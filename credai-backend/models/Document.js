import mongoose from "mongoose";

// W3C Verifiable Credential Schema (nested)
const credentialSubjectSchema = new mongoose.Schema({
  id: { type: String, required: true },
  documentHash: { type: String, required: true },
  ipfsCid: { type: String, required: true },
  documentType: { type: String },
  uploadedBy: { type: String },
  expirationDate: { type: Date }
}, { _id: false });

const credentialStatusSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  statusPurpose: { type: String, enum: ['revocation', 'suspension'] },
  statusListIndex: { type: Number },
  statusListCredential: { type: String }
}, { _id: false });

const proofSchema = new mongoose.Schema({
  type: { type: String, required: true },
  created: { type: Date, required: true },
  verificationMethod: { type: String, required: true },
  signatureValue: { type: String, required: true },
  challenge: { type: String },
  domain: { type: String }
}, { _id: false });

const verifiableCredentialSchema = new mongoose.Schema({
  '@context': { type: [String], required: true },
  id: { type: String, required: true },
  type: { type: [String], required: true },
  issuer: { type: String, required: true },
  issuanceDate: { type: Date, required: true },
  credentialSubject: { type: credentialSubjectSchema, required: true },
  credentialStatus: { type: credentialStatusSchema },
  proof: { type: proofSchema }
}, { _id: false });

// Main Document Schema
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
    validate: {
      validator: function(v) {
        // CIDv0: Qm + 44 base58 characters (SHA-256, 256-bit hash)
        // CIDv1: More permissive - multibase prefix + variable length (20-100 chars)
        return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(v) || /^[a-z][a-z0-9]{20,100}$/i.test(v);
      },
      message: "Invalid IPFS CID format (must be valid CIDv0 or CIDv1)"
    }
  },
  uploader: { 
    type: String, 
    required: [true, "Uploader address is required"],
    match: [/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"],
    lowercase: true,
    index: true
  },
  docType: {
    type: String,
    enum: {
      values: ['general', 'passport', 'certificate', 'test-document', 'other'],
      message: '{VALUE} is not a valid document type'
    },
    default: 'general'
  },
  expirationDate: { 
    type: Date,
    validate: {
      validator: function(v) {
        // Only validate future date on new documents
        return !v || (this.isNew ? v > new Date() : true);
      },
      message: "Expiration date must be in the future for new documents"
    }
  },
  revoked: { 
    type: Boolean, 
    default: false,
    index: true
  },
  revocationTx: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^0x[a-fA-F0-9]{64}$/.test(v);
      },
      message: "Invalid transaction hash format"
    }
  },
  revokedAt: {
    type: Date,
    validate: {
      validator: function(v) {
        // revokedAt should only be set if revoked is true
        return !v || this.revoked === true;
      },
      message: "revokedAt can only be set when document is revoked"
    }
  },
  revocationReason: {
    type: String,
    maxlength: [500, 'Revocation reason cannot exceed 500 characters'],
    trim: true
  },
  verified: { 
    type: Boolean, 
    default: false 
  },
  issuerDID: {
    type: String,
    index: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        // Support multiple DID formats
        return /^did:ethr:maticamoy:0x[a-fA-F0-9]{40}(:\d+)?$/.test(v) || /^did:[a-z]+:[a-zA-Z0-9._%-]+$/.test(v);
      },
      message: "Invalid DID format"
    }
  },
  issuerName: {
    type: String,
    trim: true,
    maxlength: [100, 'Issuer name cannot exceed 100 characters']
  },
  issuerOrganization: {
    type: String,
    trim: true,
    maxlength: [100, 'Organization name cannot exceed 100 characters']
  },
  verifiableCredential: {
    type: verifiableCredentialSchema,
    default: null
  },
  credentialProof: {
    type: proofSchema,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt (replacing custom timestamp field)
  strict: true
});

