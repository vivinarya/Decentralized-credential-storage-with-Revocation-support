import mongoose from "mongoose";

/**
 * Connect to MongoDB.
 * - Accepts an optional uri argument.
 * - Falls back to process.env.MONGODB_URI or process.env.MONGO_URI.
 * - Validates the uri and throws a clear error if it's missing/invalid.
 *
 * Returns the mongoose connection on success.
 */
export async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri || typeof mongoUri !== "string") {
    const msg =
      "MONGODB_URI is not set or invalid. Set MONGODB_URI (or MONGO_URI) in environment or pass a valid URI to connectDB.";
    console.error(msg);
    // Throw so the caller can decide to terminate startup
    throw new Error(msg);
  }

  try {
    // Optional: enable strictQuery to remove deprecation warnings (tune as needed)
    mongoose.set("strictQuery", true);

    // Connect; mongoose v7+ has reasonable defaults; add options if needed for older versions
    await mongoose.connect(mongoUri);

    console.log("MongoDB connected");
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    // Re-throw so startup can exit or handle it explicitly
    throw error;
  }
}
