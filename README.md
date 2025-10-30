# CredAI — Decentralized Document Verification

> **Production-ready blockchain-based credential storage**  
> Built with W3C Verifiable Credentials, DID support, and on-chain revocation.

---

##  Overview

**CredAI** enables decentralized, verifiable document storage and credential verification.  
Documents are registered on the **Polygon Amoy Testnet**, stored on **IPFS (Pinata)**, and verified through **DID-based authentication**.

---

##  Repository Structure

```
credai/
├── credai-frontend/        # React + TypeScript + Vite Frontend
│   ├── src/
│   │   ├── components/     # UI Components
│   │   ├── api.ts          # Axios Config
│   │   └── App.tsx         # Root Component
│   └── package.json
│
└── credai-backend/         # Express + MongoDB + Redis + Hardhat
    ├── routes/             # API Routes
    ├── models/             # Mongoose Schemas
    ├── services/           # DID & VC Logic
    ├── contracts/          # Solidity Smart Contracts
    ├── config/             # Redis Config
    ├── index.js            # Express Entry Point
    └── package.json
```

---

## Quick Start (Windows)

### 1. Frontend Setup
```bash
cd c:\cred-ai\credai-frontend
npm install
npm run dev
```
Open **http://localhost:5173**

### 2. Backend Setup
```bash
cd c:\cred-ai\credai-backend
npm install
```

Update the `.env` file with your credentials as shown below.

---

##  Environment Setup

| Section | Variable | Example / Description |
|----------|-----------|-----------------------|
| **Server** | `PORT` | `5000` |
| **Database** | `MONGODB_URI` | `mongodb+srv://username:password@cluster.mongodb.net/credai` |
| | `REDIS_URL` | `redis://localhost:6379` |
| **Blockchain (Polygon Amoy)** | `NETWORK` | `https://rpc-amoy.polygon.technology` |
| | `PRIVATE_KEY` | `your_wallet_private_key_without_0x` |
| | `CONTRACT_ADDRESS` | `your_deployed_contract_address` |
| | `POLYGON_DID_REGISTRY` | `0xcB80F37eDD2bE3570c6C9D5B0888614E04E1e49E` |
| **IPFS (Pinata)** | `PINATA_API_KEY` | `your_pinata_api_key` |
| | `PINATA_API_SECRET` | `your_pinata_secret` |
| **Security Keys** | `DID_ENCRYPTION_KEY` | `crypto.randomBytes(32).toString('hex')` |
| | `REVOKE_API_KEY` | `generate_random_api_key` |
| **Optional** | `API_BASE_URL` | `http://localhost:5000` |

---

##  Smart Contract (Polygon Amoy)

**File:** `contracts/DocumentStorage.sol`

**Functions:**
```solidity
function registerDocument(bytes32 fileHash, uint256 expirationTimestamp) external
function revokeDocument(bytes32 fileHash) external
function verifyDocument(bytes32 fileHash) external view returns (DocumentInfo)
```

**Events:**
```solidity
event DocumentRegistered(bytes32 fileHash, address uploader, uint256 timestamp)
event DocumentRevoked(bytes32 fileHash, address revoker, uint256 timestamp)
```

**Deployed Details:**
| Property | Value |
|-----------|--------|
| **Contract Address** | `0x0E2c6688D3e7D54CF397410566E99DA052653203` |
| **Network** | Polygon Amoy (Chain ID: 80002) |
| **DID Registry** | `0xcB80F37eDD2bE3570c6C9D5B0888614E04E1e49E` |

---

## Hardhat Commands

```bash
cd c:\cred-ai\credai-backend
npm run compile
npm run deploy -- --network amoy
```

---

## Prerequisites

| Requirement | Description |
|--------------|-------------|
| **Node.js v18+ & npm** | Runtime environment |
| **MongoDB Atlas / Local** | Document database |
| **Redis (port 6379)** | Caching and session store |
| **MetaMask Extension** | Wallet authentication |
| **Polygon Amoy Testnet Tokens** | For gas transactions |
| **Pinata Account** | IPFS decentralized storage |

**Install Redis (Recommended via Docker):**
```bash
docker run -d -p 6379:6379 redis:alpine
```
Alternatively, download from:  
[https://github.com/microsoftarchive/redis/releases](https://github.com/microsoftarchive/redis/releases)

---

## Key Features

### Core Functionality
- **Blockchain Registration** — Immutable proofs stored on Polygon  
- **IPFS Storage** — Decentralized file hosting via Pinata  
- **W3C Verifiable Credentials** — Standards-compliant credential issuance  
- **DID Authentication** — Uses `did:ethr:maticamoy`  
- **On-Chain Revocation** — Secure document revocation with audit trails  
- **Expiration Management** — Auto-status updates on expiry  
- **Real-Time Verification** — Instant blockchain confirmation  

### Security
- AES-256 private key encryption  
- Regex protection for DID lookups  
- CORS with configurable origins  
- Transaction retry (3 attempts)  
- File size limit (50MB)  
- Cryptographically secure nonces  
- Data consistency validation  

---

## API Endpoints

### Document Operations
| Method | Endpoint | Description |
|---------|-----------|-------------|
| `POST` | `/api/upload` | Upload and register a document |
| `GET` | `/api/verify/:fileHash` | Verify document by hash |
| `POST` | `/api/verify` | Verify with file buffer |
| `POST` | `/api/revoke` | Revoke a document |
| `GET` | `/api/history` | Get user’s upload history |

### DID / Issuer Management
| Method | Endpoint | Description |
|---------|-----------|-------------|
| `POST` | `/api/did/register` | Register issuer with DID |
| `GET` | `/api/did/wallet/:address/profiles` | Get issuer profiles by wallet |
| `GET` | `/api/did/:did` | Resolve DID document |

### User Authentication
| Method | Endpoint | Description |
|---------|-----------|-------------|
| `POST` | `/api/user/auth` | Authenticate wallet |
| `POST` | `/api/user/logout` | Logout user |

---

##Available Scripts

### Frontend (`credai-frontend`)
| Command | Description |
|----------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint TypeScript files |

### Backend (`credai-backend`)
| Command | Description |
|----------|-------------|
| `npm run dev` | Start development server (nodemon) |
| `npm start` | Start production server |
| `npm run compile` | Compile smart contracts |
| `npm run deploy` | Deploy contracts to Polygon Amoy |
| `npm test` | Run backend tests |

---

## Tech Stack

| Layer | Technologies |
|--------|---------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, ethers.js v6, Vite |
| **Backend** | Node.js, Express, MongoDB, Redis, IPFS (Pinata) |
| **Blockchain** | Polygon Amoy Testnet, Solidity 0.8.x, Hardhat, ethr-did, did-resolver |







