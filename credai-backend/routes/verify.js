import express from "express";
import { ethers } from "ethers";
import { CONTRACT_ABI } from "../contractABI.js";
import Document from "../models/Document.js";
import redisClient from "../config/redis.js";

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { fileBuffer } = req.body;
    if (!fileBuffer) return res.status(400).json({ error: "fileBuffer missing" });

    const buf = Buffer.from(fileBuffer, "base64");
    const fileHash = ethers.keccak256(buf);

    // Check Redis cache first
    const cacheKey = `verify:${fileHash}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log("Verification cache HIT:", fileHash.slice(0, 10) + "...");
        return res.json(JSON.parse(cached));
      }
      console.log("Verification cache MISS:", fileHash.slice(0, 10) + "...");
    } catch (cacheError) {
      console.error("Cache read error:", cacheError);
    }

    // Check database
    const doc = await Document.findOne({ fileHash });

    // Check blockchain
    const provider = new ethers.JsonRpcProvider(process.env.NETWORK);
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    const [exists, uploader, expiration, expired, revoked] = await contract.verifyDocument(fileHash);

    const result = {
      verified: exists,
      blockchain: { 
        exists, 
        uploader, 
        expiration: expiration.toString(), 
        expired, 
        revoked 
      },
      database: doc ? {
        ipfsCid: doc.ipfsCid,
        uploader: doc.uploader,
        expirationDate: doc.expirationDate,
        revoked: doc.revoked,
        timestamp: doc.timestamp,
      } : null,
    };

    // Cache for 5 minutes (300 seconds)
    try {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(result));
      console.log("Verification cached for 5 minutes");
    } catch (cacheError) {
      console.error("Cache write error:", cacheError);
    }

    res.json(result);
  } catch (error) {
    console.error("Verification error:", error);
    next(error);
  }
});

export default router;

