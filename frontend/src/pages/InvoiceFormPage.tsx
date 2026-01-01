import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Paper,
  Autocomplete,
} from '@mui/material';
import { Delete, ArrowBack, Save } from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import { invoicesApi } from '../services/invoicesApi';
import { partnersApi, categoriesApi } from '../services/singleEntryApi';
import { productsApi } from '../services/productsApi';
import type {
  InvoiceCreate,
  InvoiceLineItemCreate,
  Partner,
  Category,
  PaymentTerms,
  InvoiceWithDetails,
  ProductWithDetails,
} from '../types';
import { formatCurrency } from '../utils/currency';
import { useAuthStore } from '../store/authStore';

const paymentTermsOptions: { value: PaymentTerms; label: string; days: number }[] = [
  { value: 'due_on_receipt', label: 'Due on Receipt', days: 0 },
  { value: 'net_15', label: 'Net 15', days: 15 },
  { value: 'net_30', label: 'Net 30', days: 30 },
  { value: 'net_60', label: 'Net 60', days: 60 },
  { value: 'net_90', label: 'Net 90', days: 90 },
  { value: 'custom', label: 'Custom', days: 0 },
];

interface LineItem {
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  category_id: string;
  subtotal: number;
  tax_amount: number;
  line_total: number;
}

