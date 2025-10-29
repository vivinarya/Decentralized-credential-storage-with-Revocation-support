import mongoose from "mongoose";

const DocumentSchema = new mongoose.Schema({
  fileHash: { 
    type: String, 
    required: [true, "File hash is required"],
    unique: true,
    match: [/^0x[a-fA-F0-9]{64}$/, "Invalid file hash format"],
    index: true
  },
  ipfsCid: { 
    type: String, 
    required: [true, "IPFS CID is required"],
    match: [/^Qm[a-zA-Z0-9]{44}$/, "Invalid IPFS CID format"]
  },
  uploader: { 
    type: String, 
    required: [true, "Uploader address is required"],
    match: [/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"],
    lowercase: true
  },
  expirationDate: { 
    type: Date,
    validate: {
      validator: function(v) {
        return !v || v > new Date();
      },
      message: "Expiration date must be in the future"
    }
  },
  revoked: { 
    type: Boolean, 
    default: false,
    index: true
  },
  verified: { 
    type: Boolean, 
    default: false 
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    immutable: true
  },
});

// Compound indexes for faster queries
DocumentSchema.index({ uploader: 1, timestamp: -1 });
DocumentSchema.index({ revoked: 1, timestamp: -1 });

// Prevent accidental overwrites
DocumentSchema.set('strict', true);

export default mongoose.models.Document || mongoose.model("Document", DocumentSchema);

