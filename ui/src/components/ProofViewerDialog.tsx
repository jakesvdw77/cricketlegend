import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress, Typography, Box,
} from '@mui/material';
import { paymentApi } from '../api/paymentApi';

interface Props {
  open: boolean;
  proofUrl: string | null;
  onClose: () => void;
}

export const ProofViewerDialog: React.FC<Props> = ({ open, proofUrl, onClose }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !proofUrl) return;
    let revoked = false;
    setLoading(true);
    setError('');
    setBlobUrl(null);
    paymentApi.fetchProof(proofUrl)
      .then(({ blobUrl: url, mimeType: mime }) => {
        if (!revoked) { setBlobUrl(url); setMimeType(mime); }
      })
      .catch(() => { if (!revoked) setError('Could not load the document. Please try again.'); })
      .finally(() => { if (!revoked) setLoading(false); });
    return () => {
      revoked = true;
      // revoke on unmount / next open
    };
  }, [open, proofUrl]);

  const handleClose = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    onClose();
  };

  const isPdf = mimeType === 'application/pdf';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Proof of Payment</DialogTitle>
      <DialogContent sx={{ p: 0, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading && <CircularProgress />}
        {error && <Typography color="error" sx={{ p: 3 }}>{error}</Typography>}
        {blobUrl && isPdf && (
          <Box
            component="iframe"
            src={blobUrl}
            title="Proof of Payment"
            sandbox="allow-same-origin"
            sx={{ width: '100%', height: '70vh', border: 'none', display: 'block' }}
          />
        )}
        {blobUrl && !isPdf && (
          <Box
            component="img"
            src={blobUrl}
            alt="Proof of Payment"
            sx={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', mx: 'auto', p: 2 }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
