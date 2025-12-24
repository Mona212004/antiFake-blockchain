/* global BigInt */
import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, CircularProgress, Stack, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Divider } from '@mui/material';
import QRCode from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { getWalletClient, publicClient, PRODUCT_ABI, PRODUCT_ADDRESS } from '../../utils/contract';
import { getAddress } from "viem";

const UpdateProduct = () => {
    const { state } = useLocation();
    const navigate = useNavigate();

    // FIX: Define the Ref here
    const componentRef = useRef(null);

    // Aligned with ScannerPage navigation state
    const id = state?.id;
    const details = state?.data;
    const mfgSig = state?.mfgSig;
    const lifecycle = state?.lifecycle;

    const [shopName, setShopName] = useState("");
    const [locationInput, setLocationInput] = useState("");
    const [finalQR, setFinalQR] = useState("");
    const [loading, setLoading] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [product, setProduct] = useState(null);

    useEffect(() => {
        const fetchProduct = async () => {
            if (!id) return;
            try {
                const productData = await publicClient.readContract({
                    address: PRODUCT_ADDRESS,
                    abi: PRODUCT_ABI,
                    functionName: 'products',
                    args: [BigInt(id)]
                });
                setProduct(productData);
            } catch (err) {
                console.error("Error fetching product:", err);
            }
        };
        fetchProduct();
    }, [id]);

    const handleReview = () => {
        if (!shopName || !locationInput) {
            alert("Please fill in your shop name and location.");
            return;
        }
        setShowReview(true);
    };

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
    });

    const handleConfirmAndSign = async () => {
        setLoading(true);
        try {
            const wallet = await getWalletClient();
            const [account] = await wallet.getAddresses();
            const timestamp = new Date().toISOString();

            const hash = await wallet.writeContract({
                account,
                address: PRODUCT_ADDRESS,
                abi: PRODUCT_ABI,
                functionName: 'retailerReceive',
                args: [
                    BigInt(id),
                    locationInput,
                    "RETAILER_SIG_CONFIRMED",
                    shopName,
                    timestamp
                ],
            });

            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            const updatedQRData = {
                id,
                data: details,
                mfgSig,
                retSig: hash,
                lifecycle: [
                    ...(lifecycle || []),
                    {
                        type: "RETAIL_RECEIVED",
                        time: timestamp,
                        location: locationInput,
                        entity: shopName,
                        retailerAddress: getAddress(account)
                    }
                ]
            };

            setFinalQR(JSON.stringify(updatedQRData));
            setShowReview(false);
            alert("Blockchain successfully updated.");

        } catch (err) {
            console.error(err);
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            <Paper elevation={3} sx={{ p: 4, maxWidth: 650, mx: 'auto', borderRadius: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>Retailer Reception</Typography>

                <Stack spacing={3}>
                    <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle2" color="primary">Product Info:</Typography>
                        <Typography variant="h6">{details?.brand} {details?.name}</Typography>
                        <Typography variant="caption">ID: {id}</Typography>
                    </Box>

                    <TextField fullWidth label="Retailer Shop Name" variant="outlined" value={shopName} onChange={(e) => setShopName(e.target.value)} />
                    <TextField fullWidth label="Shop Location" variant="outlined" value={locationInput} onChange={(e) => setLocationInput(e.target.value)} />

                    <Button variant="contained" size="large" onClick={handleReview} disabled={loading || !!finalQR}>
                        Review & Sign Update
                    </Button>
                </Stack>

                {finalQR && (
                    <Box ref={componentRef} sx={{ mt: 4, textAlign: 'center', p: 3, border: '2px solid #1976d2', borderRadius: 2 }}>
                        <Typography variant="h6" color="primary">Final Consumer QR Code</Typography>
                        <Divider sx={{ my: 2 }} />
                        <QRCode value={finalQR} size={280} level="H" includeMargin={true} />
                        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
                            <Button variant="contained" color="success" onClick={handlePrint}>Print Label</Button>
                            <Button variant="outlined" onClick={() => navigate('/retailer')}>Finish</Button>
                        </Stack>
                    </Box>
                )}
            </Paper>

            <Dialog open={showReview} onClose={() => setShowReview(false)}>
                <DialogTitle>Confirm Authorization</DialogTitle>
                <DialogContent dividers>
                    <Typography>Sign and record receipt for <b>{details?.name}</b> to the blockchain?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowReview(false)}>Edit</Button>
                    <Button onClick={handleConfirmAndSign} variant="contained" disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : "Authorize"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UpdateProduct;