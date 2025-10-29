import express from "express";
import { ethers } from "ethers";
import Document from "../models/Document.js";

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { fileBuffer } = req.body;
    if (!fileBuffer) return res.status(400).json({ error: "fileBuffer missing" });

    const fileHash = ethers.keccak256(Buffer.from(fileBuffer, "base64"));

    const doc = await Document.findOne({ fileHash });
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const expirationDate = doc.expirationDate;
    const isExpired = expirationDate ? new Date(expirationDate) < new Date() : null;

    res.json({ expirationDate, isExpired });
  } catch (error) {
    next(error);
  }
});

export default router;


