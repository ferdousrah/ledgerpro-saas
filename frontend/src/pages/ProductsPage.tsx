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
  MenuItem,
  Grid,
  Snackbar,
  Tabs,
  Tab,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Add, Edit, Delete, Inventory } from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import DialogHeader from '../components/DialogHeader';
import { productsApi } from '../services/productsApi';
import { categoriesApi, taxRatesApi } from '../services/singleEntryApi';
import { productCategoriesApi } from '../services/productCategoriesApi';
import type { ProductWithDetails, ProductCreate, ProductUpdate, Category, TaxRate, ProductCategory } from '../types';
import { formatCurrency } from '../utils/currency';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'service'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form state
  const [formData, setFormData] = useState<ProductCreate>({
    name: '',
    product_type: 'service',
    description: '',
    sku: '',
    unit_price: 0,
    cost_price: 0,
    tax_rate_id: '',
    category_id: '',
    product_category_id: '',
    track_inventory: false,
    stock_quantity: 0,
    low_stock_threshold: 0,
    is_active: true,
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadTaxRates();
    loadProductCategories();
  }, [typeFilter, activeFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (typeFilter !== 'all') params.product_type = typeFilter;
      if (activeFilter !== 'all') params.is_active = activeFilter === 'active';

      const data = await productsApi.list(params);
      setProducts(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.list();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories');
    }
  };

  const loadTaxRates = async () => {
    try {
      const data = await taxRatesApi.list();
      setTaxRates(data);
    } catch (err) {
      console.error('Failed to load tax rates');
    }
  };

  const loadProductCategories = async () => {
    try {
      const data = await productCategoriesApi.list({ is_active: true });
      setProductCategories(data);
    } catch (err) {
      console.error('Failed to load product categories');
    }
  };

  const handleOpenDialog = (product?: ProductWithDetails) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        product_type: product.product_type,
        description: product.description || '',
        sku: product.sku || '',
        unit_price: product.unit_price,
        cost_price: product.cost_price || 0,
        tax_rate_id: product.tax_rate_id || '',
        category_id: product.category_id || '',
        product_category_id: product.product_category_id || '',
        track_inventory: product.track_inventory,
        stock_quantity: product.stock_quantity || 0,
        low_stock_threshold: product.low_stock_threshold || 0,
        is_active: product.is_active,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        product_type: 'service',
        description: '',
        sku: '',
        unit_price: 0,
        cost_price: 0,
        tax_rate_id: '',
        category_id: '',
        product_category_id: '',
        track_inventory: false,
        stock_quantity: 0,
        low_stock_threshold: 0,
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = async () => {
    try {
      // Sanitize formData - convert empty strings to null for UUID fields
      const sanitizedData: any = { ...formData };
      if (sanitizedData.tax_rate_id === '') sanitizedData.tax_rate_id = null;
      if (sanitizedData.category_id === '') sanitizedData.category_id = null;
      if (sanitizedData.product_category_id === '') sanitizedData.product_category_id = null;
      if (sanitizedData.sku === '') sanitizedData.sku = null;
      if (sanitizedData.description === '') sanitizedData.description = null;
      if (sanitizedData.cost_price === 0) sanitizedData.cost_price = null;

      if (editingProduct) {
        const updateData: ProductUpdate = {};
        Object.keys(sanitizedData).forEach((key) => {
          const value = sanitizedData[key as keyof ProductCreate];
          if (value !== '' && value !== undefined) {
            updateData[key as keyof ProductUpdate] = value as any;
          }
        });
        await productsApi.update(editingProduct.id, updateData);
        setSuccessMessage('Product updated successfully');
      } else {
        await productsApi.create(sanitizedData);
        setSuccessMessage('Product created successfully');
      }
      handleCloseDialog();
      loadProducts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save product');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this product?')) return;

    try {
      await productsApi.delete(id);
      setSuccessMessage('Product deactivated successfully');
      loadProducts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete product');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await productsApi.activate(id);
      setSuccessMessage('Product activated successfully');
      loadProducts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to activate product');
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
          {params.row.sku && (
            <Typography variant="caption" color="text.secondary">
              SKU: {params.row.sku}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'product_type',
      headerName: 'Type',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value === 'product' ? 'Product' : 'Service'}
          size="small"
          color={params.value === 'product' ? 'primary' : 'secondary'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'description',
      headerName: 'Description',
      width: 250,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" noWrap>
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'category_name',
      headerName: 'Transaction Category',
      width: 150,
      valueGetter: (value, row) => row.category_name || '-',
    },
    {
      field: 'product_category_name',
      headerName: 'Product Category',
      width: 150,
      renderCell: (params: GridRenderCellParams) =>
        params.row.product_category_name ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {params.row.product_category_color && (
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '4px',
                  backgroundColor: params.row.product_category_color,
                  border: '1px solid rgba(0,0,0,0.1)',
                }}
              />
            )}
            <Typography variant="body2">{params.row.product_category_name}</Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            -
          </Typography>
        ),
    },
    {
      field: 'unit_price',
      headerName: 'Price',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatCurrency(value),
    },
    {
      field: 'tax_rate_name',
      headerName: 'Tax Rate',
      width: 120,
      renderCell: (params: GridRenderCellParams) =>
        params.row.tax_rate_name ? (
          <Typography variant="body2">
            {params.row.tax_rate_name} ({params.row.tax_rate_percentage}%)
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No tax
          </Typography>
        ),
    },
    {
      field: 'track_inventory',
      headerName: 'Inventory',
      width: 120,
      renderCell: (params: GridRenderCellParams) =>
        params.row.track_inventory ? (
          <Box>
            <Typography variant="body2">
              {params.row.stock_quantity || 0} units
            </Typography>
            {params.row.low_stock_threshold &&
              params.row.stock_quantity <= params.row.low_stock_threshold && (
                <Chip label="Low Stock" size="small" color="warning" />
              )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Not tracked
          </Typography>
        ),
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
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
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton size="small" onClick={() => handleOpenDialog(params.row)}>
            <Edit />
          </IconButton>
          {params.row.is_active ? (
            <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)}>
              <Delete />
            </IconButton>
          ) : (
            <IconButton size="small" color="success" onClick={() => handleActivate(params.row.id)}>
              <Inventory />
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
            Products & Services
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Add Product/Service
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
              <Tabs value={typeFilter} onChange={(_, value) => setTypeFilter(value)} sx={{ mb: 1 }}>
                <Tab label="All" value="all" />
                <Tab label="Products" value="product" />
                <Tab label="Services" value="service" />
              </Tabs>
              <Tabs value={activeFilter} onChange={(_, value) => setActiveFilter(value)}>
                <Tab label="All" value="all" />
                <Tab label="Active" value="active" />
                <Tab label="Inactive" value="inactive" />
              </Tabs>
            </Box>

            <DataGrid
              rows={products}
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
                },
                '& .MuiDataGrid-cell': {
                  borderColor: 'divider',
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogHeader title={editingProduct ? 'Edit Product/Service' : 'Add Product/Service'} onClose={handleCloseDialog} />
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
                  select
                  fullWidth
                  label="Type"
                  value={formData.product_type}
                  onChange={(e) =>
                    setFormData({ ...formData, product_type: e.target.value as 'product' | 'service' })
                  }
                  required
                >
                  <MenuItem value="service">Service</MenuItem>
                  <MenuItem value="product">Product</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="SKU / Product Code"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Transaction Category"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <MenuItem value="">None</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Product Category"
                  value={formData.product_category_id}
                  onChange={(e) => setFormData({ ...formData, product_category_id: e.target.value })}
                >
                  <MenuItem value="">None</MenuItem>
                  {productCategories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {cat.color && (
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              borderRadius: '4px',
                              backgroundColor: cat.color,
                              border: '1px solid rgba(0,0,0,0.1)',
                            }}
                          />
                        )}
                        {cat.name}
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
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
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Unit Price"
                  type="number"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
                  inputProps={{ min: 0, step: 0.01 }}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Cost Price"
                  type="number"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Default Tax Rate"
                  value={formData.tax_rate_id}
                  onChange={(e) => setFormData({ ...formData, tax_rate_id: e.target.value })}
                >
                  <MenuItem value="">None</MenuItem>
                  {taxRates.map((tax) => (
                    <MenuItem key={tax.id} value={tax.id}>
                      {tax.name} ({tax.percentage}%)
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Track Inventory"
                  value={formData.track_inventory ? 'true' : 'false'}
                  onChange={(e) =>
                    setFormData({ ...formData, track_inventory: e.target.value === 'true' })
                  }
                >
                  <MenuItem value="false">No</MenuItem>
                  <MenuItem value="true">Yes</MenuItem>
                </TextField>
              </Grid>
              {formData.track_inventory && (
                <>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Stock Quantity"
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, stock_quantity: Number(e.target.value) })
                      }
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Low Stock Threshold"
                      type="number"
                      value={formData.low_stock_threshold}
                      onChange={(e) =>
                        setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })
                      }
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingProduct ? 'Update' : 'Create'}
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
