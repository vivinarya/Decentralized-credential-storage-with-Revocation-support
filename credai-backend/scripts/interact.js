import pkg from 'hardhat';
import dotenv from 'dotenv';
dotenv.config();

const { ethers } = pkg;

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_AMOY_RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Load the deployed contract
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const contractABI = (await import(`../artifacts/contracts/CredentialStorage.sol/CredentialStorage.json`, { assert: { type: 'json' } })).default.abi;
  const contract = new ethers.Contract(contractAddress, contractABI, wallet);

  console.log("Connected to contract at:", contractAddress);

  // Example: call contract function
  const tx = await contract.storeCredential("John Doe", "Blockchain Dev");
  await tx.wait();
  console.log("Credential stored successfully!");

  const result = await contract.getCredential("John Doe");
  console.log("Retrieved credential:", result);
}

main().catch(console.error);