import { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Snackbar,
  Tabs,
  Tab,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Add, Edit, Delete, Restore } from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import DialogHeader from '../components/DialogHeader';
import { productCategoriesApi } from '../services/productCategoriesApi';
import type { ProductCategory, ProductCategoryCreate, ProductCategoryUpdate } from '../types';

export default function ProductCategoriesPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form state
  const [formData, setFormData] = useState<ProductCategoryCreate>({
    name: '',
    description: '',
    color: '#2196F3',
    is_active: true,
  });

  useEffect(() => {
    loadCategories();
  }, [activeFilter]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (activeFilter !== 'all') params.is_active = activeFilter === 'active';

      const data = await productCategoriesApi.list(params);
      setCategories(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load product categories');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category?: ProductCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        color: category.color || '#2196F3',
        is_active: category.is_active,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        color: '#2196F3',
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingCategory) {
        const updateData: ProductCategoryUpdate = {};
        Object.keys(formData).forEach((key) => {
          const value = formData[key as keyof ProductCategoryCreate];
          if (value !== '' && value !== undefined) {
            updateData[key as keyof ProductCategoryUpdate] = value as any;
          }
        });
        await productCategoriesApi.update(editingCategory.id, updateData);
        setSuccessMessage('Product category updated successfully');
      } else {
        await productCategoriesApi.create(formData);
        setSuccessMessage('Product category created successfully');
      }
      handleCloseDialog();
      loadCategories();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save product category');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this product category?')) return;

    try {
      await productCategoriesApi.delete(id);
      setSuccessMessage('Product category deactivated successfully');
      loadCategories();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete product category');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await productCategoriesApi.activate(id);
      setSuccessMessage('Product category activated successfully');
      loadCategories();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to activate product category');
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 200,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%' }}>
          {params.row.color && (
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: '4px',
                backgroundColor: params.row.color,
                border: '1px solid rgba(0,0,0,0.1)',
                flexShrink: 0,
              }}
            />
          )}
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 2,
      minWidth: 300,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" noWrap>
            {params.value || '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 120,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Chip
            label={params.value ? 'Active' : 'Inactive'}
            size="small"
            color={params.value ? 'success' : 'default'}
          />
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      headerAlign: 'left',
      align: 'left',
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 0.5 }}>
          <IconButton size="small" onClick={() => handleOpenDialog(params.row)}>
            <Edit />
          </IconButton>
          {params.row.is_active ? (
            <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)}>
              <Delete />
            </IconButton>
          ) : (
            <IconButton size="small" color="success" onClick={() => handleActivate(params.row.id)}>
              <Restore />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Product Categories
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Add Category
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Card>
          <CardContent>
            {/* Filters */}
            <Box sx={{ mb: 2 }}>
              <Tabs value={activeFilter} onChange={(_, value) => setActiveFilter(value)}>
                <Tab label="All" value="all" />
                <Tab label="Active" value="active" />
                <Tab label="Inactive" value="inactive" />
              </Tabs>
            </Box>

            <Box sx={{ width: '100%' }}>
              <DataGrid
                rows={categories}
                columns={columns}
                slots={{ toolbar: GridToolbar }}
                slotProps={{
                  toolbar: {
                    showQuickFilter: true,
                    quickFilterProps: { debounceMs: 500 },
                  },
                }}
                initialState={{
                  pagination: { paginationModel: { pageSize: 25 } },
                  sorting: {
                    sortModel: [{ field: 'name', sort: 'asc' }],
                  },
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                autoHeight
                disableRowSelectionOnClick
                sx={{
                  '& .MuiDataGrid-columnHeader': {
                    backgroundColor: 'background.default',
                    padding: '0 16px',
                  },
                  '& .MuiDataGrid-cell': {
                    padding: '0 16px',
                    borderColor: 'divider',
                  },
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogHeader title={editingCategory ? 'Edit Product Category' : 'Add Product Category'} onClose={handleCloseDialog} />
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TextField
                    label="Color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    sx={{ width: 120 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Choose a color to identify this category
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={!!successMessage}
          autoHideDuration={6000}
          onClose={() => setSuccessMessage('')}
          message={successMessage}
        />
      </Box>
    </DashboardLayout>
  );
}
