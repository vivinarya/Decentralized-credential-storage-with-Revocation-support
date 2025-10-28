import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const DocumentStorage = await hre.ethers.getContractFactory("DocumentStorage");
  console.log("Deploying DocumentStorage...");

  const contract = await DocumentStorage.deploy();

  // Use waitForDeployment() in ethers v6
  await contract.waitForDeployment();

  console.log("Contract deployed at:", contract.target);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exit(1);
});


