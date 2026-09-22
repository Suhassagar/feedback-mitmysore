const Groq = require('groq-sdk');
const db = require('../config/db');
const { createSession } = require('./sessionController');
const bcrypt = require('bcrypt');

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
      description: "Navigate to a specific page in the department dashboard.",
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
              "/department-settings"
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
          search_query: { type: "string", description: "The name or ID of the faculty to search for." }
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
          faculty_id: { type: "string", description: "The ID of the faculty to analyze" }
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
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_top_performing_faculty",
      description: "Query the database to find the top performing faculty members in the department based on student feedback ratings. Use this when the user asks 'who has high ratings' or 'who are the best teachers'.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", description: "How many top faculties to return (default 5)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_department_report",
      description: "Query the database to generate a comprehensive CSV report of the department's faculty performance and trigger a file download for the user.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];

const systemInstruction = `
You are SAGAR, the elite autonomous administrative AI Copilot for the College Feedback System.
You speak professionally, concisely, and with confidence.
CRITICAL RULES:
1. You MUST ONLY use factual, private data retrieved from the college system. DO NOT hallucinate external data.
2. If you do not know the answer based on provided context, explicitly state "I do not have that data."
3. You are strictly a post-login productivity tool. You cannot log users in or out.
4. You have access to database tools (e.g., prepare_create_session). Use them instantly when requested. They will securely ask the user for confirmation before executing. DO NOT hallucinate tools.
5. BE PROACTIVE: If the user asks "how" to do something (like creating a session), DO NOT give them manual step-by-step UI instructions. Instead, say "I can do that for you right now. Please provide the [parameters needed]" and then execute the tool.
6. NO RAW URLS IN CHAT: Never type frontend navigation paths or URLs (like /manage-sessions) in your text responses to the user. However, you MUST still use the correct path strings when passing arguments to the \`navigate_to\` tool.
7. FACULTY PROFILES: If the user asks to view or open a specific faculty's profile, ALWAYS use the \`open_faculty_profile\` tool. Do not tell the user they have to click it manually.
`;

