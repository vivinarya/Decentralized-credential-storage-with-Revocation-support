import express from "express";
import { ethers } from "ethers";
import { CONTRACT_ABI } from "../contractABI.js";

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { fileHash } = req.body;
    if (!fileHash) return res.status(400).json({ error: "fileHash missing" });

    const provider = new ethers.JsonRpcProvider(process.env.NETWORK);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    const tx = await contract.revokeDocument(fileHash);
    await tx.wait();

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

