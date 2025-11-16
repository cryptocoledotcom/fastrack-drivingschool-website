const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Initialize Secret Manager client
const secretsClient = new SecretManagerServiceClient();

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

// HTTP Callable Function to log session events
exports.logSessionEvent = functions.https.onCall(async (data, context) => {
  const eventType = data.eventType;
  let uid;

  if (!['login', 'logout'].includes(eventType)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid event type specified.");
  }

  // For 'login', we require an authenticated user.
  // For 'logout', we can accept a UID in the payload as the user will be signed out.
  if (eventType === 'login') {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "The 'login' event must be called by an authenticated user.");
    }
    uid = context.auth.uid;
  } else if (eventType === 'logout') {
    if (!data.userId) {
      throw new functions.https.HttpsError("invalid-argument", "The 'logout' event requires a 'userId'.");
    }
    uid = data.userId;
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

/**
 * Verifies a user's answer to a security question and creates an immutable log
 * of the attempt.
 */
exports.verifySecurityQuestionAndLog = functions.https.onCall(async (data, context) => {
  // 1. Authentication & Input Validation
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const { question, answer } = data;
  const userId = context.auth.uid;

  if (!question || typeof answer !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a 'question' and 'answer'."
    );
  }

  // 2. Fetch the user's stored security questions
  const securityProfileRef = db.doc(`users/${userId}/securityProfile/questions`);
  const securityProfileSnap = await securityProfileRef.get();

  if (!securityProfileSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Security questions have not been set up for this user.");
  }

  const securityData = securityProfileSnap.data();
  const questionData = securityData.questions.find(q => q.question === question);

  let isCorrect = false;
  if (questionData && questionData.answerHash) {
    // 3. Securely compare the provided answer with the stored hash
    isCorrect = await bcrypt.compare(answer, questionData.answerHash);
  }

  // 4. Create an Immutable Log Entry
  const logRef = db.collection("identity_validation_logs").doc(); // Auto-generate a unique ID

  await logRef.set({
    userId: userId,
    question: question,
    response: answer, // Storing the student's exact response as requested
    isCorrect: isCorrect,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    context: {
      // Additional context for auditing purposes
      ip: context.rawRequest.ip,
      userAgent: context.rawRequest.headers["user-agent"] || "",
    }
  });

  // 5. Return the result
  return { success: isCorrect };
});
