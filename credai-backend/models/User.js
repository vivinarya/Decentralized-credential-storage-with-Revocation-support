import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  walletAddress: { 
    type: String, 
    required: [true, "Wallet address is required"],
    unique: true, 
    lowercase: true,
    match: [/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address format"],
    index: true
  },
  username: { 
    type: String,
    maxlength: [50, "Username cannot exceed 50 characters"],
    trim: true,
    default: function() {
      return `user_${this.walletAddress.slice(2, 8)}`;
    }
  },
  email: { 
    type: String,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    lowercase: true,
    sparse: true // Allow multiple null values
  },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    immutable: true 
  },
  lastLogin: { 
    type: Date, 
    default: Date.now 
  },
  totalDocuments: { 
    type: Number, 
    default: 0, 
    min: [0, "Total documents cannot be negative"]
  },
});

// Prevent accidental overwrites
UserSchema.set('strict', true);

export default mongoose.models.User || mongoose.model("User", UserSchema);

