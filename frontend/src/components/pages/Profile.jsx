import { Box, Paper, Avatar, Typography, Button, Stack, Divider } from '@mui/material';
import bgImg from '../../img/bg.png';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicClient } from '../../utils/contract'; // Assuming you have publicClient set up
import { getAddress } from "viem";

const Profile = () => {
    const [account, setAccount] = useState("");
    const [balance, setBalance] = useState("0");
    const navigate = useNavigate();

    useEffect(() => {
        const getWalletData = async () => {
            if (window.ethereum) {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    const validatedAddress = getAddress(accounts[0]);
                    setAccount(validatedAddress);
                    const bal = await publicClient.getBalance({ address: accounts[0] });
                    setBalance(parseFloat(bal.toString() / 1e18).toFixed(4));
                }
            }
        };
        getWalletData();
    }, []);

    return (
        <Box sx={{ backgroundImage: `url(${bgImg})`, minHeight: "100vh", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Paper sx={{ width: "450px", p: 4, borderRadius: 5, textAlign: 'center' }}>
                <Avatar sx={{ width: 80, height: 80, m: 'auto', mb: 2, bgcolor: '#3f51b5' }}>
                    {account ? account[2].toUpperCase() : "?"}
                </Avatar>

                <Typography variant="h5" fontWeight="bold">Wallet Identity</Typography>

                <Box sx={{ bgcolor: '#f0f2f5', p: 2, borderRadius: 2, my: 3 }}>
                    <Typography variant="caption" color="textSecondary">CONNECTED ADDRESS</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                        {account || "No wallet connected"}
                    </Typography>
                </Box>

                <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
                    <Box>
                        <Typography variant="h6">{balance} ETH</Typography>
                        <Typography variant="caption">Balance</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box>
                        <Typography variant="h6">Mainnet</Typography>
                        <Typography variant="caption">Network</Typography>
                    </Box>
                </Stack>

                <Button fullWidth variant="contained" onClick={() => navigate(-1)}>
                    Back to Dashboard
                </Button>
            </Paper>
        </Box>
    );
}

export default Profile;