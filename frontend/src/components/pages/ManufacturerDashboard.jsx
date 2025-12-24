/* global BigInt */
import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Table, TableBody, TableCell, TableHead, TableRow, Stack, Chip, CircularProgress, Button } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { publicClient, PRODUCT_ABI, PRODUCT_ADDRESS } from '../../utils/contract';
import { useNavigate } from 'react-router-dom';

const ManufacturerDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [stats, setStats] = useState({ total: 0 });
    const navigate = useNavigate();

    useEffect(() => {
        const loadData = async () => {
            try {
                const count = await publicClient.readContract({
                    address: PRODUCT_ADDRESS,
                    abi: PRODUCT_ABI,
                    functionName: 'productCount'
                });

                const total = Number(count);
                setStats({ total });

                const fetchedProducts = [];
                // Fetch the 5 most recent products
                for (let i = total; i > Math.max(0, total - 5); i--) {
                    const data = await publicClient.readContract({
                        address: PRODUCT_ADDRESS,
                        abi: PRODUCT_ABI,
                        functionName: 'products',
                        args: [BigInt(i)]
                    });
                    const mapped = {
                        id: data[0].toString(),
                        name: data[2],
                        brand: data[3],
                        isSold: data[8],
                        manufacturerSig: data[14],
                    };
                    fetchedProducts.push(mapped);
                }
                setProducts(fetchedProducts);
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const viewHistory = async (productId) => {
        const [histAddrs, histLocs, histActors, histTimes] = await publicClient.readContract({
            address: PRODUCT_ADDRESS,
            abi: PRODUCT_ABI,
            functionName: 'getProductHistory',
            args: [BigInt(productId)]
        });
        console.log('History Preview:', { histAddrs, histLocs, histActors, histTimes }); // Or navigate to view
        // Could navigate to /product/{id} for full preview
    };

    return (
        <Box sx={{ p: 4 }}>
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#1a237e', color: 'white' }}>
                        <Typography variant="h6">Total Products Created</Typography>
                        <Typography variant="h3">{stats.total}</Typography>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Recent Blockchain Records</Typography>
                    <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 3 }}>
                        {loading ? <CircularProgress sx={{ m: 5 }} /> : (
                            <Table>
                                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                    <TableRow>
                                        <TableCell>ID</TableCell>
                                        <TableCell>Product Name</TableCell>
                                        <TableCell>Brand</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Manufacturer Signature</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {products.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell>#{p.id}</TableCell>
                                            <TableCell>{p.name}</TableCell>
                                            <TableCell>{p.brand}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={p.isSold ? "Sold" : "In Stock"}
                                                    color={p.isSold ? "secondary" : "success"}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <VerifiedUserIcon color="success" fontSize="small" />
                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                                        {p.manufacturerSig.substring(0, 15)}...
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Button size="small" onClick={() => viewHistory(p.id)}>Preview History</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ManufacturerDashboard;