require("dotenv").config();
const env = require("./config/env"); // Strict environment validation
const express = require("express");
const mysql = require("mysql2/promise");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const cors = require("cors");
const bcrypt = require("bcrypt");
const helmet = require("helmet");
const http = require("http");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');
const { setupCopilotSocket } = require('./controllers/copilotController');

const crypto = require("crypto");

// --- Encryption Helpers ---
const ENCRYPTION_KEY = crypto.scryptSync(env.SESSION_SECRET, 'salt', 32); // Must be 256 bits (32 bytes)
const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text) {
  if (!text) return text;
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return text;
  let textParts = text.split(':');
  if (textParts.length !== 2) return text; // Probably not encrypted (e.g. legacy data)
  try {
    let iv = Buffer.from(textParts[0], 'hex');
    let encryptedText = Buffer.from(textParts[1], 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error("Decryption failed:", err.message);
    return "[Encrypted Message - Decryption Failed]";
  }
}

const app = express();
app.use(helmet());
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL
].filter(Boolean);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }
});

// --- Security: Rate Limiting ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: { success: false, message: "Too many login attempts from this IP, please try again after 15 minutes." }
});

// Global State Trackers
const activeTabs = {}; 
const disconnectTimeouts = {};

setupCopilotSocket(io);

io.on("connection", (socket) => {
  console.log("WebSocket client connected:", socket.id);

  socket.on("register_dashboard", (data) => {
    const dept_id = data.dept_id;
    if (!dept_id) return;
    
    socket.dept_id = dept_id;
    activeTabs[dept_id] = (activeTabs[dept_id] || 0) + 1;
    
    if (disconnectTimeouts[dept_id]) {
      clearTimeout(disconnectTimeouts[dept_id]);
      delete disconnectTimeouts[dept_id];
      console.log(`[AUTH] Disconnect timer canceled for ${dept_id} (Reconnected)`);
    }
  });

  socket.on("disconnect", () => {
    const dept_id = socket.dept_id;
    if (dept_id) {
      activeTabs[dept_id] = Math.max(0, activeTabs[dept_id] - 1);
      
      if (activeTabs[dept_id] === 0) {
        // [DEVELOPMENT MODE] Disabled 3-second lockdown timer to prevent annoyances during hot-reloads
        console.log(`[AUTH] Tab count for ${dept_id} is 0. (Logout timer disabled for development)`);
        
        /* 
        disconnectTimeouts[dept_id] = setTimeout(async () => {
           console.log(`[AUTH] 3 seconds expired. Logging out ${dept_id}.`);
           
           const dummyReq = {
             headers: socket.request.headers || {},
             socket: { remoteAddress: socket.request.connection?.remoteAddress },
             ip: socket.request.connection?.remoteAddress
           };

           if (typeof logActivity === 'function') {
               await logActivity(dummyReq, dept_id, 'LOGOUT', 'AUTH', 'Logged out (Browser Closed/Disconnected)');
           }
           
        }, 3000); 
        */
      }
    }
    console.log("WebSocket client disconnected:", socket.id);
  });
});

// --- CORS setup ---
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
    credentials: true, // allow cookies
  })
);

// --- JSON parsing ---
app.use(express.json());

// --- Session setup ---
app.set('trust proxy', 1); // Trust first proxy (needed for secure cookies behind a load balancer/reverse proxy)

const dbOptions = {
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "college_feedback_system",
  port: Number(process.env.DB_PORT) || 3306,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  createDatabaseTable: true,
  schema: {
    tableName: 'express_sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
};
const sessionStore = new MySQLStore(dbOptions);

app.use(
  session({
    key: 'connect.sid',
    secret: env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: env.NODE_ENV === "production", 
      sameSite: env.NODE_ENV === "production" ? "none" : "lax"
    },
  })
);

// --- Basic route ---
app.get("/", (req, res) => res.send("Server is running!"));

// --- Routes (Knex Refactored) ---
app.use('/auth', require('./routes/authRoutes'));
app.use('/faculty', require('./routes/facultyRoutes'));
app.use('/', require('./routes/studentRoutes'));
app.use('/', require('./routes/courseRoutes'));
app.use('/', require('./routes/sessionRoutes'));
app.use('/', require('./routes/feedbackRoutes'));
app.use('/', require('./routes/analyticsRoutes'));
app.use('/', require('./routes/adminRoutes'));
app.use('/', require('./routes/systemRoutes'));
app.use('/', require('./routes/remarksRoutes'));

// --- Global Error Handlers ---
// 1. Catch 404 (Route Not Found)
app.use(notFoundHandler);
// 2. Catch all other unhandled errors (500)
app.use(errorHandler);

const PORT = process.env.PORT || 8081;
if (require.main === module) {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = { app, server };
