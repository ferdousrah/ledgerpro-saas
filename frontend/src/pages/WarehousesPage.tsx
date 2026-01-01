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
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Add, Edit, Delete, Restore, Star } from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import DialogHeader from '../components/DialogHeader';
import { warehousesApi } from '../services/warehousesApi';
import type { Warehouse, WarehouseCreate, WarehouseUpdate } from '../types';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form state
  const [formData, setFormData] = useState<WarehouseCreate>({
    name: '',
    code: '',
    description: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    is_default: false,
    is_active: true,
  });

  useEffect(() => {
    loadWarehouses();
  }, [activeFilter]);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (activeFilter !== 'all') params.is_active = activeFilter === 'active';

      const data = await warehousesApi.list(params);
      setWarehouses(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (warehouse?: Warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        name: warehouse.name,
        code: warehouse.code || '',
        description: warehouse.description || '',
        address: warehouse.address || '',
        city: warehouse.city || '',
        state: warehouse.state || '',
        postal_code: warehouse.postal_code || '',
        country: warehouse.country || '',
        is_default: warehouse.is_default,
        is_active: warehouse.is_active,
      });
    } else {
      setEditingWarehouse(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        is_default: false,
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingWarehouse(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingWarehouse) {
        const updateData: WarehouseUpdate = {};
        Object.keys(formData).forEach((key) => {
          const value = formData[key as keyof WarehouseCreate];
          if (value !== '' && value !== undefined) {
            updateData[key as keyof WarehouseUpdate] = value as any;
          }
        });
        await warehousesApi.update(editingWarehouse.id, updateData);
        setSuccessMessage('Warehouse updated successfully');
      } else {
        await warehousesApi.create(formData);
        setSuccessMessage('Warehouse created successfully');
      }
      handleCloseDialog();
      loadWarehouses();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save warehouse');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this warehouse?')) return;

    try {
      await warehousesApi.delete(id);
      setSuccessMessage('Warehouse deactivated successfully');
      loadWarehouses();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete warehouse');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await warehousesApi.activate(id);
      setSuccessMessage('Warehouse activated successfully');
      loadWarehouses();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to activate warehouse');
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
          {params.row.is_default && <Star fontSize="small" color="warning" />}
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'code',
      headerName: 'Code',
      width: 120,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2">{params.value || '-'}</Typography>
        </Box>
      ),
    },
    {
      field: 'city',
      headerName: 'City',
      width: 150,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2">{params.value || '-'}</Typography>
        </Box>
      ),
    },
    {
      field: 'state',
      headerName: 'State',
      width: 150,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2">{params.value || '-'}</Typography>
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
            Warehouses
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Add Warehouse
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
                rows={warehouses}
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
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogHeader title={editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'} onClose={handleCloseDialog} />
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., WH-001"
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
                <TextField
                  fullWidth
                  label="Address"
                  multiline
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="State/Province"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Postal Code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.is_default}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    />
                  }
                  label="Set as default warehouse"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingWarehouse ? 'Update' : 'Create'}
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
