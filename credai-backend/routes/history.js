import express from "express";
import Document from "../models/Document.js";
import { cacheMiddleware } from "../middleware/cache.js";

const router = express.Router();

// Cache for 60 seconds
router.get("/", cacheMiddleware(60), async (req, res, next) => {
  try {
    const history = await Document.find().sort({ timestamp: -1 }).limit(50);
    res.json({ history });
  } catch (error) {
    next(error);
  }
});

export default router;


