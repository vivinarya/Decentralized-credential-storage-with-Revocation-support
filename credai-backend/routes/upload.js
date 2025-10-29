import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { ethers } from "ethers";
import { body, validationResult } from "express-validator";
import { CONTRACT_ABI } from "../contractABI.js";
import Document from "../models/Document.js";
import { clearCache } from "../middleware/cache.js";

const router = express.Router();

// Configure multer with file size limit
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  }
});

router.post(
  "/",
  upload.single("file"),
  [
    body("uploader")
      .isString()
      .trim()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage("Invalid Ethereum address"),
    body("expirationTimestamp")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Invalid expiration timestamp")
  ],
  async (req, res, next) => {
    try {
      // Validate inputs
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({ error: "File is required" });
      }

      const { expirationTimestamp, uploader } = req.body;

      // Prepare FormData for Pinata
      const data = new FormData();
      data.append("file", req.file.buffer, req.file.originalname);

      // Upload to Pinata IPFS
      const pinRes = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        data,
        {
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          headers: {
            ...data.getHeaders(),
            pinata_api_key: process.env.PINATA_API_KEY,
            pinata_secret_api_key: process.env.PINATA_API_SECRET,
          },
        }
      );

      const ipfsCid = pinRes.data.IpfsHash;
      const fileHash = ethers.keccak256(req.file.buffer);

      // Check if document already exists
      const existingDoc = await Document.findOne({ fileHash });
      if (existingDoc) {
        return res.status(409).json({ 
          error: "Document already exists",
          fileHash,
          ipfsCid: existingDoc.ipfsCid
        });
      }

      // Save to MongoDB
      const expirationDate = expirationTimestamp
        ? new Date(parseInt(expirationTimestamp) * 1000)
        : null;

      const doc = new Document({
        fileHash,
        ipfsCid,
        uploader: uploader.toLowerCase(),
        expirationDate,
      });

      await doc.save();
      console.log("Document saved to DB:", fileHash.slice(0, 10) + "...");

      // Register on blockchain
      const provider = new ethers.JsonRpcProvider(process.env.NETWORK);
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      const contract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        CONTRACT_ABI,
        wallet
      );

      const expirationTimestampInt = parseInt(expirationTimestamp) || 0;
      const tx = await contract.registerDocument(fileHash, expirationTimestampInt);
      await tx.wait();
      console.log("Document registered on blockchain:", tx.hash);

      // Clear history cache
      await clearCache("cache:/api/history*");

      res.json({ 
        success: true, 
        ipfsCid, 
        fileHash, 
        transactionHash: tx.hash,
        document: {
          fileHash: doc.fileHash,
          ipfsCid: doc.ipfsCid,
          uploader: doc.uploader,
          expirationDate: doc.expirationDate,
          timestamp: doc.timestamp
        }
      });
    } catch (error) {
      console.error("Upload error:", error);
      
      if (error.name === "ValidationError") {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
);

export default router;





