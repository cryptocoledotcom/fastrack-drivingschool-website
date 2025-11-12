const functions = require("firebase-functions");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");
const admin = require('firebase-admin');

// Initialize the Admin SDK
admin.initializeApp();

// Initialize Secret Manager client
const secretsClient = new SecretManagerServiceClient();

// Function to access the secret key
async function getGeminiApiKey() {
  // Make sure to replace YOUR_PROJECT_NUMBER with your actual Google Cloud project number
  const name = 'projects/176295468347/secrets/GEMINI_API_KEY_SECRET/versions/latest';
  const [version] = await secretsClient.accessSecretVersion({ name });
  const payload = version.payload?.data?.toString();
  if (!payload) {
    throw new Error('Gemini API key not found in Secret Manager.');
  }
  return payload;
}

// HTTP Callable Function that your React app will call
exports.generateContent = functions.https.onCall(async (data, context) => {
  // 1. Authentication Check (recommended for production)
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called by an authenticated user.');
  }

  try {
    const apiKey = await getGeminiApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro"}); // Or another model like "gemini-1.5-flash"

    const prompt = data.prompt || 'Write a short poem.';
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 3. Return the result
    return { text: text };

  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw new functions.https.HttpsError('internal', 'AI generation failed.', error.message);
  }
});

/**
 * Logs a session event (like login or logout) to a dedicated audit collection.
 * This function must be called by an authenticated user.
 */
exports.logSessionEvent = functions.https.onCall(async (data, context) => {
  // 1. Authentication Check: Ensure the user is logged in.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called by an authenticated user.'
    );
  }

  // 2. Validate Input: Ensure an event type was passed.
  const eventType = data.eventType;
  if (!eventType || (eventType !== 'login' && eventType !== 'logout')) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with a valid "eventType" ("login" or "logout").'
    );
  }

  const logData = {
    userId: context.auth.uid,
    eventType: eventType,
    ipAddress: context.rawRequest.ip, // Securely captured on the backend
    timestamp: admin.firestore.FieldValue.serverTimestamp(), // Use server time for accuracy
    userAgent: context.rawRequest.headers['user-agent'] || null,
  };

  // 3. Write to Firestore
  await admin.firestore().collection('session_events').add(logData);

  return { success: true, log: logData };
});