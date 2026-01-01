import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Snackbar,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Add, Edit, Delete, AccountBalance, Warning as WarningIcon } from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import DialogHeader from '../components/DialogHeader';
import { accountsApi, AccountType, type MoneyAccount, type MoneyAccountCreate } from '../services/singleEntryApi';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/currency';

export default function AccountsPage() {
  const { tenant } = useAuthStore();
  const [accounts, setAccounts] = useState<MoneyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<MoneyAccount | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  const [formData, setFormData] = useState<MoneyAccountCreate>({
    name: '',
    account_type: AccountType.CASH,
    account_number: '',
    bank_name: '',
    opening_balance: 0,
    description: '',
    is_active: true,
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await accountsApi.list();
      setAccounts(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (account?: MoneyAccount) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        account_type: account.account_type,
        account_number: account.account_number || '',
        bank_name: account.bank_name || '',
        opening_balance: account.opening_balance,
        description: account.description || '',
        is_active: account.is_active,
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: '',
        account_type: AccountType.CASH,
        account_number: '',
        bank_name: '',
        opening_balance: 0,
        description: '',
        is_active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAccount(null);
    setError('');
  };

  const handleSave = async () => {
    try {
      setError('');
      if (editingAccount) {
        await accountsApi.update(editingAccount.id, formData);
        setSuccessMessage('Account updated successfully');
      } else {
        await accountsApi.create(formData);
        setSuccessMessage('Account added successfully');
      }
      await loadAccounts();
      handleCloseDialog();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save account');
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
  };

  const handleCancelConfirm = () => {
    setConfirmDialogOpen(false);
    setConfirmAction(null);
  };

  const handleDelete = async (id: string) => {
    openConfirmDialog('Are you sure you want to delete this account?', async () => {
      try {
        setError('');
        await accountsApi.delete(id);
        await loadAccounts();
        setSuccessMessage('Account deleted successfully');
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to delete account');
      }
    });
  };

  const getAccountTypeLabel = (type: AccountType) => {
    const labels = {
      [AccountType.CASH]: 'Cash',
      [AccountType.BANK]: 'Bank',
      [AccountType.MOBILE_MONEY]: 'Mobile Money',
      [AccountType.OTHER]: 'Other',
    };
    return labels[type];
  };

  const getAccountTypeColor = (type: AccountType) => {
    const colors: Record<AccountType, 'default' | 'primary' | 'secondary' | 'info'> = {
      [AccountType.CASH]: 'default',
      [AccountType.BANK]: 'primary',
      [AccountType.MOBILE_MONEY]: 'secondary',
      [AccountType.OTHER]: 'info',
    };
    return colors[type];
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Money Accounts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your cash, bank, and other money accounts
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Account
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Card>
        <CardContent>
          {accounts.length === 0 ? (
            <Box py={8} textAlign="center">
              <AccountBalance sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No accounts yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click "Add Account" to create your first money account
              </Typography>
            </Box>
          ) : (
            <Box sx={{ height: 500, width: '100%' }}>
              <DataGrid
                rows={accounts}
                columns={[
                  {
                    field: 'name',
                    headerName: 'Account Name',
                    flex: 1,
                    minWidth: 180,
                    renderCell: (params) => (
                      <Box sx={{ py: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {params.value}
                        </Typography>
                        {params.row.bank_name && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {params.row.bank_name}
                          </Typography>
                        )}
                      </Box>
                    ),
                  },
                  {
                    field: 'account_type',
                    headerName: 'Type',
                    width: 130,
                    renderCell: (params) => (
                      <Chip
                        label={getAccountTypeLabel(params.value)}
                        size="small"
                        color={getAccountTypeColor(params.value)}
                      />
                    ),
                  },
                  {
                    field: 'account_number',
                    headerName: 'Account Number',
                    width: 150,
                    valueGetter: (params) => params || '-',
                  },
                  {
                    field: 'opening_balance',
                    headerName: 'Opening Balance',
                    width: 150,
                    align: 'right',
                    headerAlign: 'right',
                    renderCell: (params) => formatCurrency(params.value, tenant?.currency || 'USD'),
                  },
                  {
                    field: 'current_balance',
                    headerName: 'Current Balance',
                    width: 150,
                    align: 'right',
                    headerAlign: 'right',
                    renderCell: (params) => (
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={params.value >= 0 ? 'success.main' : 'error.main'}
                      >
                        {formatCurrency(params.value, tenant?.currency || 'USD')}
                      </Typography>
                    ),
                  },
                  {
                    field: 'is_active',
                    headerName: 'Status',
                    width: 110,
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
                        <Tooltip title="Edit" arrow>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDialog(params.row)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete" arrow>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(params.row.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
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
                getRowHeight={() => 'auto'}
                sx={{
                  '& .MuiDataGrid-columnHeader': {
                    backgroundColor: 'background.default',
                  },
                  '& .MuiDataGrid-cell': {
                    display: 'flex',
                    alignItems: 'center',
                    borderColor: 'divider',
                  },
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogHeader
          title={editingAccount ? 'Edit Account' : 'Add New Account'}
          onClose={handleCloseDialog}
        />
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            label="Account Name"
            fullWidth
            margin="normal"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Account Type</InputLabel>
            <Select
              value={formData.account_type}
              onChange={(e) => setFormData({ ...formData, account_type: e.target.value as AccountType })}
              label="Account Type"
            >
              <MenuItem value={AccountType.CASH}>Cash</MenuItem>
              <MenuItem value={AccountType.BANK}>Bank</MenuItem>
              <MenuItem value={AccountType.MOBILE_MONEY}>Mobile Money</MenuItem>
              <MenuItem value={AccountType.OTHER}>Other</MenuItem>
            </Select>
          </FormControl>

          {(formData.account_type === AccountType.BANK || formData.account_type === AccountType.MOBILE_MONEY) && (
            <>
              <TextField
                label="Account Number"
                fullWidth
                margin="normal"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              />
              <TextField
                label={formData.account_type === AccountType.BANK ? 'Bank Name' : 'Provider Name'}
                fullWidth
                margin="normal"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              />
            </>
          )}

          <TextField
            label="Opening Balance"
            type="number"
            fullWidth
            margin="normal"
            value={formData.opening_balance}
            onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
            inputProps={{ step: 0.01, min: 0 }}
            disabled={!!editingAccount}
            helperText={editingAccount ? 'Opening balance cannot be changed after creation' : ''}
          />

          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
              label="Status"
            >
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.name}>
            {editingAccount ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={handleCancelConfirm} maxWidth="xs" fullWidth>
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
          <Typography variant="body1" sx={{ mt: 1 }}>{confirmMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCancelConfirm} variant="outlined">Cancel</Button>
          <Button onClick={handleConfirm} variant="contained" color="error" autoFocus>Confirm</Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccessMessage('')} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
