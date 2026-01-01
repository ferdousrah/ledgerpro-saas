import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Checkbox,
  FormControlLabel,
  Snackbar,
  Chip,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Receipt as TaxIcon,
  CloudDownload as DownloadIcon,
  GridOn as CsvIcon,
  Code as JsonIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import DialogHeader from '../components/DialogHeader';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import { taxRatesApi } from '../services/singleEntryApi';
import type { TaxRate, TaxRateCreate } from '../types';
import { DATE_FORMATS, formatDate } from '../utils/dateFormatter';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
];

export default function SettingsPage() {
  const { tenant, setTenant } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    company_name: tenant?.company_name || '',
    phone: tenant?.phone || '',
    address: tenant?.address || '',
    currency: tenant?.currency || 'USD',
    date_format: tenant?.date_format || 'DD/MM/YYYY',
    pdf_top_margin: tenant?.pdf_top_margin || 70,
    pdf_bottom_margin: tenant?.pdf_bottom_margin || 20,
    default_tax_rate: tenant?.default_tax_rate || 0,
    tax_label: tenant?.tax_label || 'Tax',
  });

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(() => {
    if (!tenant?.logo_url) return null;
    // If URL is already absolute, use it; otherwise construct it
    if (tenant.logo_url.startsWith('http')) {
      return tenant.logo_url;
    }
    const apiBaseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
    return `${apiBaseUrl}${tenant.logo_url}`;
  });

  // Fiscal Year Dialog
  const [fiscalYearDialogOpen, setFiscalYearDialogOpen] = useState(false);

  // Tax Configuration Dialog
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [taxLoading, setTaxLoading] = useState(false);
  const [taxError, setTaxError] = useState('');
  const [taxSuccess, setTaxSuccess] = useState('');
  const [taxFormOpen, setTaxFormOpen] = useState(false);
  const [editingTaxRate, setEditingTaxRate] = useState<TaxRate | null>(null);
  const [taxFormData, setTaxFormData] = useState<TaxRateCreate>({
    name: '',
    rate: 0,
    description: '',
    applies_to_income: false,
    applies_to_expense: false,
    is_active: true,
  });

  // Backup Dialog
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);

  // Confirmation Dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  // Snackbar Notification
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleEdit = () => {
    setEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      company_name: tenant?.company_name || '',
      phone: tenant?.phone || '',
      address: tenant?.address || '',
      currency: tenant?.currency || 'USD',
      date_format: tenant?.date_format || 'DD/MM/YYYY',
      pdf_top_margin: tenant?.pdf_top_margin || 70,
      pdf_bottom_margin: tenant?.pdf_bottom_margin || 20,
      default_tax_rate: tenant?.default_tax_rate || 0,
      tax_label: tenant?.tax_label || 'Tax',
    });
    setError('');
  };

  const handleSave = async () => {
    try {
      setError('');
      setSuccess('');

      const updatedTenant = await authAPI.updateTenantSettings(formData);

      setTenant(updatedTenant);
      setEditing(false);
      showNotification('Settings updated successfully! Page will refresh...', 'success');

      // Reload page after a short delay to ensure all components get updated tenant data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update settings');
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (100KB max)
    const maxSize = 100 * 1024; // 100KB
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 100KB');
      return;
    }

    try {
      setUploadingLogo(true);
      setError('');

      // Create FormData
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      // Upload to backend
      const response = await authAPI.uploadLogo(formDataUpload);

      // Get base URL from environment or use relative path
      const apiBaseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
      const logoUrl = `${apiBaseUrl}${response.url}`;
      setLogoPreview(logoUrl);

      // Update tenant in store
      if (tenant) {
        setTenant({ ...tenant, logo_url: logoUrl });
      }

      showNotification('Logo uploaded successfully!', 'success');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async () => {
    try {
      setUploadingLogo(true);
      await authAPI.deleteLogo();
      setLogoPreview(null);

      // Update tenant in store
      if (tenant) {
        setTenant({ ...tenant, logo_url: undefined });
      }

      showNotification('Logo deleted successfully!', 'success');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Tax Rate handlers
  const loadTaxRates = async () => {
    try {
      setTaxLoading(true);
      const rates = await taxRatesApi.list();
      setTaxRates(rates);
    } catch (err: any) {
      setTaxError(err.response?.data?.detail || 'Failed to load tax rates');
    } finally {
      setTaxLoading(false);
    }
  };

  const handleOpenTaxDialog = () => {
    setTaxDialogOpen(true);
    setTaxError('');
    setTaxSuccess('');
    loadTaxRates();
  };

  const handleCloseTaxDialog = () => {
    setTaxDialogOpen(false);
    setTaxFormOpen(false);
    setEditingTaxRate(null);
  };

  const handleAddTaxRate = () => {
    setEditingTaxRate(null);
    setTaxFormData({
      name: '',
      rate: 0,
      description: '',
      applies_to_income: false,
      applies_to_expense: false,
      is_active: true,
    });
    setTaxFormOpen(true);
    setTaxError('');
    setTaxSuccess('');
  };

  const handleEditTaxRate = (taxRate: TaxRate) => {
    setEditingTaxRate(taxRate);
    setTaxFormData({
      name: taxRate.name,
      rate: taxRate.rate,
      description: taxRate.description || '',
      applies_to_income: taxRate.applies_to_income,
      applies_to_expense: taxRate.applies_to_expense,
      is_active: taxRate.is_active,
    });
    setTaxFormOpen(true);
    setTaxError('');
    setTaxSuccess('');
  };

  const handleSaveTaxRate = async () => {
    try {
      setTaxError('');
      setTaxSuccess('');

      if (!taxFormData.name || taxFormData.rate <= 0) {
        setTaxError('Please provide a valid name and rate');
        return;
      }

      if (editingTaxRate) {
        await taxRatesApi.update(editingTaxRate.id, taxFormData);
        setTaxSuccess('Tax rate updated successfully!');
      } else {
        await taxRatesApi.create(taxFormData);
        setTaxSuccess('Tax rate created successfully!');
      }

      setTaxFormOpen(false);
      setEditingTaxRate(null);
      loadTaxRates();
    } catch (err: any) {
      setTaxError(err.response?.data?.detail || 'Failed to save tax rate');
    }
  };

  const openConfirmDialog = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setConfirmDialogOpen(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setConfirmDialogOpen(false);
    setConfirmAction(null);
    setConfirmMessage('');
  };

  const handleCancelConfirm = () => {
    setConfirmDialogOpen(false);
    setConfirmAction(null);
    setConfirmMessage('');
  };

  const handleDeleteTaxRate = (id: string) => {
    openConfirmDialog(
      'Are you sure you want to delete this tax rate? This action cannot be undone.',
      async () => {
        try {
          setTaxError('');
          setTaxSuccess('');
          await taxRatesApi.delete(id);
          showNotification('Tax rate deleted successfully!', 'success');
          loadTaxRates();
        } catch (err: any) {
          showNotification(err.response?.data?.detail || 'Failed to delete tax rate', 'error');
        }
      }
    );
  };

  const selectedCurrency = CURRENCIES.find(c => c.code === formData.currency);

  return (
    <DashboardLayout>
      <Box mb={3}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your application settings and preferences
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" flexDirection="column" alignItems="center" py={4}>
                {/* Logo with Edit Icon */}
                <Box sx={{ position: 'relative', mb: 2 }}>
                  {logoPreview ? (
                    <Box
                      sx={{
                        position: 'relative',
                        border: '2px solid',
                        borderColor: 'primary.main',
                        borderRadius: 2,
                        p: 2,
                        bgcolor: 'background.paper',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 100,
                        minWidth: 200,
                      }}
                    >
                      <img
                        src={logoPreview}
                        alt={tenant?.company_name}
                        style={{
                          maxHeight: '80px',
                          maxWidth: '180px',
                          objectFit: 'contain',
                        }}
                        onError={(e) => {
                          console.error('Failed to load logo:', logoPreview);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <IconButton
                        size="small"
                        component="label"
                        disabled={uploadingLogo}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'background.paper',
                          boxShadow: 2,
                          '&:hover': { bgcolor: 'grey.100' },
                        }}
                      >
                        <EditIcon fontSize="small" />
                        <input
                          type="file"
                          hidden
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                          onChange={handleLogoUpload}
                        />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        position: 'relative',
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 2,
                        bgcolor: 'background.paper',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 100,
                        minWidth: 200,
                      }}
                    >
                      <BusinessIcon sx={{ fontSize: 60, color: 'primary.main' }} />
                      <IconButton
                        size="small"
                        component="label"
                        disabled={uploadingLogo}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'background.paper',
                          boxShadow: 2,
                          '&:hover': { bgcolor: 'grey.100' },
                        }}
                      >
                        <AddIcon fontSize="small" />
                        <input
                          type="file"
                          hidden
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                          onChange={handleLogoUpload}
                        />
                      </IconButton>
                    </Box>
                  )}
                </Box>

                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {tenant?.company_name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    bgcolor: tenant?.accounting_type === 'single' ? 'success.50' : 'info.50',
                    color: tenant?.accounting_type === 'single' ? 'success.main' : 'info.main',
                    px: 2,
                    py: 0.5,
                    borderRadius: 1,
                    fontWeight: 'medium',
                    mb: 1,
                  }}
                >
                  {tenant?.accounting_type === 'single' ? 'Single Entry' : 'Double Entry'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Currency: {selectedCurrency?.symbol} {tenant?.currency}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold">
                  Company Information
                </Typography>
                {!editing && (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={handleEdit}
                    size="small"
                  >
                    Edit
                  </Button>
                )}
              </Box>

              <Grid container spacing={3}>
                {/* Row 1: Company Name */}
                <Grid item xs={12}>
                  <TextField
                    label="Company Name"
                    fullWidth
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    disabled={!editing}
                    variant={editing ? 'outlined' : 'filled'}
                    helperText={editing ? 'Enter your company or business name' : ''}
                  />
                </Grid>

                {/* Row 2: Address */}
                <Grid item xs={12}>
                  <TextField
                    label="Address"
                    fullWidth
                    multiline
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={!editing}
                    variant={editing ? 'outlined' : 'filled'}
                    helperText={editing ? 'Enter company full address' : ''}
                  />
                </Grid>

                {/* Row 3: Phone */}
                <Grid item xs={12}>
                  <TextField
                    label="Phone Number"
                    fullWidth
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!editing}
                    variant={editing ? 'outlined' : 'filled'}
                    helperText={editing ? 'Enter company phone number' : ''}
                  />
                </Grid>

                {/* Row 4: Currency, Date Format, Accounting Type */}
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth disabled={!editing} variant={editing ? 'outlined' : 'filled'}>
                    <InputLabel>Currency</InputLabel>
                    <Select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      label="Currency"
                    >
                      {CURRENCIES.map((currency) => (
                        <MenuItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.code} - {currency.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth disabled={!editing} variant={editing ? 'outlined' : 'filled'}>
                    <InputLabel>Date Format</InputLabel>
                    <Select
                      value={formData.date_format}
                      onChange={(e) => setFormData({ ...formData, date_format: e.target.value })}
                      label="Date Format"
                    >
                      {DATE_FORMATS.map((format) => (
                        <MenuItem key={format.value} value={format.value}>
                          {format.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Accounting Type"
                    fullWidth
                    value={tenant?.accounting_type === 'single' ? 'Single Entry' : 'Double Entry'}
                    disabled
                    variant="filled"
                    helperText="Cannot be changed after setup"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold">
                  Tax Configuration
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure tax settings for your invoices. Set default tax rate and terminology.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Default Tax Rate (%)"
                    fullWidth
                    type="number"
                    value={formData.default_tax_rate}
                    onChange={(e) => setFormData({ ...formData, default_tax_rate: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) })}
                    disabled={!editing}
                    variant={editing ? 'outlined' : 'filled'}
                    helperText={editing ? 'Tax rate applied to all invoices (0-100%)' : `${formData.default_tax_rate}% tax rate applied`}
                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!editing} variant={editing ? 'outlined' : 'filled'}>
                    <InputLabel>Tax Label</InputLabel>
                    <Select
                      value={formData.tax_label}
                      onChange={(e) => setFormData({ ...formData, tax_label: e.target.value })}
                      label="Tax Label"
                    >
                      <MenuItem value="Tax">Tax</MenuItem>
                      <MenuItem value="VAT">VAT (Value Added Tax)</MenuItem>
                      <MenuItem value="GST">GST (Goods and Services Tax)</MenuItem>
                    </Select>
                    {!editing && (
                      <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5, display: 'block' }}>
                        Using "{formData.tax_label}" terminology in invoices
                      </Box>
                    )}
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold">
                  PDF Invoice Settings
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure margins for PDF invoices (in millimeters). Useful for pre-printed letterheads.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="PDF Top Margin (mm)"
                    fullWidth
                    type="number"
                    value={formData.pdf_top_margin}
                    onChange={(e) => setFormData({ ...formData, pdf_top_margin: Math.max(0, Math.min(200, parseInt(e.target.value) || 0)) })}
                    disabled={!editing}
                    variant={editing ? 'outlined' : 'filled'}
                    helperText={editing ? 'Space for company letterhead (0-200mm)' : `${formData.pdf_top_margin}mm space for letterhead`}
                    inputProps={{ min: 0, max: 200 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="PDF Bottom Margin (mm)"
                    fullWidth
                    type="number"
                    value={formData.pdf_bottom_margin}
                    onChange={(e) => setFormData({ ...formData, pdf_bottom_margin: Math.max(0, Math.min(200, parseInt(e.target.value) || 0)) })}
                    disabled={!editing}
                    variant={editing ? 'outlined' : 'filled'}
                    helperText={editing ? 'Space for footer (0-200mm)' : `${formData.pdf_bottom_margin}mm space for footer`}
                    inputProps={{ min: 0, max: 200 }}
                  />
                </Grid>
              </Grid>

              {editing && (
                <Box mt={3} display="flex" gap={2}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={!formData.company_name}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                System Settings
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure fiscal year, tax rates, and data export options.
              </Typography>
              <Grid container spacing={2}>
                <Grid item>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CalendarIcon />}
                    onClick={() => setFiscalYearDialogOpen(true)}
                  >
                    Fiscal Year Settings
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<TaxIcon />}
                    onClick={handleOpenTaxDialog}
                  >
                    Tax Configuration
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => setBackupDialogOpen(true)}
                  >
                    Backup & Export
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2} color="error">
                Danger Zone
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary" paragraph>
                Permanently delete your account and all associated data. This action cannot be undone.
              </Typography>
              <Button variant="outlined" color="error" disabled size="small">
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Fiscal Year Settings Dialog */}
      <Dialog open={fiscalYearDialogOpen} onClose={() => setFiscalYearDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogHeader title="Fiscal Year Settings" onClose={() => setFiscalYearDialogOpen(false)} />
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Current Fiscal Year Information
            </Typography>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      Fiscal Year Start Date
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {tenant?.fiscal_year_start ? formatDate(tenant.fiscal_year_start, tenant?.date_format || 'DD/MM/YYYY') : 'Not set'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      Fiscal Year End Date
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {tenant?.fiscal_year_start ? (() => {
                        const startDate = new Date(tenant.fiscal_year_start);
                        const endDate = new Date(startDate);
                        endDate.setFullYear(endDate.getFullYear() + 1);
                        endDate.setDate(endDate.getDate() - 1);
                        return formatDate(endDate, tenant?.date_format || 'DD/MM/YYYY');
                      })() : 'Not set'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
                  <CardContent>
                    <Typography variant="caption" color="primary.main" gutterBottom>
                      Current Fiscal Year
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary.main">
                      {tenant?.fiscal_year_start ? (() => {
                        const startDate = new Date(tenant.fiscal_year_start);
                        const today = new Date();
                        let currentFYStart = new Date(startDate);

                        // Calculate which fiscal year we're in
                        while (currentFYStart <= today) {
                          const nextFYStart = new Date(currentFYStart);
                          nextFYStart.setFullYear(nextFYStart.getFullYear() + 1);
                          if (nextFYStart > today) break;
                          currentFYStart = nextFYStart;
                        }

                        const currentFYEnd = new Date(currentFYStart);
                        currentFYEnd.setFullYear(currentFYEnd.getFullYear() + 1);
                        currentFYEnd.setDate(currentFYEnd.getDate() - 1);

                        return `FY ${currentFYStart.getFullYear()}-${currentFYEnd.getFullYear()} (${formatDate(currentFYStart, tenant?.date_format || 'DD/MM/YYYY')} - ${formatDate(currentFYEnd, tenant?.date_format || 'DD/MM/YYYY')})`;
                      })() : 'Not set'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Alert severity="info">
              Fiscal year settings are configured during initial setup and cannot be changed here. Contact support if you need to modify your fiscal year.
            </Alert>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>Note:</strong> Your fiscal year determines how financial reports are organized and when your annual accounting cycle begins and ends.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFiscalYearDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Tax Configuration Dialog */}
      <Dialog open={taxDialogOpen} onClose={handleCloseTaxDialog} maxWidth="md" fullWidth>
        <DialogHeader
          title={
            <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
              <Typography variant="h6">Tax Configuration</Typography>
              {!taxFormOpen && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddTaxRate}
                >
                  Add Tax Rate
                </Button>
              )}
            </Box>
          }
          onClose={handleCloseTaxDialog}
        />
        <DialogContent>
          {taxError && <Alert severity="error" sx={{ mb: 2 }}>{taxError}</Alert>}
          {taxSuccess && <Alert severity="success" sx={{ mb: 2 }}>{taxSuccess}</Alert>}

          {taxFormOpen ? (
            // Add/Edit Form
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {editingTaxRate ? 'Edit Tax Rate' : 'Add New Tax Rate'}
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Tax Rate Name"
                    fullWidth
                    value={taxFormData.name}
                    onChange={(e) => setTaxFormData({ ...taxFormData, name: e.target.value })}
                    required
                    helperText="e.g., Sales Tax, VAT, Income Tax"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Rate (%)"
                    type="number"
                    fullWidth
                    value={taxFormData.rate}
                    onChange={(e) => setTaxFormData({ ...taxFormData, rate: parseFloat(e.target.value) || 0 })}
                    required
                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                    helperText="Enter percentage (0-100)"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    fullWidth
                    multiline
                    rows={2}
                    value={taxFormData.description}
                    onChange={(e) => setTaxFormData({ ...taxFormData, description: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={taxFormData.applies_to_income}
                        onChange={(e) => setTaxFormData({ ...taxFormData, applies_to_income: e.target.checked })}
                      />
                    }
                    label="Applies to Income"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={taxFormData.applies_to_expense}
                        onChange={(e) => setTaxFormData({ ...taxFormData, applies_to_expense: e.target.checked })}
                      />
                    }
                    label="Applies to Expenses"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={taxFormData.is_active}
                        onChange={(e) => setTaxFormData({ ...taxFormData, is_active: e.target.checked })}
                      />
                    }
                    label="Active"
                  />
                </Grid>
              </Grid>
              <Box mt={3} display="flex" gap={2}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveTaxRate}
                  disabled={!taxFormData.name || taxFormData.rate <= 0}
                >
                  {editingTaxRate ? 'Update' : 'Create'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={() => setTaxFormOpen(false)}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          ) : (
            // Tax Rates List with DataGrid
            <Box sx={{ mt: 2, height: 450, width: '100%' }}>
              {taxLoading ? (
                <Typography variant="body2" color="text.secondary">Loading tax rates...</Typography>
              ) : taxRates.length === 0 ? (
                <Alert severity="info">
                  No tax rates configured. Click "Add Tax Rate" to create your first tax rate.
                </Alert>
              ) : (
                <DataGrid
                  rows={taxRates}
                  columns={[
                    {
                      field: 'name',
                      headerName: 'Name',
                      flex: 1,
                      minWidth: 150,
                      renderCell: (params) => (
                        <Box>
                          <Typography variant="body2" fontWeight="medium">{params.row.name}</Typography>
                          {params.row.description && (
                            <Typography variant="caption" color="text.secondary">
                              {params.row.description}
                            </Typography>
                          )}
                        </Box>
                      ),
                    },
                    {
                      field: 'rate',
                      headerName: 'Rate',
                      width: 100,
                      align: 'right',
                      headerAlign: 'right',
                      renderCell: (params) => `${params.value.toFixed(2)}%`,
                    },
                    {
                      field: 'applies_to',
                      headerName: 'Applies To',
                      width: 200,
                      renderCell: (params) => (
                        <Box display="flex" gap={0.5}>
                          {params.row.applies_to_income && (
                            <Chip label="Income" size="small" color="success" variant="outlined" />
                          )}
                          {params.row.applies_to_expense && (
                            <Chip label="Expense" size="small" color="error" variant="outlined" />
                          )}
                          {!params.row.applies_to_income && !params.row.applies_to_expense && (
                            <Typography variant="caption" color="text.secondary">None</Typography>
                          )}
                        </Box>
                      ),
                    },
                    {
                      field: 'is_active',
                      headerName: 'Status',
                      width: 120,
                      renderCell: (params) => (
                        <Chip
                          label={params.value ? 'Active' : 'Inactive'}
                          size="small"
                          color={params.value ? 'success' : 'default'}
                        />
                      ),
                    },
                    {
                      field: 'actions',
                      headerName: 'Actions',
                      width: 120,
                      sortable: false,
                      filterable: false,
                      renderCell: (params) => (
                        <Box>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditTaxRate(params.row)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteTaxRate(params.row.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ),
                    },
                  ]}
                  slots={{
                    toolbar: GridToolbar,
                  }}
                  slotProps={{
                    toolbar: {
                      showQuickFilter: true,
                      quickFilterProps: { debounceMs: 500 },
                    },
                  }}
                  initialState={{
                    pagination: {
                      paginationModel: { pageSize: 10 },
                    },
                  }}
                  pageSizeOptions={[5, 10, 25, 50]}
                  disableRowSelectionOnClick
                  sx={{
                    '& .MuiDataGrid-cell:focus': {
                      outline: 'none',
                    },
                    '& .MuiDataGrid-cell:focus-within': {
                      outline: 'none',
                    },
                  }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTaxDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Backup & Export Dialog */}
      <Dialog open={backupDialogOpen} onClose={() => setBackupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogHeader title="Backup & Export Data" onClose={() => setBackupDialogOpen(false)} />
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph sx={{ mt: 2 }}>
            Export your data in various formats for backup or migration purposes.
          </Typography>

          <List>
            <ListItem>
              <ListItemIcon>
                <CsvIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Export Accounts to CSV"
                secondary="Spreadsheet-compatible format for Excel, Google Sheets"
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => {
                  const token = localStorage.getItem('access_token');
                  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
                  window.open(`${apiUrl}/export/csv/accounts?token=${token}`, '_blank');
                }}
              >
                Download
              </Button>
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CsvIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Export Categories to CSV"
                secondary="All income and expense categories"
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => {
                  const token = localStorage.getItem('access_token');
                  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
                  window.open(`${apiUrl}/export/csv/categories?token=${token}`, '_blank');
                }}
              >
                Download
              </Button>
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CsvIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Export Transactions to CSV"
                secondary="All income and expense transactions"
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => {
                  const token = localStorage.getItem('access_token');
                  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
                  window.open(`${apiUrl}/export/csv/transactions?token=${token}`, '_blank');
                }}
              >
                Download
              </Button>
            </ListItem>
            <Divider sx={{ my: 2 }} />
            <ListItem>
              <ListItemIcon>
                <JsonIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Full Backup (JSON)"
                secondary="Complete data backup including all accounts, categories, transactions, and tax rates"
              />
              <Button
                variant="contained"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => {
                  const token = localStorage.getItem('access_token');
                  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
                  window.open(`${apiUrl}/export/json/full-backup?token=${token}`, '_blank');
                }}
              >
                Download
              </Button>
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelConfirm}
        maxWidth="xs"
        fullWidth
      >
        <DialogHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <WarningIcon color="warning" />
              <Typography variant="h6">Confirm Action</Typography>
            </Box>
          }
          onClose={handleCancelConfirm}
        />
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            {confirmMessage}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCancelConfirm} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleConfirm} variant="contained" color="error" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
