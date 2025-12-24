import { network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  // 1. Connect to network
  const { viem, networkName } = await network.connect();
  console.log("Connected to network:", networkName);

  // 2. Get wallet clients
  const [deployer] = await viem.getWalletClients();
  console.log("Deploying contracts with account:", deployer.account.address);

  // 3. Deploy contract
  const product = await viem.deployContract("ProductIdentification", []);

  console.log("----------------------------------------------------");
  console.log("✅ Product System deployed successfully!");
  console.log("📍 Contract Address:", product.address);
  console.log("----------------------------------------------------");

  // 4. FIX: Use process.cwd() instead of __dirname
  // process.cwd() starts at C:\Users\M\Documents\blcokchain\antiFake
  const rootDir = process.cwd();
  const frontendPath = path.join(rootDir, "frontend", "src", "utils", "deployed_addresses.json");

  const deploymentData = {
    "ProductIdentificationModule#ProductIdentification": product.address
  };

  // Ensure the directory exists
  const dir = path.dirname(frontendPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write the file
  fs.writeFileSync(
    frontendPath,
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("📝 Updated deployed_addresses.json at:", frontendPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });