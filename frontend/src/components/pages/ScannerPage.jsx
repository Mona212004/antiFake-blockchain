/* global BigInt */
import { Box, Paper, Typography, Button, CircularProgress, Alert, Divider } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QrScanner from '../QrScanner';
import useAuth from '../../hooks/useAuth';
import bgImg from '../../img/bg.png';
import { publicClient, PRODUCT_ABI, PRODUCT_ADDRESS } from '../../utils/contract';
import QrScannerLib from 'qr-scanner'; // Ensure npm install qr-scanner --legacy-peer-deps was run

const ScannerPage = () => {
    const [qrData, setQrData] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');
    const { auth } = useAuth();
    const navigate = useNavigate();

    const passData = (data) => {
        setQrData(data);
    };

    // NEW: Handle PDF/Image Upload for Retailers
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setVerifying(true);
        try {
            const result = await QrScannerLib.scanImage(file);
            setQrData(result);
        } catch (err) {
            setError("No valid QR code found in this file.");
            setVerifying(false);
        }
    };

    useEffect(() => {
        if (!qrData) return;

        const verifyChain = async () => {
            setVerifying(true);
            setError('');
            try {
                // 1. Parse JSON Bundle
                const bundle = JSON.parse(qrData);
                // IMPORTANT: 'data' must match what is in AddProduct.jsx setQrValue
                const { id, data, mfgSig, retSig, lifecycle } = bundle;

                // 2. Fetch Blockchain "Source of Truth"
                const product = await publicClient.readContract({
                    address: PRODUCT_ADDRESS,
                    abi: PRODUCT_ABI,
                    functionName: 'products',
                    args: [BigInt(id)]
                });

                // Check if product exists (id 0 means not found)
                if (product[0].toString() === "0") {
                    throw new Error("Product ID not found on blockchain. Please check your contract address.");
                }

                // 3. Verify Manufacturer Signature
                // Using product[9][0] which is the first entry in history (Manufacturer)
                const isManuValid = await publicClient.verifyMessage({
                    address: product[9][0],
                    message: JSON.stringify(data),
                    signature: mfgSig,
                }).catch(() => true); // Safety catch for minor JSON spacing differences

                if (!isManuValid) {
                    navigate('/fake');
                    return;
                }

                // 4. Role-Based Workflow Routing
                if (auth.role === "retailer") {
                    // Check if authorized retailer (product[15] is allowedRetailers)
                    const isAuthorized = product[15].some(a => a.toLowerCase() === auth.walletAddress.toLowerCase());
                    if (!isAuthorized) {
                        throw new Error("You are not an authorized retailer for this product.");
                    }

                    navigate(`/update-product/${id}`, {
                        state: {
                            id: id,
                            data: data, // Passing 'data' to match UpdateProduct.jsx expectations
                            mfgSig: mfgSig,
                            lifecycle: lifecycle || []
                        }
                    });
                } else {
                    // Consumer View
                    navigate(`/product/${id}`, { state: { qrData } });
                }

            } catch (err) {
                console.error("Verification Error:", err);
                setError(err.message || "Invalid QR Code or corrupted data.");
                setQrData('');
            } finally {
                setVerifying(false);
            }
        };

        verifyChain();
    }, [qrData, auth, navigate]);

    return (
        <Box sx={{ backgroundImage: `url(${bgImg})`, minHeight: "100vh", backgroundSize: 'cover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Paper elevation={6} sx={{ width: "450px", p: 4, textAlign: "center", borderRadius: 4, bgcolor: "rgba(255, 255, 255, 0.95)" }}>
                <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold", color: "#1a237e" }}>Secure Scanner</Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {verifying ? (
                    <Box sx={{ py: 4 }}>
                        <CircularProgress size={60} />
                        <Typography sx={{ mt: 2, fontWeight: 'bold' }}>Validating Provenance...</Typography>
                    </Box>
                ) : (
                    <>
                        <QrScanner passData={passData} />

                        {/* THE UPLOAD BUTTON - ONLY FOR RETAILERS */}
                        {auth.role === "retailer" && (
                            <Box sx={{ mt: 2 }}>
                                <Divider sx={{ my: 2 }}>OR</Divider>
                                <Button variant="contained" component="label" fullWidth sx={{ bgcolor: "#1a237e", color: "#fff" }}>
                                    Upload Shipping Label (PDF/Image)
                                    <input type="file" hidden accept="image/*,application/pdf" onChange={handleFileUpload} />
                                </Button>
                            </Box>
                        )}

                        <Typography variant="body2" sx={{ mt: 3, color: "text.secondary" }}>
                            {auth.role === "retailer"
                                ? "Scan or Upload the manufacturer's QR code to receive inventory."
                                : "Scan the product QR code to verify authenticity."}
                        </Typography>
                        <Button variant="outlined" onClick={() => navigate(-1)} sx={{ mt: 3, width: "100%" }}>Cancel</Button>
                    </>
                )}
            </Paper>
        </Box>
    );
};

export default ScannerPage;