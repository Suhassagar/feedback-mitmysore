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

const path = require("path");

const app = express();
app.set('trust proxy', 1); // Trust first proxy (needed for secure cookies behind a load balancer/reverse proxy)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://mitmysore.vercel.app",
  process.env.FRONTEND_URL
].filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // Strictly allow only verified MIT Mysore deployment subdomains, not arbitrary *.vercel.app
  if (/^https:\/\/mitmysore(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)) return true;
  if (/^https:\/\/feedback-mitmysore(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)) return true;
  return false;
};

// --- CORS setup ---
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
    credentials: true, // allow cookies
  })
);

// --- JSON parsing ---
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// --- Health / Ping Keep-Alive Endpoints ---
// Fast endpoints for Render keep-alive and external monitors (e.g. cron-job.org / UptimeRobot)
// Placed before express-session to bypass database session lookups entirely (<2ms response)
app.get("/ping", (req, res) => {
  res.status(200).json({ status: "alive", timestamp: new Date().toISOString() });
});

app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString() 
  });
});

app.get("/health/email", async (req, res) => {
  try {
    const { verifyEmailService } = require('./utils/emailService');
    const result = await verifyEmailService();
    res.status(result.success ? 200 : 500).json({
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: err.message
    });
  }
});

// --- Session setup ---
const sessionPool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "college_feedback_system",
  port: Number(process.env.DB_PORT) || 3306,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 30000
});

const sessionStore = new MySQLStore({
  createDatabaseTable: false,
  schema: {
    tableName: 'express_sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
}, sessionPool);

const sessionMiddleware = session({
  key: 'connect.sid',
  secret: env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: env.NODE_ENV === "production", 
    sameSite: env.NODE_ENV === "production" ? "none" : "lax"
  },
});

app.use(sessionMiddleware);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }
});

app.set('io', io);

// Bind express-session with Socket.IO so socket.request.session is populated
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Global State Trackers
const activeTabs = {}; 
const disconnectTimeouts = {};

setupCopilotSocket(io);

io.on("connection", (socket) => {
  const session = socket.request?.session;
  console.log("WebSocket client connected:", socket.id, "Session user:", session?.username || session?.usn || "anonymous");

  socket.on("register_dashboard", (data) => {
    const session = socket.request?.session;
    if (!session || !session.role) {
      console.warn(`[SOCKET] Blocked unauthenticated register_dashboard from ${socket.id}`);
      return;
    }

    let dept_id = data?.dept_id;
    if (session.role === 'department') {
      dept_id = session.dept_id;
    } else if (session.role !== 'admin') {
      console.warn(`[SOCKET] Unauthorized role ${session.role} attempted register_dashboard`);
      return;
    }

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
    }
    console.log("WebSocket client disconnected:", socket.id);
  });
});

// --- Basic route ---
app.get("/", (req, res) => res.send("Server is running!"));

// --- Routes (Knex Refactored) ---
const { apiLimiter } = require('./middleware/rateLimiter');
app.use(apiLimiter); // Apply general rate limit to all API routes

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
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Self-ping to keep Render free tier awake if deployed or configured
    const targetUrl = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL;
    if (targetUrl) {
      const intervalMinutes = 10;
      const intervalMs = intervalMinutes * 60 * 1000;
      const httpLib = targetUrl.startsWith("https") ? require("https") : require("http");

      setInterval(() => {
        httpLib.get(`${targetUrl}/ping`, (res) => {
          console.log(`[Keep-Alive] Self-ping to ${targetUrl}/ping succeeded (status: ${res.statusCode})`);
        }).on("error", (err) => {
          console.warn(`[Keep-Alive] Self-ping warning: ${err.message}`);
        });
      }, intervalMs);

      console.log(`[Keep-Alive] Configured keep-alive pinger for ${targetUrl}/ping every ${intervalMinutes} minutes.`);
    }
  });
}

module.exports = { app, server };
