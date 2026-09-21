# MIT Mysore — Student Feedback Management System
## Master Project Context & AI Handover Guide

> **Note for newly installed Antigravity AI:**  
> This file contains the complete architectural, operational, and deployment context for this project. Read this file completely to immediately understand the entire codebase, live hosting, database schemas, active credentials, and developer workflow rules.

---

### 1. Project Overview & Business Logic
* **Institution**: Maharaja Institute of Technology Mysore (MITM).
* **Application**: Real-time Student Feedback & Analytics Platform.
* **Core User Roles**:
  1. **Administrator**: Full system authority, department management, global analytics, audit logs.
  2. **Department (HOD)**: Manages faculty, subjects, student rosters, initiates feedback sessions, views AI analytics & remarks.
  3. **Faculty**: Views personal ratings, assigned courses, student feedback distribution, and performance metrics.
  4. **Student**: Anonymous feedback submission for assigned course faculty using one-time secure session tokens.
  5. **AI Assistant ("SAGAR")**: Intelligent Copilot providing automated remarks analysis, department summaries, and dashboard navigation.

---

### 2. Live Production Infrastructure

| Component | Platform | Live URL / Endpoint | Details |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** | `https://mitmysore.vercel.app`<br>`https://feedback-mitmysore.vercel.app` | Built from `feedback-system/` directory with Vite + React. |
| **Backend API** | **Render** | `https://mit-feedback-api.onrender.com` | Web Service built from `backend/` directory with Node.js/Express. |
| **Database** | **TiDB Cloud** | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000` | Serverless MySQL-compatible cloud database (`college_feedback_system`), SSL enabled. |
| **Media CDN** | **Cloudinary** | Cloud Name: `dep3ok4l` | College logo, faculty avatars, image attachments. |
| **Email SMTP** | **Gmail** | `feedback.mitmysore@gmail.com` | Automated session links, token delivery, faculty notifications. |
| **AI LLM** | **Groq** | `qwen/qwen3.8-27b` | Fast streaming, function/tool calling, remarks analysis. |

---

### 3. Repository & Version Control Rules

* **GitHub Remote**: `https://github.com/Suhassagar/feedback-mitmysore.git`
* **Active Branches**:
  * `main`: Local development and active feature enhancements.
  * `prod`: Production branch tracked by Vercel and Render.
* ⚠️ **STRICT USER RULE**:
  * **NEVER push code to GitHub automatically.**
  * Only stage, commit, and push when the user explicitly instructs: *"Push the code to GitHub"*.
  * All development, testing, and debugging must be done **locally first**.

---

### 4. Codebase Architecture

```
d:\college_feedback_system
├── backend/                             # Express.js REST & Socket.IO API
│   ├── config/
│   │   ├── db.js                        # Knex query builder with cloud keep-alive & pool resilience
│   │   └── env.js                       # Zod environment variable validation
│   ├── controllers/
│   │   ├── adminController.js           # Admin dashboard, audit logs, global actions
│   │   ├── analyticsController.js       # Rating score aggregations & department charts
│   │   ├── authController.js            # Admin, Department, Faculty, and Student authentication
│   │   ├── copilotController.js         # SAGAR AI Assistant with Groq streaming & tool execution
│   │   ├── courseController.js          # Course management & faculty-course assignment
│   │   ├── facultyController.js         # Faculty profiles & registration approvals
│   │   ├── feedbackController.js        # Feedback submission & anti-tamper token verification
│   │   ├── remarksController.js         # AI executive summary of qualitative student remarks
│   │   ├── sessionController.js         # Feedback session lifecycle & batched email distribution
│   │   ├── studentController.js         # Student roster & CSV/Excel bulk upload
│   │   └── systemController.js          # Department CRUD & course catalog
│   ├── middleware/
│   │   ├── authMiddleware.js            # Role-based route protection (Admin, Dept, Faculty)
│   │   └── errorMiddleware.js           # 404 and global 500 error handlers
│   ├── routes/                          # Express route definitions
│   ├── utils/
│   │   ├── emailService.js              # HTML email templates with dynamic FRONTEND_URL
│   │   └── logger.js                    # Database audit trail (IP address sanitization)
│   ├── .env                             # Local development environment (uses 127.0.0.1 MySQL)
│   ├── .env.production                  # Production credentials (uses TiDB Cloud)
│   └── server.js                        # Application entry point, CORS, Socket.IO, express-session
│
├── feedback-system/                     # React Single Page Application (Vite)
│   ├── src/
│   │   ├── components/                  # Navbar, Modals, AdminLayout, CopilotChat, Charts
│   │   ├── context/                     # AuthContext, ThemeContext
│   │   ├── hooks/                       # Custom hooks (useFaculties, useSessions, useAnalytics)
│   │   ├── pages/                       # All route pages (HomePortal, Dashboards, FeedbackForm)
│   │   ├── services/
│   │   │   ├── apiClient.js             # Axios instance with credentials & dynamic baseURL
│   │   │   └── socket.js                # Socket.IO client connection
│   │   ├── App.jsx                      # React Router route registry
│   │   └── main.jsx                     # Application root mounting
│   ├── .env.production                  # VITE_API_URL=https://mit-feedback-api.onrender.com
│   └── vercel.json                      # Vercel SPA rewrite rules
│
├── production_database_setup.sql        # Database schema reference script
└── PROJECT_HANDOVER_GUIDE.md            # This master handover file
```

