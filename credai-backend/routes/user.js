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

    // NOTE: do not set any long-lived session here.
    // If you want short-lived authentication, return a signed challenge or token.
    res.json({
      user: {
        walletAddress: user.walletAddress,
        username: user.username,
        totalDocuments: user.totalDocuments,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    console.error("User auth error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Logout endpoint — clears any server-side session/cookie if present.
// Frontend will call this on beforeunload so server won't keep a session.
router.post("/logout", (req, res) => {
  try {
    // If you use express-session or similar, destroy the session here:
    // if (req.session) req.session.destroy(() => {});
    // If you set an auth cookie, clear it:
    // res.clearCookie("connect.sid"); // or your cookie name

    // Respond OK even if no session exists
    return res.json({ ok: true });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ error: "Failed to logout" });
  }
});

export default router;
