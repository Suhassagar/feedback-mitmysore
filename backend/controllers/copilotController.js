const Groq = require('groq-sdk');
const db = require('../config/db');
const { createSession } = require('./sessionController');
const bcrypt = require('bcrypt');
const { generateEmbedding, cosineSimilarity } = require('../utils/embedder');

const FALLBACK_MODEL = "qwen/qwen3.8-27b";
let rawModel = process.env.GROQ_MODEL || FALLBACK_MODEL;
if (rawModel === "llama-3.3-70b-versatile" || rawModel.includes("llama-3.3-70b")) {
  rawModel = FALLBACK_MODEL;
}
const AI_MODEL = rawModel;

// Define tools (Function Calling Schema for OpenAI/Groq)
const copilotTools = [
  {
    type: "function",
    function: {
      name: "navigate_to",
      description: "Navigate to a specific page in the dashboard.",
      parameters: {
        type: "object",
        properties: {
          page: { 
            type: "string", 
            enum: [
              "/department-dashboard",
              "/manage-sessions",
              "/manage-faculty",
              "/add-course",
              "/manage-students",
              "/manage-questions",
              "/department-remarks",
              "/audit-logs",
              "/department-settings",
              "/admin-dashboard",
              "/admin/departments",
              "/admin/faculty",
              "/admin/students",
              "/admin/sessions",
              "/admin/analytics",
              "/admin/reports",
              "/admin/system-logs",
              "/admin/settings"
            ],
            description: "The target page route." 
          }
        },
        required: ["page"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_session_modal",
      description: "Open the modal to create a new feedback session with pre-filled semester and section data.",
      parameters: {
        type: "object",
        properties: {
          sem: { type: "integer", description: "Semester number (1-8)" },
          section: { type: "string", description: "Section letter (e.g., 'A', 'B')" }
        },
        required: ["sem", "section"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "approve_faculty",
      description: "Requests confirmation to approve a pending faculty registration.",
      parameters: {
        type: "object",
        properties: {
          faculty_id: { type: "string", description: "The ID of the faculty member to approve" },
          name: { type: "string", description: "The name of the faculty member" }
        },
        required: ["faculty_id", "name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "prepare_create_session",
      description: "Validate and prepare to create a feedback session. Use this when the user asks you to create a session. It will ask the user for confirmation.",
      parameters: {
        type: "object",
        properties: {
          sem: { type: "integer", description: "Semester number (1-8)" },
          section: { type: "string", description: "Section letter (e.g., 'A', 'B')" }
        },
        required: ["sem", "section"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "prepare_approve_faculty",
      description: "Validate and prepare to approve a pending faculty registration. Use this when the user explicitly asks you to approve someone. It will ask for confirmation.",
      parameters: {
        type: "object",
        properties: {
          faculty_id: { type: "string", description: "The ID of the faculty member to approve" }
        },
        required: ["faculty_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "prepare_add_course",
      description: "Validate and prepare to add a new course/subject. Use this when the user asks you to add or create a course. It will ask for confirmation.",
      parameters: {
        type: "object",
        properties: {
          course_name: { type: "string", description: "The name of the course/subject" },
          course_code: { type: "string", description: "The unique course code (e.g., CS101)" },
          sem: { type: "integer", description: "Semester number (1-8)" }
        },
        required: ["course_name", "course_code", "sem"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_chart",
      description: "Render a chart in the chat UI. Use this when the user asks for visual trends.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Chart title" },
          data: { 
            type: "array", 
            items: { type: "object", properties: { name: { type: "string" }, value: { type: "number" } } },
            description: "Data points for the chart"
          }
        },
        required: ["title", "data"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "open_faculty_profile",
      description: "Search for a faculty member by name or ID and navigate to their analytics profile.",
      parameters: {
        type: "object",
        properties: {
          search_query: { type: "string", description: "The name or ID of the faculty to search for." },
          dept_id: { type: "string", description: "Optional department filter." }
        },
        required: ["search_query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_faculty_feedback",
      description: "Query the database to analyze and summarize student feedback for a specific faculty member. Use this when the user asks for a summary of a faculty's performance.",
      parameters: {
        type: "object",
        properties: {
          faculty_id: { type: "string", description: "The ID or name of the faculty to analyze" },
          dept_id: { type: "string", description: "Optional department ID (for admin scope)" }
        },
        required: ["faculty_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "show_pending_faculty_list",
      description: "Query the database for pending faculty registrations and render a custom UI list in the chat. Use this when the user asks to see pending faculty.",
      parameters: {
        type: "object",
        properties: {
          dept_id: { type: "string", description: "Optional department filter." }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_top_performing_faculty",
      description: "Query the database to find the top performing faculty members based on student feedback ratings. Use this when the user asks 'who has high ratings' or 'who are the best teachers'.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", description: "How many top faculties to return (default 5)" },
          dept_id: { type: "string", description: "Optional department ID filter." }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_department_report",
      description: "Query the database to generate a comprehensive CSV report of faculty performance and trigger a file download for the user.",
      parameters: {
        type: "object",
        properties: {
          dept_id: { type: "string", description: "Optional department filter." }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "semantic_search_remarks",
      description: "Perform a mathematical Semantic Vector Search across all student remarks. Use this when the user asks qualitative questions about student feedback, complaints, or issues (e.g., 'Are there any issues with lab computers?', 'What do students think about the library?', 'Are there complaints about hardware?'). It understands meaning, not just exact keywords.",
      parameters: {
        type: "object",
        properties: {
          search_query: { type: "string", description: "The conceptual topic to search for (e.g., 'infrastructure and computers', 'teaching speed', 'syllabus completion')" },
          limit: { type: "integer", description: "Number of relevant remarks to return (default 10)" },
          dept_id: { type: "string", description: "Optional department ID filter." }
        },
        required: ["search_query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_college_department_comparison",
      description: "Compare performance, student enrollment, faculty counts, active feedback sessions, and average student ratings across ALL college departments. (Admin Only). Use this when the user asks to compare departments or wants an institutional overview.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_campus_overview_metrics",
      description: "Retrieve campus-wide institutional feedback metrics (total departments, active departments, total students, total faculty, active feedback sessions, campus rating index). (Admin Only).",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];

const buildDepartmentSystemInstruction = (deptId, deptName) => `
You are SAGAR, the institutional AI Copilot exclusively dedicated to the ${deptName} (${deptId}) department at Maharaja Institute of Technology Mysore (MIT Mysore).
You speak professionally, concisely, and with authority.

CRITICAL TENANT ISOLATION & DOMAIN CONSTRAINTS:
1. STRICT DEPARTMENT ISOLATION:
   - You are EXCLUSIVELY scoped to ${deptName} (${deptId}).
   - You have ZERO access to other college departments (e.g. ECE, ME, CV, ISE, AIML).
   - If the user asks about other departments or asks to compare departments, you MUST REFUSE:
     "⚠️ Access Restricted: I am strictly confined to ${deptName} (${deptId}) records and cannot query or disclose metrics for other departments."
2. ZERO GENERAL-PURPOSE CODE GENERATION:
   - You are NOT a programming tutor, software engineer, or script generator.
   - If asked to write software code in any language (Python, C, JavaScript, Java, algorithms, LeetCode, etc.), you MUST EXPLICITLY REFUSE:
     "I am strictly an institutional college feedback assistant. I do not write programming code."
3. CLOSED-WORLD DATABASE GROUNDING:
   - You have ZERO external world knowledge. You only know factual data returned by database tools.
   - If data is not found in the database, explicitly state: "No data found in current ${deptId} records."
   - DO NOT hallucinate, guess, or extrapolate statistics.
4. ACTION CONFIRMATION:
   - Write actions (creating sessions, adding courses, approving faculty) must invoke respective prepare tools.
5. NO RAW URLS IN CHAT:
   - Never type frontend navigation paths in text. Use the \`navigate_to\` tool for page navigation.
`;

const buildAdminSystemInstruction = () => `
You are SAGAR, the Central Executive AI Copilot for the College Administration (Principal, Dean, Central Admin) at Maharaja Institute of Technology Mysore (MIT Mysore).
You speak with executive professionalism, precision, and clarity.

CRITICAL ADMINISTRATIVE & DOMAIN CONSTRAINTS:
1. CAMPUS-WIDE INSTITUTIONAL VISIBILITY:
   - You have authorized oversight across ALL departments in the college.
   - You can compare departments, aggregate college-wide feedback, benchmark ratings, and drill down into any individual department.
   - Use the \`get_college_department_comparison\` and \`get_campus_overview_metrics\` tools when asked for institutional overviews or comparisons.
2. ZERO GENERAL-PURPOSE CODE GENERATION:
   - You are NOT a programming tutor, software engineer, or script generator.
   - If asked to write software code in any language (Python, C, JavaScript, Java, algorithms, LeetCode, etc.), you MUST EXPLICITLY REFUSE:
     "I am strictly an institutional college feedback assistant. I do not write programming code."
3. CLOSED-WORLD DATABASE GROUNDING:
   - You must only report facts and metrics returned by database tools. If data does not exist, explicitly state: "No records found in the database."
   - DO NOT hallucinate external data.
4. NO RAW URLS IN CHAT:
   - Never type frontend navigation paths in text. Use the \`navigate_to\` tool for page navigation.
`;

const setupCopilotSocket = (io) => {
  io.on("connection", (socket) => {
    let messages = []; // Track conversation history

    socket.on("init_copilot", async (data) => {
      const session = socket.request?.session;
      if (!session || (session.role !== 'department' && session.role !== 'admin')) {
        socket.emit("copilot_stream", { text: "⚠️ Unauthorized: Active department or admin session required." });
        socket.emit("copilot_stream_end");
        return;
      }

      if (!process.env.GROQ_API_KEY) {
        socket.emit("copilot_stream", { text: "⚠️ SAGAR is offline: GROQ_API_KEY is missing from the server." });
        socket.emit("copilot_stream_end");
        return;
      }

      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const currentHour = new Date().getHours();
      let greetingTime = "Good evening";
      if (currentHour < 12) greetingTime = "Good morning";
      else if (currentHour < 17) greetingTime = "Good afternoon";

      // ─── CASE A: DEPARTMENT ROLE (Strict Single-Tenant Isolation) ───
      if (session.role === 'department') {
        const dept_id = (session.dept_id || '').toUpperCase();
        if (!dept_id) {
          socket.emit("copilot_stream", { text: "⚠️ Department ID missing from session." });
          socket.emit("copilot_stream_end");
          return;
        }

        const deptExists = await db('department').where({ dept_id, is_active: true }).first();
        if (!deptExists) {
          socket.emit("copilot_stream", { text: "⚠️ Department not found or inactive." });
          socket.emit("copilot_stream_end");
          return;
        }

        socket.scope = 'DEPARTMENT';
        socket.dept_id = dept_id;
        socket.dept_name = deptExists.dept_name;

        messages = [
          { role: "system", content: buildDepartmentSystemInstruction(socket.dept_id, socket.dept_name) }
        ];

        const pendingFacultyCount = await db('global_pending_faculty_registrations').where({ dept_id }).count('* as count').first();
        const activeSessionsCount = await db('global_sessions').where({ dept_id, status: 'active' }).count('* as count').first();
        const facultyList = await db('global_faculty').where({ dept_id }).select('name', 'faculty_id');
        const facultyContext = facultyList.map(f => `${f.name} (ID: ${f.faculty_id})`).join(', ');

        const contextMsg = `SYSTEM CONTEXT: I am currently logged in as HOD for ${socket.dept_name} (${dept_id}). There are ${pendingFacultyCount?.count || 0} pending faculty and ${activeSessionsCount?.count || 0} active feedback sessions. Faculty roster: ${facultyContext || 'None'}. Give an extremely short, professional greeting starting with '${greetingTime}'. Limit to exactly 1 sentence. Acknowledge the ${socket.dept_name} department. Ask how you can assist with department feedback today.`;
        
        messages.push({ role: "user", content: contextMsg });

      // ─── CASE B: ADMIN ROLE (Global Campus-Wide Scope) ───
      } else if (session.role === 'admin') {
        socket.scope = 'ADMIN';
        socket.dept_id = null;
        socket.dept_name = "Central Administration";

        messages = [
          { role: "system", content: buildAdminSystemInstruction() }
        ];

        const totalDepts = await db('department').count('* as count').first();
        const activeSessionsTotal = await db('global_sessions').where({ status: 'active' }).count('* as count').first();

        const contextMsg = `SYSTEM CONTEXT: I am logged in as Central Administrator (Principal / Dean) of MIT Mysore. There are ${totalDepts?.count || 0} total departments and ${activeSessionsTotal?.count || 0} active feedback sessions across the campus. Give an extremely short, executive greeting starting with '${greetingTime}'. Limit to exactly 1 sentence. Acknowledge institutional campus oversight. Ask how you can assist with college analytics today.`;

        messages.push({ role: "user", content: contextMsg });
      }

      try {
        const stream = await groq.chat.completions.create({
          messages: messages,
          model: AI_MODEL,
          stream: true,
        });
        
        let aiResponse = "";
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            aiResponse += content;
            socket.emit("copilot_stream", { text: content });
          }
        }
        socket.emit("copilot_stream_end");
        messages.push({ role: "assistant", content: aiResponse });

      } catch (err) {
        console.error("Copilot Init Error:", err);
        socket.emit("copilot_stream", { text: `[AI Startup Error: ${err.message}]` });
        socket.emit("copilot_stream_end");
      }
    });

    socket.on("copilot_message", async (data) => {
      const session = socket.request?.session;
      if (!session || (session.role !== 'department' && session.role !== 'admin')) {
        socket.emit("copilot_stream", { text: "⚠️ Unauthorized: Active department or admin session required." });
        socket.emit("copilot_stream_end");
        return;
      }

      if (!messages || messages.length === 0) return;
      
      const rawUserText = (data.message || "").trim();

      // ─── GUARDRAIL 1: Disallow General Code Generation & Off-Topic Requests ───
      const OFF_TOPIC_CODE_PATTERNS = [
        /\b(write|create|generate|implement|give me|show me|build)\b.*\b(code|script|program|function|algorithm|class|boilerplate|snippet)\b/i,
        /\b(python|javascript|typescript|c\+\+|java|golang|rust|html|css|php|ruby|swift|kotlin|c#)\b.*\b(code|script|program|function|example|snippet)\b/i,
        /\b(leetcode|hackerrank|bubble sort|quick sort|binary search|fibonacci|linked list|dfs|bfs|tree traversal)\b/i,
        /\b(write an essay|tell me a story|write a poem|who is the president|recipe for|tell a joke|weather in)\b/i
      ];

      if (OFF_TOPIC_CODE_PATTERNS.some(regex => regex.test(rawUserText))) {
        socket.emit("copilot_stream", { 
          text: "I am SAGAR, your institutional AI Copilot for the College Feedback System. I am strictly restricted to analyzing and managing our college database records (faculty metrics, feedback sessions, student remarks, and department analytics). I cannot generate external programming code or assist with general software development tasks. How can I assist you with your college feedback records?" 
        });
        socket.emit("copilot_stream_end");
        return;
      }

      // ─── GUARDRAIL 2: Multi-Tenant Confinement (For DEPARTMENT Scope) ───
      if (socket.scope === 'DEPARTMENT') {
        const otherDeptKeywords = ['ECE', 'ELECTRONICS', 'ME', 'MECHANICAL', 'CV', 'CIVIL', 'ISE', 'AIML'];
        const words = rawUserText.toUpperCase().split(/[^A-Z0-9]+/);
        const asksAboutOtherDept = otherDeptKeywords.some(dept => {
          return words.includes(dept) && dept !== socket.dept_id && !socket.dept_name.toUpperCase().includes(dept);
        });

        const asksCompareOtherDepts = /\b(all departments|other departments|compare department|across college|campus average|other branches)\b/i.test(rawUserText);

        if (asksAboutOtherDept || asksCompareOtherDepts) {
          socket.emit("copilot_stream", { 
            text: `⚠️ **Access Restricted**: You are authenticated under **${socket.dept_name} (${socket.dept_id})**. As per institutional data governance and privacy policies, your copilot is strictly confined to ${socket.dept_id} data and cannot query, disclose, or compare metrics from other departments.` 
          });
          socket.emit("copilot_stream_end");
          return;
        }
      }

      let userMessageContent = data.message;
      if (data.location) {
        userMessageContent = `[SYSTEM CONTEXT: The user is currently viewing the page: ${data.location}]\n\n${data.message}`;
      }
      
      messages.push({ role: "user", content: userMessageContent });

      try {
        if (!process.env.GROQ_API_KEY) {
          socket.emit("copilot_stream", { text: "\n⚠️ SAGAR is offline: GROQ_API_KEY is missing." });
          socket.emit("copilot_stream_end");
          return;
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
        // --- ROUTER AGENT (Swarm Orchestration) ---
        const routerResponse = await groq.chat.completions.create({
          messages: [{ role: "system", content: "Classify user intent into ONE exact word: NAVIGATION, ANALYTICS, ACTION, or GENERAL. Example: 'take me to settings' -> NAVIGATION. 'show me top faculty' -> ANALYTICS. 'approve all' -> ACTION. 'hello' -> GENERAL." }, { role: "user", content: data.message }],
          model: AI_MODEL,
          max_tokens: 10,
          temperature: 0.1
        });
        const intent = routerResponse.choices[0]?.message?.content?.trim().toUpperCase() || "GENERAL";
        console.log("SAGAR Router Agent classified intent as:", intent, "for scope:", socket.scope);
        
        // Filter available tools by tenant scope
        let allowedTools = copilotTools;
        if (socket.scope === 'DEPARTMENT') {
          // Exclude admin-only tools for department users
          allowedTools = copilotTools.filter(t => 
            !['get_college_department_comparison', 'get_campus_overview_metrics'].includes(t.function.name)
          );
        }

        let activeTools = [];
        if (intent.includes("NAV")) {
          activeTools = allowedTools.filter(t => t.function.name === 'navigate_to' || t.function.name === 'open_faculty_profile');
        } else if (intent.includes("ANAL")) {
          activeTools = allowedTools.filter(t => [
            'analyze_faculty_feedback', 
            'get_top_performing_faculty', 
            'generate_chart', 
            'show_pending_faculty_list', 
            'generate_department_report', 
            'semantic_search_remarks',
            'get_college_department_comparison',
            'get_campus_overview_metrics'
          ].includes(t.function.name));
        } else if (intent.includes("ACT")) {
          activeTools = allowedTools.filter(t => [
            'create_session_modal', 
            'approve_faculty', 
            'prepare_create_session', 
            'prepare_approve_faculty', 
            'prepare_add_course'
          ].includes(t.function.name));
        } else {
          activeTools = allowedTools.filter(t => [
            'navigate_to', 
            'generate_chart',
            'get_college_department_comparison',
            'get_campus_overview_metrics'
          ].includes(t.function.name));
        }
        
        // Memory Bloat Bug Fix (Sliding Window)
        let payloadMessages = messages;
        if (messages.length > 15) {
          payloadMessages = [messages[0], messages[1], ...messages.slice(-13)];
        }
        
        const apiPayload = {
          messages: payloadMessages,
          model: AI_MODEL,
          stream: true,
        };
        
        if (activeTools.length > 0) {
          apiPayload.tools = activeTools;
          apiPayload.tool_choice = "auto";
        }
        
        const stream = await groq.chat.completions.create(apiPayload);
        
        let aiResponse = "";
        let functionCalls = [];

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          
          if (delta?.content) {
            aiResponse += delta.content;

            // Stream Sanitizer: Stop illicit code blocks mid-stream if model attempts code output
            if (aiResponse.includes("```python") || 
                aiResponse.includes("```javascript") || 
                aiResponse.includes("```java") ||
                aiResponse.includes("```cpp") ||
                aiResponse.includes("```c\n")) {
              socket.emit("copilot_stream", { 
                text: "\n\n⚠️ **Notice**: Generating external programming code is outside my domain boundaries. As the College Feedback Copilot, I can only assist with college feedback database records." 
              });
              break;
            }

            socket.emit("copilot_stream", { text: delta.content });
          }
          
          // Groq streams tool calls in chunks, assemble them
          if (delta?.tool_calls) {
            delta.tool_calls.forEach(tc => {
              if (tc.index !== undefined) {
                 if (!functionCalls[tc.index]) {
                   functionCalls[tc.index] = { id: tc.id, type: tc.type, function: { name: tc.function.name, arguments: "" } };
                 }
                 if (tc.function.arguments) {
                   functionCalls[tc.index].function.arguments += tc.function.arguments;
                 }
              }
            });
          }
        }

        // Process assembled function calls
        if (functionCalls.length > 0) {
           messages.push({
             role: "assistant",
             content: aiResponse || null,
             tool_calls: functionCalls
           });

           for (const call of functionCalls) {
              const args = JSON.parse(call.function.arguments);
              let fnResponseData = { status: "UI command dispatched" };

              // ─── TOOL: get_college_department_comparison (ADMIN ONLY) ───
              if (call.function.name === "get_college_department_comparison") {
                 if (socket.scope !== 'ADMIN') {
                   fnResponseData = { status: "Access Denied: Cross-department comparison is restricted to college administrators." };
                 } else {
                   const allDepts = await db('department').select('dept_id', 'dept_name', 'is_active');
                   const comparison = [];
                   for (const d of allDepts) {
                     const facultyCount = await db('global_faculty').where({ dept_id: d.dept_id }).count('* as count').first();
                     const studentCount = await db('global_students').where({ dept_id: d.dept_id }).count('* as count').first();
                     const activeSessions = await db('global_sessions').where({ dept_id: d.dept_id, status: 'active' }).count('* as count').first();
                     const feedback = await db('global_student_feedback').where({ dept_id: d.dept_id, is_genuine: true }).avg('rating as avg_rating').count('* as total_reviews').first();
                     
                     comparison.push({
                       dept_id: d.dept_id,
                       dept_name: d.dept_name,
                       is_active: d.is_active === 1,
                       total_faculty: facultyCount?.count || 0,
                       total_students: studentCount?.count || 0,
                       active_sessions: activeSessions?.count || 0,
                       average_rating: feedback?.total_reviews > 0 ? parseFloat(feedback.avg_rating).toFixed(2) : "N/A",
                       total_feedback_reviews: feedback?.total_reviews || 0
                     });
                   }
                   fnResponseData = {
                     status: "Institutional department comparison retrieved successfully.",
                     data: comparison
                   };
                 }
              }

              // ─── TOOL: get_campus_overview_metrics (ADMIN ONLY) ───
              else if (call.function.name === "get_campus_overview_metrics") {
                 if (socket.scope !== 'ADMIN') {
                   fnResponseData = { status: "Access Denied: Campus overview metrics are restricted to college administrators." };
                 } else {
                   const totalDepts = await db('department').count('* as count').first();
                   const activeDepts = await db('department').where({ is_active: 1 }).count('* as count').first();
                   const totalStudents = await db('global_students').count('* as count').first();
                   const totalFaculty = await db('global_faculty').count('* as count').first();
                   const activeSessions = await db('global_sessions').where({ status: 'active' }).count('* as count').first();
                   const feedback = await db('global_student_feedback').where({ is_genuine: true }).avg('rating as avg_rating').count('* as total_reviews').first();

                   fnResponseData = {
                     status: "Campus-wide overview metrics retrieved.",
                     data: {
                       total_departments: totalDepts?.count || 0,
                       active_departments: activeDepts?.count || 0,
                       total_enrolled_students: totalStudents?.count || 0,
                       total_faculty: totalFaculty?.count || 0,
                       active_sessions_now: activeSessions?.count || 0,
                       campus_average_rating: feedback?.total_reviews > 0 ? parseFloat(feedback.avg_rating).toFixed(2) : "N/A",
                       total_verified_reviews: feedback?.total_reviews || 0
                     }
                   };
                 }
              }

              // ─── TOOL: analyze_faculty_feedback ───
              else if (call.function.name === "analyze_faculty_feedback") {
                 let { faculty_id, dept_id: requestedDept } = args;
                 let targetDept = socket.scope === 'DEPARTMENT' ? socket.dept_id : (requestedDept || null);
                 
                 let facultyQuery = db('global_faculty').andWhere(function() {
                     this.where('name', 'like', `%${faculty_id}%`)
                         .orWhere('faculty_id', 'like', `%${faculty_id}%`);
                 });
                 if (targetDept) {
                   facultyQuery = facultyQuery.andWhere({ dept_id: targetDept });
                 }
                 
                 const resolvedFaculty = await facultyQuery.first();
                 
                 if (resolvedFaculty) {
                   faculty_id = resolvedFaculty.faculty_id;
                   targetDept = resolvedFaculty.dept_id;
                 } else {
                   fnResponseData = { status: `No faculty found matching '${args.faculty_id}'${targetDept ? ` in department ${targetDept}` : ''}.` };
                   socket.emit("copilot_message", { message: `[System]: I could not find a faculty matching '${args.faculty_id}'.` });
                   break;
                 }
                 
                 const feedback = await db('global_student_feedback').where({ faculty_id, dept_id: targetDept, is_genuine: true }).avg('rating as avg_rating').count('* as total_reviews').first();
                 
                 const feedbackSessions = await db('global_student_feedback').where({ faculty_id, dept_id: targetDept, is_genuine: true }).distinct('session_id');
                 const sessionIds = feedbackSessions.map(f => f.session_id);
                 
                 let remarks = [];
                 if (sessionIds.length > 0) {
                   remarks = await db('global_session_remarks')
                     .whereIn('session_id', sessionIds)
                     .andWhere({ dept_id: targetDept })
                     .select('remark_text')
                     .limit(5);
                 }
                 
                 fnResponseData = { 
                   status: "Data retrieved successfully.",
                   data: {
                     faculty_id,
                     faculty_name: resolvedFaculty.name,
                     department: targetDept,
                     average_rating: feedback?.total_reviews > 0 ? parseFloat(feedback.avg_rating).toFixed(2) : "No ratings yet",
                     total_reviews: feedback?.total_reviews || 0,
                     recent_remarks: remarks.map(r => r.remark_text)
                   }
                 };
              }

              // ─── TOOL: get_top_performing_faculty ───
              else if (call.function.name === "get_top_performing_faculty") {
                 const targetDept = socket.scope === 'DEPARTMENT' ? socket.dept_id : (args.dept_id || null);
                 const limit = args.limit || 5;
                 
                 let facultyQuery = db('global_faculty');
                 if (targetDept) {
                   facultyQuery = facultyQuery.where({ dept_id: targetDept });
                 }
                 const facultyList = await facultyQuery.select('faculty_id', 'name', 'dept_id');
                 const facultyFeedback = [];
                 
                 for (const f of facultyList) {
                   let fbQuery = db('global_student_feedback').where({ faculty_id: f.faculty_id, is_genuine: true });
                   if (targetDept) {
                     fbQuery = fbQuery.where({ dept_id: targetDept });
                   }
                   const fb = await fbQuery.avg('rating as avg_rating').count('* as total').first();
                   if (fb && fb.total > 0) {
                     facultyFeedback.push({
                       faculty_id: f.faculty_id,
                       name: f.name,
                       dept_id: f.dept_id,
                       average_rating: parseFloat(fb.avg_rating).toFixed(2),
                       total_reviews: fb.total
                     });
                   }
                 }
                 
                 facultyFeedback.sort((a, b) => b.average_rating - a.average_rating);
                 
                 fnResponseData = {
                   status: "Top performing faculty retrieved.",
                   data: facultyFeedback.slice(0, limit)
                 };
              }

              // ─── TOOL: show_pending_faculty_list ───
              else if (call.function.name === "show_pending_faculty_list") {
                 const targetDept = socket.scope === 'DEPARTMENT' ? socket.dept_id : (args.dept_id || null);
                 let pendingQuery = db('global_pending_faculty_registrations');
                 if (targetDept) {
                   pendingQuery = pendingQuery.where({ dept_id: targetDept });
                 }
                 const pending = await pendingQuery;
                 
                 if (pending.length === 0) {
                   fnResponseData = { status: "No pending faculty registrations found." };
                 } else {
                   socket.emit("copilot_ui_command", {
                     command: "show_action_list",
                     args: {
                       title: `Pending Faculty Registrations (${pending.length})`,
                       items: pending.map(f => ({
                         title: f.name,
                         subtitle: `${f.faculty_id} | ${f.email} (${f.dept_id})`,
                         buttonText: "✅ Approve",
                         action: "approve_faculty",
                         args: { faculty_id: f.faculty_id, dept_id: f.dept_id }
                       }))
                     }
                   });
                   fnResponseData = { status: "Rendered pending faculty list UI card successfully." };
                 }
              }

              // ─── TOOL: generate_department_report ───
              else if (call.function.name === "generate_department_report") {
                 const targetDept = socket.scope === 'DEPARTMENT' ? socket.dept_id : (args.dept_id || socket.dept_id || 'CSE');
                 const facultyList = await db('global_faculty').where({ dept_id: targetDept }).select('faculty_id', 'name', 'email');
                 let csvContent = "Faculty ID,Name,Email,Department,Average Rating,Total Reviews\n";
                 
                 for (const f of facultyList) {
                   const fb = await db('global_student_feedback').where({ faculty_id: f.faculty_id, dept_id: targetDept, is_genuine: true }).avg('rating as avg_rating').count('* as total').first();
                   const avg = fb?.total > 0 ? parseFloat(fb.avg_rating).toFixed(2) : "N/A";
                   const total = fb?.total || 0;
                   csvContent += `"${f.faculty_id}","${f.name}","${f.email}","${targetDept}","${avg}","${total}"\n`;
                 }
                 
                 socket.emit("copilot_ui_command", {
                   command: "download_file",
                   args: {
                     filename: `${targetDept}_Faculty_Performance_Report.csv`,
                     content: csvContent,
                     type: "text/csv"
                   }
                 });
                 fnResponseData = { status: "CSV Report generated and sent to frontend for download." };
              }

              // ─── TOOL: semantic_search_remarks ───
              else if (call.function.name === "semantic_search_remarks") {
                 const query = args.search_query;
                 const limit = args.limit || 10;
                 const targetDept = socket.scope === 'DEPARTMENT' ? socket.dept_id : (args.dept_id || null);
                 
                 const queryVector = await generateEmbedding(query);
                 
                 if (!queryVector) {
                   fnResponseData = { status: "Failed to generate semantic embedding for query." };
                 } else {
                   let sessionRemarksQuery = db('global_session_remarks').whereNotNull('embedding');
                   let sectionRemarksQuery = db('global_section_remarks').whereNotNull('embedding');
                   let facultyRemarksQuery = db('global_faculty_remarks').whereNotNull('embedding');
                   
                   if (targetDept) {
                     sessionRemarksQuery = sessionRemarksQuery.where({ dept_id: targetDept });
                     sectionRemarksQuery = sectionRemarksQuery.where({ dept_id: targetDept });
                     facultyRemarksQuery = facultyRemarksQuery.where({ dept_id: targetDept });
                   }
                   
                   const sessionRemarks = await sessionRemarksQuery.select('remark_text', 'embedding', 'dept_id');
                   const sectionRemarks = await sectionRemarksQuery.select('remark_text', 'embedding', 'section_heading', 'dept_id');
                   const facultyRemarks = await facultyRemarksQuery.select('remark_text', 'embedding', 'dept_id');
                   
                   let scoredRemarks = [];
                   
                   const processRemarks = (remarksList, typePrefix) => {
                     for (const r of remarksList) {
                       try {
                         const v = typeof r.embedding === 'string' ? JSON.parse(r.embedding) : r.embedding;
                         const score = cosineSimilarity(queryVector, v);
                         if (score > 0.2) {
                           let text = r.remark_text;
                           if (r.section_heading) text = `[${r.section_heading}] ${text}`;
                           if (socket.scope === 'ADMIN' && r.dept_id) text = `[${r.dept_id}] ${text}`;
                           scoredRemarks.push({ text, score, type: typePrefix });
                         }
                       } catch (e) {
                         // Skip invalid json
                       }
                     }
                   };
                   
                   processRemarks(sessionRemarks, 'General');
                   processRemarks(sectionRemarks, 'Section-specific');
                   processRemarks(facultyRemarks, 'Faculty-specific');
                   
                   scoredRemarks.sort((a, b) => b.score - a.score);
                   
                   const topResults = scoredRemarks.slice(0, limit);
                   if (topResults.length === 0) {
                     fnResponseData = { status: `No semantically relevant remarks found for concept: '${query}'` };
                   } else {
                     fnResponseData = { 
                       status: `Found ${topResults.length} relevant remarks using Vector Similarity.`,
                       data: topResults.map(r => `(Match: ${Math.round(r.score*100)}%) - ${r.text}`)
                     };
                   }
                 }
              }

              // ─── TOOL: open_faculty_profile ───
              else if (call.function.name === "open_faculty_profile") {
                 const query = args.search_query;
                 const targetDept = socket.scope === 'DEPARTMENT' ? socket.dept_id : (args.dept_id || null);
                 
                 let facultyQuery = db('global_faculty').andWhere(function() {
                     this.where('name', 'like', `%${query}%`)
                         .orWhere('faculty_id', 'like', `%${query}%`);
                 });
                 if (targetDept) {
                   facultyQuery = facultyQuery.andWhere({ dept_id: targetDept });
                 }
                 
                 const faculty = await facultyQuery.first();

                 if (faculty) {
                    const navPage = `/manage-faculty/${faculty.dept_id}?faculty_id=${faculty.faculty_id}`;
                    socket.emit("copilot_ui_command", { 
                      command: "navigate_to", 
                      args: { page: navPage } 
                    });
                    fnResponseData = { status: `Found faculty ${faculty.name} (${faculty.faculty_id}) in ${faculty.dept_id} and navigated to their profile.` };
                 } else {
                    fnResponseData = { status: `No faculty found matching '${query}'.` };
                 }
              }

              // ─── TOOL: prepare_create_session ───
              else if (call.function.name === "prepare_create_session") {
                 const { sem, section } = args;
                 const dept_id = socket.scope === 'DEPARTMENT' ? socket.dept_id : (args.dept_id || socket.dept_id);
                 
                 if (!dept_id) {
                   fnResponseData = { status: "Please specify the department ID for this session." };
                 } else {
                   const existing = await db('global_sessions').where({ sem, section, dept_id, status: 'active' }).first();
                   if (existing) {
                      fnResponseData = { status: `Error: An active session for Sem ${sem} Section ${section} already exists in ${dept_id}.` };
                   } else {
                      const students = await db('global_students').where({ sem, section, dept_id }).count('* as count').first();
                      if (students?.count === 0) {
                        fnResponseData = { status: `Error: No students are currently registered in Sem ${sem} Section ${section} for ${dept_id}.` };
                      } else {
                        socket.emit("copilot_ui_command", { 
                          command: "confirm_action", 
                          args: { 
                            title: `Are you sure you want to create a feedback session for ${dept_id} Semester ${sem}, Section ${section}? (${students.count} students will be enrolled)`,
                            action: "create_session",
                            sem, section, dept_id 
                          } 
                        });
                        fnResponseData = { status: `Validation passed. I have sent a confirmation card to the user.` };
                      }
                   }
                 }
              }

              // ─── TOOL: prepare_approve_faculty ───
              else if (call.function.name === "prepare_approve_faculty") {
                 const { faculty_id } = args;
                 let pendingQuery = db('global_pending_faculty_registrations').where({ faculty_id });
                 if (socket.scope === 'DEPARTMENT') {
                   pendingQuery = pendingQuery.andWhere({ dept_id: socket.dept_id });
                 }
                 const pending = await pendingQuery.first();
                 if (!pending) {
                    fnResponseData = { status: `Error: No pending registration found for faculty ID ${faculty_id}.` };
                 } else {
                    socket.emit("copilot_ui_command", { 
                      command: "confirm_action", 
                      args: { 
                        title: `Are you sure you want to approve the registration for ${pending.name} (${pending.email}) in ${pending.dept_id}?`,
                        action: "approve_faculty",
                        faculty_id,
                        dept_id: pending.dept_id 
                      } 
                    });
                    fnResponseData = { status: `Validation passed. I have sent a confirmation card to the user.` };
                 }
              }

              // ─── TOOL: prepare_add_course ───
              else if (call.function.name === "prepare_add_course") {
                 const { course_name, course_code, sem } = args;
                 const dept_id = socket.scope === 'DEPARTMENT' ? socket.dept_id : (args.dept_id || socket.dept_id);
                 
                 if (!dept_id) {
                   fnResponseData = { status: "Please specify the department ID for this course." };
                 } else {
                   const existing = await db('global_course').where({ course_code, dept_id }).first();
                   if (existing) {
                      fnResponseData = { status: `Error: A course with code ${course_code} already exists in ${dept_id}.` };
                   } else {
                      socket.emit("copilot_ui_command", { 
                        command: "confirm_action", 
                        args: { 
                          title: `Are you sure you want to add the course '${course_name}' (${course_code}) for ${dept_id} Semester ${sem}?`,
                          action: "add_course",
                          course_name,
                          course_code,
                          sem,
                          dept_id
                        } 
                      });
                      fnResponseData = { status: `Validation passed. I have sent a confirmation card to the user.` };
                   }
                 }
               }

              // ─── TOOL: navigate_to ───
              else if (call.function.name === "navigate_to") {
                  let targetPage = args.page;
                  if (socket.scope === 'DEPARTMENT') {
                    const dept_id = socket.dept_id;
                    if (dept_id && targetPage && targetPage.startsWith('/') && !targetPage.includes(`/${dept_id}`) && !targetPage.startsWith('/admin')) {
                      targetPage = `${targetPage}/${dept_id}`;
                    }
                  }
                  socket.emit("copilot_ui_command", { 
                    command: "navigate_to", 
                    args: { page: targetPage } 
                  });
                  fnResponseData = { status: `Navigated to ${targetPage}` };
              } else {
                 socket.emit("copilot_ui_command", { 
                   command: call.function.name, 
                   args: args 
                 });
              }
              
              // Push the tool result back into the history
              messages.push({
                role: "tool",
                tool_call_id: call.id,
                content: JSON.stringify(fnResponseData)
              });
           }
           
           const finalStream = await groq.chat.completions.create({
             messages: messages,
             model: AI_MODEL,
             stream: true,
             tools: allowedTools,
             tool_choice: "auto"
           });
           
           let finalResponse = "";
           for await (const chunk of finalStream) {
             const content = chunk.choices[0]?.delta?.content || "";
             if (content) {
               finalResponse += content;
               socket.emit("copilot_stream", { text: content });
             }
           }
           messages.push({ role: "assistant", content: finalResponse });
        } else {
           if (aiResponse) messages.push({ role: "assistant", content: aiResponse });
        }
        
        socket.emit("copilot_stream_end");

      } catch (err) {
        console.error("Copilot Message Error:", err);
        socket.emit("copilot_stream", { text: `\n[AI Error: ${err.message}]` });
        socket.emit("copilot_stream_end");
      }
    });

    // Execute Confirmed Actions directly from UI bypass LLM
    socket.on("execute_copilot_action", async (data) => {
      const session = socket.request?.session;
      if (!session || (session.role !== 'department' && session.role !== 'admin')) {
        socket.emit("copilot_stream", { text: "⚠️ Unauthorized: Active department or admin session required." });
        socket.emit("copilot_stream_end");
        return;
      }

      const { action, args } = data;
      const dept_id = session.role === 'department' ? session.dept_id : (args?.dept_id || socket.dept_id);
      if (!dept_id) {
        socket.emit("copilot_stream", { text: "❌ Department context missing." });
        socket.emit("copilot_stream_end");
        return;
      }
      
      try {
        if (action === 'create_session') {
          const { sem, section } = args;
          let responseData;
          const reqMock = { 
            body: { session_id: `S${Date.now().toString().substring(5)}`, dept_id, sem, section },
            session: { role: session.role, dept_id, username: session.username }
          };
          const resMock = {
            json: (resData) => { responseData = { success: true, data: resData }; },
            status: (code) => ({ json: (resData) => { responseData = { success: false, code, data: resData }; } })
          };
          
          await createSession(reqMock, resMock);
          
          if (responseData.success) {
            socket.emit("copilot_stream", { text: `✅ Successfully created feedback session for Sem ${sem} Section ${section} in ${dept_id}.` });
          } else {
            socket.emit("copilot_stream", { text: `❌ Failed to create session: ${responseData.data.error || 'Unknown error'}` });
          }
          socket.emit("copilot_stream_end");
        } 
        else if (action === 'approve_faculty') {
          const { faculty_id } = args;
          const pending = await db('global_pending_faculty_registrations').where({ faculty_id, dept_id }).first();
          
          if (!pending) {
            socket.emit("copilot_stream", { text: `❌ Error: No pending registration found for ${faculty_id} in ${dept_id}.` });
            socket.emit("copilot_stream_end");
            return;
          }
          
          const defaultPassword = await bcrypt.hash("Fac@2007", 10);
          const trx = await db.transaction();
          try {
            await trx('global_faculty').insert({
              faculty_id: pending.faculty_id,
              name: pending.name,
              email: pending.email,
              dept_id: pending.dept_id,
              password: defaultPassword
            });
            await trx('global_directory')
              .insert({
                user_id: pending.email,
                role: 'faculty',
                dept_id: pending.dept_id
              })
              .onConflict('user_id')
              .ignore();
            await trx('global_pending_faculty_registrations').where({ id: pending.id }).del();
            await trx.commit();
            socket.emit("copilot_stream", { text: `✅ Successfully approved ${pending.name} in ${pending.dept_id}. Their account is now active.` });
          } catch (e) {
            await trx.rollback();
            socket.emit("copilot_stream", { text: `❌ Database error during approval: ${e.message}` });
          }
          socket.emit("copilot_stream_end");
        }
        else if (action === 'add_course') {
          const { course_name, course_code, sem } = args;
          const existing = await db('global_course').where({ course_code, dept_id }).first();
          if (existing) {
             socket.emit("copilot_stream", { text: `❌ Failed to add course: A course with code ${course_code} already exists in ${dept_id}.` });
             socket.emit("copilot_stream_end");
             return;
          }
          
          try {
             await db('global_course').insert({
               dept_id,
               course_name,
               course_code,
               sem,
               is_active: true
             });
             socket.emit("copilot_stream", { text: `✅ Successfully added course '${course_name}' (${course_code}) for Semester ${sem} in ${dept_id}.` });
          } catch (e) {
             socket.emit("copilot_stream", { text: `❌ Database error while adding course: ${e.message}` });
          }
          socket.emit("copilot_stream_end");
        }
      } catch (err) {
        console.error("Execute Action Error:", err);
        socket.emit("copilot_stream", { text: `\n[Execution Error: ${err.message}]` });
        socket.emit("copilot_stream_end");
      }
    });
  });
};

module.exports = { setupCopilotSocket };
