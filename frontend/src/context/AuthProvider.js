import { createContext, useState, useEffect } from "react";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState({
        walletAddress: null,
        isConnected: false
    });

    // --- SYSTEM ALIGNMENT: Listen for Wallet Changes ---
    useEffect(() => {
        const checkWallet = async () => {
            if (window.ethereum) {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    setAuth({
                        walletAddress: accounts[0].toLowerCase(),
                        isConnected: true
                    });
                }
            }
        };

        checkWallet();

        // Handle Account Changes (e.g. user switches from Manufacturer to Retailer wallet)
        window.ethereum?.on('accountsChanged', (accounts) => {
            if (accounts.length > 0) {
                setAuth({
                    walletAddress: accounts[0].toLowerCase(),
                    isConnected: true
                });
            } else {
                setAuth({ walletAddress: null, isConnected: false });
            }
        });
    }, []);

    return (
        <AuthContext.Provider value={{ auth, setAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthContext;