import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  //db
  res.json({ history: [] });
});

export default router;

