import { defineConfig } from "hardhat/config";
// In HH3/ESM, you can import the plugin directly like this:
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

export default defineConfig({
  // Register the toolbox plugin
  plugins: [hardhatToolboxViem],

  solidity: "0.8.28",

  networks: {
    // Internal simulated network (used for 'npx hardhat test')
    hardhat: {
      type: "edr-simulated",
      chainId: 1337,
    },
    // The node you run with 'npx hardhat node'
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
  },
});