const setupCopilotSocket = (io) => {
  io.on("connection", (socket) => {
    let messages = []; // Track conversation history

    socket.on("init_copilot", async (data) => {
      const dept_id = socket.dept_id || data?.dept_id;
      if (!dept_id) return;

      const deptExists = await db('department').where({ dept_id, is_active: true }).first();
      if (!deptExists) {
        socket.emit("copilot_stream", { text: "⚠️ Department not found or inactive." });
        socket.emit("copilot_stream_end");
        return;
      }

      try {
        if (!process.env.GROQ_API_KEY) {
          socket.emit("copilot_stream", { text: `⚠️ SAGAR is offline: GROQ_API_KEY is missing from the server.` });
          socket.emit("copilot_stream_end");
          return;
        }
        
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
        messages = [
          { role: "system", content: systemInstruction }
        ];

        // Morning Briefing Context Fetching
        const pendingFacultyCount = await db('global_pending_faculty_registrations').where({ dept_id }).count('* as count').first();
        const activeSessionsCount = await db('global_sessions').where({ dept_id, status: 'active' }).count('* as count').first();

        const currentHour = new Date().getHours();
        let greeting = "Good evening";
        if (currentHour < 12) greeting = "Good morning";
        else if (currentHour < 17) greeting = "Good afternoon";

        const facultyList = await db('global_faculty').where({ dept_id }).select('name', 'faculty_id');
        const facultyContext = facultyList.map(f => `${f.name} (ID: ${f.faculty_id})`).join(', ');

        const contextMsg = `SYSTEM CONTEXT: I am currently logged in to department ${dept_id}. There are ${pendingFacultyCount.count} pending faculty and ${activeSessionsCount.count} active sessions. 
The faculty in this department are: ${facultyContext || 'None currently'}.
Give an extremely short, professional greeting starting with '${greeting}'. Limit to exactly 1 sentence. Do not list any statistics or pending tasks in the greeting. Simply say hello and ask how you can assist the department today.`;
        
        messages.push({ role: "user", content: contextMsg });

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
      if (!messages || messages.length === 0) return;
      
      let userMessageContent = data.message;
      if (data.location) {
        userMessageContent = `[SYSTEM CONTEXT: The user is currently viewing the page: ${data.location}]\n\n${data.message}`;
      }
      
      messages.push({ role: "user", content: userMessageContent });

      try {
        if (!process.env.GROQ_API_KEY) {
          socket.emit("copilot_stream", { text: `\n⚠️ SAGAR is offline: GROQ_API_KEY is missing.` });
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
        console.log("SAGAR Router Agent classified intent as:", intent);
        
        let activeTools = [];
        if (intent.includes("NAV")) {
          activeTools = copilotTools.filter(t => t.function.name === 'navigate_to' || t.function.name === 'open_faculty_profile');
        } else if (intent.includes("ANAL")) {
          activeTools = copilotTools.filter(t => ['analyze_faculty_feedback', 'get_top_performing_faculty', 'generate_chart', 'show_pending_faculty_list', 'generate_department_report'].includes(t.function.name));
        } else if (intent.includes("ACT")) {
          activeTools = copilotTools.filter(t => ['create_session_modal', 'approve_faculty', 'prepare_create_session', 'prepare_approve_faculty', 'prepare_add_course'].includes(t.function.name));
        } else {
          activeTools = copilotTools.filter(t => ['navigate_to', 'generate_chart'].includes(t.function.name));
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
            socket.emit("copilot_stream", { text: delta.content });
          }
          
          // Groq streams tool calls in chunks, we must assemble them
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

              if (call.function.name === "analyze_faculty_feedback") {
                 let { faculty_id } = args;
                 const dept_id = socket.dept_id;
                 
                 // Name vs ID Bug Fix
                 const resolvedFaculty = await db('global_faculty')
                    .where({ dept_id })
                    .andWhere(function() {
                        this.where('name', 'like', `%${faculty_id}%`)
                            .orWhere('faculty_id', 'like', `%${faculty_id}%`);
                    }).first();
                 
                 if (resolvedFaculty) {
                   faculty_id = resolvedFaculty.faculty_id;
                 } else {
                   fnResponseData = { status: `No faculty found matching '${args.faculty_id}' in department ${dept_id}.` };
                   socket.emit("copilot_message", { message: `[System]: I could not find a faculty matching '${args.faculty_id}'.` });
                   break;
                 }
                 
                 const feedback = await db('global_student_feedback').where({ faculty_id, dept_id }).avg('rating as avg_rating').count('* as total_reviews').first();
                 
                 // Remarks are tied to sessions, not directly to faculty_id in the schema.
                 const feedbackSessions = await db('global_student_feedback').where({ faculty_id, dept_id }).distinct('session_id');
                 const sessionIds = feedbackSessions.map(f => f.session_id);
                 
                 let remarks = [];
                 if (sessionIds.length > 0) {
                   remarks = await db('global_session_remarks')
                     .whereIn('session_id', sessionIds)
                     .andWhere({ dept_id })
                     .select('remark_text')
                     .limit(5);
                 }
                 
                 fnResponseData = { 
                   status: "Data retrieved successfully.",
                   data: {
                     faculty_id,
                     average_rating: feedback.avg_rating,
                     total_reviews: feedback.total_reviews,
                     recent_remarks: remarks.map(r => r.remark_text)
                   }
                 };
              } else if (call.function.name === "get_top_performing_faculty") {
                 const dept_id = socket.dept_id;
                 const limit = args.limit || 5;
                 
                 // Get all faculty in dept
                 const facultyList = await db('global_faculty').where({ dept_id }).select('faculty_id', 'name');
                 const facultyFeedback = [];
                 
                 for (const f of facultyList) {
                   const fb = await db('global_student_feedback').where({ faculty_id: f.faculty_id, dept_id }).avg('rating as avg_rating').count('* as total').first();
                   if (fb.total > 0) {
                     facultyFeedback.push({
                       faculty_id: f.faculty_id,
                       name: f.name,
                       average_rating: parseFloat(fb.avg_rating).toFixed(2),
                       total_reviews: fb.total
                     });
                   }
                 }
                 
                 // Sort descending
                 facultyFeedback.sort((a, b) => b.average_rating - a.average_rating);
                 
                 fnResponseData = {
                   status: "Top performing faculty retrieved.",
                   data: facultyFeedback.slice(0, limit)
                 };
              } else if (call.function.name === "show_pending_faculty_list") {
                 const dept_id = socket.dept_id;
                 const pending = await db('global_pending_faculty_registrations').where({ dept_id });
                 
                 if (pending.length === 0) {
                   fnResponseData = { status: "No pending faculty registrations found." };
                 } else {
                   socket.emit("copilot_ui_command", {
                     command: "show_action_list",
                     args: {
                       title: `Pending Faculty Registrations (${pending.length})`,
                       items: pending.map(f => ({
                         title: f.name,
                         subtitle: `${f.faculty_id} | ${f.email}`,
                         buttonText: "✅ Approve",
                         action: "approve_faculty",
                         args: { faculty_id: f.faculty_id }
                       }))
                     }
                   });
                   fnResponseData = { status: "Rendered pending faculty list UI card successfully." };
                 }
               } else if (call.function.name === "generate_department_report") {
                 const dept_id = socket.dept_id;
                 const facultyList = await db('global_faculty').where({ dept_id }).select('faculty_id', 'name', 'email');
                 let csvContent = "Faculty ID,Name,Email,Average Rating,Total Reviews\n";
                 
                 for (const f of facultyList) {
                   const fb = await db('global_student_feedback').where({ faculty_id: f.faculty_id, dept_id }).avg('rating as avg_rating').count('* as total').first();
                   const avg = fb.total > 0 ? parseFloat(fb.avg_rating).toFixed(2) : "N/A";
                   const total = fb.total || 0;
                   csvContent += `"${f.faculty_id}","${f.name}","${f.email}","${avg}","${total}"\n`;
                 }
                 
                 socket.emit("copilot_ui_command", {
                   command: "download_file",
                   args: {
                     filename: `${dept_id}_Faculty_Performance_Report.csv`,
                     content: csvContent,
                     type: "text/csv"
                   }
                 });
                 fnResponseData = { status: "CSV Report generated and sent to frontend for download." };
              } else if (call.function.name === "open_faculty_profile") {
                 const query = args.search_query;
                 const dept_id = socket.dept_id;
                 
                 const faculty = await db('global_faculty')
                    .where({ dept_id })
                    .andWhere(function() {
                        this.where('name', 'like', `%${query}%`)
                            .orWhere('faculty_id', 'like', `%${query}%`);
                    })
                    .first();

                 if (faculty) {
                    socket.emit("copilot_ui_command", { 
                      command: "navigate_to", 
                      args: { page: `/manage-faculty/${dept_id}?faculty_id=${faculty.faculty_id}` } 
                    });
                    fnResponseData = { status: `Found faculty ${faculty.name} (${faculty.faculty_id}) and navigated to their profile.` };
                 } else {
                    fnResponseData = { status: `No faculty found matching '${query}' in department ${dept_id}.` };
                 }
              } else if (call.function.name === "prepare_create_session") {
                 const { sem, section } = args;
                 const dept_id = socket.dept_id;
                 
                 // Perform validation BEFORE asking for confirmation
                 const existing = await db('global_sessions').where({ sem, section, dept_id, status: 'active' }).first();
                 if (existing) {
                    fnResponseData = { status: `Error: An active session for Sem ${sem} Section ${section} already exists.` };
                 } else {
                    const students = await db('global_students').where({ sem, section, dept_id }).count('* as count').first();
                    if (students.count === 0) {
                      fnResponseData = { status: `Error: No students are currently registered in Sem ${sem} Section ${section}.` };
                    } else {
                      socket.emit("copilot_ui_command", { 
                        command: "confirm_action", 
                        args: { 
                          title: `Are you sure you want to create a feedback session for Semester ${sem}, Section ${section}? (${students.count} students will be enrolled)`,
                          action: "create_session",
                          sem, section 
                        } 
                      });
                      fnResponseData = { status: `Validation passed. I have sent a confirmation card to the user.` };
                    }
                 }
              } else if (call.function.name === "prepare_approve_faculty") {
                 const { faculty_id } = args;
                 const dept_id = socket.dept_id;
                 
                 const pending = await db('global_pending_faculty_registrations').where({ faculty_id, dept_id }).first();
                 if (!pending) {
                    fnResponseData = { status: `Error: No pending registration found for faculty ID ${faculty_id} in your department.` };
                 } else {
                    socket.emit("copilot_ui_command", { 
                      command: "confirm_action", 
                      args: { 
                        title: `Are you sure you want to approve the registration for ${pending.name} (${pending.email})?`,
                        action: "approve_faculty",
                        faculty_id 
                      } 
                    });
                    fnResponseData = { status: `Validation passed. I have sent a confirmation card to the user.` };
                 }
              } else if (call.function.name === "prepare_add_course") {
                 const { course_name, course_code, sem } = args;
                 const dept_id = socket.dept_id;
                 
                 const existing = await db('global_course').where({ course_code, dept_id }).first();
                 if (existing) {
                    fnResponseData = { status: `Error: A course with code ${course_code} already exists.` };
                 } else {
                    socket.emit("copilot_ui_command", { 
                      command: "confirm_action", 
                      args: { 
                        title: `Are you sure you want to add the course '${course_name}' (${course_code}) for Semester ${sem}?`,
                        action: "add_course",
                        course_name,
                        course_code,
                        sem
                      } 
                    });
                    fnResponseData = { status: `Validation passed. I have sent a confirmation card to the user.` };
                 }
               } else if (call.function.name === "navigate_to") {
                  let targetPage = args.page;
                  const dept_id = socket.dept_id;
                  if (dept_id && targetPage && targetPage.startsWith('/') && !targetPage.includes(`/${dept_id}`)) {
                    targetPage = `${targetPage}/${dept_id}`;
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
             tools: copilotTools,
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
      const { action, args } = data;
      const dept_id = socket.dept_id;
      
      try {
        if (action === 'create_session') {
          const { sem, section } = args;
          let responseData;
          const reqMock = { 
            body: { session_id: `S${Date.now().toString().substring(5)}`, dept_id, sem, section },
            session: { role: 'department', dept_id }
          };
          const resMock = {
            json: (resData) => { responseData = { success: true, data: resData }; },
            status: (code) => ({ json: (resData) => { responseData = { success: false, code, data: resData }; } })
          };
          
          await createSession(reqMock, resMock);
          
          if (responseData.success) {
            socket.emit("copilot_stream", { text: `✅ Successfully created feedback session for Sem ${sem} Section ${section}.` });
          } else {
            socket.emit("copilot_stream", { text: `❌ Failed to create session: ${responseData.data.error || 'Unknown error'}` });
          }
          socket.emit("copilot_stream_end");
        } 
        else if (action === 'approve_faculty') {
          const { faculty_id } = args;
          const pending = await db('global_pending_faculty_registrations').where({ faculty_id, dept_id }).first();
          
          if (!pending) {
            socket.emit("copilot_stream", { text: `❌ Error: No pending registration found for ${faculty_id}.` });
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
            await trx('global_directory').insert({
              email: pending.email,
              password: defaultPassword,
              role: 'faculty',
              faculty_id: pending.faculty_id
            });
            await trx('global_pending_faculty_registrations').where({ id: pending.id }).del();
            await trx.commit();
            socket.emit("copilot_stream", { text: `✅ Successfully approved ${pending.name}. Their account is now active.` });
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
             socket.emit("copilot_stream", { text: `❌ Failed to add course: A course with code ${course_code} already exists.` });
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
             socket.emit("copilot_stream", { text: `✅ Successfully added course '${course_name}' (${course_code}) for Semester ${sem}.` });
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
// Trigger nodemon restart
