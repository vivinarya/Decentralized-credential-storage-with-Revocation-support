import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import rateLimiter from "./middleware/rateLimiter.js";
import errorHandler from "./middleware/errorHandler.js";

import uploadRouter from "./routes/upload.js";
import verifyRouter from "./routes/verify.js";
import revokeRouter from "./routes/revoke.js";
import expiredRouter from "./routes/expired.js";
import historyRouter from "./routes/history.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "15mb" }));
app.use(rateLimiter);

app.use("/api/upload", uploadRouter);
app.use("/api/verify", verifyRouter);
app.use("/api/revoke", revokeRouter);
app.use("/api/expired", expiredRouter);
app.use("/api/history", historyRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

