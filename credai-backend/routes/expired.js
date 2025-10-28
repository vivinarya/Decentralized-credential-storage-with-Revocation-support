import express from "express";
import tesseractService from "../services/tesseractService.js";

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { fileBase64 } = req.body;
    if (!fileBase64) return res.status(400).json({ error: "fileBase64 missing" });

    const expirationDate = await tesseractService.getExpiration(fileBase64);
    const isExpired = expirationDate ? (new Date(expirationDate) < new Date()) : null;

    res.json({ expirationDate, isExpired });
  } catch (error) {
    next(error);
  }
});

export default router;

