import express from "express";
import User from "../models/User.js";
import Document from "../models/Document.js";

const router = express.Router();

// Authenticate/Register user by wallet address
router.post("/auth", async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address required" });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    let user = await User.findOne({ walletAddress: normalizedAddress });

    if (!user) {
      // Create new user
      user = new User({ 
        walletAddress: normalizedAddress,
      });
      await user.save();
      console.log("New user created:", normalizedAddress);
    } else {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      console.log("User logged in:", normalizedAddress);
    }

    // Get user's document count
    const docCount = await Document.countDocuments({ uploader: normalizedAddress });
    user.totalDocuments = docCount;
    await user.save();

    res.json({ 
      success: true,
      user: {
        walletAddress: user.walletAddress,
        username: user.username,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        totalDocuments: user.totalDocuments,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
router.get("/profile/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get user documents
    const documents = await Document.find({ uploader: walletAddress.toLowerCase() });

    res.json({
      user: {
        walletAddress: user.walletAddress,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        totalDocuments: documents.length,
      },
      documents,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put("/profile", async (req, res) => {
  try {
    const { walletAddress, username, email } = req.body;

    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (username) user.username = username;
    if (email) user.email = email;

    await user.save();

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
