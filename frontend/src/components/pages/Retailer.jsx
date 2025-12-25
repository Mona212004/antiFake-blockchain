/* global BigInt */
import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, Modal, Stack } from '@mui/material';
import { publicClient, PRODUCT_ABI, PRODUCT_ADDRESS } from "../../utils/contract";
import { useNavigate } from 'react-router-dom';
import { getAddress } from "viem";
import QRCode from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
const Retailer = () => {
    const [currentAccount, setCurrentAccount] = useState("");
    const [myProducts, setMyProducts] = useState([]);
    const [openModal, setOpenModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const navigate = useNavigate();
    const printRef = useRef();
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    });
    const fetchMyProducts = async (retailerAddr) => {
        if (!retailerAddr) return;
        try {
            const count = await publicClient.readContract({
                address: PRODUCT_ADDRESS,
                abi: PRODUCT_ABI,
                functionName: 'productCount',
            });

            const tempProducts = [];
            for (let i = 1; i <= Number(count); i++) {
                const product = await publicClient.readContract({
                    address: PRODUCT_ADDRESS,
                    abi: PRODUCT_ABI,
                    functionName: 'products',
                    args: [BigInt(i)],
                });

                const history = await publicClient.readContract({
                    address: PRODUCT_ADDRESS,
                    abi: PRODUCT_ABI,
                    functionName: 'getProductHistory',
                    args: [BigInt(i)],
                });

                const lifecycle = history[3].map((time, idx) => ({
                    type: idx === 0 ? "MANUFACTURED" : "RETAIL_RECEIVED",
                    time: time,
                    location: history[1][idx] || "",
                    entity: history[2][idx] || "",
                    address: getAddress(history[0][idx])
                }));

                const mapped = {
                    id: product[0].toString(),
                    serialNumber: product[1],
                    name: product[2],
                    brand: product[3],
                    description: product[4],
                    manufactDate: product[5],
                    imageUrl: product[6],
                    currentOwner: getAddress(product[7]),
                    isSold: product[8],
                    manufacturerName: product[9],
                    manufacturerSig: product[10],
                    intendedRetailer: product[11],
                    retailerSig: product[12], // <--- This captures the hash from the blockchain
                    lifecycle: lifecycle
                };

                if (mapped.currentOwner.toLowerCase() === retailerAddr.toLowerCase() && !mapped.isSold) {
                    tempProducts.push(mapped);
                }
            }
            setMyProducts(tempProducts);
        } catch (err) {
            console.error("Error fetching retailer products:", err);
        }
    };
    useEffect(() => {
        const init = async () => {
            if (window.ethereum) {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    const addr = getAddress(accounts[0]);
                    setCurrentAccount(addr);
                    fetchMyProducts(addr);
                }
                window.ethereum.on('accountsChanged', (accounts) => {
                    if (accounts.length > 0) {
                        const addr = getAddress(accounts[0]);
                        setCurrentAccount(addr);
                        fetchMyProducts(addr);
                    } else {
                        setCurrentAccount("");
                        setMyProducts([]);
                    }
                });
            }
        };
        init();
    }, []);
    useEffect(() => {
        if (!currentAccount) return;
        const unsubscribe = publicClient.watchContractEvent({
            address: PRODUCT_ADDRESS,
            abi: PRODUCT_ABI,
            eventName: 'ProductReceivedByRetailer',
            onLogs: (logs) => {
                logs.forEach(log => {
                    if (log.args.retailer?.toLowerCase() === currentAccount.toLowerCase()) {
                        fetchMyProducts(currentAccount);
                    }
                });
            },
        });
        return () => unsubscribe();
    }, [currentAccount]);
    const shortenSerial = (serial) => {
        if (!serial) return "N/A";
        return `${serial.substring(0, 12)}...${serial.substring(serial.length - 8)}`;
    };
    const handleViewLabel = (product) => {
        const qrBundle = JSON.stringify({
            id: product.id,
            details: {
                serial: product.serialNumber,
                name: product.name,
                brand: product.brand,
                description: product.description,
                imageUrl: product.imageUrl
            },
            lifecycle: product.lifecycle,
            mfgSig: product.manufacturerSig,
            retSig: product.retailerSig, // <--- Correctly passing the hash to the QR
            intendedRetailer: product.intendedRetailer
        });
        setSelectedProduct({ ...product, qrBundle });
        setOpenModal(true);
    };
    return (
        <Box sx={{ p: 4, maxWidth: '1400px', margin: '0 auto' }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 4, textAlign: 'center', mb: 5 }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Retailer Portal
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                    Connected Wallet: {currentAccount || "Not connected"}
                </Typography>
                <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/scan')}
                    sx={{ bgcolor: '#1a237e', px: 5, py: 1.5 }}
                >
                    Scan New Product to Sign Receipt
                </Button>
            </Paper>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
                Products in Your Shop ({myProducts.length})
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Serial Number</strong></TableCell>
                            <TableCell><strong>Product Name</strong></TableCell>
                            <TableCell><strong>Manufacturer</strong></TableCell>
                            <TableCell><strong>Signature Status</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {myProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                    <Typography color="text.secondary">
                                        No products in your shop yet. Scan a QR code to receive inventory.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            myProducts.map((p) => (
                                <TableRow key={p.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                            {shortenSerial(p.serialNumber)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body1" fontWeight="medium">
                                            {p.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {p.brand}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {p.manufacturerName || "Unknown"}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={p.retailerSig && p.retailerSig !== "0x" && p.retailerSig !== "" ? "Signed" : "Awaiting Signature"}
                                            color={p.retailerSig && p.retailerSig !== "0x" && p.retailerSig !== "" ? "success" : "warning"}
                                            size="small"
                                            sx={{ fontWeight: 'bold' }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={() => handleViewLabel(p)}
                                            sx={{ bgcolor: '#1a237e' }}
                                        >
                                            View Label
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <Modal open={openModal} onClose={() => setOpenModal(false)}>
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: { xs: '90%', sm: 500 },
                    bgcolor: 'background.paper',
                    borderRadius: 4,
                    boxShadow: 24,
                    p: 4,
                    textAlign: 'center'
                }}>
                    <div ref={printRef} style={{ padding: '40px 30px', background: 'white', borderRadius: '12px', border: '2px solid #1976d2' }}>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
                            {selectedProduct?.brand} - {selectedProduct?.name}
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 3 }}>
                            Serial: <strong>{selectedProduct?.serialNumber}</strong>
                        </Typography>
                        {selectedProduct?.qrBundle && (
                            <QRCode value={selectedProduct.qrBundle} size={260} level="H" includeMargin={true} />
                        )}
                        <Typography variant="caption" display="block" sx={{ my: 3, color: '#666' }}>
                            Scan to Verify Authenticity
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                            Product ID: #{selectedProduct?.id}
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 3, fontWeight: 'bold', color: '#1976d2' }}>
                            Intended for: {selectedProduct?.intendedRetailer || "Unknown Shop"}
                        </Typography>
                        {selectedProduct?.retailerSig && selectedProduct.retailerSig !== "0x" && selectedProduct.retailerSig !== "" && (
                            <Typography variant="body2" color="success.main" sx={{ mt: 2, fontWeight: 'bold' }}>
                                ✓ Signed by Retailer
                            </Typography>
                        )}
                    </div>
                    <Stack spacing={2} sx={{ mt: 4 }}>
                        <Button variant="contained" color="success" size="large" onClick={handlePrint}>
                            Print Updated Label
                        </Button>
                        <Button variant="text" onClick={() => setOpenModal(false)}>
                            Close
                        </Button>
                    </Stack>
                </Box>
            </Modal>
        </Box>
    );
};
export default Retailer;