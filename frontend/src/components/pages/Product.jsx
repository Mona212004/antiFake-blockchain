/* global BigInt */
import { Box, Paper, Avatar, Typography, Button, Chip, Stack, Divider, CircularProgress } from '@mui/material';
import bgImg from '../../img/bg.png';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineOppositeContent, {
    timelineOppositeContentClasses,
} from '@mui/lab/TimelineOppositeContent';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { publicClient, PRODUCT_ABI, PRODUCT_ADDRESS } from '../../utils/contract';

const Product = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const qrData = location.state?.qrData;

    const [product, setProduct] = useState(null);
    const [history, setHistory] = useState([]);
    const [locations, setLocations] = useState([]);
    const [actors, setActors] = useState([]);
    const [times, setTimes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [valid, setValid] = useState(true);

    const handleVerifyProduct = useCallback(async (scannedData) => {
        setLoading(true);
        try {
            // 1. Parse the QR JSON Bundle
            const parsedBundle = JSON.parse(scannedData);
            const productId = BigInt(parsedBundle.id);
            const { data: qrMetadata, mfgSig, retSig } = parsedBundle;

            // 2. Fetch ground-truth data from Blockchain
            const chainData = await publicClient.readContract({
                address: PRODUCT_ADDRESS,
                abi: PRODUCT_ABI,
                functionName: 'products',
                args: [productId]
            });

            // 3. Map the Struct from Product.sol (adjusted indices)
            const mappedProduct = {
                id: chainData[0].toString(),
                serialNumber: chainData[1],
                name: chainData[2],
                brand: chainData[3],
                description: chainData[4],
                manufactDate: chainData[5],
                imageUrl: chainData[6],
                currentOwner: chainData[7],
                isSold: chainData[8],
                history: chainData[9],
                locationHistory: chainData[10],
                actorNames: chainData[11],
                timestampHistory: chainData[12],
                manufacturerName: chainData[13],
                mfgSig: chainData[14],
                allowedRetailers: chainData[15],
                retSig: chainData[16],
            };

            // 4. Fetch history
            const [histAddrs, histLocs, histActors, histTimes] = await publicClient.readContract({
                address: PRODUCT_ADDRESS,
                abi: PRODUCT_ABI,
                functionName: 'getProductHistory',
                args: [productId]
            });

            setHistory(histAddrs);
            setLocations(histLocs);
            setActors(histActors);
            setTimes(histTimes);

            // 5. Reconstruct signed message from chain
            const reconstructed = {
                serial: mappedProduct.serialNumber,
                name: mappedProduct.name,
                brand: mappedProduct.brand,
                description: mappedProduct.description,
                imageUrl: mappedProduct.imageUrl,
                date: mappedProduct.manufactDate,
                manufacturerName: mappedProduct.manufacturerName,
                retailerList: mappedProduct.allowedRetailers,
                lifecycle: histTimes.map((time, i) => ({
                    status: i === 0 ? 'Manufactured' : 'Received by Retailer',
                    location: histLocs[i].split(', ')[1],
                    timestamp: time,
                    actor: histActors[i],
                    details: i === 0 ? 'Product registered by manufacturer' : 'Received by retailer'
                }))
            };

            const message = JSON.stringify(reconstructed);

            // 6. Verify sigs
            const isManuValid = await publicClient.verifyMessage({
                address: histAddrs[0],
                message,
                signature: mfgSig,
            });

            let isRetValid = true;
            if (retSig && mappedProduct.retSig) {
                isRetValid = await publicClient.verifyMessage({
                    address: mappedProduct.currentOwner,
                    message,
                    signature: retSig,
                });
            }

            if (!isManuValid || !isRetValid) {
                setValid(false);
                navigate('/fake');
                return;
            }

            setProduct(mappedProduct);
        } catch (err) {
            console.error(err);
            setValid(false);
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        if (qrData) handleVerifyProduct(qrData);
    }, [qrData, handleVerifyProduct]);

    if (loading) return <CircularProgress />;

    if (!valid || !product) return <Typography>Invalid Product</Typography>;

    return (
        <Box sx={{ backgroundImage: `url(${bgImg})`, minHeight: "100vh", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Paper sx={{ p: 4, maxWidth: 600, mx: 'auto', borderRadius: 4 }}>
                <Avatar sx={{ m: 'auto', bgcolor: 'primary.main' }}>
                    <VerifiedUserIcon />
                </Avatar>
                <Typography variant="h5" align="center" gutterBottom>Product Details</Typography>

                <Stack spacing={2}>
                    <Typography><b>Name:</b> {product.name}</Typography>
                    <Typography><b>Brand:</b> {product.brand}</Typography>
                    <Typography><b>Serial:</b> {product.serialNumber}</Typography>
                    <Typography><b>Description:</b> {product.description}</Typography>
                    <Typography><b>Manufact Date:</b> {product.manufactDate}</Typography>
                    <Chip label={product.isSold ? "Sold" : "Available"} color={product.isSold ? "error" : "success"} />
                </Stack>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>Provenance Timeline</Typography>
                <Timeline
                    sx={{
                        [`& .${timelineOppositeContentClasses.root}`]: {
                            flex: 0.2,
                        },
                    }}
                >
                    {times.map((time, index) => (
                        <TimelineItem key={index}>
                            <TimelineOppositeContent color="textSecondary">
                                {new Date(time).toLocaleDateString()}
                            </TimelineOppositeContent>
                            <TimelineSeparator>
                                <TimelineDot />
                                {index < times.length - 1 && <TimelineConnector />}
                            </TimelineSeparator>
                            <TimelineContent>
                                <Typography variant="h6">{index === 0 ? 'Manufactured' : 'Received by Retailer'}</Typography>
                                <Typography>Actor: {actors[index]}</Typography>
                                <Typography>Location: {locations[index].split(', ')[1]}</Typography>
                                <Typography>Address: {history[index].substring(0, 15)}...</Typography>
                            </TimelineContent>
                        </TimelineItem>
                    ))}
                </Timeline>

                <Box sx={{ mt: 3, p: 2, bgcolor: '#e8eaf6', borderRadius: 3 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VerifiedUserIcon fontSize="small" color="primary" /> Digital Proofs
                    </Typography>
                    <Stack spacing={1}>
                        <Box>
                            <Typography variant="caption" color="textSecondary">Manufacturer Signature:</Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', wordBreak: 'break-all' }}>
                                {product.mfgSig}
                            </Typography>
                        </Box>
                        {product.retSig && (
                            <Box>
                                <Typography variant="caption" color="textSecondary">Retailer Signature:</Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', wordBreak: 'break-all' }}>
                                    {product.retSig}
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                </Box>

                <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
                    <Button fullWidth variant="outlined" onClick={() => navigate(-1)}>
                        Scan Another
                    </Button>
                    {product.isSold ? (
                        <Button fullWidth variant="contained" color="error" disabled>
                            Sold Out
                        </Button>
                    ) : (
                        <Button fullWidth variant="contained" color="success" startIcon={<StorefrontIcon />}>
                            Available
                        </Button>
                    )}
                </Stack>
            </Paper>
        </Box>
    );
};

export default Product;