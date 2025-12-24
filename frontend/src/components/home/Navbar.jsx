import * as React from "react";
import { useState, useEffect } from "react"; // Combine them here
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import logoImg from "../../img/logo.png";
import { Container } from "@mui/system";
import CustomButton from "./CustomButton";
import { styled } from "@mui/material";

// FIX: Added getWalletClient to the import list below
import { getWalletClient, publicClient, PRODUCT_ABI, PRODUCT_ADDRESS } from "../../utils/contract";

export const Navbar = ({ account, setAccount }) => {
  const [mobileMenu, setMobileMenu] = useState({ left: false });

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

      // Cleanup listener on unmount
      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
  }, [setAccount]);

  const connectWallet = async () => {
    try {
      const walletClient = await getWalletClient();

      // FORCE SWITCH TO LOCALHOST 1337
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x539' }], // 0x539 is the hex for 1337
        });
      } catch (switchError) {
        // This error code means the chain has not been added to MetaMask.
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

          {/* 1. PUBLIC/CONSUMER LINK: Points to the scanner for everyone */}
          <Link to="/scan" style={{ textDecoration: "none" }}>
            <NavLink variant="body2">Verify Product</NavLink>
          </Link>

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
                /* 2. RETAILER LINK: Points to the actual Retailer dashboard */
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