const functions = require("firebase-functions");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

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