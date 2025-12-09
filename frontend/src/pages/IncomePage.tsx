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
import { Add, Edit, Delete, TrendingUp } from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import { transactionsApi, accountsApi, categoriesApi, TransactionType, type Transaction, type TransactionCreate, type MoneyAccount, type Category } from '../services/singleEntryApi';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/currency';

export default function IncomePage() {
  const { tenant } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState<TransactionCreate>({
    account_id: '',
    category_id: '',
    transaction_type: TransactionType.INCOME,
    amount: 0,
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    reference_number: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [transactionsData, accountsData, categoriesData] = await Promise.all([
        transactionsApi.list({ transaction_type: TransactionType.INCOME }),
        accountsApi.list(),
        categoriesApi.list(TransactionType.INCOME),
      ]);
      setTransactions(transactionsData);
      setAccounts(accountsData);
      setCategories(categoriesData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setFormData({
        account_id: transaction.account_id,
        category_id: transaction.category_id || '',
        transaction_type: TransactionType.INCOME,
        amount: transaction.amount,
        transaction_date: transaction.transaction_date,
        description: transaction.description || '',
        reference_number: transaction.reference_number || '',
      });
    } else {
      setEditingTransaction(null);
      setFormData({
        account_id: accounts[0]?.id || '',
        category_id: '',
        transaction_type: TransactionType.INCOME,
        amount: 0,
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        reference_number: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTransaction(null);
    setError('');
  };

  const handleSave = async () => {
    try {
      setError('');
      if (editingTransaction) {
        await transactionsApi.update(editingTransaction.id, formData);
        setSuccessMessage('Income updated successfully');
      } else {
        await transactionsApi.create(formData);
        setSuccessMessage('Income added successfully');
      }
      await loadData();
      handleCloseDialog();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save transaction');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      setError('');
      await transactionsApi.delete(id);
      await loadData();
      setSuccessMessage('Income deleted successfully');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete transaction');
    }
  };

  const getAccountName = (accountId: string) => {
    return accounts.find((a) => a.id === accountId)?.name || 'Unknown';
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'Uncategorized';
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown';
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

  const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <DashboardLayout>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Income Transactions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Income: <strong style={{ color: '#4caf50' }}>{formatCurrency(totalIncome, tenant?.currency || 'USD')}</strong>
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="success"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          disabled={accounts.length === 0}
        >
          Add Income
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {accounts.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please create at least one money account before adding transactions.
        </Alert>
      )}

      <Card>
        <CardContent>
          {transactions.length === 0 ? (
            <Box py={8} textAlign="center">
              <TrendingUp sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No income transactions yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click "Add Income" to record your first income transaction
              </Typography>
            </Box>
          ) : (
            <Box sx={{ height: 500, width: '100%' }}>
              <DataGrid
                rows={transactions}
                columns={[
                  {
                    field: 'transaction_date',
                    headerName: 'Date',
                    width: 130,
                    valueFormatter: (params) => new Date(params).toLocaleDateString(),
                  },
                  {
                    field: 'account_id',
                    headerName: 'Account',
                    flex: 1,
                    minWidth: 150,
                    valueGetter: (params) => getAccountName(params),
                  },
                  {
                    field: 'category_id',
                    headerName: 'Category',
                    width: 150,
                    renderCell: (params) => (
                      <Chip label={getCategoryName(params.value)} size="small" color="success" variant="outlined" />
                    ),
                  },
                  {
                    field: 'description',
                    headerName: 'Description',
                    flex: 1,
                    minWidth: 200,
                    renderCell: (params) => (
                      <Box sx={{ py: 1 }}>
                        <Typography variant="body2">{params.value || '-'}</Typography>
                        {params.row.reference_number && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Ref: {params.row.reference_number}
                          </Typography>
                        )}
                      </Box>
                    ),
                  },
                  {
                    field: 'amount',
                    headerName: 'Amount',
                    width: 150,
                    align: 'right',
                    headerAlign: 'right',
                    renderCell: (params) => (
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                        +{formatCurrency(params.value, tenant?.currency || 'USD')}
                      </Typography>
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
                          <IconButton size="small" color="primary" onClick={() => handleOpenDialog(params.row)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete" arrow>
                          <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)}>
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
                  '& .MuiDataGrid-cell': {
                    display: 'flex',
                    alignItems: 'center',
                  },
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTransaction ? 'Edit Income' : 'Add Income'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <FormControl fullWidth margin="normal">
            <InputLabel>Account</InputLabel>
            <Select
              value={formData.account_id}
              onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
              label="Account"
              required
            >
              {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.name} ({formatCurrency(account.current_balance, tenant?.currency || 'USD')})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Category (Optional)</InputLabel>
            <Select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              label="Category (Optional)"
            >
              <MenuItem value="">None</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Amount"
            type="number"
            fullWidth
            margin="normal"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            inputProps={{ step: 0.01, min: 0 }}
            required
          />

          <TextField
            label="Date"
            type="date"
            fullWidth
            margin="normal"
            value={formData.transaction_date}
            onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            required
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

          <TextField
            label="Reference Number"
            fullWidth
            margin="normal"
            value={formData.reference_number}
            onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
            placeholder="Invoice/Receipt number"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="success"
            disabled={!formData.account_id || formData.amount <= 0}
          >
            {editingTransaction ? 'Update' : 'Add'}
          </Button>
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
