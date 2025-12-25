import { Box, Paper, Typography, Button, CircularProgress, Alert, Divider } from '@mui/material';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QrScanner from '../QrScanner';
import useAuth from '../../hooks/useAuth';
import bgImg from '../../img/bg.png';
import QrScannerLib from 'qr-scanner';

const MANUFACTURER_ADDRESS = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266".toLowerCase();

const createImageFromFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const ScannerPage = () => {
    const [qrData, setQrData] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');
    const { auth } = useAuth();
    const navigate = useNavigate();
    const isProcessing = useRef(false);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setVerifying(true);
        setError('');

        try {
            const img = await createImageFromFile(file);
            const canvas = document.createElement('canvas');
            const size = 1024;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            const scale = Math.min(size / img.width, size / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (size - w) / 2;
            const y = (size - h) / 2;
            ctx.drawImage(img, x, y, w, h);

            const imageData = ctx.getImageData(0, 0, size, size);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const val = avg < 128 ? 0 : 255;
                data[i] = val;
                data[i + 1] = val;
                data[i + 2] = val;
            }
            ctx.putImageData(imageData, 0, 0);

            const result = await QrScannerLib.scanImage(canvas, {
                returnDetailedScanResult: true,
                alsoTryWithoutScanRegion: true,
                inversionMode: 'both',
            });

            if (result?.data) {
                setQrData(result.data);
            } else {
                throw new Error('No QR data found');
            }
        } catch (err) {
            setError("QR not detected. Ensure the code is clear and not blurry.");
        } finally {
            setVerifying(false);
        }
    };

    useEffect(() => {
        if (!qrData || !auth.isConnected) return;

        const processQR = async () => {
            try {
                const cleanData = qrData.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
                const bundle = JSON.parse(cleanData);

                const userAddr = auth.walletAddress?.toLowerCase();
                const isRetailer = userAddr && userAddr !== MANUFACTURER_ADDRESS;

                if (isRetailer) {
                    navigate(`/update-product/${bundle.id}`, {
                        state: {
                            id: bundle.id,
                            data: bundle.details || bundle,
                            mfgSig: bundle.mfgSig,
                            lifecycle: bundle.lifecycle || [],
                            intendedRetailer: bundle.intendedRetailer  // ← NOW PASSED CORRECTLY
                        }
                    });
                } else {
                    navigate(`/product`, { state: { qrData: cleanData } });
                }
            } catch (err) {
                setError("Invalid QR Format.");
                setQrData('');
            } finally {
                setVerifying(false);
            }
        };

        processQR();
    }, [qrData, auth, navigate]);

    return (
        <Box sx={{ backgroundImage: `url(${bgImg})`, minHeight: "100vh", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Paper elevation={6} sx={{ width: "450px", p: 4, textAlign: "center", borderRadius: 4 }}>
                <Button variant="text" onClick={() => navigate(-1)} sx={{ alignSelf: 'flex-start', mb: 2 }}>Back</Button>
                <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold" }}>Secure Scanner</Typography>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {verifying ? (
                    <CircularProgress />
                ) : (
                    <>
                        <QrScanner passData={setQrData} />
                        <Divider sx={{ my: 2 }}>OR</Divider>
                        <Button variant="contained" component="label" fullWidth>
                            Upload QR Screenshot
                            <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                        </Button>
                    </>
                )}
            </Paper>
        </Box>
    );
};

export default ScannerPage;