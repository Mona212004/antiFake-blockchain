/* global BigInt */
import { createPublicClient, createWalletClient, http, custom, defineChain, getAddress } from "viem";
import deployedAddresses from './deployed_addresses.json';
import ProductData from '../abis/ProductIdentification.json';

// 1. Define the custom chain
const localChain = defineChain({
    id: 1337, // Change to 31337 if using Hardhat
    name: 'Localhost 8545',
    network: 'localhost 8545',
    nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
    rpcUrls: {
        default: { http: ['http://127.0.0.1:8545'] },
        public: { http: ['http://127.0.0.1:8545'] },
    },
});

// 2. Export Contract Details - FIXED: Only one declaration
export const PRODUCT_ADDRESS = getAddress(deployedAddresses["ProductIdentificationModule#ProductIdentification"]);
export const PRODUCT_ABI = ProductData.abi;

export const publicClient = createPublicClient({
    chain: localChain,
    transport: http("http://127.0.0.1:8545", {
        batch: true // Helps with multiple rapid calls
    }),
    pollingInterval: 1_000, // Sync every second
});

// 3. Wallet Client with Auto-Switch
export const getWalletClient = async () => {
    if (!window.ethereum) {
        alert("Please install MetaMask!");
        return null;
    }

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x539' }], // 0x539 = 1337. Use 0x7a69 for 31337.
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x539',
                        chainName: 'Localhost 8545',
                        rpcUrls: ['http://127.0.0.1:8545'],
                        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                        blockExplorerUrls: null
                    }],
                });
            } catch (addError) {
                console.error("User denied adding the local network");
            }
        }
    }

    return createWalletClient({
        chain: localChain,
        transport: custom(window.ethereum),
    });
};