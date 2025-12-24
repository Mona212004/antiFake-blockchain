import { useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, Divider, Chip } from '@mui/material';
import bgImg from '../../img/bg.png';
import { useNavigate } from 'react-router-dom';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import GppBadIcon from '@mui/icons-material/GppBad';
import SecurityIcon from '@mui/icons-material/Security';
import PublicIcon from '@mui/icons-material/Public';
// Removed Counter utilities
import { publicClient, PRODUCT_ABI, PRODUCT_ADDRESS } from '../../utils/contract';

const FakeProduct = () => {
    const navigate = useNavigate();
    const [systemStats, setSystemStats] = useState("...");

    // Replaced with productCount
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const count = await publicClient.readContract({
                    address: PRODUCT_ADDRESS,
                    abi: PRODUCT_ABI,
                    functionName: 'productCount'
                });
                setSystemStats(count.toString());
            } catch (err) {
                console.error("Fetch failed", err);
            }
        };
        fetchStats();
    }, []);

    return (
        <Box sx={{
            backgroundImage: `url(${bgImg})`,
            minHeight: "100vh",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2
        }}>
            {/* Global Context: Showing the system is alive despite this failure */}
            <Chip
                icon={<PublicIcon style={{ color: '#fff' }} />}
                label={`System has secured ${systemStats} authentic products`}
                sx={{ mb: 2, bgcolor: 'rgba(15, 27, 76, 0.8)', color: '#fff', fontWeight: 'bold' }}
            />

            <Paper sx={{ p: 4, maxWidth: 400, textAlign: 'center', borderRadius: 4, bgcolor: '#fff' }}>
                <GppBadIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h5" fontWeight="bold" color="error" gutterBottom>Counterfeit Detected</Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mb: 3 }}>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        ❌ Cryptographic Signatures are missing or altered
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                        ❌ Supply Chain Provenance cannot be established
                    </Typography>
                </Box>

                <Box sx={{ bgcolor: '#fff5f5', p: 2, borderRadius: 2, mb: 3, border: '1px solid #ffcdd2' }}>
                    <Typography variant="body2" sx={{ color: "#c62828", lineHeight: 1.6 }}>
                        This product failed to clear our <b>Ethereum Blockchain security layer</b>.
                        It does not possess the unique digital identity assigned by authorized manufacturers.
                    </Typography>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => navigate('/')}
                        startIcon={<ReportProblemIcon />}
                        sx={{ py: 1.5, fontWeight: 'bold', borderRadius: '12px' }}
                    >
                        Report Counterfeit Attempt
                    </Button>

                    <Button
                        variant="outlined"
                        onClick={() => navigate('/')}
                        startIcon={<SecurityIcon />}
                        sx={{ py: 1.5, color: "#444", borderColor: '#ccc', borderRadius: '12px' }}
                    >
                        Scan Different Product
                    </Button>
                </Box>

                <Typography variant="caption" sx={{ display: 'block', mt: 3, color: '#888' }}>
                    Contract Query Status: PRODUCT_NOT_FOUND (0x0)
                </Typography>
            </Paper>
        </Box>
    );
};

export default FakeProduct;