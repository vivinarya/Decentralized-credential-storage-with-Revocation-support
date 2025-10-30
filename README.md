# CredAI — Decentralized Document Verification

**Production-ready blockchain-based credential storage with W3C Verifiable Credentials, DID support, and on-chain revocation.**

This repository contains:
- **credai-frontend** — Vite + React + TypeScript UI with MetaMask integration
- **credai-backend** — Express API + MongoDB + Redis + Hardhat contracts + DID/VC services

---

## Quick Start (Windows)

### 1. Frontend
cd c:\cred-ai\credai-frontend
npm install

Open http://localhost:5173

### 2. Backend
cd c:\cred-ai\credai-backend
npm install

Update .env with your credentials (see Environment Setup below)

# Server
PORT=5000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/credai
REDIS_URL=redis://localhost:6379

# Blockchain (Polygon Amoy Testnet)
NETWORK=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_wallet_private_key_without_0x
CONTRACT_ADDRESS=your_deployed_contract_address
POLYGON_DID_REGISTRY=0xcB80F37eDD2bE3570c6C9D5B0888614E04E1e49E

# IPFS Storage (Pinata)
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_secret

# Security Keys
DID_ENCRYPTION_KEY=generate_using_crypto.randomBytes(32).toString('hex')
REVOKE_API_KEY=generate_random_api_key

# Optional
API_BASE_URL=http://localhost:5000

### 3. Hardhat (Compile / Deploy)

cd c:\cred-ai\credai-backend
npm run compile
npm run deploy -- --network amoy



---

## Prerequisites
- **Node.js** v18+ and npm
- **MongoDB Atlas** account (or local MongoDB)
- **Redis** server running on port 6379
- **MetaMask** browser extension
- **Polygon Amoy testnet** tokens ([Get from faucet](https://faucet.polygon.technology))
- **Pinata** account for IPFS storage

### Install Redis (Windows)
Using Docker (recommended)
docker run -d -p 6379:6379 redis:alpine

Or download from: https://github.com/microsoftarchive/redis/releases


---

## Key Features

### Core Functionality
- Blockchain Registration — Documents stored on Polygon with immutable proofs
- IPFS Storage — Decentralized file storage via Pinata
- W3C Verifiable Credentials — Standard-compliant credential issuance
- DID (Decentralized Identifiers) — Issuer authentication using `did:ethr:maticamoy`
- On-Chain Revocation — Documents can be revoked with audit trail
- Expiration Management — Automatic status updates based on expiration dates
- Real-Time Verification — Instant blockchain confirmation

### Security Features
- AES-256 encryption for private keys
- Regex injection protection for DID lookups
- CORS protection with configurable origins
- Transaction retry logic (max 3 attempts)
- File size limits (50MB) to prevent DoS
- Cryptographically secure nonces for challenges
- Consistency validation between blockchain and database

---

## Project Structure
credai/
├── credai-frontend/
│ ├── src/
│ │ ├── components/ # React components
│ │ │ ├── Header.tsx
│ │ │ ├── HeroSection.tsx
│ │ │ ├── UploadModal.tsx
│ │ │ ├── VerifyModal.tsx
│ │ │ ├── ExpiredChecker.tsx
│ │ │ ├── RevocationPanel.tsx
│ │ │ ├── HistoryPanel.tsx
│ │ │ ├── RegisterIssuerModal.tsx
│ │ │ └── FAQCollapse.tsx
│ │ ├── api.ts # Axios configuration
│ │ └── App.tsx # Main app component
│ └── package.json
│
├── credai-backend/
│ ├── routes/
│ │ ├── upload.js # Document upload API
│ │ ├── verify.js # Verification API
│ │ ├── revoke.js # Revocation API
│ │ ├── history.js # User history API
│ │ └── did.js # DID/Issuer management
│ ├── models/
│ │ ├── Document.js # Document schema
│ │ ├── Issuer.js # Issuer/DID schema
│ │ └── User.js # User schema
│ ├── services/
│ │ ├── vcService.js # Verifiable Credentials logic
│ │ └── didService.js # DID operations
│ ├── contracts/
│ │ └── DocumentStorage.sol # Smart contract
│ ├── config/
│ │ └── redis.js # Redis configuration
│ └── index.js # Express server entry
│
└── README.md


---

## Available Scripts

### Frontend (`credai-frontend/package.json`)
npm run dev # Start development server (Vite)
npm run build # Build for production
npm run preview # Preview production build
npm run lint # Lint TypeScript files


### Backend (`credai-backend/package.json`)
npm start # Start production server
npm run dev # Start development server (nodemon)
npm run compile # Compile smart contracts
npm run deploy # Deploy to Polygon Amoy
npm test # Run tests


---

## API Endpoints

### Document Operations
- `POST /api/upload` — Upload and register document
- `GET /api/verify/:fileHash` — Verify document by hash
- `POST /api/verify` — Verify with file buffer
- `POST /api/revoke` — Revoke a document
- `GET /api/history` — Get user's upload history

### DID/Issuer Management
- `POST /api/did/register` — Register as issuer with DID
- `GET /api/did/wallet/:address/profiles` — Get issuer profiles by wallet
- `GET /api/did/:did` — Resolve DID document

### User Authentication
- `POST /api/user/auth` — Authenticate wallet
- `POST /api/user/logout` — Logout user

---

## Smart Contract

### DocumentStorage.sol (Deployed on Polygon Amoy)
// Key Functions:
function registerDocument(bytes32 fileHash, uint256 expirationTimestamp) external
function revokeDocument(bytes32 fileHash) external
function verifyDocument(bytes32 fileHash) external view returns (DocumentInfo)

// Events:
event DocumentRegistered(bytes32 fileHash, address uploader, uint256 timestamp)
event DocumentRevoked(bytes32 fileHash, address revoker, uint256 timestamp)

**Contract Address:** `0x0E2c6688D3e7D54CF397410566E99DA052653203`  
**Network:** Polygon Amoy (Chain ID: 80002)  // for testing purposes only
**DID Registry:** `0xcB80F37eDD2bE3570c6C9D5B0888614E04E1e49E`

---

## Tech Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- ethers.js v6
- Vite

### Backend
- Node.js + Express
- MongoDB (Mongoose)
- Redis (caching)
- IPFS (Pinata)

### Blockchain
- Polygon Amoy Testnet
- Solidity 0.8.x
- Hardhat
- ethr-did / did-resolver







