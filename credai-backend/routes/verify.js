import express from "express";
import { ethers } from "ethers";
import { CONTRACT_ABI } from "../contractABI.js";
import Document from "../models/Document.js";
import redisClient from "../config/redis.js";
import vcService from "../services/vcService.js";
import Issuer from "../models/Issuer.js";

const router = express.Router();

/**
 * Helper: Find issuer by DID with case-insensitive matching and regex injection protection
 * @param {string} did - The DID to search for
 * @returns {Promise<Issuer|null>}
 */
async function findIssuerByDID(did) {
  // Escape special regex characters to prevent regex injection
  const escapedDID = did.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return await Issuer.findOne({ 
    did: { $regex: new RegExp(`^${escapedDID}$`, 'i') }
  });
}

/**
 * GET /api/verify/:fileHash
 * Quick verification by file hash (no file buffer needed)
 */
router.get("/:fileHash", async (req, res) => {
  try {
    const { fileHash } = req.params;
    const detailed = req.query.detailed === "true";

    console.log('🔍 Verifying document:', fileHash.slice(0, 10) + '...');

    if (!/^0x[a-fA-F0-9]{64}$/.test(fileHash)) {
      return res.status(400).json({ error: "Invalid file hash format" });
    }

    const cacheKey = `verify:${fileHash}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log("✅ Verification cache HIT:", fileHash.slice(0, 10) + "...");
        return res.json(JSON.parse(cached));
      }
    } catch (cacheError) {
      console.error("Cache read error:", cacheError?.message ?? cacheError);
    }

    console.log('Checking MongoDB...');
    const doc = await Document.findOne({ fileHash });
    if (!doc) {
      return res.status(404).json({ verified: false, error: "Document not found in database" });
    }
    console.log('Document found in database');

    console.log('⛓️  Verifying on blockchain...');
    const provider = new ethers.JsonRpcProvider(process.env.NETWORK);
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    const verificationRaw = await contract.verifyDocument(fileHash);
    const verification = {
      exists: verificationRaw.exists,
      uploader: verificationRaw.uploader,
      expiration: Number(verificationRaw.expiration.toString()),
      expired: verificationRaw.expired,
      revoked: verificationRaw.revoked
    };

    if (!verification.exists) {
      return res.status(404).json({ verified: false, error: "Document not found on blockchain" });
    }
    console.log(' Document verified on blockchain');

    // Verify blockchain and database consistency
    if (verification.uploader.toLowerCase() !== doc.uploader.toLowerCase()) {
      console.warn('Uploader mismatch between blockchain and database');
      return res.status(409).json({ 
        verified: false, 
        error: "Data inconsistency detected between blockchain and database" 
      });
    }
    
    if (verification.revoked !== doc.revoked) {
      console.warn('Revocation status mismatch');
      return res.status(409).json({ 
        verified: false, 
        error: "Data inconsistency detected between blockchain and database" 
      });
    }

    const response = {
      verified: true,
      fileHash,
      document: {
        ipfsCid: doc.ipfsCid,
        uploadedBy: doc.uploader,
        uploadedAt: doc.timestamp,
        expirationDate: doc.expirationDate,
        revoked: doc.revoked,
        revokedAt: doc.revokedAt || null
      },
      blockchain: {
        uploader: verification.uploader,
        expiration: new Date(verification.expiration * 1000),
        revoked: verification.revoked,
        expired: verification.expired
      }
    };

    if (doc.issuerDID) {
      console.log(' Getting issuer & VC info...');
      const issuer = await findIssuerByDID(doc.issuerDID);

      if (issuer) {
        response.issuer = {
          did: doc.issuerDID,
          name: doc.issuerName,
          organization: doc.issuerOrganization,
          verified: issuer.profile?.verified ?? false
        };

        if (doc.verifiableCredential) {
          try {
            const vcVerification = await vcService.verifyCredential(
              doc.verifiableCredential, 
              issuer,
              doc
            );

            response.credential = {
              id: doc.verifiableCredential.id,
              issuanceDate: doc.verifiableCredential.issuanceDate,
              verification: vcVerification,
              status: {
                revoked: doc.revoked,
                revokedAt: doc.revokedAt
              }
            };
          } catch (vcError) {
            console.error('VC verification failed:', vcError.message);
            response.credential = {
              error: 'Credential verification failed',
              id: doc.verifiableCredential?.id
            };
          }
        }
      }
    }

    if (detailed) {
      response.detailed = {
        blockchainStatus: "registered",
        verificationMethod: doc.issuerDID ? "DID + Credential" : "Document Hash"
      };
    }

    try {
      // Reduced TTL for verification cache to 60 seconds for real-time updates
      await redisClient.set(cacheKey, JSON.stringify(response), { EX: 60 });
    } catch (cacheSetError) {
      console.error("Cache set error:", cacheSetError?.message ?? cacheSetError);
    }

    console.log('Verification complete\n');
    res.json(response);

  } catch (error) {
    console.error("Verification error:", error.message);
    // Don't expose internal error details
    res.status(500).json({ error: "Verification failed" });
  }
});

/**
 * POST /api/verify
 * Full verification with file buffer (includes blockchain verification)
 */
router.post("/", async (req, res) => {
  try {
    const { fileBuffer, docType, metadata } = req.body;

    if (!fileBuffer) return res.status(400).json({ error: "fileBuffer missing" });
    if (typeof fileBuffer !== "string") return res.status(400).json({ error: "fileBuffer must be base64 string" });

    const MAX_BASE64_LENGTH = 5 * 1024 * 1024;
    if (fileBuffer.length > MAX_BASE64_LENGTH) {
      return res.status(413).json({ error: "Payload too large" });
    }

    let buf;
    try {
      buf = Buffer.from(fileBuffer, "base64");
    } catch (err) {
      return res.status(400).json({ error: "Invalid base64 fileBuffer" });
    }

    const fileHash = ethers.keccak256(buf);
    const cacheKey = `verify:${fileHash}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log("Verification cache HIT:", fileHash.slice(0, 10) + "...");
        return res.json(JSON.parse(cached));
      }
      console.log("Verification cache MISS:", fileHash.slice(0, 10) + "...");
    } catch (cacheError) {
      console.error("Cache read error:", cacheError?.message ?? cacheError);
    }

    // Check MongoDB
    const doc = await Document.findOne({ fileHash });

    if (!doc) {
      return res.status(404).json({ 
        verified: false, 
        error: "Document not found in database" 
      });
    }

    // Add blockchain verification for consistency with GET endpoint
    console.log('Verifying on blockchain...');
    const provider = new ethers.JsonRpcProvider(process.env.NETWORK);
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    const verificationRaw = await contract.verifyDocument(fileHash);
    const verification = {
      exists: verificationRaw.exists,
      uploader: verificationRaw.uploader,
      expiration: Number(verificationRaw.expiration.toString()),
      expired: verificationRaw.expired,
      revoked: verificationRaw.revoked
    };

    if (!verification.exists) {
      return res.status(404).json({ 
        verified: false, 
        error: "Document not found on blockchain" 
      });
    }

    // Verify blockchain and database consistency
    if (verification.uploader.toLowerCase() !== doc.uploader.toLowerCase()) {
      console.warn('Uploader mismatch between blockchain and database');
      return res.status(409).json({ 
        verified: false, 
        error: "Data inconsistency detected between blockchain and database" 
      });
    }
    
    if (verification.revoked !== doc.revoked) {
      console.warn('Revocation status mismatch');
      return res.status(409).json({ 
        verified: false, 
        error: "Data inconsistency detected between blockchain and database" 
      });
    }

    const result = {
      verified: true,
      fileHash,
      document: {
        revoked: doc.revoked,
        expirationDate: doc.expirationDate,
        uploadedAt: doc.timestamp
      },
      blockchain: {
        uploader: verification.uploader,
        expiration: new Date(verification.expiration * 1000),
        revoked: verification.revoked,
        expired: verification.expired
      }
    };

    try {
      await redisClient.set(cacheKey, JSON.stringify(result), { EX: 60 });
    } catch (cacheSetError) {
      console.error("Cache set error:", cacheSetError?.message ?? cacheSetError);
    }

    return res.json(result);

  } catch (error) {
    console.error("Verification error:", error?.message ?? String(error));
    return res.status(500).json({ error: "Verification failed" });
  }
});

