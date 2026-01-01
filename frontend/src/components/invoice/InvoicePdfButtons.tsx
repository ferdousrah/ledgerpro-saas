import { useState } from 'react';
import {
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { PictureAsPdf, Print } from '@mui/icons-material';
import { generateInvoicePDF } from '../../utils/invoicePdf';
import { useAuthStore } from '../../store/authStore';
import type { InvoiceWithDetails } from '../../types';

interface InvoicePdfButtonsProps {
  invoice: InvoiceWithDetails;
  variant?: 'full' | 'icon-only';
  size?: 'small' | 'medium';
  pdfOptions?: {
    topMargin?: number; // in mm
    bottomMargin?: number; // in mm
  };
}

export default function InvoicePdfButtons({
  invoice,
  variant = 'full',
  size = 'medium',
  pdfOptions,
}: InvoicePdfButtonsProps) {
  const { tenant } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (e: React.MouseEvent) => {
    // Prevent row click in DataGrid
    e.stopPropagation();

    if (!tenant) {
      setError('Tenant information not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await generateInvoicePDF(invoice, tenant, 'download', pdfOptions);
    } catch (err: any) {
      console.error('Error downloading PDF:', err);
      setError(err.message || 'Failed to download PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (e: React.MouseEvent) => {
    // Prevent row click in DataGrid
    e.stopPropagation();

    if (!tenant) {
      setError('Tenant information not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await generateInvoicePDF(invoice, tenant, 'print', pdfOptions);
    } catch (err: any) {
      console.error('Error printing PDF:', err);
      setError(err.message || 'Failed to print PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Icon-only variant for list page
  if (variant === 'icon-only') {
    return (
      <>
        <Tooltip title="Download PDF">
          <span>
            <IconButton
              size={size}
              onClick={handleDownload}
              disabled={loading}
              color="primary"
            >
              {loading ? <CircularProgress size={16} /> : <PictureAsPdf fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Print">
          <span>
            <IconButton size={size} onClick={handlePrint} disabled={loading}>
              <Print fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Snackbar>
      </>
    );
  }

  // Full variant for detail page
  return (
    <>
      <Button
        variant="outlined"
        startIcon={loading ? <CircularProgress size={16} /> : <PictureAsPdf />}
        onClick={handleDownload}
        disabled={loading}
        size={size}
      >
        Download PDF
      </Button>

      <Button
        variant="outlined"
        startIcon={<Print />}
        onClick={handlePrint}
        disabled={loading}
        size={size}
      >
        Print
      </Button>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
