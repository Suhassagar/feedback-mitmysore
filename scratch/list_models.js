require('dotenv').config({ path: '../backend/.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // We fetch the API key using a direct HTTP request to see exactly what models are available
    // because the standard SDK doesn't natively expose listModels easily in all versions.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    
    if (data.models) {
      console.log("AVAILABLE MODELS:");
      data.models.forEach(m => console.log(`- ${m.name} (generateContent: ${m.supportedGenerationMethods.includes('generateContent')})`));
    } else {
      console.log("Error fetching models:", data);
    }
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

listModels();
