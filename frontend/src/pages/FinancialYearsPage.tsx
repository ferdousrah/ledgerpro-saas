import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  DialogContentText,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Add, Close as CloseIcon, Lock, CheckCircle, Delete, Edit } from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import DialogHeader from '../components/DialogHeader';
import { useAuthStore } from '../store/authStore';
import { useYearStore } from '../store/yearStore';
import { fiscalYearsApi } from '../services/fiscalYearsApi';
import { formatCurrency } from '../utils/currency';
import { formatDateRange } from '../utils/dateFormatter';
import type {
  FinancialYear,
  FinancialYearCreate,
  YearClosingValidation,
  FinancialYearStatus,
} from '../types';

export default function FinancialYearsPage() {
  const { user, tenant } = useAuthStore();
  const { fetchYears, setSelectedYear } = useYearStore();

  const [years, setYears] = useState<FinancialYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newYear, setNewYear] = useState<FinancialYearCreate>({
    year_name: '',
    start_date: '',
    end_date: '',
    is_current: false,
  });

  // Close dialog state
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closingYear, setClosingYear] = useState<FinancialYear | null>(null);
  const [validation, setValidation] = useState<YearClosingValidation | null>(null);
  const [validating, setValidating] = useState(false);
  const [closing, setClosing] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingYear, setDeletingYear] = useState<FinancialYear | null>(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  useEffect(() => {
    loadYears();
  }, []);

  const loadYears = async () => {
    try {
      const data = await fiscalYearsApi.list();
      setYears(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load financial years');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateYear = async () => {
    try {
      await fiscalYearsApi.create(newYear);
      setCreateDialogOpen(false);
      setNewYear({ year_name: '', start_date: '', end_date: '', is_current: false });
      await loadYears();
      await fetchYears();
      showSnackbar('Financial year created successfully', 'success');
    } catch (err: any) {
      showSnackbar(err.response?.data?.detail || 'Failed to create financial year', 'error');
    }
  };

  const handleSetCurrent = async (year: FinancialYear) => {
    try {
      await fiscalYearsApi.setCurrent(year.id);
      await loadYears();
      await fetchYears();
      setSelectedYear(year);
      showSnackbar(`${year.year_name} set as current year`, 'success');
    } catch (err: any) {
      showSnackbar(err.response?.data?.detail || 'Failed to set current year', 'error');
    }
  };

  const handleOpenCloseDialog = async (year: FinancialYear) => {
    setClosingYear(year);
    setCloseDialogOpen(true);
    setValidating(true);

    try {
      const validationResult = await fiscalYearsApi.validateClosing(year.id);
      setValidation(validationResult);
    } catch (err: any) {
      showSnackbar(err.response?.data?.detail || 'Failed to validate year closing', 'error');
      setCloseDialogOpen(false);
    } finally {
      setValidating(false);
    }
  };

  const handleCloseYear = async () => {
    if (!closingYear) return;

    setClosing(true);
    try {
      const result = await fiscalYearsApi.close(closingYear.id, {
        validate_categories: true,
        create_next_year: true,
      });

      showSnackbar(result.message, 'success');
      setCloseDialogOpen(false);
      await loadYears();
      await fetchYears();
    } catch (err: any) {
      showSnackbar(err.response?.data?.detail || 'Failed to close financial year', 'error');
    } finally {
      setClosing(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingYear) return;

    try {
      await fiscalYearsApi.delete(deletingYear.id);
      setDeleteDialogOpen(false);
      setDeletingYear(null);
      await loadYears();
      await fetchYears();
      showSnackbar('Financial year deleted successfully', 'success');
    } catch (err: any) {
      showSnackbar(err.response?.data?.detail || 'Failed to delete financial year', 'error');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <Alert severity="warning">Only administrators can manage financial years.</Alert>
      </DashboardLayout>
    );
  }

  const columns: GridColDef[] = [
    {
      field: 'year_name',
      headerName: 'Year Name',
      flex: 1,
      minWidth: 180,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" alignItems="center" gap={1}>
          {params.value}
          {params.row.is_current && (
            <Chip label="Current" size="small" color="primary" />
          )}
        </Box>
      ),
    },
    {
      field: 'period',
      headerName: 'Period',
      flex: 1.2,
      minWidth: 200,
      valueGetter: (value, row) => formatDateRange(row.start_date, row.end_date, tenant?.date_format || 'DD/MM/YYYY'),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => (
        params.value === 'closed' ? (
          <Chip icon={<Lock />} label="Closed" size="small" color="default" />
        ) : (
          <Chip label="Open" size="small" color="success" />
        )
      ),
    },
    {
      field: 'total_transactions_count',
      headerName: 'Transactions',
      flex: 0.8,
      minWidth: 140,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" alignItems="center" gap={1} justifyContent="flex-end">
          {params.value}
          {params.row.has_uncategorized_transactions && (
            <Chip label="Uncategorized" size="small" color="warning" />
          )}
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1.5,
      minWidth: 280,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" justifyContent="center" gap={1}>
          {!params.row.is_current && (
            <Tooltip title="Set as current year">
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleSetCurrent(params.row)}
              >
                Set Current
              </Button>
            </Tooltip>
          )}
          {params.row.status === 'open' && (
            <Tooltip title="Close this financial year">
              <Button
                size="small"
                variant="contained"
                color="warning"
                startIcon={<Lock />}
                onClick={() => handleOpenCloseDialog(params.row)}
              >
                Close Year
              </Button>
            </Tooltip>
          )}
          {params.row.status === 'open' && params.row.total_transactions_count === 0 && (
            <Tooltip title="Delete year">
              <IconButton
                size="small"
                color="error"
                onClick={() => {
                  setDeletingYear(params.row);
                  setDeleteDialogOpen(true);
                }}
              >
                <Delete />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

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
        <Typography variant="h4" fontWeight="bold">
          Financial Years
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Year
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent>
          <DataGrid
            rows={years}
            columns={columns}
            slots={{ toolbar: GridToolbar }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
              },
            }}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
              sorting: {
                sortModel: [{ field: 'year_name', sort: 'desc' }],
              },
            }}
            pageSizeOptions={[10, 25, 50]}
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

      {/* Create Year Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogHeader title="Create Financial Year" onClose={() => setCreateDialogOpen(false)} />
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Year Name"
              placeholder="FY 2024-2025"
              value={newYear.year_name}
              onChange={(e) => setNewYear({ ...newYear, year_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Start Date"
              type="date"
              value={newYear.start_date}
              onChange={(e) => setNewYear({ ...newYear, start_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="End Date"
              type="date"
              value={newYear.end_date}
              onChange={(e) => setNewYear({ ...newYear, end_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateYear}
            variant="contained"
            disabled={!newYear.year_name || !newYear.start_date || !newYear.end_date}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Year Dialog */}
      <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogHeader
          title={`Close Financial Year: ${closingYear?.year_name}`}
          onClose={() => setCloseDialogOpen(false)}
        />
        <DialogContent>
          {validating ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : validation ? (
            <Box>
              {validation.errors.length > 0 ? (
                <>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    Cannot close this financial year due to the following issues:
                  </Alert>
                  <List>
                    {validation.errors.map((error, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={`• ${error}`} />
                      </ListItem>
                    ))}
                  </List>
                </>
              ) : (
                <>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <strong>Year is ready to close!</strong>
                  </Alert>
                  <DialogContentText>
                    <strong>Summary:</strong>
                  </DialogContentText>
                  <List dense>
                    <ListItem>
                      <ListItemText primary={`Total Transactions: ${validation.total_transactions}`} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary={`Accounts: ${validation.accounts_summary.length}`} />
                    </ListItem>
                  </List>

                  {validation.warnings.length > 0 && (
                    <>
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        Warnings:
                      </Alert>
                      <List dense>
                        {validation.warnings.map((warning, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={`• ${warning}`} />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}

                  <DialogContentText sx={{ mt: 2 }}>
                    <strong>What will happen:</strong>
                  </DialogContentText>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="✓ Year status will be set to 'Closed'" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="✓ Balance snapshots will be finalized" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="✓ Next year will be created automatically" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="✓ Opening balances will be transferred to next year" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="✓ Only admins will be able to edit transactions in this year" />
                    </ListItem>
                  </List>
                </>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
          {validation && validation.can_close && (
            <Button
              onClick={handleCloseYear}
              variant="contained"
              color="warning"
              disabled={closing}
              startIcon={closing ? <CircularProgress size={20} /> : <Lock />}
            >
              {closing ? 'Closing...' : 'Close Year'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Year Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogHeader title="Delete Financial Year" onClose={() => setDeleteDialogOpen(false)} />
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the financial year "{deletingYear?.year_name}"?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
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
