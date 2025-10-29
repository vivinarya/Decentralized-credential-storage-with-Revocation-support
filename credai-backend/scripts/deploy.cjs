const hre = require("hardhat");

async function main() {
  console.log("Deploying updated DocumentVerification contract...");

  const DocumentVerification = await hre.ethers.getContractFactory("DocumentVerification");
  const contract = await DocumentVerification.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\n===================================");
  console.log("DocumentVerification deployed to:", address);
  console.log("===================================");
  console.log("\nUpdate your .env file with:");
  console.log(`CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




