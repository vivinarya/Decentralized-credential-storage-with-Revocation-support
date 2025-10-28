import express from "express";
import { ethers } from "ethers";
import { CONTRACT_ABI } from "../contractABI.js";

const router = express.Router();

function jsonSafeStringify(obj) {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

router.post("/", async (req, res, next) => {
  try {
    const { fileBuffer } = req.body;
    if (!fileBuffer) return res.status(400).json({ error: "File missing" });

    const fileHash = ethers.keccak256(Buffer.from(fileBuffer, "base64"));

    const provider = new ethers.JsonRpcProvider(process.env.NETWORK);
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    const doc = await contract.verifyDocument(fileHash);

    res.json(jsonSafeStringify(doc));
  } catch (error) {
    next(error);
  }
});

export default router;
