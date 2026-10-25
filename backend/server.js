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

const path = require("path");

const app = express();
app.disable('x-powered-by'); // Suppress Express server banner
app.set('trust proxy', 1); // Trust first proxy (needed for secure cookies behind a load balancer/reverse proxy)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: { action: "sameorigin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xContentTypeOptions: true,
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  }
}));

const isProduction = process.env.NODE_ENV === 'production';

const parseAdditionalOrigins = () => {
  if (!process.env.ADDITIONAL_ALLOWED_ORIGINS) return [];
  return process.env.ADDITIONAL_ALLOWED_ORIGINS
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
};

const allowedOrigins = [
  // Only permit local development origins when NOT in production
  ...(!isProduction ? ["http://localhost:5173", "http://127.0.0.1:5173"] : []),
  "https://mitmysore.vercel.app",
  process.env.FRONTEND_URL,
  ...parseAdditionalOrigins()
].filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Server-to-server or non-browser tools (e.g. curl/uptime monitors)
  if (allowedOrigins.includes(origin)) return true;
  // Permit arbitrary localhost ports strictly in development/test
  if (!isProduction && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true;
  }
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

// --- JSON & URL-encoded parsing (bounded to prevent DoS memory bloat) ---
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  }
}));

const { emailHealthLimiter } = require('./middleware/rateLimiter');

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

app.get("/health/email", emailHealthLimiter, async (req, res) => {
  try {
    const { verifyEmailService } = require('./utils/emailService');
    const result = await verifyEmailService();
    // Return safe operational status without exposing the raw institutional Gmail address
    res.status(result.success ? 200 : 500).json({
      status: result.success ? "healthy" : "degraded",
      service: "smtp",
      configured: result.configured !== false,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: "unhealthy",
      service: "smtp",
      configured: false,
      timestamp: new Date().toISOString()
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
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    ca: process.env.DB_CA_CERT || undefined
  } : undefined,
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
  rolling: true,
  cookie: { 
    httpOnly: true,
    secure: env.NODE_ENV === "production", 
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 4 * 60 * 60 * 1000 // 4 hours inactivity timeout
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

// --- Anti-Caching Security Middleware for Sensitive Endpoints ---
// Prevents sensitive student rosters, faculty ratings, notes, and session tokens from being cached in browser history or shared proxy caches
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

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

// --- Process Lifecycle & Graceful Shutdown ---
const db = require("./config/db");

const gracefulShutdown = (signal) => {
  console.log(`[SYSTEM] Received ${signal}. Initiating graceful shutdown...`);
  server.close(async () => {
    console.log('[SYSTEM] HTTP and WebSocket listeners closed.');
    try {
      if (sessionPool && typeof sessionPool.end === 'function') {
        await sessionPool.end();
        console.log('[SYSTEM] Session database connection pool drained.');
      }
      if (db && typeof db.destroy === 'function') {
        await db.destroy();
        console.log('[SYSTEM] Knex database connection pool closed.');
      }
      process.exit(0);
    } catch (err) {
      console.error('[SYSTEM] Error during database shutdown:', err.message);
      process.exit(1);
    }
  });

  // Force termination after 10 seconds if connections fail to drain
  setTimeout(() => {
    console.error('[SYSTEM] Graceful shutdown timeout (10s) exceeded. Forcing termination.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[CRITICAL] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

module.exports = { app, server };