/**
 * POST /api/verify/credential
 * Verify a Verifiable Credential with proper validation
 */
router.post("/credential", async (req, res) => {
  try {
    const { fileHash, verifiableCredential } = req.body;

    if (!fileHash) {
      return res.status(400).json({ error: "fileHash required" });
    }

    if (!verifiableCredential) {
      return res.status(400).json({ error: "verifiableCredential required" });
    }

    // Structural validation of VC
    if (!verifiableCredential.issuer || !verifiableCredential.id) {
      return res.status(400).json({ 
        error: "Invalid verifiableCredential structure: missing issuer or id" 
      });
    }

    const doc = await Document.findOne({ fileHash });
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Use helper function to prevent regex injection
    const issuer = await findIssuerByDID(verifiableCredential.issuer);
    
    if (!issuer) {
      return res.status(404).json({ error: "Issuer not found" });
    }

    let vcVerification;
    let verificationError = null;

    // Wrapped VC verification with proper error handling
    try {
      vcVerification = await vcService.verifyCredential(
        verifiableCredential, 
        issuer,
        doc
      );
    } catch (vcError) {
      console.error("VC verification failed:", vcError.message);
      
      // Classify error types for proper HTTP status codes
      if (vcError.message?.includes('parse') || vcError.message?.includes('format')) {
        return res.status(400).json({ 
          error: "Invalid credential format",
          type: "format_error"
        });
      } else if (vcError.message?.includes('validation')) {
        return res.status(422).json({ 
          error: "Credential validation failed",
          type: "validation_error"
        });
      } else if (vcError.message?.includes('signature') || vcError.message?.includes('proof')) {
        return res.status(401).json({ 
          error: "Credential signature verification failed",
          type: "signature_error"
        });
      } else if (vcError.message?.includes('expired')) {
        return res.status(410).json({ 
          error: "Credential has expired",
          type: "expiration_error"
        });
      } else if (vcError.message?.includes('revoked')) {
        return res.status(412).json({ 
          error: "Credential has been revoked",
          type: "revocation_error"
        });
      } else {
        // Generic verification failure
        verificationError = "Credential verification failed";
        vcVerification = { valid: false };
      }
    }

    // Get credential status with error handling
    let credentialStatus;
    try {
      credentialStatus = await vcService.getCredentialStatus(
        verifiableCredential.id, 
        doc
      );
    } catch (statusError) {
      console.error("Failed to retrieve credential status:", statusError.message);
      credentialStatus = { 
        available: false, 
        error: "Status check unavailable" 
      };
    }

    res.json({
      success: true,
      fileHash,
      document: {
        exists: true,
        revoked: doc.revoked,
        expirationDate: doc.expirationDate
      },
      credential: {
        id: verifiableCredential.id,
        issuer: issuer.profile?.name ?? 'Unknown',
        issuanceDate: verifiableCredential.issuanceDate
      },
      verification: vcVerification,
      credentialStatus: credentialStatus,
      ...(verificationError && { warning: verificationError })
    });

  } catch (error) {
    console.error("VC verification error:", error.message);
    // Don't expose internal error messages
    res.status(500).json({ error: "Credential verification failed" });
  }
});

export default router;

//start















