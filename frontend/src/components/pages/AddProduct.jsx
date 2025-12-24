/* global BigInt */
import { useState, useRef, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, Grid, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, CircularProgress, Stack, Chip, Divider } from '@mui/material';
import QRCode from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { getWalletClient, publicClient, PRODUCT_ABI, PRODUCT_ADDRESS } from '../../utils/contract';
import { getAddress, isAddress } from "viem";

const AddProduct = () => {
    const componentRef = useRef();
    const [formData, setFormData] = useState({
        serial: "", name: "", brand: "", description: "",
        imageUrl: "", location: "", manufacturerName: "",
        date: new Date().toISOString()
    });

    const [retailerInput, setRetailerInput] = useState("");
    const [destinations, setDestinations] = useState([]);
    const [qrValue, setQrValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [productId, setProductId] = useState("");

    // Debugging: Log the address on mount to ensure JSON is being read
    useEffect(() => {
        console.log("Current Contract Address in Frontend:", PRODUCT_ADDRESS);
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const addRetailer = () => {
        if (retailerInput && isAddress(retailerInput)) {
            const checksummed = getAddress(retailerInput);
            if (!destinations.includes(checksummed)) {
                setDestinations([...destinations, checksummed]);
                setRetailerInput("");
            }
        } else {
            alert("Please enter a valid Ethereum address.");
        }
    };

    const handleReview = () => {
        if (!formData.serial || !formData.name) {
            alert("Please fill in the Serial and Product Name.");
            return;
        }
        setShowReview(true);
    };

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
    });

    const handleConfirmAndSend = async () => {
        setLoading(true);
        try {
            // 1. Checksum Verification
            if (!isAddress(PRODUCT_ADDRESS)) {
                throw new Error(`Invalid address format: ${PRODUCT_ADDRESS}`);
            }

            const wallet = await getWalletClient();
            const [account] = await wallet.getAddresses();
            const currentTimestamp = new Date().toISOString();

            // 2. The Write Transaction
            const hash = await wallet.writeContract({
                account,
                address: PRODUCT_ADDRESS,
                abi: PRODUCT_ABI,
                functionName: 'addProduct',
                args: [
                    formData.serial, formData.name, formData.brand,
                    formData.description, formData.imageUrl, currentTimestamp,
                    formData.location, "MFG_INITIAL_SIG", formData.manufacturerName,
                    destinations
                ],
            });

            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            let numericId = null;

            // 3. Robust Event Log Extraction
            if (receipt.logs && receipt.logs.length > 0) {
                try {
                    // Filter for logs that have the expected number of topics for a standard 'ProductCreated' event
                    const eventLog = receipt.logs.find(l => l.topics && l.topics.length > 1);
                    if (eventLog) {
                        numericId = BigInt(eventLog.topics[1]).toString();
                    }
                } catch (logError) {
                    console.warn("Log parse failed:", logError);
                }
            }

            // 4. Fallback Read with specific error context
            if (!numericId) {
                try {
                    const count = await publicClient.readContract({
                        address: PRODUCT_ADDRESS,
                        abi: PRODUCT_ABI,
                        functionName: 'productCount',
                    });
                    numericId = count.toString();
                } catch (readError) {
                    console.error("Read Contract Fail:", readError);
                    throw new Error("Blockchain sync error: Contract exists but state is unreachable. Clear MetaMask Activity Tab.");
                }
            }

            setProductId(numericId);

            const qrData = {
                id: numericId,
                data: { // Changed from 'details' to 'data' to match ScannerPage expectation
                    serial: formData.serial,
                    name: formData.name,
                    brand: formData.brand,
                    description: formData.description,
                    image: formData.imageUrl
                },
                lifecycle: [{
                    type: "MANUFACTURED",
                    time: currentTimestamp,
                    location: formData.location,
                    entity: formData.manufacturerName,
                    destinations: destinations
                }],
                mfgSig: hash, // This is the transaction hash used as the signature
                mfgAddress: getAddress(account)
            };

            setQrValue(JSON.stringify(qrData));
            setShowReview(false);
            alert(`Success! Product ID ${numericId} registered.`);

        } catch (err) {
            console.error("Critical Failure:", err);
            // Help the user identify if it's a MetaMask sync issue
            const errorMsg = err.message.includes("0x")
                ? "Contract not detected. 1. Run npx hardhat node. 2. Clear MetaMask Activity. 3. Redeploy."
                : err.message;
            alert("Registration failed: " + errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>Register New Product (Manufacturer Entity)</Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth label="Serial Number" name="serial" value={formData.serial} onChange={handleChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Product Name" name="name" value={formData.name} onChange={handleChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Brand" name="brand" value={formData.brand} onChange={handleChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Description" name="description" value={formData.description} onChange={handleChange} sx={{ mb: 2 }} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth label="Image URL" name="imageUrl" value={formData.imageUrl} onChange={handleChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Manufacturer Name" name="manufacturerName" value={formData.manufacturerName} onChange={handleChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Manufacturer Address (Location)" name="location" value={formData.location} onChange={handleChange} sx={{ mb: 2 }} />
                    </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle1" sx={{ mb: 1 }}>Define Retailer Destinations (Address List)</Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <TextField fullWidth label="Retailer Wallet Address" value={retailerInput} onChange={(e) => setRetailerInput(e.target.value)} />
                    <Button variant="contained" onClick={addRetailer}>Add to List</Button>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    {destinations.map((ret, index) => (
                        <Chip key={index} label={`${ret.substring(0, 8)}...`} onDelete={() => setDestinations(destinations.filter(r => r !== ret))} />
                    ))}
                </Stack>

                <Button variant="contained" color="primary" fullWidth onClick={handleReview} sx={{ mt: 4 }} disabled={loading}>
                    Review & Generate QR
                </Button>

                {qrValue && (
                    <Box ref={componentRef} sx={{ mt: 4, textAlign: 'center', p: 2, border: '1px dashed grey' }}>
                        {/* Updated Typography to use the product name from formData */}
                        <Typography variant="h6" gutterBottom>
                            {formData.name ? `${formData.name} Label` : "Manufacturer QR Label"}
                        </Typography>

                        <QRCode value={qrValue} size={250} level="M" includeMargin={true} />
                        <Typography variant="body2" sx={{ mt: 1 }}><b>Blockchain ID:</b> {productId}</Typography>
                        <Button variant="contained" onClick={handlePrint} sx={{ mt: 2 }}>Print for Shipment</Button>
                    </Box>
                )}
            </Paper>

            <Dialog open={showReview} onClose={() => setShowReview(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Review Manufacturer Entry</DialogTitle>
                <DialogContent dividers>
                    <List dense>
                        <ListItem><ListItemText primary="Product" secondary={`${formData.brand} ${formData.name}`} /></ListItem>
                        <ListItem><ListItemText primary="Serial" secondary={formData.serial} /></ListItem>
                        <ListItem><ListItemText primary="Origin" secondary={formData.location} /></ListItem>
                        <ListItem><ListItemText primary="Retailer Count" secondary={destinations.length} /></ListItem>
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowReview(false)}>Edit</Button>
                    <Button variant="contained" onClick={handleConfirmAndSend} disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : "Authorize & Sign to Ethereum"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AddProduct;