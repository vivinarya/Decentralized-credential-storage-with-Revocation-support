import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import { connectDB } from "./db.js";
import redisClient from "./config/redis.js";
import 'dotenv/config';

// Import did.js FIRST to check for errors
import didRoute from "./routes/did.js";

import uploadRoute from "./routes/upload.js";
import verifyRoute from "./routes/verify.js";
import revokeRoute from "./routes/revoke.js";
import historyRoute from "./routes/history.js";
import expiredRoute from "./routes/expired.js";
import userRoute from "./routes/user.js";
import adminRoutes from './routes/admin.js';


dotenv.config();

const app = express();

app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/admin', adminRoutes);

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production",
  crossOriginEmbedderPolicy: false
}));

app.use(mongoSanitize());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
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
app.use("/api/did", didRoute);
app.use("/api/upload", uploadRoute);
app.use("/api/verify", verifyRoute);
app.use("/api/revoke", revokeRoute);
app.use("/api/history", historyRoute);
app.use("/api/expired", expiredRoute);
app.use("/api/user", userRoute);

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}).catch(err => {
  console.error("Failed to connect to DB:", err);
  process.exit(1);
});