// Compound Indexes for common queries (using createdAt from timestamps)
DocumentSchema.index({ uploader: 1, createdAt: -1 });
DocumentSchema.index({ revoked: 1, createdAt: -1 });
DocumentSchema.index({ issuerDID: 1, createdAt: -1 });
DocumentSchema.index({ expirationDate: 1, revoked: 1 });

// Virtual for checking if document is expired
DocumentSchema.virtual('isExpired').get(function() {
  return this.expirationDate && this.expirationDate < new Date();
});

// Virtual for checking if document is valid (not revoked and not expired)
DocumentSchema.virtual('isValid').get(function() {
  return !this.revoked && (!this.expirationDate || this.expirationDate > new Date());
});

/**
 * Instance method to revoke document
 * Prevents re-revocation to preserve audit trail
 */
DocumentSchema.methods.revoke = function(reason, transactionHash) {
  if (this.revoked) {
    throw new Error('Document is already revoked. Cannot revoke again.');
  }
  
  this.revoked = true;
  this.revokedAt = new Date();
  this.revocationReason = reason || 'Revoked by issuer';
  
  if (transactionHash) {
    this.revocationTx = transactionHash;
  }
  
  return this.save();
};

/**
 * Instance method to update revocation details (for admin corrections)
 */
DocumentSchema.methods.updateRevocation = function(reason, transactionHash) {
  if (!this.revoked) {
    throw new Error('Document is not revoked. Use revoke() method instead.');
  }
  
  if (reason) this.revocationReason = reason;
  if (transactionHash) this.revocationTx = transactionHash;
  
  return this.save();
};

/**
 * Instance method to check if document can be modified
 */
DocumentSchema.methods.canModify = function() {
  return !this.revoked; // Can't modify revoked documents
};

/**
 * Static method to find valid documents (not revoked, not expired)
 */
DocumentSchema.statics.findValid = function() {
  return this.find({
    revoked: false,
    $or: [
      { expirationDate: null },
      { expirationDate: { $gt: new Date() } }
    ]
  });
};

/**
 * Static method to find expired documents that haven't been revoked yet
 * (Useful for cleanup/processing tasks)
 */
DocumentSchema.statics.findExpiredNotRevoked = function() {
  return this.find({
    expirationDate: { $lte: new Date() },
    revoked: false
  });
};

/**
 * Static method to find ALL expired documents (including revoked)
 */
DocumentSchema.statics.findExpired = function() {
  return this.find({
    expirationDate: { $lte: new Date() }
  });
};

/**
 * Static method to find by issuer
 */
DocumentSchema.statics.findByIssuer = function(issuerDID) {
  return this.find({ issuerDID });
};

/**
 * Pre-save hook to validate revocation consistency and data integrity
 */
DocumentSchema.pre('save', function(next) {
  // If document is revoked, ensure revokedAt is set
  if (this.revoked && !this.revokedAt) {
    this.revokedAt = new Date();
  }
  
  // If document is not revoked, clear revocation fields
  if (!this.revoked) {
    this.revokedAt = null;
    this.revocationReason = null;
    this.revocationTx = null;
  }

  // Validate credential subject consistency (if VC exists)
  if (this.verifiableCredential && this.verifiableCredential.credentialSubject) {
    const subject = this.verifiableCredential.credentialSubject;
    
    // Check if key fields match between credential and document
    if (subject.documentHash && subject.documentHash !== this.fileHash) {
      return next(new Error('Credential subject documentHash does not match document fileHash'));
    }
    
    if (subject.ipfsCid && subject.ipfsCid !== this.ipfsCid) {
      return next(new Error('Credential subject ipfsCid does not match document ipfsCid'));
    }
    
    if (subject.uploadedBy && subject.uploadedBy.toLowerCase() !== this.uploader.toLowerCase()) {
      return next(new Error('Credential subject uploadedBy does not match document uploader'));
    }
  }
  
  next();
});

// Ensure virtuals are included in JSON output
DocumentSchema.set('toJSON', { virtuals: true });
DocumentSchema.set('toObject', { virtuals: true });

export default mongoose.models.Document || mongoose.model("Document", DocumentSchema);





