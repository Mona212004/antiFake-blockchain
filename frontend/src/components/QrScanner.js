import React, { useEffect, useState } from 'react';
import { QrReader } from 'react-qr-reader';
import { Box, Typography, Paper } from '@mui/material';

/**
 * @dev QrScanner component for Product Authentication.
 * Pass scanned ID back to parent for blockchain lookup.
 */
const QrScanner = ({ passData }) => {
  const [data, setData] = useState('');

  useEffect(() => {
    if (data) {
      passData(data);
    }
  }, [data, passData]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
      <Paper elevation={3} sx={{ p: 2, borderRadius: '15px', width: '100%', maxWidth: '400px', bgcolor: '#f5f5f5' }}>
        <Typography variant="h6" sx={{ textAlign: 'center', mb: 2, color: '#0F1B4C', fontWeight: 'bold' }}>
          Align QR Code with Camera
        </Typography>

        <Box sx={{ width: '100%', border: '4px solid #0F1B4C', borderRadius: '10px', overflow: 'hidden' }}>
          <QrReader
            onResult={(result, error) => {
              if (result) {
                setData(result?.text);
              }
            }}
            // Standard constraints for mobile-first scanning
            constraints={{ facingMode: 'environment' }}
            style={{ width: '100%' }}
          />
        </Box>

        <Typography variant="caption" sx={{ display: 'block', mt: 2, textAlign: 'center', color: 'gray' }}>
          Blockchain Product Verification System
        </Typography>
      </Paper>
    </Box>
  );
};

export default QrScanner;