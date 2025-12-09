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
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import { taxRatesApi } from '../services/singleEntryApi';
import type { TaxRate, TaxRateCreate } from '../types';

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
    currency: tenant?.currency || 'USD',
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
      currency: tenant?.currency || 'USD',
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
      showNotification('Settings updated successfully!', 'success');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update settings');
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
                <BusinessIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
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
                <Grid item xs={12} sm={6}>
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
                <Grid item xs={12} sm={6}>
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
        <DialogTitle>Fiscal Year Settings</DialogTitle>
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
                      {tenant?.fiscal_year_start ? new Date(tenant.fiscal_year_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not set'}
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
                        return endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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

                        return `FY ${currentFYStart.getFullYear()}-${currentFYEnd.getFullYear()} (${currentFYStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${currentFYEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
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
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
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
        </DialogTitle>
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
        <DialogTitle>Backup & Export Data</DialogTitle>
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
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography variant="h6">Confirm Action</Typography>
          </Box>
        </DialogTitle>
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
