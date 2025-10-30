import express from "express";
import multer from "multer";
import { body, validationResult } from "express-validator";
import axios from "axios";
import _ from "lodash";
import { ethers } from "ethers";
import Document from "../models/Document.js";
import Issuer from "../models/Issuer.js";
import vcService from "../services/vcService.js";
import { CONTRACT_ABI } from "../contractABI.js";
import { clearCache } from "../middleware/cache.js";

const router = express.Router();

// Validate Pinata credentials at startup
if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
  throw new Error('Pinata API credentials not configured in environment variables');
}

// Configure multer with file size limit to prevent memory exhaustion
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Optional: Add file type validation
    cb(null, true);
  }
});

/**
 * POST /api/upload
 * Upload a document with optional DID & VC
 */
router.post(
  "/",
  upload.single("file"),
  [
    body("uploader")
      .isString()
      .trim()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage("Invalid Ethereum address"),
    body("issuerDID")
      .optional()
      .matches(/^did:ethr:maticamoy:0x[a-fA-F0-9]{40}(:\d+)?$/i)
      .withMessage("Invalid DID format"),
    body("expirationTimestamp")
      .optional()
      .isInt({ min: 0 })
      .custom((value) => {
        if (value > 0 && value < Math.floor(Date.now() / 1000)) {
          throw new Error('Expiration timestamp must be in the future');
        }
        return true;
      })
      .withMessage("Invalid expiration timestamp"),
    body("docType")
      .optional()
      .isString()
      .trim()
      .isIn(['general', 'passport', 'certificate', 'test-document', 'other'])
      .withMessage("Invalid document type")
  ],
  async (req, res, next) => {
    let savedDoc = null;

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({ error: "File is required" });
      }

      const { expirationTimestamp, uploader, issuerDID, docType } = req.body;

      console.log('📤 Upload request:', {
        fileName: req.file.originalname,
        fileSize: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
        issuerDID: issuerDID || 'none',
        uploader: uploader.slice(0, 6) + '...'
      });

      // Prepare FormData for Pinata
      console.log('Uploading to IPFS...');
      const data = new FormData();

      // Convert buffer to Blob for FormData compatibility
      const fileBlob = new Blob([req.file.buffer], { 
        type: req.file.mimetype || 'application/octet-stream' 
      });
      data.append("file", fileBlob, req.file.originalname);

      // Upload to Pinata IPFS with timeout and size limits
      const pinRes = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        data,
        {
          timeout: 60000, // 60 second timeout
          maxContentLength: MAX_FILE_SIZE,
          maxBodyLength: MAX_FILE_SIZE,
          headers: {
            "Content-Type": "multipart/form-data",
            pinata_api_key: process.env.PINATA_API_KEY,
            pinata_secret_api_key: process.env.PINATA_API_SECRET,
          },
        }
      );

      const ipfsCid = pinRes.data.IpfsHash;
      const fileHash = ethers.keccak256(req.file.buffer);

      console.log('IPFS uploaded:', ipfsCid.slice(0, 10) + '...');
      console.log('File hash:', fileHash.slice(0, 10) + '...');

      // Setup blockchain connection
      const provider = new ethers.JsonRpcProvider(process.env.NETWORK);
      const contract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );

      // Check blockchain first for existing document
      console.log('Checking blockchain for existing document...');
      try {
        const verification = await contract.verifyDocument(fileHash);
        if (verification.exists) {
          console.log('Document already exists on blockchain');
          return res.status(409).json({ 
            error: "Document already registered on blockchain",
            fileHash 
          });
        }
      } catch (checkError) {
        console.warn(' Blockchain check failed (continuing):', checkError.message);
        // Continue even if check fails (network issues etc)
      }

      // Check if document already exists in MongoDB
      const existingDoc = await Document.findOne({ fileHash });
      if (existingDoc) {
        console.log(' Document already exists in database');
        return res.status(409).json({ 
          error: "Document already exists in database",
          fileHash,
          ipfsCid: existingDoc.ipfsCid
        });
      }

      const expirationDate = expirationTimestamp
        ? new Date(parseInt(expirationTimestamp) * 1000)
        : null;

      // Get issuer info if DID provided
      let issuerInfo = null;
      let verifiableCredential = null;
      
      if (issuerDID) {
        console.log(' Looking up issuer with DID:', issuerDID);
        
        // Case-insensitive DID lookup
        issuerInfo = await Issuer.findOne({ 
          did: { $regex: new RegExp(`^${_.escapeRegExp(issuerDID)}$`, 'i') } 
        });
        
        if (!issuerInfo) {
          console.log('Issuer not found for DID:', issuerDID);
          return res.status(404).json({ error: "Issuer not found" });
        }

        console.log('Issuer found:', issuerInfo.profile.name, 'from', issuerInfo.profile.organization);
        console.log('Creating Verifiable Credential...');
        
        // Create VC for document
        const tempDoc = {
          fileHash,
          ipfsCid,
          uploader: uploader.toLowerCase(),
          expirationDate,
          docType: docType || 'general'
        };

        verifiableCredential = await vcService.createVerifiableCredential(tempDoc, issuerInfo);
        console.log('VC created:', verifiableCredential.id.slice(0, 30) + '...');
      }

      // Save to MongoDB
      console.log('Saving to MongoDB...');
      const doc = new Document({
        fileHash,
        ipfsCid,
        uploader: uploader.toLowerCase(),
        docType: docType || 'general',
        expirationDate,
        issuerDID: issuerInfo?.did || null,
        issuerName: issuerInfo?.profile.name || null,
        issuerOrganization: issuerInfo?.profile.organization || null,
        verifiableCredential: verifiableCredential || null,
      });

      await doc.save();
      savedDoc = doc;
      console.log('Document saved to MongoDB');

      // Register on blockchain
      console.log('⛓️  Registering on blockchain...');
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      const contractWithSigner = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        CONTRACT_ABI,
        wallet
      );

      const expirationTimestampInt = parseInt(expirationTimestamp) || 0;
      const tx = await contractWithSigner.registerDocument(fileHash, expirationTimestampInt);
      const receipt = await tx.wait();
      console.log('Registered on blockchain:', tx.hash.slice(0, 10) + '...');

      // Update issuer stats if applicable (with error handling)
      if (issuerInfo) {
        try {
          issuerInfo.documentsIssued += 1;
          issuerInfo.lastActivityAt = new Date();
          await issuerInfo.save();
          console.log('Updated issuer stats');
        } catch (statsError) {
          console.error('Failed to update issuer stats:', statsError.message);
          // Document is still successfully registered, just log the error
        }
      }

      // Clear cache
      await clearCache("cache:/api/history*");

      console.log('✅ Upload complete!\n');

      res.json({ 
        success: true,
        message: "Document uploaded successfully",
        data: {
          fileHash, 
          ipfsCid, 
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          issuerDID: issuerInfo?.did || null,
          verifiableCredentialId: verifiableCredential?.id || null,
          expirationDate,
          timestamp: doc.timestamp
        }
      });
    } catch (error) {
      console.error("Upload error:", error.message);

      // Rollback: Delete MongoDB entry if blockchain registration failed
      if (savedDoc && savedDoc._id) {
        try {
          await Document.deleteOne({ _id: savedDoc._id });
          console.log(' Rolled back MongoDB entry due to error');
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError.message);
        }
      }

      // Handle specific blockchain duplicate error with type checking
      if (error.code === 'CALL_EXCEPTION' && 
          typeof error.reason === 'string' && 
          error.reason.includes('already exists')) {
        return res.status(409).json({ 
          error: "Document already exists on blockchain",
          fileHash
        });
      }

      // Handle multer file size error
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
        });
      }

      // Handle Pinata timeout
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return res.status(504).json({ 
          error: "IPFS upload timeout. Please try again." 
        });
      }
      
      // Handle validation errors
      if (error.name === "ValidationError") {
        return res.status(400).json({ error: error.message });
      }

      // Handle MongoDB duplicate key error
      if (error.code === 11000) {
        return res.status(409).json({ 
          error: "Document with this hash already exists" 
        });
      }
      
      // Pass to global error handler
      next(error);
    }
  }
);

export default router;

//start

























