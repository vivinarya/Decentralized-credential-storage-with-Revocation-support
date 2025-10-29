import mongoose from "mongoose";

// W3C DID Document Schema (nested)
const verificationMethodSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  controller: { type: String, required: true },
  blockchainAccountId: { type: String },
  publicKeyHex: { type: String },
  publicKeyBase58: { type: String },
  publicKeyJwk: { type: Object }
}, { _id: false });

const didDocumentSchema = new mongoose.Schema({
  '@context': { 
    type: [String], 
    required: true,
    default: ['https://www.w3.org/ns/did/v1']
  },
  id: { 
    type: String, 
    required: true 
  },
  verificationMethod: {
    type: [verificationMethodSchema],
    default: []
  },
  authentication: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  assertionMethod: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  keyAgreement: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  capabilityInvocation: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  capabilityDelegation: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  service: {
    type: [Object],
    default: []
  }
}, { _id: false });

// Main Issuer Schema
const issuerSchema = new mongoose.Schema(
  {
    did: {
      type: String,
      required: true,
      unique: true,
      index: true,
      validate: {
        validator: function(v) {
          return /^did:ethr:maticamoy:0x[a-fA-F0-9]{40}(:\d+)?$/.test(v);
        },
        message: props => `${props.value} is not a valid DID format!`
      }
    },
    didDocument: {
      type: didDocumentSchema,
      required: true,
    },
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
      validate: {
        validator: function(v) {
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: props => `${props.value} is not a valid Ethereum address!`
      }
    },
    profile: {
      name: {
        type: String,
        required: true,
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [100, 'Name cannot exceed 100 characters']
      },
      organization: {
        type: String,
        required: true,
        trim: true,
        minlength: [2, 'Organization must be at least 2 characters'],
        maxlength: [100, 'Organization cannot exceed 100 characters']
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      },
      description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
      },
      website: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+/, 'Please enter a valid URL']
      },
      verified: {
        type: Boolean,
        default: false,
      },
    },
    publicKey: {
      type: String,
      required: true,
    },
    encryptedPrivateKey: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "suspended", "pending"],
        message: '{VALUE} is not a valid status'
      },
      default: "pending",
    },
    documentsIssued: {
      type: Number,
      default: 0,
      min: [0, 'Documents issued cannot be negative']
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for wallet + organization (prevent duplicate profiles for same org)
issuerSchema.index({ walletAddress: 1, 'profile.organization': 1 }, { unique: true });

// Instance method to update activity timestamp
issuerSchema.methods.updateActivity = function() {
  this.lastActivityAt = new Date();
  return this.save();
};

// Instance method to increment document count
issuerSchema.methods.incrementDocuments = function() {
  this.documentsIssued += 1;
  this.lastActivityAt = new Date();
  return this.save();
};

// Static method to find by wallet address
issuerSchema.statics.findByWallet = function(walletAddress) {
  return this.find({ walletAddress: walletAddress.toLowerCase() });
};

// Static method to find active issuers
issuerSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

// Pre-save hook to validate DID consistency
issuerSchema.pre('save', function(next) {
  const wallet = this.walletAddress.toLowerCase();
  
  // 1. Validate DID wallet address matches issuer wallet address
  // Format: did:ethr:maticamoy:0xADDRESS or did:ethr:maticamoy:0xADDRESS:timestamp
  const didWallet = this.did.split(':')[3]?.split(':')[0]?.toLowerCase();
  
  if (didWallet && didWallet !== wallet) {
    return next(new Error('DID wallet address does not match issuer wallet address'));
  }
  
  // 2. Validate didDocument.id matches issuer DID
  if (this.didDocument && this.didDocument.id !== this.did) {
    return next(new Error('DID document id must match issuer DID'));
  }
  
  // 3. Validate didDocument verification methods reference correct wallet
  if (this.didDocument && this.didDocument.verificationMethod) {
    const hasMatchingMethod = this.didDocument.verificationMethod.some(vm => {
      if (vm.blockchainAccountId) {
        // Format: eip155:80002:0xADDRESS
        const vmWallet = vm.blockchainAccountId.split(':')[2]?.toLowerCase();
        return vmWallet === wallet;
      }
      return false;
    });
    
    if (!hasMatchingMethod && this.didDocument.verificationMethod.length > 0) {
      return next(new Error('DID document verification methods must reference issuer wallet address'));
    }
  }
  
  next();
});

const Issuer = mongoose.model("Issuer", issuerSchema);

export default Issuer;



