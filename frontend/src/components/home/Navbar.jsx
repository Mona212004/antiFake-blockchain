import * as React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import logoImg from "../../img/logo.png";
import { Container } from "@mui/system";
import CustomButton from "./CustomButton";
import { styled } from "@mui/material";
import { getWalletClient } from "../../utils/contract";

export const Navbar = ({ account, setAccount }) => {
    // Manufacturer Address (Account #0 in Hardhat)
    const manufacturerAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266".toLowerCase();

    useEffect(() => {
        if (window.ethereum) {
            const handleAccountsChanged = (accounts) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0].toLowerCase());
                } else {
                    setAccount(null);
                }
            };
            window.ethereum.on("accountsChanged", handleAccountsChanged);
            return () => {
                window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
            };
        }
    }, [setAccount]);

    const connectWallet = async () => {
        try {
            const walletClient = await getWalletClient();
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x539' }],
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0x539',
                            chainName: 'Hardhat Local',
                            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                            rpcUrls: ['http://127.0.0.1:8545'],
                        }],
                    });
                }
            }
            const [address] = await walletClient.getAddresses();
            setAccount(address.toLowerCase());
        } catch (error) {
            console.error("Connection failed:", error);
        }
    };

    const NavLink = styled(Typography)(({ theme }) => ({
        fontSize: "14px",
        color: "#4F5361",
        fontWeight: "bold",
        cursor: "pointer",
        textDecoration: "none",
        "&:hover": { color: "#0F1B4C" },
    }));

    const NavbarLinksBox = styled(Box)(({ theme }) => ({
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing(3),
        [theme.breakpoints.down("md")]: { display: "none" },
    }));

    const NavbarContainer = styled(Container)(({ theme }) => ({
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: theme.spacing(5),
        [theme.breakpoints.down("md")]: { padding: theme.spacing(2) },
    }));

    return (
        <NavbarContainer>
            <Box sx={{ display: "flex", alignItems: "center", gap: "2.5rem" }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Link to="/">
                        <img src={logoImg} alt="Identeefi" style={{ cursor: "pointer", height: "40px" }} />
                    </Link>
                </Box>

                <NavbarLinksBox>
                    <Link to="/" style={{ textDecoration: "none" }}>
                        <NavLink variant="body2">Home</NavLink>
                    </Link>

                    {/* FIX: HIDE "Verify Product" specifically for the Manufacturer */}
                    {account !== manufacturerAddress && (
                        <Link to="/scan" style={{ textDecoration: "none" }}>
                            <NavLink variant="body2">Verify Product</NavLink>
                        </Link>
                    )}

                    {account && (
                        <>
                            {account === manufacturerAddress ? (
                                <>
                                    <Link to="/manufacturer" style={{ textDecoration: "none" }}>
                                        <NavLink variant="body2">Manufacturer Dashboard</NavLink>
                                    </Link>
                                    <Link to="/add-product" style={{ textDecoration: "none" }}>
                                        <NavLink variant="body2">Add Product</NavLink>
                                    </Link>
                                </>
                            ) : (
                                <Link to="/retailer" style={{ textDecoration: "none" }}>
                                    <NavLink variant="body2">Retailer Portal</NavLink>
                                </Link>
                            )}
                        </>
                    )}
                </NavbarLinksBox>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                {account ? (
                    <Box sx={{ textAlign: 'right', border: '1px solid #0F1B4C', p: 1, borderRadius: 2 }}>
                        <Typography sx={{ fontSize: "10px", fontWeight: "bold", color: "#0F1B4C" }}>
                            WALLET CONNECTED
                        </Typography>
                        <Typography sx={{ fontSize: "12px", color: "gray", fontFamily: 'monospace' }}>
                            {account.substring(0, 6)}...{account.substring(account.length - 4)}
                        </Typography>
                    </Box>
                ) : (
                    <CustomButton
                        backgroundColor="#0F1B4C"
                        color="#fff"
                        buttonText="Connect Wallet"
                        onClick={connectWallet}
                    />
                )}
            </Box>
        </NavbarContainer>
    );
};

export default Navbar;