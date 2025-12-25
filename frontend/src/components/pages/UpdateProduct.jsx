/* global BigInt */
import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box, Paper, Typography, TextField, Button, CircularProgress,
    Stack, Dialog, DialogTitle, DialogContent, DialogActions,
    List, ListItem, ListItemText, Divider, Chip, Alert
} from '@mui/material';
import QRCode from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { getWalletClient, publicClient, PRODUCT_ABI, PRODUCT_ADDRESS } from '../../utils/contract';
import { getAddress } from "viem";

const UpdateProduct = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const componentRef = useRef(null);

    // All hooks must be called unconditionally
    const [shopName, setShopName] = useState("");
    const [locationInput, setLocationInput] = useState("");
    const [finalQR, setFinalQR] = useState("");
    const [loading, setLoading] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [receptionTimestamp, setReceptionTimestamp] = useState("");

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
    });

    // Now validate ID after hooks
    const rawId = state?.id;
    let productId;
    try {
        productId = BigInt(rawId);
    } catch (err) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Alert severity="error" sx={{ maxWidth: 600, mx: 'auto' }}>
                    Invalid Product ID. Please scan a valid QR code.
                </Alert>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/scan')}>
                    Back to Scanner
                </Button>
            </Box>
        );
    }

    const details = state?.data;
    const mfgSig = state?.mfgSig;
    const lifecycle = state?.lifecycle || [];
    const originalIntendedRetailer = state?.intendedRetailer || "Unknown Shop";

    const manufacturerEntry = lifecycle[0] || {};
    const manufacturerName = manufacturerEntry.entity || 'Unknown Manufacturer';
    const originLocation = manufacturerEntry.location || 'Not specified';
    const productionDate = manufacturerEntry.time
        ? new Date(manufacturerEntry.time).toLocaleString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : 'Unknown Date';

    const handleReview = () => {
        if (!shopName.trim() || !locationInput.trim()) {
            alert("Please fill in your shop name and location.");
            return;
        }
        const now = new Date().toLocaleString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        setReceptionTimestamp(now);
        setShowReview(true);
    };

    const handleConfirmAndSign = async () => {
        setLoading(true);
        try {
            const wallet = await getWalletClient();
            const [account] = await wallet.getAddresses(); // This is the Retailer's address
            const retailerAddress = getAddress(account);
            const timestamp = new Date().toISOString();

            // 1. Send the transaction to the blockchain
            // We pass the retailer's address as the "signature" string to the contract
            const txHash = await wallet.writeContract({
                account,
                address: PRODUCT_ADDRESS,
                abi: PRODUCT_ABI,
                functionName: 'retailerReceive',
                args: [productId, locationInput, retailerAddress, shopName, timestamp],
            });

            // 2. Wait for confirmation
            await publicClient.waitForTransactionReceipt({ hash: txHash });

            // 3. Prepare the updated lifecycle
            const updatedLifecycle = [
                ...lifecycle,
                {
                    type: "RETAIL_RECEIVED",
                    time: timestamp,
                    location: locationInput,
                    entity: shopName,
                    address: retailerAddress
                }
            ];

            // 4. BUNDLE EVERYTHING
            const updatedQRData = {
                id: rawId.toString(),
                details,
                lifecycle: updatedLifecycle,
                mfgSig,
                retSig: retailerAddress, // <--- Now correctly shows the Wallet Address
                intendedRetailer: originalIntendedRetailer
            };

            setFinalQR(JSON.stringify(updatedQRData));
            setShowReview(false);
        } catch (err) {
            console.error("Transaction error:", err);
            alert("Transaction failed: " + (err.shortMessage || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            <Paper elevation={3} sx={{ p: 4, maxWidth: 650, mx: 'auto', borderRadius: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center' }}>
                    Retailer Reception & Label Update
                </Typography>

                <Stack spacing={3}>
                    <Box sx={{ bgcolor: '#f0f7ff', p: 3, borderRadius: 2, border: '1px solid #bbdefb' }}>
                        <Typography variant="subtitle1" color="primary" gutterBottom>
                            Verified Product
                        </Typography>
                        <Typography variant="h6">{details?.brand} - {details?.name}</Typography>
                        <Typography variant="body2">Serial: <strong>{details?.serial}</strong></Typography>
                        <Typography variant="caption">Product ID: #{rawId}</Typography>
                    </Box>

                    <TextField
                        fullWidth
                        label="Your Shop Name (e.g. Marie Shop)"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        variant="outlined"
                    />

                    <TextField
                        fullWidth
                        label="Shop Location (e.g. Phnom Penh, Cambodia)"
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        variant="outlined"
                    />

                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleReview}
                        disabled={loading || !!finalQR}
                        fullWidth
                        sx={{ py: 1.5 }}
                    >
                        {loading ? <CircularProgress size={24} /> : "Sign Reception & Update Label"}
                    </Button>
                </Stack>

                {finalQR && (
                    <Box sx={{ mt: 5 }}>
                        <Typography variant="h6" color="success.main" gutterBottom textAlign="center" sx={{ fontWeight: 'bold' }}>
                            ✓ Updated Consumer Label Ready
                        </Typography>

                        <div ref={componentRef} style={{ padding: '40px 30px', background: 'white', borderRadius: '12px', border: '2px solid #1976d2', textAlign: 'center' }}>
                            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
                                {details?.brand} - {details?.name}
                            </Typography>

                            <Typography variant="body1" sx={{ mb: 3 }}>
                                Serial: <strong>{details?.serial}</strong>
                            </Typography>

                            <QRCode value={finalQR} size={260} level="H" includeMargin={true} />

                            <Typography variant="caption" display="block" sx={{ my: 3, color: '#666' }}>
                                Scan to Verify Authenticity
                            </Typography>

                            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                Product ID: #{rawId}
                            </Typography>

                            <Typography variant="h6" sx={{ mt: 3, fontWeight: 'bold', color: '#1976d2' }}>
                                Intended for: {originalIntendedRetailer}
                            </Typography>
                        </div>

                        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4 }}>
                            <Button variant="contained" color="success" size="large" onClick={handlePrint}>
                                Print Updated Label
                            </Button>
                            <Button variant="outlined" size="large" onClick={() => navigate('/retailer')}>
                                Finish
                            </Button>
                        </Stack>
                    </Box>
                )}
            </Paper>

            <Dialog open={showReview} onClose={() => setShowReview(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Confirm Reception</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                        1. Manufacturer Origin (Verified)
                    </Typography>
                    <List dense sx={{ bgcolor: '#f1f8e9', borderRadius: 2, mb: 2, p: 1 }}>
                        <ListItem><ListItemText primary="Manufacturer" secondary={manufacturerName} /></ListItem>
                        <ListItem><ListItemText primary="Location" secondary={originLocation} /></ListItem>
                        <ListItem><ListItemText primary="Production Date" secondary={productionDate} /></ListItem>
                        <ListItem>
                            <ListItemText primary="Authenticity" secondary={<Chip label="Digitally Signed" color="success" size="small" />} />
                        </ListItem>
                    </List>

                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                        2. Your Reception (New)
                    </Typography>
                    <List dense sx={{ bgcolor: '#e3f2fd', borderRadius: 2, p: 1 }}>
                        <ListItem><ListItemText primary="Shop Name" secondary={shopName} /></ListItem>
                        <ListItem><ListItemText primary="Location" secondary={locationInput} /></ListItem>
                        <ListItem><ListItemText primary="Reception Date" secondary={receptionTimestamp} /></ListItem>
                        <ListItem><ListItemText primary="Status" secondary="In Stock (isSold = false)" /></ListItem>
                    </List>

                    <Typography variant="caption" sx={{ mt: 3, fontStyle: 'italic', color: 'text.secondary' }}>
                        This action adds your signature to the blockchain history.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowReview(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleConfirmAndSign} disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : "Confirm & Sign"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UpdateProduct;