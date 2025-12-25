/* global BigInt */
import { useState, useRef, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, Grid, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, CircularProgress, Stack, Chip, Divider } from '@mui/material';
import QRCode from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { getWalletClient, publicClient, PRODUCT_ABI, PRODUCT_ADDRESS } from '../../utils/contract';
import { getAddress, isAddress } from "viem";
import { v4 as uuidv4 } from 'uuid';

const AddProduct = () => {
    const componentRef = useRef();
    const [formData, setFormData] = useState({
        name: "",
        brand: "",
        description: "",
        imageUrl: "",
        location: "",
        manufacturerName: ""
    });

    const [retailerInput, setRetailerInput] = useState("");
    const [retailerNameInput, setRetailerNameInput] = useState("");
    const [retailerQuantityInput, setRetailerQuantityInput] = useState(1);
    const [destinations, setDestinations] = useState([]);
    const [qrValues, setQrValues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [productIds, setProductIds] = useState([]);

    useEffect(() => {
        console.log("Current Contract Address in Frontend:", PRODUCT_ADDRESS);
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const addRetailer = () => {
        const cleanAddr = retailerInput.trim();
        const cleanName = retailerNameInput.trim();
        const quantity = parseInt(retailerQuantityInput, 10);

        if (cleanAddr && isAddress(cleanAddr) && cleanName && quantity > 0) {
            const checksummed = getAddress(cleanAddr);
            if (!destinations.find(d => d.address === checksummed)) {
                setDestinations([...destinations, {
                    address: checksummed,
                    name: cleanName,
                    quantity
                }]);
                setRetailerInput("");
                setRetailerNameInput("");
                setRetailerQuantityInput(1);
            } else {
                alert("This address is already in the list.");
            }
        } else {
            alert("Please enter a valid Name, Ethereum Address, and Quantity (at least 1).");
        }
    };

    const handleReview = () => {
        if (!formData.name || !formData.manufacturerName || !formData.location || destinations.length === 0) {
            alert("Please fill in Product Name, Manufacturer Name, Location, and at least one Retailer with Quantity.");
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
            if (!isAddress(PRODUCT_ADDRESS)) throw new Error("Invalid contract address.");

            const wallet = await getWalletClient();
            const [account] = await wallet.getAddresses();
            const currentTimestamp = new Date().toISOString();

            const generatedQrValues = [];
            const generatedProductIds = [];

            for (const retailer of destinations) {
                for (let i = 0; i < retailer.quantity; i++) {
                    const serial = uuidv4();

                    const detailsToSign = {
                        serial: serial,
                        name: formData.name,
                        brand: formData.brand,
                        description: formData.description,
                        imageUrl: formData.imageUrl
                    };

                    const messageToSign = JSON.stringify(detailsToSign);
                    const manufacturerSignature = await wallet.signMessage({
                        account,
                        message: messageToSign,
                    });

                    const hash = await wallet.writeContract({
                        account,
                        address: PRODUCT_ADDRESS,
                        abi: PRODUCT_ABI,
                        functionName: 'addProduct',
                        args: [
                            serial,
                            formData.name,
                            formData.brand,
                            formData.description,
                            formData.imageUrl,
                            currentTimestamp,
                            formData.location,
                            manufacturerSignature,
                            formData.manufacturerName,
                            destinations.map(d => d.address),
                            retailer.name
                        ],
                    });

                    const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

                    let numericId = null;
                    if (receipt.logs && receipt.logs.length > 0) {
                        const eventLog = receipt.logs.find(l => l.topics && l.topics.length > 1);
                        if (eventLog) numericId = BigInt(eventLog.topics[1]).toString();
                    }

                    if (!numericId) {
                        const count = await publicClient.readContract({
                            address: PRODUCT_ADDRESS,
                            abi: PRODUCT_ABI,
                            functionName: 'productCount',
                        });
                        numericId = count.toString();
                    }

                    const qrData = {
                        id: numericId,
                        details: detailsToSign,
                        lifecycle: [{
                            type: "MANUFACTURED",
                            time: currentTimestamp,
                            location: formData.location,
                            entity: formData.manufacturerName,
                            address: getAddress(account)
                        }],
                        mfgSig: manufacturerSignature,
                        retSig: "",
                        intendedRetailer: retailer.name
                    };

                    generatedQrValues.push({
                        qrValue: JSON.stringify(qrData),
                        retailerName: retailer.name,
                        serial: serial
                    });
                    generatedProductIds.push(numericId);
                }
            }

            setQrValues(generatedQrValues);
            setProductIds(generatedProductIds);
            setShowReview(false);
            alert(`Batch of Products Registered! Total: ${generatedQrValues.length}`);

        } catch (err) {
            console.error("Registration Error:", err);
            alert("Registration failed: " + (err.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>Register New Product Batch & Generate Secure Labels</Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth label="Product Name" name="name" value={formData.name} onChange={handleChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Brand" name="brand" value={formData.brand} onChange={handleChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Description" name="description" value={formData.description} onChange={handleChange} multiline rows={2} sx={{ mb: 2 }} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth label="Image URL" name="imageUrl" value={formData.imageUrl} onChange={handleChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Manufacturer Name" name="manufacturerName" value={formData.manufacturerName} onChange={handleChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Manufacturer Physical Location" name="location" value={formData.location} onChange={handleChange} sx={{ mb: 2 }} />
                    </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>Authorized Retailer Nodes & Quantities</Typography>

                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <TextField
                        sx={{ flex: 1 }}
                        label="Retailer Name (e.g. NYC Shop)"
                        value={retailerNameInput}
                        onChange={(e) => setRetailerNameInput(e.target.value)}
                    />
                    <TextField
                        sx={{ flex: 2 }}
                        label="Retailer Wallet Address (0x...)"
                        value={retailerInput}
                        onChange={(e) => setRetailerInput(e.target.value)}
                    />
                    <TextField
                        sx={{ width: 100 }}
                        label="Qty"
                        type="number"
                        value={retailerQuantityInput}
                        onChange={(e) => setRetailerQuantityInput(e.target.value)}
                        inputProps={{ min: 1 }}
                    />
                    <Button variant="contained" onClick={addRetailer}>Add</Button>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                    {destinations.map((ret, index) => (
                        <Chip
                            key={index}
                            label={`${ret.name} (${ret.address.substring(0, 6)}...) x ${ret.quantity}`}
                            color="primary"
                            variant="outlined"
                            onDelete={() => setDestinations(destinations.filter(d => d.address !== ret.address))}
                            sx={{ m: 0.5 }}
                        />
                    ))}
                </Stack>

                <Button variant="contained" color="primary" fullWidth size="large" onClick={handleReview} sx={{ mt: 4, height: '56px' }} disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : "Sign & Register Batch"}
                </Button>

                {qrValues.length > 0 && (
                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h6" color="success.main" gutterBottom sx={{ fontWeight: 'bold' }}>
                            ✓ Batch Secured on Blockchain (Group by Retailer)
                        </Typography>

                        <div ref={componentRef} style={{ padding: '20px', background: 'white' }}>
                            {destinations.map((retailer, retIndex) => {
                                const retailerQrs = qrValues.filter(q => q.retailerName === retailer.name);
                                return (
                                    <Box key={retIndex} sx={{ mb: 6, pageBreakAfter: 'always' }}>
                                        <Typography variant="h6" sx={{ mb: 3, textAlign: 'center', color: '#1976d2' }}>
                                            Labels for {retailer.name} ({retailerQrs.length} products)
                                        </Typography>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px' }}>
                                            {retailerQrs.map((qr, qrIndex) => {
                                                const parsed = JSON.parse(qr.qrValue);
                                                return (
                                                    <div
                                                        key={qrIndex}
                                                        style={{
                                                            padding: '20px',
                                                            background: 'white',
                                                            border: '1px solid #ddd',
                                                            borderRadius: '10px',
                                                            textAlign: 'center',
                                                            width: '300px'
                                                        }}
                                                    >
                                                        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                                                            {formData.brand} - {formData.name}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ mb: 2 }}>
                                                            Serial: <strong>{qr.serial}</strong>
                                                        </Typography>
                                                        <QRCode value={qr.qrValue} size={200} level="H" includeMargin={true} />
                                                        <Typography variant="caption" display="block" sx={{ mt: 2, color: '#666' }}>
                                                            Scan to Verify Authenticity
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                                                            Product ID: #{parsed.id || 'Pending'}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ mt: 2, fontStyle: 'italic' }}>
                                                            Intended for: {retailer.name}
                                                        </Typography>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </Box>
                                );
                            })}
                        </div>

                        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4 }}>
                            <Button variant="contained" color="success" onClick={handlePrint}>
                                Print All Labels
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    setQrValues([]);
                                    setProductIds([]);
                                    setFormData({
                                        name: "", brand: "", description: "",
                                        imageUrl: "", location: "", manufacturerName: ""
                                    });
                                    setDestinations([]);
                                    setRetailerNameInput("");
                                    setRetailerInput("");
                                    setRetailerQuantityInput(1);
                                }}
                            >
                                New Batch
                            </Button>
                        </Stack>
                    </Box>
                )}
            </Paper>

            <Dialog open={showReview} onClose={() => setShowReview(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Verify Batch & Sign Authorization</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        By clicking "Confirm", you will sign and register each product in the batch individually on the blockchain.
                    </Typography>
                    <List dense>
                        <ListItem><ListItemText primary="Product Name" secondary={formData.name} /></ListItem>
                        <ListItem><ListItemText primary="Manufacturer" secondary={formData.manufacturerName} /></ListItem>
                        <ListItem><ListItemText primary="Total Products" secondary={destinations.reduce((sum, d) => sum + d.quantity, 0)} /></ListItem>
                        <ListItem><ListItemText primary="Authorized Retailers" secondary={destinations.map(d => `${d.name} x ${d.quantity}`).join(', ')} /></ListItem>
                    </List>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setShowReview(false)} color="inherit">Edit Data</Button>
                    <Button variant="contained" onClick={handleConfirmAndSend} disabled={loading} color="primary">
                        Confirm & Sign Batch
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AddProduct;