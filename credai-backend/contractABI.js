import fs from "fs";
import path from "path";

const filePath = path.resolve("./artifacts/contracts/DocumentStorage.sol/DocumentStorage.json");
const rawData = fs.readFileSync(filePath);
const jsonContent = JSON.parse(rawData);

export const CONTRACT_ABI = jsonContent.abi;

