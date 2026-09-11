const { z } = require("zod");

// Define the exact schema of required and optional environment variables
const envSchema = z.object({
  PORT: z.string().optional().default("8081"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters long for security."),
  GEMINI_API_KEY: z.string().optional().describe("Used for AI Remarks. If missing, AI features will be disabled."),
  // Add database vars if they were in .env, but right now they are hardcoded in db.js,
  // so we'll just validate the crucial secrets here.
});

// Validate the current process.env
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ [FATAL ERROR]: Invalid Environment Variables!");
  console.error("Please check your .env file.");
  
  // Print exactly which variables are missing or incorrectly formatted
  _env.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path[0]}: ${issue.message}`);
  });
  
  process.exit(1); // Hard crash before the server can start
}

// Export the validated environment variables so they can be safely used throughout the app
module.exports = _env.data;
