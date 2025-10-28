# CredAI — Document Verification

Minimal frontend (Vite + React + Tailwind) and backend (Express + Hardhat + Tesseract).  
This repo contains two folders:

- credai-frontend — Vite + React + TypeScript UI
- credai-backend — Express API, Hardhat smart contract, OCR service

Quick start (Windows)
1. Frontend
   ```powershell
   cd c:\cred-ai\credai-frontend
   npm install
   npm run dev
   # open http://localhost:5173
   ```

2. Backend
   ```powershell
   cd c:\cred-ai\credai-backend
   npm install
   cp .env.example .env
   # update .env values, then:
   npm run dev
   ```

3. Hardhat (compile / deploy)
   ```powershell
   cd c:\cred-ai\credai-backend
   npm run compile
   npm run deploy --network goerli
   ```

Environment templates
- credai-backend/.env.example — example env for backend (RPC, keys, port, contract address)
- credai-frontend/.env.example — example env for frontend API base URL

Useful scripts (added to each package.json)
- Frontend: dev, build, preview
- Backend: start, dev (nodemon), compile, deploy, test

Folder highlights
- credai-frontend/src/components — UI parts (Navbar, HeroSection, FeatureCards, HistoryPanel, UploadModal, VerifyModal)
- credai-backend/routes — API routes (upload, verify, history, revoke, expired)
- credai-backend/contracts — DocumentStorage.sol
- credai-backend/services/tesseractService.js — OCR helper

Notes
- Do NOT commit real private keys. Use .env (gitignored).
- For local Ethereum testing use `npx hardhat node` and point RPC_URL to http://127.0.0.1:8545.



