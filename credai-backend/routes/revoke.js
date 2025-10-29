import express from "express";
import { ethers } from "ethers";
import { CONTRACT_ABI } from "../contractABI.js";
import Document from "../models/Document.js";
import { clearCache } from "../middleware/cache.js";

const router = express.Router();

function normalizeFileHash(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  const hexOnly = s.startsWith("0x") ? s.slice(2) : s;
  if (!/^[a-fA-F0-9]{64}$/.test(hexOnly)) return null;
  return "0x" + hexOnly.toLowerCase();
}

function normalizeAddress(addr) {
  if (typeof addr !== "string") return null;
  const trimmed = addr.trim();
  if (!/^0x[a-fA-F0-9]{40}$/i.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

router.post("/", async (req, res) => {
  try {
    const { fileHash: raw, walletAddress: rawWallet } = req.body;
    
    if (!raw) return res.status(400).json({ error: "fileHash missing" });
    if (!rawWallet) return res.status(400).json({ error: "walletAddress missing" });

    const fileHash = normalizeFileHash(raw);
    if (!fileHash) {
      return res.status(400).json({ error: "fileHash must be a 32-byte hex string" });
    }

    const walletAddress = normalizeAddress(rawWallet);
    if (!walletAddress) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }

    // Find document in database
    const doc = await Document.findOne({ fileHash: { $eq: fileHash } });
    if (!doc) {
      return res.status(404).json({ error: "Document not found in database" });
    }

    // SECURITY CHECK: Verify ownership
    const docUploader = normalizeAddress(doc.uploader);
    if (docUploader !== walletAddress) {
      console.warn(`Unauthorized revoke attempt: ${walletAddress} tried to revoke document owned by ${docUploader}`);
      return res.status(403).json({ 
        error: "Unauthorized: You can only revoke documents you uploaded" 
      });
    }

    if (doc.revoked) {
      return res.status(200).json({ 
        success: true, 
        message: "Document already revoked", 
        transactionHash: doc.revocationTx || null 
      });
    }

    const { PRIVATE_KEY, NETWORK, CONTRACT_ADDRESS } = process.env;
    if (!PRIVATE_KEY || !NETWORK || !CONTRACT_ADDRESS) {
      console.error("Missing PRIVATE_KEY, NETWORK or CONTRACT_ADDRESS");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Revoke on blockchain
    const provider = new ethers.JsonRpcProvider(NETWORK);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    let tx;
    try {
      tx = await contract.revokeDocument(fileHash);
    } catch (err) {
      console.error("Failed to send revoke transaction:", { 
        fileHash, 
        message: err?.message ?? String(err) 
      });
      return res.status(502).json({ error: "Failed to submit revocation transaction" });
    }

    let receipt;
    try {
      receipt = await tx.wait();
    } catch (err) {
      console.error("Transaction failed:", { 
        fileHash, 
        txHash: tx.hash, 
        message: err?.message ?? String(err) 
      });
      return res.status(502).json({ error: "Revocation transaction failed" });
    }

    if (receipt && typeof receipt.status !== "undefined" && receipt.status === 0) {
      console.error("Transaction reverted on chain", { fileHash, txHash: tx.hash });
      return res.status(502).json({ error: "Revocation transaction reverted" });
    }

    // Update database
    try {
      doc.revoked = true;
      doc.revocationTx = tx.hash;
      doc.revokedAt = new Date();
      await doc.save();
    } catch (err) {
      console.error("Failed to update DB after blockchain revocation:", { 
        fileHash, 
        txHash: tx.hash, 
        message: err?.message ?? String(err) 
      });
      return res.status(500).json({ 
        error: "Document revoked on blockchain but database update failed",
        transactionHash: tx.hash
      });
    }

    // Clear caches
    await clearCache("cache:/api/history*").catch((e) => console.error("cache clear error", e));
    await clearCache(`verify:${fileHash}`).catch((e) => console.error("cache clear error", e));

    return res.json({
      success: true,
      message: "Document revoked successfully",
      transactionHash: tx.hash,
    });  } catch (error) {
    console.error("Unexpected revocation error:", { message: error?.message ?? String(error) });
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;




