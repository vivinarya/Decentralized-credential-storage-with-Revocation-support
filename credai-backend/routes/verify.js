import express from "express";
import { ethers } from "ethers";
import { CONTRACT_ABI } from "../contractABI.js";
import Document from "../models/Document.js";
import redisClient from "../config/redis.js";

const router = express.Router();

/**
 * NOTE: This route returns a fast, deterministic response about whether the file hash
 * exists / is revoked (from DB). For passports (docType === "passport") we also
 * trigger a federated-learning / LLM-backed verification pipeline which runs
 * asynchronously (job queue or worker). This keeps the main API low-latency and
 * avoids sending raw image data to external services synchronously.
 *
 * Security & privacy notes (must follow when implementing FL/LLM integration):
 * - Do NOT send raw passport images to external hosts without explicit consent.
 * - Prefer computing local feature vectors (embeddings, keypoints, visual features)
 *   and send those for federated aggregation/verification.
 * - Use secure channels (mTLS / encrypted API) and authenticate worker nodes.
 * - Use secure aggregation (e.g., cryptographic secure aggregation) or differential privacy
 *   if uploading model updates or features to an aggregator.
 * - Keep a tamper/audit log of verification jobs and results for later reconciliation.
 */

// Maximum base64 payload length (protects server memory)
const MAX_BASE64_LENGTH = 5 * 1024 * 1024; // 5 MiB

// Placeholder in-memory job counter for demo (replace with Redis/Bull/etc.)
let _jobCounter = 0;

/**
 * Enqueue or trigger a federated passport verification job.
 * Replace this with a real queue (Bull/Redis/Cloud Task) + worker that runs the FL/LLM verification.
 *
 * Important: the enqueue function should NOT forward raw images to external parties.
 * Instead:
 * - Extract and store features locally (embeddings, ML features), or
 * - Encrypt the payload and let trusted workers decrypt in a secure environment,
 * - Or perform local model inference and send only the model outputs (predictions, embeddings).
 */
async function enqueueFederatedPassportVerification({ fileHash, fileBuffer, metadata }) {
  // Generate a job id (replace with real queue job ID)
  _jobCounter += 1;
  const jobId = `fl-job-${Date.now()}-${_jobCounter}`;

  // Example: persist a minimal job record in Redis (optional)
  try {
    const jobRecord = {
      id: jobId,
      fileHash,
      status: "queued",
      createdAt: new Date().toISOString(),
      metadata: metadata || {},
      // Do NOT include fileBuffer here in plaintext in production.
    };
    // Store job metadata for quick lookup (expires in e.g., 24 hours)
    await redisClient.set(`fljob:${jobId}`, JSON.stringify(jobRecord), { EX: 60 * 60 * 24 });
  } catch (err) {
    console.error("Failed to persist FL job metadata to Redis:", err?.message ?? err);
  }

  // TODO: Push a task to your queue/worker system with either:
  // - Encrypted fileBuffer and jobId, or
  // - Local features/embeddings + jobId, or
  // - A secure reference (S3 presigned URL / encrypted storage) to the file for workers to fetch.
  //
  // Example pseudo-code (replace with Bull, RabbitMQ, Cloud Tasks, etc):
  // await flQueue.add({ jobId, fileHash, metadata, featuresReference });

  // For now return placeholder job record
  return { jobId, status: "queued" };
}

/**
 * Example feature extractor stub.
 * Replace with your own local extraction (OpenCV, torchvision, MobileNet embeddings, etc.)
 * The idea: avoid uploading raw images by instead sending features/embeddings to aggregator.
 */
function extractVisualFeaturesStub(buffer) {
  // This is a stub. Replace with real feature extraction.
  // For example: run a lightweight model to compute an embedding (float32 array),
  // then quantize/base64-encode that embedding and share that.
  const pseudoFeature = `feat_${Buffer.from(buffer.slice(0, 16)).toString("hex")}`;
  return { embedding: pseudoFeature, version: "stub-v0" };
}

router.post("/", async (req, res) => {
  try {
    const { fileBuffer, docType, metadata } = req.body;

    if (!fileBuffer) return res.status(400).json({ error: "fileBuffer missing" });
    if (typeof fileBuffer !== "string") return res.status(400).json({ error: "fileBuffer must be base64 string" });

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

    // Check Redis cache first
    const cacheKey = `verify:${fileHash}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log("Verification cache HIT:", fileHash.slice(0, 10) + "...");
        // Return cached object (it may include passportVerification state)
        return res.json(JSON.parse(cached));
      }
      console.log("Verification cache MISS:", fileHash.slice(0, 10) + "...");
    } catch (cacheError) {
      console.error("Cache read error:", cacheError?.message ?? cacheError);
    }

    // Lookup DB
    const doc = await Document.findOne({ fileHash: { $eq: fileHash } });
    const baseResult = {
      existsInDB: !!doc,
      revoked: !!doc?.revoked,
      fileHash,
    };

    // Prepare a result object we will cache and return quickly
    const result = { ...baseResult };

    // If this is a passport verification request, trigger FL/LLM pipeline
    if (docType === "passport") {
      // Important: do not embed raw fileBuffer in responses or store unencrypted in logs
      // We'll enqueue a job and return the jobId so UI/LLM can poll / receive callback.
      try {
        // Optionally run local feature extraction to avoid sending raw image data
        const features = extractVisualFeaturesStub(buf); // replace with real extractor

        // Ideally, enqueue only metadata/features, not the full image.
        const job = await enqueueFederatedPassportVerification({
          fileHash,
          // In real implementation, either omit fileBuffer or store encrypted and reference by job
          // fileBuffer,
          metadata: { ...(metadata || {}), features },
        });

        result.passportVerification = {
          status: job.status, // queued / processing / done
          jobId: job.jobId,
          verified: null, // will be set by worker later
          confidence: null, // worker sets this
        };
      } catch (err) {
        console.error("Failed to enqueue federated passport verification:", err?.message ?? err);
        // Do not block the main verification; return partial result with error info
        result.passportVerification = {
          status: "error",
          error: "Failed to accept passport verification job",
        };
      }
    }

    // Cache result for short time (5 min)
    try {
      await redisClient.set(cacheKey, JSON.stringify(result), { EX: 60 * 5 });
    } catch (err) {
      console.error("Cache set error:", err?.message ?? err);
    }

    return res.json(result);
  } catch (error) {
    console.error("Verification error:", error?.message ?? String(error));
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;


