const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const nodemailer = require("nodemailer");
const cors = require("cors")({ origin: true });

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize Secret Manager client
const secretsClient = new SecretManagerServiceClient();
const db = admin.firestore();

// Function to access the secret key
async function getGeminiApiKey() {
  // Make sure to replace YOUR_PROJECT_NUMBER with your actual Google Cloud project number
  const name = "projects/176295468347/secrets/GEMINI_API_KEY_SECRET/versions/latest";
  const [version] = await secretsClient.accessSecretVersion({ name });
  const payload = version.payload?.data?.toString();
  if (!payload) {
    throw new Error("Gemini API key not found in Secret Manager.");
  }
  return payload;
}

// Function to access the Nodemailer App Password from Secret Manager
async function getNodemailerPassword() {
  const name = "projects/176295468347/secrets/NODEMAILER_APP_PASSWORD/versions/latest";
  const [version] = await secretsClient.accessSecretVersion({ name });
  const payload = version.payload?.data?.toString();
  if (!payload) {
    throw new Error("Nodemailer App Password not found in Secret Manager.");
  }
  return payload;
}

/**
 * A Cloud Function to update the user's MFA status in Firestore.
 * It expects an authenticated request with a boolean `mfaEnabled` in the body.
 */
exports.updateMfaStatus = functions.https.onRequest((req, res) => {
  // Use CORS to allow requests from your web app
  cors(req, res, async () => {
    // Check for POST request
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    // Check for authentication
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    if (!idToken) {
      return res.status(403).send("Unauthorized");
    }

    try {
      // Verify the user's ID token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const { mfaEnabled } = req.body;

      if (typeof mfaEnabled !== "boolean") {
        return res.status(400).send("Bad Request: 'mfaEnabled' must be a boolean.");
      }
      // Update the user's document in the 'users' collection
      const userRef = db.collection("users").doc(uid);
      await userRef.update({ mfaEnabled: mfaEnabled });
      return res.status(200).send({ success: true, message: `MFA status updated to ${mfaEnabled}` });
    } catch (error) {
      console.error("Error updating MFA status:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});

// HTTP Callable Function to log session events
exports.logSessionEvent = functions.https.onCall(async (data, context) => {
  // Check for authentication
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called by an authenticated user.");
  }

  const eventType = data.eventType;
  const uid = context.auth.uid;

  if (!['login', 'logout'].includes(eventType)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid event type specified.");
  }

  try {
    await db.collection('session_events').add({
      userId: uid,
      eventType: eventType,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: `Event '${eventType}' logged successfully.` };
  } catch (error) {
    console.error("Error logging session event to Firestore:", error);
    throw new functions.https.HttpsError("internal", "Failed to log session event.");
  }
});

// HTTP Callable Function that your React app will call
exports.generateContent = functions.https.onCall(async (data, context) => {
  // 1. Authentication Check (recommended for production)
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called by an authenticated user.");
  }

  try {
    const apiKey = await getGeminiApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = data.prompt || "Write a short poem.";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return { text: text };
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw new functions.https.HttpsError("internal", "AI generation failed.", error.message);
  }
});

/**
 * Firestore trigger that sends an email notification when a user is locked out.
 * This function activates whenever a new document is created in the 'lockouts' collection.
 */
exports.sendLockoutNotification = onDocumentCreated("lockouts/{lockoutId}", async (event) => {
      try {
        // Securely fetch credentials at runtime
        const nodemailerEmail = process.env.NODEMAILER_EMAIL;
        const nodemailerPassword = await getNodemailerPassword();

        // Initialize the Nodemailer transporter inside the function
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: nodemailerEmail,
          pass: nodemailerPassword,
        },
      });

      const snap = event.data;
      if (!snap) return; // Exit if there's no data
      const lockoutData = snap.data();
      const userEmail = lockoutData.userEmail;
      const userId = lockoutData.userId;

      const mailOptions = {
        from: `Fastrack Driving School <${nodemailerEmail}>`,
        to: "cole@fastrackdrive.com", // Your admin email address
        subject: "User Account Locked Out - Action Required",
        html: `
        <h1>User Lockout Alert</h1>
        <p>A user has been locked out of their account due to multiple failed identity verification attempts.</p>
        <h2>User Details:</h2>
        <ul>
          <li><strong>Email:</strong> ${userEmail}</li>
          <li><strong>User ID:</strong> ${userId}</li>
        </ul>
        <p>To unlock their account, please go to the Firebase console, navigate to the 'users' collection, find the document with the ID above, and set the 'isLocked' field to 'false'.</p>
      `,
      };

        await transporter.sendMail(mailOptions);
        functions.logger.log("Lockout notification email sent successfully to cole@fastrackdrive.com for user:", userEmail);
      } catch (error) {
        functions.logger.error("Error sending lockout email:", error);
      }
    });
