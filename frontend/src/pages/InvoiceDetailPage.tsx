import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Divider,
  Paper,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Send,
  Cancel,
  Payment,
  Delete,
} from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import DialogHeader from '../components/DialogHeader';
import InvoicePdfButtons from '../components/invoice/InvoicePdfButtons';
import { invoicesApi } from '../services/invoicesApi';
import { accountsApi } from '../services/singleEntryApi';
import type {
  InvoiceWithDetails,
  InvoicePaymentWithDetails,
  InvoicePaymentCreate,
  InvoiceStatus,
  PaymentMethod,
  MoneyAccount,
} from '../types';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/dateFormatter';
import { useAuthStore } from '../store/authStore';

const paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'other', label: 'Other' },
];

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tenant } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [payments, setPayments] = useState<InvoicePaymentWithDetails[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccount[]>([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  useEffect(() => {
    loadInvoice();
    loadAccounts();

    // Auto-open payment dialog if ?action=payment
    if (searchParams.get('action') === 'payment') {
      setPaymentDialogOpen(true);
    }
  }, [id, searchParams]);

  const loadInvoice = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [invoiceData, paymentsData] = await Promise.all([
        invoicesApi.get(id),
        invoicesApi.listPayments(id),
      ]);
      setInvoice(invoiceData);
      setPayments(paymentsData);

      // Set default payment amount to remaining balance
      if (invoiceData.balance_due > 0) {
        setPaymentAmount(invoiceData.balance_due);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await accountsApi.list();
      setAccounts(data);
      // Set default account
      if (data.length > 0 && !paymentAccountId) {
        setPaymentAccountId(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load accounts:', err);
    }
  };

  const handleSendInvoice = async () => {
    if (!id) return;

    try {
      await invoicesApi.send(id);
      setSuccessMessage('Invoice sent successfully');
      loadInvoice();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send invoice');
    }
  };

  const handleCancelInvoice = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to cancel this invoice?')) return;

    try {
      await invoicesApi.cancel(id);
      setSuccessMessage('Invoice cancelled successfully');
      loadInvoice();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel invoice');
    }
  };

  const handleRecordPayment = async () => {
    if (!id || !invoice) return;

    if (!paymentAmount || paymentAmount <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }

    if (paymentAmount > invoice.balance_due) {
      setError('Payment amount cannot exceed balance due');
      return;
    }

    if (!paymentAccountId) {
      setError('Please select an account');
      return;
    }

    try {
      setRecordingPayment(true);
      setError('');

      const paymentData: InvoicePaymentCreate = {
        payment_date: paymentDate,
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        account_id: paymentAccountId,
        reference_number: paymentReference || undefined,
        notes: paymentNotes || undefined,
      };

      await invoicesApi.recordPayment(id, paymentData);
      setSuccessMessage('Payment recorded successfully');
      setPaymentDialogOpen(false);
      resetPaymentForm();
      loadInvoice();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
      await invoicesApi.deletePayment(id, paymentId);
      setSuccessMessage('Payment deleted successfully');
      loadInvoice();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete payment');
    }
  };

  const resetPaymentForm = () => {
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentAmount(invoice?.balance_due || '');
    setPaymentMethod('bank_transfer');
    setPaymentReference('');
    setPaymentNotes('');
  };

  const getStatusColor = (
    status: InvoiceStatus
  ): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'sent':
        return 'primary';
      case 'paid':
        return 'success';
      case 'partially_paid':
        return 'warning';
      case 'overdue':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: InvoiceStatus): string => {
    return status.replace(/_/g, ' ').toUpperCase();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout>
        <Alert severity="error">Invoice not found</Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/invoices')} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h4" component="h1">
                Invoice {invoice.invoice_number}
              </Typography>
              <Chip
                label={getStatusLabel(invoice.status)}
                color={getStatusColor(invoice.status)}
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <InvoicePdfButtons
              invoice={invoice}
              variant="full"
              pdfOptions={{
                topMargin: tenant?.pdf_top_margin,
                bottomMargin: tenant?.pdf_bottom_margin,
              }}
            />

            {invoice.status === 'draft' && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                >
                  Edit
                </Button>
                <Button variant="contained" startIcon={<Send />} onClick={handleSendInvoice}>
                  Send
                </Button>
              </>
            )}

            {(invoice.status === 'draft' || invoice.status === 'sent') &&
              invoice.payments_count === 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Cancel />}
                  onClick={handleCancelInvoice}
                >
                  Cancel Invoice
                </Button>
              )}

            {invoice.balance_due > 0 &&
              invoice.status !== 'cancelled' &&
              invoice.status !== 'draft' && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Payment />}
                  onClick={() => setPaymentDialogOpen(true)}
                >
                  Record Payment
                </Button>
              )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        {/* Invoice Header */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Customer
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {invoice.customer_name}
                </Typography>
                {invoice.customer_email && (
                  <Typography variant="body2" color="text.secondary">
                    {invoice.customer_email}
                  </Typography>
                )}
                {invoice.customer_address && (
                  <Typography variant="body2" color="text.secondary">
                    {invoice.customer_address}
                  </Typography>
                )}
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Invoice Date:
                  </Typography>
                  <Typography variant="body2">{formatDate(invoice.invoice_date)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Due Date:
                  </Typography>
                  <Typography variant="body2">{formatDate(invoice.due_date)}</Typography>
                </Box>
                {invoice.reference_number && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Reference:
                    </Typography>
                    <Typography variant="body2">{invoice.reference_number}</Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Line Items
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoice.line_items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.line_number}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.category_name || '-'}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">{formatCurrency(item.unit_price, tenant?.currency || 'USD')}</TableCell>
                    <TableCell align="right">
                      <strong>{formatCurrency(item.subtotal, tenant?.currency || 'USD')}</strong>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Totals */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ maxWidth: 400, ml: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Subtotal:</Typography>
              <Typography>{formatCurrency(invoice.subtotal, tenant?.currency || 'USD')}</Typography>
            </Box>
            {invoice.discount_amount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="error.main">Discount:</Typography>
                <Typography color="error.main">-{formatCurrency(invoice.discount_amount, tenant?.currency || 'USD')}</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Total {tenant?.tax_label || 'Tax'}:</Typography>
              <Typography>{formatCurrency(invoice.total_tax, tenant?.currency || 'USD')}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6">Total Amount:</Typography>
              <Typography variant="h6">{formatCurrency(invoice.total_amount, tenant?.currency || 'USD')}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography color="success.main">Total Paid:</Typography>
              <Typography color="success.main">{formatCurrency(invoice.total_paid, tenant?.currency || 'USD')}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" color={invoice.balance_due > 0 ? 'error.main' : 'text.primary'}>
                Balance Due:
              </Typography>
              <Typography variant="h6" color={invoice.balance_due > 0 ? 'error.main' : 'success.main'}>
                {formatCurrency(invoice.balance_due, tenant?.currency || 'USD')}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Payment History */}
        {payments.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment History
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Account</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.payment_date)}</TableCell>
                      <TableCell>{formatCurrency(payment.amount, tenant?.currency || 'USD')}</TableCell>
                      <TableCell>
                        {paymentMethodOptions.find((m) => m.value === payment.payment_method)?.label}
                      </TableCell>
                      <TableCell>{payment.account_name}</TableCell>
                      <TableCell>{payment.reference_number || '-'}</TableCell>
                      <TableCell>{payment.notes || '-'}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeletePayment(payment.id)}
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Notes and Terms */}
        {(invoice.notes || invoice.terms_and_conditions || invoice.footer_text) && (
          <Card>
            <CardContent>
              {invoice.notes && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Notes
                  </Typography>
                  <Typography variant="body2">{invoice.notes}</Typography>
                </Box>
              )}
              {invoice.terms_and_conditions && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Terms and Conditions
                  </Typography>
                  <Typography variant="body2">{invoice.terms_and_conditions}</Typography>
                </Box>
              )}
              {invoice.footer_text && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Footer
                  </Typography>
                  <Typography variant="body2">{invoice.footer_text}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogHeader title="Record Payment" onClose={() => setPaymentDialogOpen(false)} />
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label="Payment Date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
                required
              />

              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value ? Number(e.target.value) : '')}
                inputProps={{ min: 0, max: invoice.balance_due, step: 0.01 }}
                helperText={`Balance due: ${formatCurrency(invoice.balance_due, tenant?.currency || 'USD')}`}
                sx={{ mb: 2 }}
                required
              />

              <TextField
                select
                fullWidth
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                sx={{ mb: 2 }}
                required
              >
                {paymentMethodOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                label="Account"
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
                sx={{ mb: 2 }}
                required
              >
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                label="Reference Number (Optional)"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Check number, transaction ID, etc."
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Notes (Optional)"
                multiline
                rows={2}
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Payment notes..."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentDialogOpen(false)} disabled={recordingPayment}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              variant="contained"
              color="success"
              disabled={recordingPayment}
            >
              {recordingPayment ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
