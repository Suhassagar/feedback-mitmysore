const { z } = require("zod");

// Define the comprehensive schema of required and optional environment variables
const envSchema = z.object({
  PORT: z.string().optional().default("8081"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters long for security."),
  ENCRYPTION_SECRET: z.string().min(16, "ENCRYPTION_SECRET must be at least 16 characters long.").optional(),
  GROQ_API_KEY: z.string().optional().describe("Used for AI Remarks and Copilot."),
  GEMINI_API_KEY: z.string().optional().describe("Legacy AI key."),
  BACKEND_URL: z.string().optional(),
  RENDER_EXTERNAL_URL: z.string().optional(),
  FRONTEND_URL: z.string().optional(),
  
  // Database configuration
  DB_HOST: z.string().optional().default("127.0.0.1"),
  DB_PORT: z.string().regex(/^\d+$/, "DB_PORT must be a valid port number").optional().default("3306"),
  DB_USER: z.string().optional().default("root"),
  DB_PASSWORD: z.string().optional().default(""),
  DB_NAME: z.string().optional().default("college_feedback_system"),
  DB_SSL: z.enum(["true", "false"]).optional().default("false"),
  DB_SSL_REJECT_UNAUTHORIZED: z.enum(["true", "false"]).optional().default("true"),
  DB_CA_CERT: z.string().optional().describe("Optional PEM/CA Certificate content for SSL database connection"),
  ADDITIONAL_ALLOWED_ORIGINS: z.string().optional().describe("Comma-separated list of additional approved CORS origins"),

  // Cloudinary configuration
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Email notifications
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === "production") {
    if (!data.DB_PASSWORD) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DB_PASSWORD"],
        message: "DB_PASSWORD is required in production and cannot be empty.",
      });
    }

    if (data.SESSION_SECRET && data.SESSION_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SESSION_SECRET"],
        message: "SESSION_SECRET must be at least 32 characters in production.",
      });
    }

    // Insecure placeholder detection
    const insecurePlaceholders = [
      "your_32_plus_character_secure_session_secret_hex",
      "your_32_plus_character_secure_field_encryption_secret_hex",
      "default_secret",
      "change_me",
      "secret123",
      "supersecret",
      "password123",
      "12345678901234567890123456789012"
    ];

    if (data.SESSION_SECRET && insecurePlaceholders.some(p => data.SESSION_SECRET.toLowerCase().includes(p.toLowerCase()))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SESSION_SECRET"],
        message: "SESSION_SECRET is using an insecure placeholder default value. Generate a cryptographically secure random secret.",
      });
    }

    if (data.ENCRYPTION_SECRET) {
      if (data.ENCRYPTION_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ENCRYPTION_SECRET"],
          message: "ENCRYPTION_SECRET must be at least 32 characters in production.",
        });
      }
      if (insecurePlaceholders.some(p => data.ENCRYPTION_SECRET.toLowerCase().includes(p.toLowerCase()))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ENCRYPTION_SECRET"],
          message: "ENCRYPTION_SECRET is using an insecure placeholder default value.",
        });
      }
    }

    // HTTPS enforcement for production URLs
    if (data.FRONTEND_URL && !data.FRONTEND_URL.startsWith("https://")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["FRONTEND_URL"],
        message: "FRONTEND_URL must use https:// in production.",
      });
    }

    if (data.BACKEND_URL && !data.BACKEND_URL.startsWith("https://")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["BACKEND_URL"],
        message: "BACKEND_URL must use https:// in production.",
      });
    }
  }
});

// Validate the current process.env
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ [FATAL CONFIG ERROR]: Invalid Environment Variables!");
  console.error("Please verify your environment configuration (.env or Cloud environment settings).");
  
  // Print exactly which variables are missing or incorrectly formatted
  _env.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  
  process.exit(1); // Hard crash before the server can start
}

// Export the validated environment variables so they can be safely used throughout the app
module.exports = _env.data;