export default function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = id !== 'new' && !!id;
  const { tenant } = useAuthStore();

  // Construct logo URL properly
  const getLogoUrl = () => {
    if (!tenant?.logo_url) return null;
    // If URL is already absolute, use it; otherwise construct it
    if (tenant.logo_url.startsWith('http')) {
      return tenant.logo_url;
    }
    const apiBaseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
    return `${apiBaseUrl}${tenant.logo_url}`;
  };

  // Form state
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Dropdown data
  const [customers, setCustomers] = useState<Partner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);

  // Invoice header
  const [customerId, setCustomerId] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Partner | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [salesOrderNo, setSalesOrderNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('net_30');
  const [customPaymentDays, setCustomPaymentDays] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [footerText, setFooterText] = useState('Thank you for your business!');
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ProductWithDetails | null>(null);

  useEffect(() => {
    loadDropdownData();
    if (isEditMode) {
      loadInvoice();
    }
  }, [isEditMode, id]);

  // Calculate due date based on payment terms
  const calculateDueDate = (invoiceDateStr: string, terms: PaymentTerms, customDays?: number) => {
    const date = new Date(invoiceDateStr);
    const termsOption = paymentTermsOptions.find((t) => t.value === terms);
    const daysToAdd = terms === 'custom' ? (customDays || 0) : (termsOption?.days || 0);
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
  };

  const dueDate = calculateDueDate(invoiceDate, paymentTerms, Number(customPaymentDays) || undefined);

  const loadDropdownData = async () => {
    try {
      const [customersData, categoriesData, productsData] = await Promise.all([
        partnersApi.list({ category: 'customer' }),
        categoriesApi.list(),
        productsApi.list({ is_active: true }),
      ]);
      setCustomers(customersData);
      setCategories(categoriesData);
      setProducts(productsData);
    } catch (err: any) {
      setError('Failed to load form data');
    }
  };

  const loadInvoice = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const invoice: InvoiceWithDetails = await invoicesApi.get(id);

      if (invoice.status !== 'draft') {
        setError('Only draft invoices can be edited');
        setTimeout(() => navigate('/invoices'), 2000);
        return;
      }

      setCustomerId(invoice.customer_id);
      const customer = customers.find((c) => c.id === invoice.customer_id);
      setSelectedCustomer(customer || null);
      setInvoiceNumber(invoice.invoice_number);
      setSalesOrderNo(invoice.reference_number || '');
      setInvoiceDate(invoice.invoice_date);
      setPaymentTerms(invoice.payment_terms);
      setCustomPaymentDays(invoice.custom_payment_terms_days || '');
      setNotes(invoice.notes || '');
      setFooterText(invoice.footer_text || 'Thank you for your business!');

      const loadedLineItems = invoice.line_items.map((item) => ({
        line_number: item.line_number,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        category_id: item.category_id || '',
        subtotal: item.subtotal,
        tax_amount: item.tax_amount,
        line_total: item.line_total,
      }));
      setLineItems(loadedLineItems);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const calculateLineItem = (item: LineItem): LineItem => {
    const subtotal = item.quantity * item.unit_price;
    // Use tenant's default tax rate
    const taxPercentage = tenant?.default_tax_rate || 0;
    const taxAmount = (subtotal * taxPercentage) / 100;
    const lineTotal = subtotal + taxAmount;

    return {
      ...item,
      subtotal: Number(subtotal.toFixed(2)),
      tax_amount: Number(taxAmount.toFixed(2)),
      line_total: Number(lineTotal.toFixed(2)),
    };
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    updatedItems[index] = calculateLineItem(updatedItems[index]);
    setLineItems(updatedItems);
  };

  const addItemFromCatalog = (item: ProductWithDetails | null) => {
    if (!item) return;

    const newLine: LineItem = {
      line_number: lineItems.length + 1,
      description: item.description || item.name,
      quantity: 1,
      unit_price: item.unit_price,
      category_id: item.category_id || '',
      subtotal: item.unit_price,
      tax_amount: 0,
      line_total: item.unit_price,
    };

    const calculatedLine = calculateLineItem(newLine);
    setLineItems([...lineItems, calculatedLine]);
    setSelectedItem(null);
  };

  const removeLineItem = (index: number) => {
    const updatedItems = lineItems.filter((_, i) => i !== index);
    updatedItems.forEach((item, idx) => {
      item.line_number = idx + 1;
    });
    setLineItems(updatedItems);
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
    const lineItemTaxes = lineItems.reduce((sum, item) => sum + item.tax_amount, 0);

    // Calculate effective tax rate from line items
    // This is the weighted average tax rate across all line items
    const effectiveTaxRate = subtotal > 0 ? lineItemTaxes / subtotal : 0;

    // Apply discount to subtotal first to get taxable amount
    const taxableAmount = subtotal - discountAmount;

    // Calculate tax on the discounted taxable amount using effective tax rate
    // Standard formula: Tax = (Subtotal - Discount) × Effective_Tax_Rate
    const calculatedTax = taxableAmount * effectiveTaxRate;

    // Total = taxable amount + tax
    const totalAmount = taxableAmount + calculatedTax;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalTax: Number(calculatedTax.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
    };
  };

  const validateForm = (): string | null => {
    if (!customerId) return 'Please select a customer';
    if (!invoiceDate) return 'Please enter invoice date';
    if (paymentTerms === 'custom' && !customPaymentDays) {
      return 'Please enter custom payment terms days';
    }
    if (lineItems.length === 0) return 'Invoice must have at least one line item';

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.description.trim()) {
        return `Line ${i + 1}: Please enter description`;
      }
      if (item.quantity <= 0) {
        return `Line ${i + 1}: Quantity must be greater than 0`;
      }
      if (item.unit_price < 0) {
        return `Line ${i + 1}: Unit price cannot be negative`;
      }
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError('');

      const invoiceData: InvoiceCreate = {
        customer_id: customerId,
        invoice_date: invoiceDate,
        payment_terms: paymentTerms,
        custom_payment_terms_days: paymentTerms === 'custom' ? Number(customPaymentDays) : undefined,
        discount_amount: discountAmount,
        reference_number: salesOrderNo || undefined,
        notes: notes || undefined,
        terms_and_conditions: undefined,
        footer_text: footerText || undefined,
        line_items: lineItems.map(
          (item): InvoiceLineItemCreate => ({
            line_number: item.line_number,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            category_id: item.category_id || undefined,
          })
        ),
      };

      if (isEditMode && id) {
        await invoicesApi.update(id, invoiceData);
      } else {
        await invoicesApi.create(invoiceData);
      }

      navigate('/invoices');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
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

  const totals = calculateTotals();

  return (
    <DashboardLayout>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/invoices')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            {isEditMode ? 'Edit Invoice' : 'Create Invoice'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 4 }}>
            {/* Header Section */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* Company Logo */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Box
                  sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 120,
                  }}
                >
                  {getLogoUrl() ? (
                    <Box textAlign="center">
                      <img
                        src={getLogoUrl()!}
                        alt={tenant?.company_name}
                        style={{
                          maxHeight: '100px',
                          maxWidth: '250px',
                          objectFit: 'contain',
                        }}
                        onError={(e) => {
                          console.error('Failed to load logo:', getLogoUrl());
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <Typography variant="h6" mt={1} textAlign="center">
                        {tenant?.company_name}
                      </Typography>
                    </Box>
                  ) : (
                    <Box textAlign="center">
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 2,
                        }}
                      >
                        <Typography variant="h3" color="white">
                          {tenant?.company_name?.charAt(0).toUpperCase()}
                        </Typography>
                      </Box>
                      <Typography variant="h6">{tenant?.company_name}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                        Add logo in Settings
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Grid>

              {/* Invoice Details */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ bgcolor: 'background.default', p: 3, borderRadius: 2 }}>
                  <Typography variant="h5" gutterBottom fontWeight="bold">
                    Invoice
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Invoice Number"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    sx={{ mb: 2, bgcolor: 'background.paper' }}
                    disabled={isEditMode}
                    helperText={isEditMode ? 'Auto-generated' : 'Leave blank for auto-generation'}
                  />
                  <TextField
                    fullWidth
                    placeholder="Sales Order No"
                    value={salesOrderNo}
                    onChange={(e) => setSalesOrderNo(e.target.value)}
                    sx={{ bgcolor: 'background.paper' }}
                  />
                </Box>
              </Grid>
            </Grid>

            {/* Customer Selection */}
            <Box sx={{ mb: 4 }}>
              <Autocomplete
                options={customers}
                getOptionLabel={(option) => option.name}
                value={selectedCustomer}
                onChange={(_, newValue) => {
                  setSelectedCustomer(newValue);
                  setCustomerId(newValue?.id || '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Choose Customer *"
                    placeholder="Search customers..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'background.default',
                      },
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Typography variant="body1">{option.name}</Typography>
                  </li>
                )}
              />
            </Box>

            {/* Dates and Payment Terms */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Invoice Date <span style={{ color: 'red' }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  required
                  sx={{ bgcolor: 'background.default' }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Payment Terms
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
                  sx={{ bgcolor: 'background.default' }}
                >
                  {paymentTermsOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Due Date <span style={{ color: 'red' }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  value={dueDate}
                  disabled
                  sx={{ bgcolor: 'background.default' }}
                  helperText={`Based on ${
                    paymentTermsOptions.find((t) => t.value === paymentTerms)?.label || 'payment terms'
                  }`}
                />
              </Grid>
            </Grid>

            {/* Custom Payment Days */}
            {paymentTerms === 'custom' && (
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Custom Days"
                    type="number"
                    value={customPaymentDays}
                    onChange={(e) => setCustomPaymentDays(e.target.value ? Number(e.target.value) : '')}
                    sx={{ bgcolor: 'background.default' }}
                  />
                </Grid>
              </Grid>
            )}

            {/* Item Selection */}
            <Box sx={{ mb: 3 }}>
              <Autocomplete
                options={products}
                getOptionLabel={(option) => option.name}
                value={selectedItem}
                onChange={(_, newValue) => {
                  addItemFromCatalog(newValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Select a Product/Service"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'background.default',
                      },
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box>
                      <Typography variant="body1">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.description || option.name} - {formatCurrency(option.unit_price, tenant?.currency || 'USD')}
                      </Typography>
                    </Box>
                  </li>
                )}
              />
            </Box>

            {/* Line Items Table */}
            {lineItems.length > 0 && (
              <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'primary.main' }}>
                      <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }} align="center">
                        Quantity
                      </TableCell>
                      <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }} align="right">
                        Price
                      </TableCell>
                      <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }} align="right">
                        Amount
                      </TableCell>
                      <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }} align="center">

                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lineItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            value={item.description}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                            variant="standard"
                            placeholder="Item description"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            size="small"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                            variant="standard"
                            inputProps={{ min: 0, step: 0.01, style: { textAlign: 'center' } }}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateLineItem(index, 'unit_price', Number(e.target.value))}
                            variant="standard"
                            inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right' } }}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight="medium">{formatCurrency(item.subtotal, tenant?.currency || 'USD')}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => removeLineItem(index)} color="error">
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}

            {/* Totals */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
              <Box sx={{ minWidth: 300 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography>Sub Total</Typography>
                  <Typography>{formatCurrency(totals.subtotal, tenant?.currency || 'USD')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography>Discount Amount</Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right' } }}
                    sx={{ width: 120 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography>Total {tenant?.tax_label || 'Tax'}</Typography>
                  <Typography>{formatCurrency(totals.totalTax, tenant?.currency || 'USD')}</Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    pt: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography fontWeight="bold">Grand Total</Typography>
                  <Typography fontWeight="bold" color="primary">
                    {formatCurrency(totals.totalAmount, tenant?.currency || 'USD')}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Notes */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Notes
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any internal notes here..."
                sx={{ bgcolor: 'background.default' }}
              />
            </Box>

            {/* Footer */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Footer
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Add footer text (Thank you message, contact info, etc.)"
                sx={{ bgcolor: 'background.default' }}
              />
            </Box>

            {/* Save Button */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => navigate('/invoices')} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSave}
                disabled={saving}
                size="large"
              >
                {saving ? 'Saving...' : 'Save Invoice'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </DashboardLayout>
  );
}
