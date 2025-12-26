import * as React from "react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Box, Typography, Container, styled } from "@mui/material";
import logoImg from "../../img/logo.png";
import CustomButton from "./CustomButton";
import { getWalletClient } from "../../utils/contract";

export const Navbar = ({ account, setAccount }) => {
    const manufacturerAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266".toLowerCase();

    // Styled Components
    const NavLink = styled(Typography)(() => ({
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

    const connectWallet = async () => {
        try {
            const walletClient = await getWalletClient();
            const [address] = await walletClient.getAddresses();
            setAccount(address.toLowerCase());
        } catch (error) {
            console.error("Connection failed:", error);
        }
    };

    return (
        <Container sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: "2.5rem" }}>
                <Link to="/">
                    <img src={logoImg} alt="Logo" style={{ height: "40px" }} />
                </Link>

                <NavbarLinksBox>
                    <Link to="/" style={{ textDecoration: "none" }}>
                        <NavLink variant="body2">Home</NavLink>
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
                                <Link to="/retailer" style={{ textDecoration: "none" }}>
                                    <NavLink variant="body2">Retailer Portal</NavLink>
                                </Link>
                            )}
                        </>
                    )}
                </NavbarLinksBox>
            </Box>

            <Box>
                {account ? (
                    <Box sx={{ textAlign: 'right', border: '1px solid #0F1B4C', p: 1, borderRadius: 2 }}>
                        <Typography sx={{ fontSize: "10px", fontWeight: "bold" }}>CONNECTED</Typography>
                        <Typography sx={{ fontSize: "12px", fontFamily: 'monospace' }}>
                            {account.substring(0, 6)}...{account.substring(account.length - 4)}
                        </Typography>
                    </Box>
                ) : (
                    <CustomButton backgroundColor="#0F1B4C" color="#fff" buttonText="Connect Wallet" onClick={connectWallet} />
                )}
            </Box>
        </Container>
    );
};

export default Navbar;