---

### 5. Database Schema & Key Tables

1. **`admin`**: System administrators (`id`, `username`, `password` bcrypt hash).
2. **`department`**: Department entities (`dept_id`, `dept_name`, `username`, `password`, `is_active`, `ai_summary`).
3. **`global_students`**: Enrolled students (`usn` PK, `name`, `email`, `sem`, `section`, `dept_id`, `active_session_id`, `status`).
4. **`global_faculty`**: Faculty members (`faculty_id` PK, `name`, `email`, `dept_id`).
5. **`global_course`**: Academic subjects (`course_code` PK, `course_name`, `sem`, `dept_id`).
6. **`global_assign`**: Faculty assignments to course, semester, section, and academic year.
7. **`global_sessions`**: Feedback sessions (`session_id` PK, `dept_id`, `sem`, `section`, `academic_year`, `status`).
8. **`global_feedback_questions`**: Evaluation questions across categories (Teaching Effectiveness, Interaction, etc.).
9. **`global_student_feedback`**: Individual ratings (scale 1–5) and remarks linked to session, student USN, and faculty.
10. **`global_used_tokens`**: One-time submission security tokens ensuring a student can only submit once.
11. **`global_department_activity_logs`**: System audit trail capturing action type, entity, IP address, and timestamp.
12. **`express_sessions`**: Persistent server sessions stored in MySQL via `express-mysql-session`.

---

### 6. Critical Operational & Auth Rules

* **Admin Login**:
  * Username: `admin` or `admin@mit`
  * Default Password: `admin123`
* **Department Login**:
  * Form requires **Username / Email** (e.g., `cse@mit` or `ece@mit`), **NOT** department code (`CSE` or `ECE`).
  * Default Password: `Dept@123`
* **AI Model Selection**:
  * Always use **`qwen/qwen3.8-27b`** for Groq completions.
  * Do NOT use `llama-3.3-70b-versatile` (returns 404 model_not_found on this API key).
* **Question Seeding Policy**:
  * Default question auto-seeding on department creation has been **disabled** per user preference. Newly created departments start with 0 questions so they can be customized.
* **Database Connection Resilience**:
  * In `config/db.js`, Knex is configured with `enableKeepAlive: true`, `connectTimeout: 30000`, and `min: 0, max: 25`.
  * `getDepartments` in `systemController.js` includes auto-retry to withstand serverless cloud cold starts.

---

### 7. Local Development Commands

To run the full stack locally:
```powershell
# 1. Start Local Backend Server (Port 8081)
cd d:\college_feedback_system\backend
npm start

# 2. Start Local Frontend Dev Server (Port 5173)
cd d:\college_feedback_system\feedback-system
npm run dev
```
Local test URL: **`http://localhost:5173/`**
