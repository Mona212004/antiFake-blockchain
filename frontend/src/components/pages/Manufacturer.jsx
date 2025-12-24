import CustomButton from "../home/CustomButton";
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Box, Button as Btn, Typography, Paper, Chip, Divider, Stack } from '@mui/material';
import FactoryIcon from '@mui/icons-material/Factory';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PublicIcon from '@mui/icons-material/Public';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

// Import contract utilities (removed Counter)
import { publicClient, PRODUCT_ABI, PRODUCT_ADDRESS } from '../../utils/contract';

const Manufacturer = () => {
    const [currentAccount, setCurrentAccount] = useState("");
    const [myProductCount, setMyProductCount] = useState("0");

    const connectWallet = async () => {
        if (window.ethereum) {
            await window.ethereum.request({ method: "eth_requestAccounts" });
        }
    };

    const fetchBlockchainData = async (account) => {
        try {
            // Use productCount for stats (removed Counter)
            const pCount = await publicClient.readContract({
                address: PRODUCT_ADDRESS,
                abi: PRODUCT_ABI,
                functionName: 'productCount'
            });
            setMyProductCount(pCount.toString());
        } catch (err) {
            console.error("Blockchain Sync Error", err);
        }
    };

    useEffect(() => {
        const init = async () => {
            if (window.ethereum) {
                const accounts = await window.ethereum.request({ method: "eth_accounts" });
                if (accounts.length !== 0) {
                    setCurrentAccount(accounts[0]);
                    fetchBlockchainData(accounts[0]);
                }

                // Listen for account changes (MetaMask account switching)
                window.ethereum.on('accountsChanged', (accounts) => {
                    const newAccount = accounts[0] || "";
                    setCurrentAccount(newAccount);
                    if (newAccount) fetchBlockchainData(newAccount);
                });
            }
        };
        init();
    }, []);

    return (
        <div className="manufacturer-page">
            <div className="manufacturer-content">
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Manufacturer Portal</Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary' }}>Securely register and track products on blockchain</Typography>
                </Box>

                <Paper sx={{ p: 3, borderRadius: 3, mb: 4 }}>
                    <Stack direction="row" spacing={3} justifyContent="space-around">
                        <Box textAlign="center">
                            <FactoryIcon sx={{ fontSize: 40, color: '#0F1B4C' }} />
                            <Typography variant="h6">{myProductCount}</Typography>
                            <Typography variant="caption">Products Registered</Typography>
                        </Box>
                        <Box textAlign="center">
                            <AssessmentIcon sx={{ fontSize: 40, color: '#0F1B4C' }} />
                            <Typography variant="h6">Active</Typography>
                            <Typography variant="caption">Supply Chain Status</Typography>
                        </Box>
                        <Box textAlign="center">
                            <AccountBalanceWalletIcon sx={{ fontSize: 40, color: '#0F1B4C' }} />
                            <Typography variant="h6">{currentAccount ? 'Connected' : 'Disconnected'}</Typography>
                            <Typography variant="caption">Wallet Status</Typography>
                        </Box>
                    </Stack>
                </Paper>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {currentAccount ? (
                        <>
                            <Link to="/add-product" style={{ textDecoration: 'none' }}>
                                <CustomButton className="btns" buttonStyle='btn--primary' buttonSize='btn--large'>
                                    <AddCircleOutlineIcon sx={{ mr: 1 }} />
                                    Register & Sign New Product
                                </CustomButton>
                            </Link>

                            <Link to="/inventory" style={{ textDecoration: 'none' }}>
                                <CustomButton className="btns" buttonStyle='btn--long' buttonSize='btn--large'>
                                    <QrCodeScannerIcon sx={{ mr: 1 }} />
                                    Manage & Generate QR Labels
                                </CustomButton>
                            </Link>

                            <Link to="/profile" style={{ textDecoration: 'none' }}>
                                <CustomButton className="btns" buttonStyle='btn--outline' buttonSize='btn--large'>
                                    View Digital Identity
                                </CustomButton>
                            </Link>
                        </>
                    ) : (
                        <CustomButton
                            className="btns"
                            buttonStyle='btn--primary'
                            buttonSize='btn--large'
                            onClick={connectWallet}
                            style={{ backgroundColor: '#ff9800' }}
                        >
                            Connect Wallet to Initialize
                        </CustomButton>
                    )}
                </Box>

                <Box sx={{ mt: 5, p: 2, borderRadius: 2, bgcolor: '#e3f2fd', border: '1px solid #2196f3' }}>
                    <Typography variant="caption" sx={{ color: '#0d47a1', fontWeight: 'bold', display: 'block' }}>
                        Protocol Reminder:
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666', lineHeight: 1.2 }}>
                        All products registered here are cryptographically signed by your wallet.
                        This establishes the <b>Source of Truth</b> for the entire lifecycle.
                    </Typography>
                </Box>
            </div>
        </div>
    );
}

export default Manufacturer;