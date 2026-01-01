import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  MenuItem,
  TextField,
  Grid,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  TrendingUp,
  TrendingDown,
  SwapHoriz,
  Build,
} from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import { stockMovementsApi } from '../services/stockMovementsApi';
import { warehousesApi } from '../services/warehousesApi';
import { productsApi } from '../services/productsApi';
import type { StockMovementWithDetails, Warehouse, ProductWithDetails, MovementType } from '../types';

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovementWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);

  // Filters
  const [productFilter, setProductFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<MovementType | ''>('');

  useEffect(() => {
    loadDropdownData();
  }, []);

  useEffect(() => {
    loadMovements();
  }, [productFilter, warehouseFilter, movementTypeFilter]);

  const loadDropdownData = async () => {
    try {
      const [warehousesData, productsData] = await Promise.all([
        warehousesApi.list({ is_active: true }),
        productsApi.list({ is_active: true }),
      ]);
      setWarehouses(warehousesData);
      setProducts(productsData.filter(p => p.track_inventory));
    } catch (err: any) {
      setError('Failed to load filter data');
    }
  };

  const loadMovements = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (productFilter) params.product_id = productFilter;
      if (warehouseFilter) params.warehouse_id = warehouseFilter;
      if (movementTypeFilter) params.movement_type = movementTypeFilter;

      const data = await stockMovementsApi.list(params);
      setMovements(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (type: MovementType) => {
    switch (type) {
      case 'stock_in':
        return <TrendingUp fontSize="small" color="success" />;
      case 'stock_out':
        return <TrendingDown fontSize="small" color="error" />;
      case 'adjustment':
        return <Build fontSize="small" color="warning" />;
      case 'transfer':
        return <SwapHoriz fontSize="small" color="primary" />;
      default:
        return null;
    }
  };

  const getMovementColor = (type: MovementType): 'success' | 'error' | 'warning' | 'primary' => {
    switch (type) {
      case 'stock_in':
        return 'success';
      case 'stock_out':
        return 'error';
      case 'adjustment':
        return 'warning';
      case 'transfer':
        return 'primary';
      default:
        return 'primary';
    }
  };

  const getMovementLabel = (type: MovementType) => {
    switch (type) {
      case 'stock_in':
        return 'Stock In';
      case 'stock_out':
        return 'Stock Out';
      case 'adjustment':
        return 'Adjustment';
      case 'transfer':
        return 'Transfer';
      default:
        return type;
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'movement_date',
      headerName: 'Date',
      width: 120,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2">
            {new Date(params.value).toLocaleDateString()}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'movement_type',
      headerName: 'Type',
      width: 140,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params: GridRenderCellParams) => {
        const icon = getMovementIcon(params.value);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Chip
              {...(icon ? { icon } : {})}
              label={getMovementLabel(params.value)}
              size="small"
              color={getMovementColor(params.value)}
              variant="outlined"
            />
          </Box>
        );
      },
    },
    {
      field: 'product_name',
      headerName: 'Product',
      flex: 1,
      minWidth: 200,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {params.value}
            </Typography>
            {params.row.product_sku && (
              <Typography variant="caption" color="text.secondary">
                SKU: {params.row.product_sku}
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      field: 'warehouse_name',
      headerName: 'Warehouse',
      width: 150,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: 'to_warehouse_name',
      headerName: 'To Warehouse',
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
      field: 'quantity',
      headerName: 'Quantity',
      width: 120,
      headerAlign: 'right',
      align: 'right',
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
          <Typography
            variant="body2"
            fontWeight="medium"
            color={parseFloat(params.value) > 0 ? 'success.main' : 'error.main'}
          >
            {parseFloat(params.value) > 0 ? '+' : ''}
            {parseFloat(params.value).toFixed(2)}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'reason',
      headerName: 'Reason',
      width: 180,
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
      field: 'notes',
      headerName: 'Notes',
      width: 200,
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
  ];

  if (loading && movements.length === 0) {
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
            Stock Movements History
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Card>
          <CardContent>
            {/* Filters */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  label="Product"
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  size="small"
                >
                  <MenuItem value="">All Products</MenuItem>
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name} {product.sku && `(${product.sku})`}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  label="Warehouse"
                  value={warehouseFilter}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                  size="small"
                >
                  <MenuItem value="">All Warehouses</MenuItem>
                  {warehouses.map((warehouse) => (
                    <MenuItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  label="Movement Type"
                  value={movementTypeFilter}
                  onChange={(e) => setMovementTypeFilter(e.target.value as MovementType | '')}
                  size="small"
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="stock_in">Stock In</MenuItem>
                  <MenuItem value="stock_out">Stock Out</MenuItem>
                  <MenuItem value="adjustment">Adjustment</MenuItem>
                  <MenuItem value="transfer">Transfer</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <Box sx={{ width: '100%' }}>
              <DataGrid
                rows={movements}
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
                    sortModel: [{ field: 'movement_date', sort: 'desc' }],
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
      </Box>
    </DashboardLayout>
  );
}
