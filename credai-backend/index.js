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

// Use a reasonable JSON body size limit to avoid DoS with large base64 payloads
app.use(express.json({ limit: "4mb" })); // adjust as needed
app.use(express.urlencoded({ extended: true }));

// Security Middleware
app.use(helmet({
  // Enable CSP in production, allow disabled in development for quick iteration
  contentSecurityPolicy: process.env.NODE_ENV === "production",
  crossOriginEmbedderPolicy: false
}));

app.use(mongoSanitize()); // Prevent NoSQL injection

// Rate limiter — apply to all API routes; tune limits to your needs
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", apiLimiter);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
if (!process.env.FRONTEND_URL && process.env.NODE_ENV === "production") {
  console.warn("FRONTEND_URL not set in production — review CORS configuration.");
}

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"]
}));

// Routes
app.use("/api/upload", uploadRoute);
app.use("/api/verify", verifyRoute);
app.use("/api/revoke", revokeRoute);
app.use("/api/history", historyRoute);
app.use("/api/expired", expiredRoute);
app.use("/api/user", userRoute);

// TODO: error handling middleware, logging, health check endpoints, etc.

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}).catch(err => {
  console.error("Failed to connect to DB:", err);
  process.exit(1);
});






