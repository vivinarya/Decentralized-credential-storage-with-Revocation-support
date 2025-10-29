import express from "express";
import { ethers } from "ethers";
import { CONTRACT_ABI } from "../contractABI.js";
import Document from "../models/Document.js";
import { clearCache } from "../middleware/cache.js";

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { fileHash } = req.body;
    if (!fileHash) return res.status(400).json({ error: "fileHash missing" });
    if (typeof fileHash !== "string") return res.status(400).json({ error: "fileHash must be a string" });

    const doc = await Document.findOne({ fileHash: { $eq: fileHash } });
    if (!doc) {
      return res.status(404).json({ error: "Document not found in database" });
    }

    doc.revoked = true;
    await doc.save();
    console.log("Document revoked in DB:", fileHash);


    const provider = new ethers.JsonRpcProvider(process.env.NETWORK);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    const tx = await contract.revokeDocument(fileHash);
    await tx.wait();
    console.log("Document revoked on blockchain:", fileHash);

    await clearCache("cache:/api/history*");
    await clearCache(`verify:${fileHash}`);
    console.log("Cache cleared after revocation");

    res.json({ 
      success: true, 
      message: "Document revoked in DB and blockchain",
      transactionHash: tx.hash
    });
  } catch (error) {
    console.error("Revocation error:", error);
    next(error);
  }
});

export default router;




