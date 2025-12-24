/* global BigInt */
import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, Chip, Divider, Button } from '@mui/material';
import { publicClient, PRODUCT_ABI, PRODUCT_ADDRESS } from "../../utils/contract";
import CustomButton from "../home/CustomButton";
import { Link } from 'react-router-dom';
import { getWalletClient } from '../../utils/contract';
import { getAddress } from "viem";

const Retailer = () => {
    const [currentAccount, setCurrentAccount] = useState("");
    const [myProducts, setMyProducts] = useState([]);

    useEffect(() => {
        const init = async () => {
            if (window.ethereum) {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    // FIX: Apply getAddress to ensure proper checksum formatting
                    const addr = getAddress(accounts[0]);
                    setCurrentAccount(addr);
                    fetchAssignedProducts(addr);
                }
            }
        };
        init();
    }, []);

    // Logic to fetch products where this retailer is the current owner
    const fetchAssignedProducts = async (retailerAddr) => {
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

                const mapped = {
                    id: product[0].toString(),
                    serialNumber: product[1],
                    name: product[2],
                    brand: product[3],
                    currentOwner: product[7],
                    isSold: product[8],
                    retailerSig: product[16] // Check if already signed
                };

                // Only show products owned by this retailer that aren't sold yet
                if (mapped.currentOwner.toLowerCase() === retailerAddr.toLowerCase() && !mapped.isSold) {
                    tempProducts.push(mapped);
                }
            }
            setMyProducts(tempProducts);
        } catch (err) {
            console.error("Error fetching retailer products:", err);
        }
    };

    const handleSell = async (productId) => {
        try {
            const wallet = await getWalletClient();
            const { hash } = await wallet.writeContract({
                address: PRODUCT_ADDRESS,
                abi: PRODUCT_ABI,
                functionName: 'sellToConsumer',
                args: [BigInt(productId)]
            });
            await publicClient.waitForTransactionReceipt({ hash });
            // Refresh products
            fetchAssignedProducts(currentAccount);
        } catch (err) {
            console.error(err);
        }
    };

    const viewHistory = async (productId) => {
        const [histAddrs, histLocs, histActors, histTimes] = await publicClient.readContract({
            address: PRODUCT_ADDRESS,
            abi: PRODUCT_ABI,
            functionName: 'getProductHistory',
            args: [BigInt(productId)]
        });
        console.log('History Preview:', { histAddrs, histLocs, histActors, histTimes }); // Or navigate to detailed view
    };

    return (
        <Box sx={{ p: 4 }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 4, textAlign: 'center', mb: 4 }}>
                <Typography variant="h5" gutterBottom>Retailer Dashboard</Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                    Connected: {currentAccount.substring(0, 6)}...{currentAccount.substring(38)}
                </Typography>
                <Link to="/scan">
                    <CustomButton backgroundColor="#1a237e" color="#fff" buttonText="Scan New Product to Receive" />
                </Link>
            </Paper>

            <Typography variant="h6" sx={{ mb: 2 }}>Products in Your Shop</Typography>
            <Grid container spacing={3}>
                {myProducts.length > 0 ? myProducts.map((product) => (
                    <Grid item xs={12} md={4} key={product.id}>
                        <Card sx={{ borderRadius: 3 }}>
                            <CardContent>
                                <Typography variant="h6">{product.name}</Typography>
                                <Typography variant="caption" display="block" gutterBottom>SN: {product.serialNumber}</Typography>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="body2">Brand: {product.brand}</Typography>
                                <Chip
                                    label={product.retailerSig ? "Signature Added" : "Awaiting Scan"}
                                    color={product.retailerSig ? "success" : "warning"}
                                    size="small"
                                    sx={{ mt: 1 }}
                                />
                                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                    <Link to={`/update-product/${product.id}`}>
                                        <CustomButton backgroundColor="#4caf50" color="#fff" buttonText="Update Status" />
                                    </Link>
                                    <Button variant="outlined" onClick={() => viewHistory(product.id)}>Preview History</Button>
                                    <Button variant="contained" color="error" onClick={() => handleSell(product.id)}>Mark as Sold</Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                )) : (
                    <Typography sx={{ ml: 3, fontStyle: 'italic' }}>No products found for this retailer account.</Typography>
                )}
            </Grid>
        </Box>
    );
};

export default Retailer;