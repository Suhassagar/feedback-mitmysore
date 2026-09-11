require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  try {
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
