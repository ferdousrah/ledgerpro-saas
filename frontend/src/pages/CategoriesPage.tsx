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
  Tabs,
  Tab,
  Tooltip,
  Snackbar,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Add, Edit, Delete, Category as CategoryIcon, Warning as WarningIcon } from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import DialogHeader from '../components/DialogHeader';
import { categoriesApi, TransactionType, type Category, type CategoryCreate } from '../services/singleEntryApi';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedTab, setSelectedTab] = useState<TransactionType>(TransactionType.INCOME);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  const [formData, setFormData] = useState<CategoryCreate>({
    name: '',
    transaction_type: TransactionType.INCOME,
    description: '',
    color: '#4caf50',
    icon: '',
    is_active: true,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.list();
      setCategories(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        transaction_type: category.transaction_type,
        description: category.description || '',
        color: category.color || '#4caf50',
        icon: category.icon || '',
        is_active: category.is_active,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        transaction_type: selectedTab,
        description: '',
        color: selectedTab === TransactionType.INCOME ? '#4caf50' : '#f44336',
        icon: '',
        is_active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCategory(null);
    setError('');
  };

  const handleSave = async () => {
    try {
      setError('');
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, formData);
        setSuccessMessage('Category updated successfully');
      } else {
        await categoriesApi.create(formData);
        setSuccessMessage('Category added successfully');
      }
      await loadCategories();
      handleCloseDialog();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save category');
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
    openConfirmDialog('Are you sure you want to delete this category?', async () => {
      try {
        setError('');
        await categoriesApi.delete(id);
        await loadCategories();
        setSuccessMessage('Category deleted successfully');
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to delete category');
      }
    });
  };

  const filteredCategories = categories.filter(
    (cat) => cat.transaction_type === selectedTab
  );

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
            Categories
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Organize your income and expenses with categories
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Category
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Card>
        <CardContent>
          <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)} sx={{ mb: 3 }}>
            <Tab label="Income Categories" value={TransactionType.INCOME} />
            <Tab label="Expense Categories" value={TransactionType.EXPENSE} />
          </Tabs>

          {filteredCategories.length === 0 ? (
            <Box py={8} textAlign="center">
              <CategoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No {selectedTab} categories yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click "Add Category" to create your first category
              </Typography>
            </Box>
          ) : (
            <Box sx={{ height: 450, width: '100%' }}>
              <DataGrid
                rows={filteredCategories}
                columns={[
                  {
                    field: 'name',
                    headerName: 'Category Name',
                    flex: 1,
                    minWidth: 200,
                    headerAlign: 'left',
                    align: 'left',
                  },
                  {
                    field: 'color',
                    headerName: 'Color',
                    width: 100,
                    headerAlign: 'center',
                    align: 'center',
                    disableColumnMenu: true,
                    cellClassName: 'center-cell',
                    renderCell: (params) =>
                      params.value ? (
                        <Box
                          sx={{
                            width: 40,
                            height: 24,
                            bgcolor: params.value,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          -
                        </Typography>
                      ),
                  },
                  {
                    field: 'description',
                    headerName: 'Description',
                    flex: 1.5,
                    minWidth: 250,
                    headerAlign: 'left',
                    align: 'left',
                  },
                  {
                    field: 'is_active',
                    headerName: 'Status',
                    width: 110,
                    headerAlign: 'center',
                    align: 'center',
                    disableColumnMenu: true,
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
                    headerAlign: 'center',
                    align: 'center',
                    sortable: false,
                    filterable: false,
                    disableColumnMenu: true,
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
                disableColumnFilter={false}
                sx={{
                  '& .MuiDataGrid-columnHeader': {
                    backgroundColor: 'background.default',
                  },
                  '& .MuiDataGrid-cell': {
                    borderColor: 'divider',
                  },
                  '& .center-cell': {
                    display: 'flex',
                    justifyContent: 'center',
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
        <DialogHeader
          title={editingCategory ? 'Edit Category' : 'Add New Category'}
          onClose={handleCloseDialog}
        />
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            label="Category Name"
            fullWidth
            margin="normal"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Transaction Type</InputLabel>
            <Select
              value={formData.transaction_type}
              onChange={(e) =>
                setFormData({ ...formData, transaction_type: e.target.value as TransactionType })
              }
              label="Transaction Type"
              disabled={!!editingCategory}
            >
              <MenuItem value={TransactionType.INCOME}>Income</MenuItem>
              <MenuItem value={TransactionType.EXPENSE}>Expense</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Color (Hex Code)"
            fullWidth
            margin="normal"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            placeholder="#4caf50"
            InputProps={{
              startAdornment: (
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    bgcolor: formData.color,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    mr: 1,
                  }}
                />
              ),
            }}
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
              value={formData.is_active ? "true" : "false"}
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
            {editingCategory ? 'Update' : 'Create'}
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
