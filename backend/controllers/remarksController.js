const db = require('../config/db');
const Groq = require('groq-sdk');

//=========================================================
// Get Remarks & Existing AI Summary
//=========================================================
const getRemarks = async (req, res) => {
  const dept_id = req.params.dept_id?.toUpperCase();
  const { session_id } = req.query;
  
  try {
    let remarksQuery = db('global_session_remarks as r')
      .join('global_sessions as s', function() {
        this.on('r.session_id', '=', 's.session_id').andOn('r.dept_id', '=', 's.dept_id');
      })
      .where({ 'r.dept_id': dept_id })
      .select('r.remark_id', 'r.session_id', 'r.remark_text', 'r.created_at', 's.sem', 's.section')
      .orderBy('r.created_at', 'desc');

    if (session_id && session_id !== 'all') {
      remarksQuery = remarksQuery.where({ 'r.session_id': session_id });
    }

    const remarks = await remarksQuery;

    let ai_summary = null;
    if (session_id && session_id !== 'all') {
      const sessionData = await db('global_sessions').where({ session_id, dept_id }).first();
      ai_summary = sessionData?.ai_summary;
    }

    res.json({ remarks, ai_summary });
  } catch (err) {
    console.error("Error fetching remarks:", err);
    res.status(500).json({ error: "Failed to fetch remarks" });
  }
};

//=========================================================
// Generate AI Summary using Google Gemini
//=========================================================
const analyzeRemarks = async (req, res) => {
  let { dept_id, session_id } = req.body;
  if (dept_id) dept_id = dept_id.toUpperCase();

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY is not configured in the server." });
  }

  try {
    // 1. Fetch remarks to analyze
    let remarksQuery = db('global_session_remarks').where({ dept_id });
    if (session_id && session_id !== 'all') {
      remarksQuery = remarksQuery.where({ session_id });
    }
    
    const remarks = await remarksQuery;

    if (remarks.length === 0) {
      return res.status(400).json({ error: "No remarks found to analyze." });
    }

    // 2. Format remarks for the AI prompt
    const remarksText = remarks.map((r, i) => `Remark ${i + 1}: ${r.remark_text}`).join('\n');

    const prompt = `
You are an expert Educational Data Analyst. Analyze the following anonymous student feedback remarks for a college department. 
Identify the overall sentiment, key strengths, primary areas for improvement, and any recurring trends.

Format your response in professional Markdown using the following structure:
### 📊 Executive Summary
[A short paragraph summarizing the overall sentiment]

### 🌟 Key Strengths
- [Point 1]
- [Point 2]

### 📉 Areas for Improvement
- [Point 1]
- [Point 2]

### 💡 Actionable Recommendations
- [Recommendation 1]
- [Recommendation 2]

Here are the remarks:
${remarksText}
`;

    // 3. Call Groq API
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    const result = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "openai/gpt-oss-120b" // High-performance open-source model
    });
    
    const ai_summary = result.choices[0]?.message?.content || "";

    // 4. Save summary if it's for a specific session
    if (session_id && session_id !== 'all') {
      await db('global_sessions')
        .where({ session_id, dept_id })
        .update({ ai_summary });
    }

    res.json({ ai_summary, message: "AI Analysis complete" });

  } catch (err) {
    console.error("AI Analysis Error:", err);
    res.status(500).json({ error: "Failed to generate AI summary. Ensure your API key is valid." });
  }
};

module.exports = {
  getRemarks,
  analyzeRemarks
};
