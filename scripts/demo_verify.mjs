import { createPublicClient, http, parseAbi } from "viem";
import { localhost } from "viem/chains";

// 1. Setup the Client (Connecting to your 'npx hardhat node')
const client = createPublicClient({
    chain: localhost,
    transport: http("http://127.0.0.1:8545"),
});

const CONTRACT_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";

// 2. Define the ABI (Just the functions we want to test)
const abi = parseAbi([
    "function productCount() view returns (uint256)",
    "function products(uint256) view returns (uint256 id, string name, string description, string manufactDate, address currentOwner, bool isSold)"
]);

async function verify() {
    console.log("--- Anti-Fake Blockchain Verification ---");

    // Fetch Product Count
    const count = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "productCount",
    });
    console.log(`Total Products: ${count}`);

    // Fetch the first seeded product (Rolex)
    const product = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "products",
        args: [1n],
    });

    console.log(`Product #1: ${product[1]}`); // Name
    console.log(`Status: ${product[5] ? "Sold" : "Available"}`);
}

verify();