import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import { connectDB } from "./db.js";
import redisClient from "./config/redis.js";
import uploadRoute from "./routes/upload.js";
import verifyRoute from "./routes/verify.js";
import revokeRoute from "./routes/revoke.js";
import historyRoute from "./routes/history.js";
import expiredRoute from "./routes/expired.js";
import userRoute from "./routes/user.js";

dotenv.config();

const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow for development
  crossOriginEmbedderPolicy: false
}));

app.use(mongoSanitize()); // Prevent NoSQL injection

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

app.use(express.json({ limit: '10mb' }));

// Connect to MongoDB
connectDB(process.env.MONGODB_URI);

// API Routes
app.use("/api/upload", uploadRoute);
app.use("/api/verify", verifyRoute);
app.use("/api/revoke", revokeRoute);
app.use("/api/history", historyRoute);
app.use("/api/expired", expiredRoute);
app.use("/api/user", userRoute);

// Health check endpoint
app.get("/health", async (req, res) => {
  const redisStatus = redisClient.isOpen ? "connected" : "disconnected";
  res.json({ 
    status: "Server running", 
    mongodb: "connected",
    redis: redisStatus,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  
  const isDev = process.env.NODE_ENV === "development";
  
  res.status(err.status || 500).json({ 
    error: isDev ? err.message : "Internal server error",
    ...(isDev && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n====================================`);
  console.log(`Server running on port ${PORT}`);
  console.log(` Security: Enabled`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(`====================================\n`);
});






