import fs from "fs";
import path from "path";

const filePath = path.resolve(process.cwd(), "./artifacts/contracts/DocumentVerification.sol/DocumentVerification.json");

let jsonContent;
try {
  const rawData = fs.readFileSync(filePath, { encoding: "utf8" });
  jsonContent = JSON.parse(rawData);
  if (!jsonContent.abi) {
    throw new Error("ABI not found in artifact JSON");
  }
} catch (err) {
  console.error("Failed to load contract ABI from", filePath, ":", err?.message ?? String(err));
  throw err;
}

export const CONTRACT_ABI = jsonContent.abi;



