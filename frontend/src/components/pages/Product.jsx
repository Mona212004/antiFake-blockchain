/* global BigInt */
import { Box, Paper, Avatar, Typography, Button, Chip, Stack, Divider, CircularProgress } from '@mui/material';
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot, TimelineOppositeContent, timelineOppositeContentClasses } from '@mui/lab';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SecurityIcon from '@mui/icons-material/Security';
import FactoryIcon from '@mui/icons-material/Factory';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { publicClient, PRODUCT_ABI, PRODUCT_ADDRESS } from '../../utils/contract';
import bgImg from '../../img/bg.png';

const Product = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const qrData = location.state?.qrData;

    const [product, setProduct] = useState(null);
    const [lifecycle, setLifecycle] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isValid, setIsValid] = useState(true);

    const handleVerifyProduct = useCallback(async (scannedData) => {
        setLoading(true);
        try {
            const bundle = JSON.parse(scannedData);
            const productId = BigInt(bundle.id);

            // Fetch on-chain data for cross-verification
            const chainData = await publicClient.readContract({
                address: PRODUCT_ADDRESS,
                abi: PRODUCT_ABI,
                functionName: 'products',
                args: [productId]
            });

            // Verify manufacturer signature
            const message = JSON.stringify(bundle.details);
            const isMfgSigValid = await publicClient.verifyMessage({
                address: chainData[7], // manufacturer address from contract
                message,
                signature: bundle.mfgSig,
            });

            if (!isMfgSigValid) {
                setIsValid(false);
                navigate('/fake');
                return;
            }

            // Extract manufacturer origin (always first entry)
            const mfgEntry = bundle.lifecycle[0] || {};
            const latestEntry = bundle.lifecycle[bundle.lifecycle.length - 1] || mfgEntry;

            const mappedProduct = {
                id: bundle.id,
                serialNumber: bundle.details.serial,
                name: bundle.details.name,
                brand: bundle.details.brand,
                description: bundle.details.desc || bundle.details.description || '',
                imageUrl: bundle.details.img || bundle.details.imageUrl || '',
                manufacturerName: mfgEntry.entity || chainData[13],
                originLocation: mfgEntry.location || 'Not specified',
                productionDate: mfgEntry.time,
                currentLocation: latestEntry.location,
                currentHolder: latestEntry.entity || mfgEntry.entity,
                isSold: chainData[8], // true if marked sold on-chain (future feature)
                mfgSig: bundle.mfgSig,
                retSig: bundle.retSig || null,
                hasRetailerUpdate: bundle.lifecycle.length > 1
            };

            setProduct(mappedProduct);
            setLifecycle(bundle.lifecycle);
            setIsValid(true);
        } catch (err) {
            console.error("Verification Error:", err);
            setIsValid(false);
            navigate('/fake');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        if (qrData) handleVerifyProduct(qrData);
    }, [qrData, handleVerifyProduct]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!isValid || !product) {
        return null; // Redirected to /fake
    }

    return (
        <Box sx={{ backgroundImage: `url(${bgImg})`, minHeight: "100vh", p: 2 }}>
            <Paper elevation={6} sx={{ p: 4, maxWidth: 700, mx: 'auto', borderRadius: 4 }}>
                <Stack alignItems="center" spacing={2} sx={{ mb: 4 }}>
                    <Avatar sx={{ bgcolor: 'success.main', width: 60, height: 60 }}>
                        <VerifiedUserIcon fontSize="large" />
                    </Avatar>
                    <Typography variant="h5" fontWeight="bold">Authentic Product Verified</Typography>
                    <Chip label="Blockchain Secured" color="success" icon={<SecurityIcon />} />
                </Stack>

                {/* Product Image */}
                {product.imageUrl && (
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <img
                            src={product.imageUrl}
                            alt={product.name}
                            style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', objectFit: 'contain' }}
                        />
                    </Box>
                )}

                {/* Product Details */}
                <Typography variant="h6" color="primary" gutterBottom>Product Details</Typography>
                <Stack spacing={1} sx={{ mb: 3 }}>
                    <Typography><b>Brand:</b> {product.brand}</Typography>
                    <Typography><b>Name:</b> {product.name}</Typography>
                    <Typography><b>Serial Number:</b> {product.serialNumber}</Typography>
                    <Typography variant="body2">{product.description}</Typography>
                </Stack>

                <Divider sx={{ my: 3 }} />

                {/* Lifecycle: Manufacturer Origin First */}
                <Typography variant="h6" color="primary" gutterBottom>Supply Chain Journey</Typography>

                <Timeline sx={{ [`& .${timelineOppositeContentClasses.root}`]: { flex: 0.3 } }}>
                    {/* Manufacturer Origin - Always shown prominently */}
                    {lifecycle[0] && (
                        <TimelineItem>
                            <TimelineOppositeContent variant="caption">
                                {new Date(lifecycle[0].time).toLocaleDateString(undefined, {
                                    year: 'numeric', month: 'long', day: 'numeric'
                                })}
                            </TimelineOppositeContent>
                            <TimelineSeparator>
                                <TimelineDot color="primary" variant="outlined">
                                    <FactoryIcon />
                                </TimelineDot>
                                {lifecycle.length > 1 && <TimelineConnector />}
                            </TimelineSeparator>
                            <TimelineContent>
                                <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                    1. Manufacturer Origin (Verified)
                                </Typography>
                                <Typography><b>Manufacturer:</b> {lifecycle[0].entity}</Typography>
                                <Typography><b>Location:</b> {lifecycle[0].location}</Typography>
                                <Chip label="Origin" size="small" color="primary" sx={{ mt: 1 }} />
                            </TimelineContent>
                        </TimelineItem>
                    )}

                    {/* Retailer Entries */}
                    {lifecycle.slice(1).map((entry, idx) => (
                        <TimelineItem key={idx}>
                            <TimelineOppositeContent variant="caption">
                                {new Date(entry.time).toLocaleDateString()}
                            </TimelineOppositeContent>
                            <TimelineSeparator>
                                <TimelineDot color="secondary">
                                    <StorefrontIcon />
                                </TimelineDot>
                                {idx < lifecycle.slice(1).length - 1 && <TimelineConnector />}
                            </TimelineSeparator>
                            <TimelineContent>
                                <Typography variant="subtitle2" fontWeight="bold">
                                    {idx + 2}. Received by Retailer
                                </Typography>
                                <Typography><b>Shop:</b> {entry.entity}</Typography>
                                <Typography><b>Location:</b> {entry.location}</Typography>
                                <Chip label="In Stock" color="success" size="small" sx={{ mt: 1 }} />
                            </TimelineContent>
                        </TimelineItem>
                    ))}
                </Timeline>

                {/* If no retailer yet */}
                {!product.hasRetailerUpdate && (
                    <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', my: 3, fontStyle: 'italic' }}>
                        This product is authentic and directly from the manufacturer.<br />
                        It has not yet been received by a retailer.
                    </Typography>
                )}

                <Divider sx={{ my: 3 }} />

                {/* Digital Signatures */}
                <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <SecurityIcon /> Digital Signatures on Blockchain
                    </Typography>
                    <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                        <b>Manufacturer Signature:</b> {product.mfgSig.substring(0, 20)}...{product.mfgSig.substring(-6)}
                    </Typography>
                    {product.retSig && (
                        <Typography variant="caption" sx={{ wordBreak: 'break-all', mt: 1 }}>
                            <b>Retailer Signature (Tx Hash):</b> {product.retSig.substring(0, 20)}...{product.retSig.substring(-6)}
                        </Typography>
                    )}
                </Box>

                <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
                    <Button fullWidth variant="outlined" onClick={() => navigate('/scan')}>
                        Scan Another Product
                    </Button>
                    <Button
                        fullWidth
                        variant="contained"
                        color={product.isSold ? "error" : "success"}
                        startIcon={<StorefrontIcon />}
                    >
                        {product.isSold ? "Already Sold" : product.hasRetailerUpdate ? "Available at Retailer" : "Direct from Manufacturer"}
                    </Button>
                </Stack>
            </Paper>
        </Box>
    );
};

export default Product;