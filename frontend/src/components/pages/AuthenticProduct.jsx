/* global BigInt */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Added Grid to the list below
import { Box, Paper, Typography, Stepper, Step, StepLabel, StepContent, Chip, Divider, Grid } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import { publicClient, PRODUCT_ABI, PRODUCT_ADDRESS } from '../../utils/contract';

const AuthenticProduct = () => {
    const { qrData } = useParams(); // Encoded QR string
    const [data, setData] = useState(null);
    const [product, setProduct] = useState(null);
    const [valid, setValid] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const verifySignatures = async () => {
            try {
                const bundle = JSON.parse(decodeURIComponent(qrData));
                const { metadata, mfgSig, retSig } = bundle;

                // Verify Manufacturer Part
                const mfgDataOnly = {
                    serial: metadata.serial,
                    name: metadata.name,
                    brand: metadata.brand,
                    description: metadata.description,
                    imageUrl: metadata.imageUrl,
                    mfgName: metadata.mfgName,
                    mfgLoc: metadata.mfgLoc,
                    mfgDate: metadata.mfgDate
                };

                // Logic to check if mfgSig matches mfgDataOnly...
                // Logic to check if retSig matches full metadata...

                setData(bundle);
            } catch (e) {
                setValid(false);
            }
        };
        verifySignatures();
    }, [qrData]);

    if (!valid || !data || !product) return <Typography sx={{ p: 5, textAlign: 'center' }}>Invalid QR Code Scanned</Typography>;

    return (
        <Box sx={{ p: 3, maxWidth: 800, m: 'auto' }}>
            <Paper elevation={4} sx={{ p: 3, borderRadius: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <VerifiedIcon color="success" sx={{ fontSize: 50 }} />
                    <Typography variant="h4" fontWeight="bold">Authentic Product</Typography>
                </Box>

                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="h6">{product.brand} - {product.name}</Typography>
                        <Typography variant="body2">SN: {product.serialNumber}</Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>{product.description}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} textAlign="right">
                        <Chip label={product.isSold ? "SOLD" : "AVAILABLE"} color={product.isSold ? "error" : "success"} />
                    </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>Traceability Journey (Lifecycle)</Typography>
                <Stepper orientation="vertical">
                    {product.timestampHistory.map((time, index) => (
                        <Step key={index} active={true}>
                            <StepLabel>
                                <Typography fontWeight="bold">{index === 0 ? 'Manufactured' : 'Received by Retailer'}</Typography>
                                <Typography variant="caption">{new Date(time).toLocaleString()}</Typography>
                            </StepLabel>
                            <StepContent>
                                <Typography variant="body2">Location: {product.locationHistory[index].split(', ')[1]}</Typography>
                                <Typography variant="body2">Actor: {product.actorNames[index]}</Typography>
                                {index > 0 && <Typography variant="caption" color="textSecondary">Source: {product.actorNames[0]}</Typography>}
                            </StepContent>
                        </Step>
                    ))}
                </Stepper>

                <Box sx={{ mt: 4, p: 2, bgcolor: '#f0f4ff', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="primary">Digital Certificates Attached:</Typography>
                    <Typography variant="caption" display="block" sx={{ wordBreak: 'break-all' }}><b>Manufacturer Sig:</b> {product.manufacturerSig.substring(0, 50)}...</Typography>
                    {product.retailerSig && <Typography variant="caption" display="block" sx={{ wordBreak: 'break-all', mt: 1 }}><b>Retailer Sig:</b> {product.retailerSig.substring(0, 50)}...</Typography>}
                </Box>
            </Paper>
        </Box>
    );
};

export default AuthenticProduct;