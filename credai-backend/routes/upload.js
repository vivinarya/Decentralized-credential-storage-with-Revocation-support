import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { ethers } from "ethers";
import { CONTRACT_ABI } from "../contractABI.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/upload
router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File missing" });
    }

    // Prepare FormData for Pinata
    const data = new FormData();
    data.append("file", req.file.buffer, req.file.originalname);

    // Upload to Pinata
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

    // Interact with blockchain
    const provider = new ethers.JsonRpcProvider(process.env.NETWORK);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    const tx = await contract.storeDocument(fileHash, ipfsCid);
    await tx.wait();

    res.json({ success: true, ipfsCid, fileHash });
  } catch (error) {
    next(error);
  }
});

export default router;

