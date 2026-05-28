import React, { useEffect, useRef } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
} from '@mui/material';
import { Close, Print } from '@mui/icons-material';

interface Props {
  pdfUrl: string | null;
  onClose: () => void;
}

export const PdfPreviewDialog: React.FC<Props> = ({ pdfUrl, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Revoke blob URL when dialog closes to avoid memory leaks
  useEffect(() => {
    if (!pdfUrl) return;
    return () => { URL.revokeObjectURL(pdfUrl); };
  }, [pdfUrl]);

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  return (
    <Dialog open={!!pdfUrl} onClose={onClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { height: '90vh', display: 'flex', flexDirection: 'column' } }}
    >
      <DialogTitle sx={{ py: 1.5, pr: 6 }}>
        PDF Preview
        <IconButton size="small" onClick={onClose}
          sx={{ position: 'absolute', right: 10, top: 10 }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, flex: 1, overflow: 'hidden' }}>
        {pdfUrl && (
          <Box component="iframe"
            ref={iframeRef}
            src={pdfUrl}
            title="PDF Preview"
            sx={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" startIcon={<Print />} onClick={handlePrint}>
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
};
