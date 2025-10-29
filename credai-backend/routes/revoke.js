import express from "express";
import { ethers } from "ethers";
import { CONTRACT_ABI } from "../contractABI.js";
import Document from "../models/Document.js";
import { clearCache } from "../middleware/cache.js";

const router = express.Router();


function requireApiKey(req, res, next) {
  const configuredKey = process.env.REVOKE_API_KEY;
  if (!configuredKey) {
    console.error("REVOKE_API_KEY not configured; rejecting revocation request.");
    return res.status(500).json({ error: "Server configuration error" });
  }
  const incoming = (req.header("x-api-key") || "").trim();
  if (!incoming || incoming !== configuredKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}


function normalizeFileHash(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  const hexOnly = s.startsWith("0x") ? s.slice(2) : s;
  if (!/^[a-fA-F0-9]{64}$/.test(hexOnly)) return null;
  return "0x" + hexOnly.toLowerCase();
}

router.post("/", requireApiKey, async (req, res) => {
  try {
    const { fileHash: raw } = req.body;
    if (!raw) return res.status(400).json({ error: "fileHash missing" });

    const fileHash = normalizeFileHash(raw);
    if (!fileHash) return res.status(400).json({ error: "fileHash must be a 32-byte hex string" });


    const doc = await Document.findOne({ fileHash: { $eq: fileHash } });
    if (!doc) {
      return res.status(404).json({ error: "Document not found in database" });
    }
    if (doc.revoked) {
      return res.status(200).json({ success: true, message: "Document already revoked", transactionHash: doc.revocationTx || null });
    }

    const { PRIVATE_KEY, NETWORK, CONTRACT_ADDRESS } = process.env;
    if (!PRIVATE_KEY || !NETWORK || !CONTRACT_ADDRESS) {
      console.error("Missing PRIVATE_KEY, NETWORK or CONTRACT_ADDRESS for revocation");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const provider = new ethers.JsonRpcProvider(NETWORK);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);


    let tx;
    try {
      tx = await contract.revokeDocument(fileHash);
    } catch (err) {
      console.error("Failed to send revoke transaction:", { fileHash, message: err?.message ?? String(err) });
      return res.status(502).json({ error: "Failed to submit revocation transaction" });
    }

    let receipt;
    try {
      receipt = await tx.wait();
    } catch (err) {
      console.error("Transaction failed while waiting for confirmation:", { fileHash, txHash: tx.hash, message: err?.message ?? String(err) });
      return res.status(502).json({ error: "Revocation transaction failed or timed out" });
    }

    if (receipt && typeof receipt.status !== "undefined" && receipt.status === 0) {
      console.error("Revocation transaction reverted on chain", { fileHash, txHash: tx.hash });
      return res.status(502).json({ error: "Revocation transaction reverted" });
    }


    try {
      doc.revoked = true;
      doc.revocationTx = tx.hash;
      doc.revokedAt = new Date();
      await doc.save();
    } catch (err) {
      console.error("Failed to update DB after successful on-chain revocation:", { fileHash, txHash: tx.hash, message: err?.message ?? String(err) });
      await clearCache("cache:/api/history*").catch(() => {});
      await clearCache(`verify:${fileHash}`).catch(() => {});
      return res.status(200).json({
        success: true,
        message: "Revoked on chain but DB update failed — reconciliation needed",
        transactionHash: tx.hash,
      });
    }


    await clearCache("cache:/api/history*").catch((e) => console.error("cache clear error", e));
    await clearCache(`verify:${fileHash}`).catch((e) => console.error("cache clear error", e));

    return res.json({
      success: true,
      message: "Document revoked on blockchain and locally",
      transactionHash: tx.hash,
    });
  } catch (error) {
    console.error("Unexpected revocation error:", { message: error?.message ?? String(error) });
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;



