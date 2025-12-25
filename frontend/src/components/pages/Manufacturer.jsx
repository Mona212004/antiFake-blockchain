/* global BigInt */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Box, Typography, Paper, Grid, Stack, CircularProgress,
    Table, TableBody, TableCell, TableHead, TableRow,
    Button, Chip, Modal, Divider, Tooltip
} from '@mui/material';
import QRCode from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';

// Icons
import FactoryIcon from '@mui/icons-material/Factory';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import QrCodeIcon from '@mui/icons-material/QrCode';
import StorefrontIcon from '@mui/icons-material/Storefront';

import CustomButton from "../home/CustomButton";
import { publicClient, PRODUCT_ABI, PRODUCT_ADDRESS } from '../../utils/contract';

const Manufacturer = () => {
    const [currentAccount, setCurrentAccount] = useState("");
    const [myProductCount, setMyProductCount] = useState(0);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    const [openModal, setOpenModal] = useState(false);
    const [selectedQr, setSelectedQr] = useState("");
    const [selectedName, setSelectedName] = useState("");
    const [selectedSerial, setSelectedSerial] = useState("");
    const [selectedDisplayRetailer, setSelectedDisplayRetailer] = useState(""); // For label text
    const printRef = useRef();

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    });

    const connectWallet = async () => {
        if (window.ethereum) {
            await window.ethereum.request({ method: "eth_requestAccounts" });
        }
    };

    const fetchBlockchainData = async () => {
        setLoading(true);
        try {
            const pCount = await publicClient.readContract({
                address: PRODUCT_ADDRESS,
                abi: PRODUCT_ABI,
                functionName: 'productCount'
            });

            const total = Number(pCount);
            setMyProductCount(total);

            const fetchedProducts = [];
            for (let i = total; i > Math.max(0, total - 50); i--) {
                try {
                    const data = await publicClient.readContract({
                        address: PRODUCT_ADDRESS,
                        abi: PRODUCT_ABI,
                        functionName: 'products',
                        args: [BigInt(i)]
                    });

                    const historyData = await publicClient.readContract({
                        address: PRODUCT_ADDRESS,
                        abi: PRODUCT_ABI,
                        functionName: 'getProductHistory',
                        args: [BigInt(i)]
                    });

                    if (data && data[0] !== undefined) {
                        fetchedProducts.push({
                            id: data[0].toString(),
                            serial: data[1],
                            name: data[2],
                            brand: data[3],
                            desc: data[4],
                            manufactDate: data[5],
                            img: data[6],
                            currentOwner: data[7],
                            isSold: data[8],
                            mfgName: data[9],
                            mfgSig: data[10],
                            retSig: data[12] || "",                    // ← FIXED: signature
                            intendedRetailer: data[11] || "Unknown",   // ← FIXED: retailer name
                            historyAddresses: historyData[0] || [],
                            historyLocations: historyData[1] || [],
                            historyActors: historyData[2] || [],
                            historyTimestamps: historyData[3] || []
                        });
                    }
                } catch (innerErr) {
                    console.error(`Error fetching product ID ${i}:`, innerErr);
                }
            }
            setProducts(fetchedProducts);
        } catch (err) {
            console.error("Blockchain Sync Error", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            if (window.ethereum) {
                const accounts = await window.ethereum.request({ method: "eth_accounts" });
                if (accounts.length !== 0) {
                    setCurrentAccount(accounts[0]);
                    fetchBlockchainData();
                }
                window.ethereum.on('accountsChanged', (accounts) => {
                    setCurrentAccount(accounts[0] || "");
                    if (accounts[0]) fetchBlockchainData();
                });
            }
        };
        init();
    }, []);

    const generateAndShowQR = (p) => {
        if (!p) return;

        const isReceived = p.historyActors && p.historyActors.length > 1;

        // Only for visual display on the printed label
        const displayRetailerText = isReceived
            ? (p.intendedRetailer || "Unknown Retailer")
            : "Pending Assignment";

        const qrData = {
            id: p.id,
            details: {
                serial: p.serial,
                name: p.name,
                brand: p.brand,
                description: p.desc || "",
                imageUrl: p.img  // Keep consistent with AddProduct
            },
            lifecycle: p.historyTimestamps.map((time, index) => ({
                type: index === 0 ? "MANUFACTURED" : "RETAIL_RECEIVED",
                time: time,
                location: p.historyLocations[index] || "",
                entity: p.historyActors[index] || "",
                address: p.historyAddresses[index] || ""
            })),
            mfgSig: p.mfgSig,
            retSig: p.retSig || "",  // ← Only the actual signature (hash or empty)
            intendedRetailer: p.intendedRetailer || ""  // ← Always preserve on-chain value
        };

        setSelectedQr(JSON.stringify(qrData));
        setSelectedName(`${p.brand} - ${p.name}`);
        setSelectedSerial(p.serial);
        setSelectedDisplayRetailer(displayRetailerText);
        setOpenModal(true);
    };
    const shortenSignature = (sig) => {
        if (!sig) return "No Sig";
        return `${sig.substring(0, 6)}...${sig.substring(sig.length - 4)}`;
    };

    return (
        <Box sx={{ p: 4, maxWidth: '1300px', margin: '0 auto' }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Manufacturer Portal</Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>Register and Track Blockchain-Secured Products</Typography>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3, boxShadow: 2 }}>
                        <FactoryIcon sx={{ fontSize: 40, color: '#1a237e', mb: 1 }} />
                        <Typography variant="h4" fontWeight="bold">{myProductCount}</Typography>
                        <Typography variant="body2" color="textSecondary">Total Products Registered</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3, boxShadow: 2 }}>
                        <VerifiedUserIcon sx={{ fontSize: 40, color: '#2e7d32', mb: 1 }} />
                        <Typography variant="h4" fontWeight="bold">Secure</Typography>
                        <Typography variant="body2" color="textSecondary">Digital Signatures Active</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3, boxShadow: 2 }}>
                        <AccountBalanceWalletIcon sx={{ fontSize: 40, color: currentAccount ? 'success.main' : 'error.main', mb: 1 }} />
                        <Typography variant="h6" noWrap>{currentAccount ? 'Connected' : 'Disconnected'}</Typography>
                        <Typography variant="body2" color="textSecondary">Wallet Status</Typography>
                    </Paper>
                </Grid>
            </Grid>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 5 }}>
                {currentAccount ? (
                    <>
                        <Link to="/add-product" style={{ textDecoration: 'none', flex: 1 }}>
                            <CustomButton className="btns" buttonStyle='btn--primary' buttonSize='btn--large' style={{ width: '100%' }}>
                                <AddCircleOutlineIcon sx={{ mr: 1 }} /> Register New Batch
                            </CustomButton>
                        </Link>
                        <Button variant="outlined" size="large" onClick={fetchBlockchainData} sx={{ borderRadius: '8px', px: 4 }}>
                            Refresh Inventory
                        </Button>
                    </>
                ) : (
                    <CustomButton onClick={connectWallet} buttonStyle='btn--primary' buttonSize='btn--large' style={{ backgroundColor: '#ff9800', width: '100%' }}>
                        Connect Wallet to Initialize
                    </CustomButton>
                )}
            </Stack>

            <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Active Inventory</Typography>
            <Paper sx={{ width: '100%', borderRadius: 3, overflow: 'hidden', boxShadow: 3 }}>
                {loading ? (
                    <Box sx={{ textAlign: 'center', p: 5 }}><CircularProgress /></Box>
                ) : products.length === 0 ? (
                    <Box sx={{ textAlign: 'center', p: 5 }}>
                        <Typography variant="body1" color="text.secondary">
                            No products registered yet. Click "Register New Batch" to begin.
                        </Typography>
                    </Box>
                ) : (
                    <Table>
                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Product Info</TableCell>
                                <TableCell>Intended Retailer</TableCell>
                                <TableCell>Current Status</TableCell>
                                <TableCell>MFG Signature</TableCell>
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {products.map((p) => {
                                const isReceived = p.historyActors && p.historyActors.length > 1;

                                return (
                                    <TableRow key={p.id} hover>
                                        <TableCell sx={{ fontWeight: 'bold' }}>#{p.id}</TableCell>
                                        <TableCell>
                                            <Typography variant="body1" fontWeight="bold">{p.name}</Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {p.brand} | Serial: {p.serial.substring(0, 12)}...
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={<StorefrontIcon fontSize="small" />}
                                                label={p.intendedRetailer || "Unknown"}
                                                color="primary"
                                                variant="outlined"
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={p.isSold ? "Sold to Consumer" : (isReceived ? "At Retailer" : "In Warehouse")}
                                                color={p.isSold ? "warning" : "success"}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title={p.mfgSig || "No signature"}>
                                                <Typography variant="caption" sx={{ fontFamily: 'monospace', cursor: 'help' }}>
                                                    {shortenSignature(p.mfgSig)}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Button
                                                variant="contained"
                                                startIcon={<QrCodeIcon />}
                                                size="small"
                                                onClick={() => generateAndShowQR(p)}
                                                sx={{ bgcolor: '#1a237e' }}
                                            >
                                                View Label
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </Paper>

            {/* Printable Label Modal */}
            <Modal open={openModal} onClose={() => setOpenModal(false)}>
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: { xs: '90%', sm: 450 },
                    bgcolor: 'background.paper',
                    borderRadius: 4,
                    boxShadow: 24,
                    p: 4,
                    textAlign: 'center'
                }}>
                    <div ref={printRef} style={{ padding: '40px 30px', background: 'white', borderRadius: '12px', border: '1px solid #ddd' }}>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
                            {selectedName}
                        </Typography>

                        <Typography variant="body1" sx={{ mb: 3 }}>
                            Serial: <strong>{selectedSerial}</strong>
                        </Typography>

                        {selectedQr && <QRCode value={selectedQr} size={220} level="H" includeMargin={true} />}

                        <Typography variant="caption" display="block" sx={{ my: 3, color: '#666' }}>
                            Scan to Verify Authenticity
                        </Typography>

                        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                            Product ID: #{selectedQr ? JSON.parse(selectedQr).id : ''}
                        </Typography>

                        <Typography variant="h6" sx={{ mt: 3, fontWeight: 'bold', color: '#1976d2' }}>
                            Intended for: {selectedDisplayRetailer}
                        </Typography>
                    </div>

                    <Stack spacing={2} sx={{ mt: 4 }}>
                        <Button variant="contained" color="success" size="large" onClick={handlePrint}>
                            Print Label
                        </Button>
                        <Button variant="text" onClick={() => setOpenModal(false)}>
                            Close
                        </Button>
                    </Stack>
                </Box>
            </Modal>
        </Box>
    );
}

export default Manufacturer;