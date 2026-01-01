import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Snackbar,
  MenuItem,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import { TrendingUp, TrendingDown, SwapHoriz } from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import DialogHeader from '../components/DialogHeader';
import { stockMovementsApi } from '../services/stockMovementsApi';
import { warehousesApi } from '../services/warehousesApi';
import { productsApi } from '../services/productsApi';
import type {
  StockAdjustmentRequest,
  StockTransferRequest,
  Warehouse,
  ProductWithDetails,
} from '../types';

type AdjustmentType = 'adjustment' | 'transfer';

export default function StockAdjustmentsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('adjustment');

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithDetails | null>(null);

  // Adjustment form state
  const [adjustmentData, setAdjustmentData] = useState<StockAdjustmentRequest>({
    product_id: '',
    warehouse_id: '',
    quantity: 0,
    reason: '',
    notes: '',
  });

  // Transfer form state
  const [transferData, setTransferData] = useState<StockTransferRequest>({
    product_id: '',
    from_warehouse_id: '',
    to_warehouse_id: '',
    quantity: 0,
    notes: '',
  });

  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      setLoading(true);
      const [warehousesData, productsData] = await Promise.all([
        warehousesApi.list({ is_active: true }),
        productsApi.list({ is_active: true }),
      ]);
      setWarehouses(warehousesData);
      setProducts(productsData.filter(p => p.track_inventory));
    } catch (err: any) {
      setError('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (type: AdjustmentType) => {
    setAdjustmentType(type);
    setSelectedProduct(null);
    setAdjustmentData({
      product_id: '',
      warehouse_id: '',
      quantity: 0,
      reason: '',
      notes: '',
    });
    setTransferData({
      product_id: '',
      from_warehouse_id: '',
      to_warehouse_id: '',
      quantity: 0,
      notes: '',
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSubmit = async () => {
    try {
      if (adjustmentType === 'adjustment') {
        if (!adjustmentData.product_id || !adjustmentData.warehouse_id || !adjustmentData.reason) {
          setError('Please fill in all required fields');
          return;
        }
        await stockMovementsApi.createAdjustment(adjustmentData);
        setSuccessMessage('Stock adjustment created successfully');
      } else {
        if (!transferData.product_id || !transferData.from_warehouse_id || !transferData.to_warehouse_id) {
          setError('Please fill in all required fields');
          return;
        }
        if (transferData.quantity <= 0) {
          setError('Transfer quantity must be greater than 0');
          return;
        }
        await stockMovementsApi.createTransfer(transferData);
        setSuccessMessage('Stock transfer created successfully');
      }
      handleCloseDialog();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create stock movement');
    }
  };

  const handleProductChange = (product: ProductWithDetails | null) => {
    setSelectedProduct(product);
    if (product) {
      if (adjustmentType === 'adjustment') {
        setAdjustmentData({ ...adjustmentData, product_id: product.id });
      } else {
        setTransferData({ ...transferData, product_id: product.id });
      }
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

  return (
    <DashboardLayout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Stock Adjustments
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Stock In Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }} onClick={() => handleOpenDialog('adjustment')}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                    <TrendingUp sx={{ fontSize: 40, color: 'success.dark' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6">Stock Adjustment</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Increase or decrease stock
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Transfer Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }} onClick={() => handleOpenDialog('transfer')}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                    <SwapHoriz sx={{ fontSize: 40, color: 'primary.dark' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6">Transfer Stock</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Move between warehouses
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Adjustment/Transfer Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogHeader
            title={adjustmentType === 'adjustment' ? 'Stock Adjustment' : 'Stock Transfer'}
            onClose={handleCloseDialog}
          />
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Product Selection */}
              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  options={products}
                  getOptionLabel={(option) => `${option.name}${option.sku ? ` (${option.sku})` : ''}`}
                  value={selectedProduct}
                  onChange={(_, value) => handleProductChange(value)}
                  renderInput={(params) => (
                    <TextField {...params} label="Product" required />
                  )}
                />
              </Grid>

              {adjustmentType === 'adjustment' ? (
                <>
                  {/* Adjustment Form */}
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      select
                      fullWidth
                      label="Warehouse"
                      value={adjustmentData.warehouse_id}
                      onChange={(e) => setAdjustmentData({ ...adjustmentData, warehouse_id: e.target.value })}
                      required
                    >
                      {warehouses.map((warehouse) => (
                        <MenuItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      type="number"
                      value={adjustmentData.quantity}
                      onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: parseFloat(e.target.value) })}
                      required
                      helperText="Positive to increase, negative to decrease"
                      InputProps={{
                        startAdornment: adjustmentData.quantity > 0 ? (
                          <InputAdornment position="start">
                            <TrendingUp color="success" />
                          </InputAdornment>
                        ) : adjustmentData.quantity < 0 ? (
                          <InputAdornment position="start">
                            <TrendingDown color="error" />
                          </InputAdornment>
                        ) : null,
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Reason"
                      value={adjustmentData.reason}
                      onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                      required
                      placeholder="e.g., Physical count, Damaged goods, etc."
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Notes"
                      multiline
                      rows={2}
                      value={adjustmentData.notes}
                      onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })}
                    />
                  </Grid>
                </>
              ) : (
                <>
                  {/* Transfer Form */}
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      select
                      fullWidth
                      label="From Warehouse"
                      value={transferData.from_warehouse_id}
                      onChange={(e) => setTransferData({ ...transferData, from_warehouse_id: e.target.value })}
                      required
                    >
                      {warehouses.map((warehouse) => (
                        <MenuItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      select
                      fullWidth
                      label="To Warehouse"
                      value={transferData.to_warehouse_id}
                      onChange={(e) => setTransferData({ ...transferData, to_warehouse_id: e.target.value })}
                      required
                    >
                      {warehouses
                        .filter((w) => w.id !== transferData.from_warehouse_id)
                        .map((warehouse) => (
                          <MenuItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </MenuItem>
                        ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      type="number"
                      value={transferData.quantity}
                      onChange={(e) => setTransferData({ ...transferData, quantity: parseFloat(e.target.value) })}
                      required
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Notes"
                      multiline
                      rows={2}
                      value={transferData.notes}
                      onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {adjustmentType === 'adjustment' ? 'Create Adjustment' : 'Transfer Stock'}
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
