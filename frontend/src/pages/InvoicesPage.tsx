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
  Tabs,
  Tab,
  Tooltip,
  Snackbar,
  Grid,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add,
  Visibility,
  Send,
  Cancel,
  Payment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { invoicesApi } from '../services/invoicesApi';
import type { InvoiceWithDetails } from '../types';
import { InvoiceStatus } from '../types';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/dateFormatter';
import { useAuthStore } from '../store/authStore';

export default function InvoicesPage() {
  const { tenant } = useAuthStore();
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [stats, setStats] = useState({
    total_invoices: 0,
    draft_count: 0,
    sent_count: 0,
    paid_count: 0,
    overdue_count: 0,
    total_outstanding: 0,
  });

  const navigate = useNavigate();

  useEffect(() => {
    loadInvoices();
    loadStats();
  }, [statusFilter]);

  const loadInvoices = async () => {
    try {
      // Only show full-page loading spinner on initial load
      if (initialLoad) {
        setLoading(true);
      }
      const filters = statusFilter !== 'all' ? { status_filter: statusFilter } : undefined;
      const data = await invoicesApi.list(filters);
      setInvoices(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load invoices');
    } finally {
      if (initialLoad) {
        setLoading(false);
        setInitialLoad(false);
      }
    }
  };

  const loadStats = async () => {
    try {
      const data = await invoicesApi.getStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load invoice stats:', err);
    }
  };

  const handleSendInvoice = async (id: string) => {
    try {
      await invoicesApi.send(id);
      setSuccessMessage('Invoice sent successfully');
      loadInvoices();
      loadStats();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send invoice');
    }
  };

  const handleCancelInvoice = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this invoice?')) return;

    try {
      await invoicesApi.cancel(id);
      setSuccessMessage('Invoice cancelled successfully');
      loadInvoices();
      loadStats();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel invoice');
    }
  };

  const getStatusColor = (status: InvoiceStatus): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case InvoiceStatus.DRAFT:
        return 'default';
      case InvoiceStatus.SENT:
        return 'primary';
      case InvoiceStatus.PAID:
        return 'success';
      case InvoiceStatus.PARTIALLY_PAID:
        return 'warning';
      case InvoiceStatus.OVERDUE:
        return 'error';
      case InvoiceStatus.CANCELLED:
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: InvoiceStatus): string => {
    return status.replace(/_/g, ' ').toUpperCase();
  };

  const columns: GridColDef[] = [
    {
      field: 'invoice_number',
      headerName: 'Invoice #',
      flex: 0.8,
      minWidth: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Box
          sx={{ fontWeight: 600, color: 'primary.main', cursor: 'pointer' }}
          onClick={() => navigate(`/invoices/${params.row.id}`)}
        >
          {params.value}
        </Box>
      ),
    },
    {
      field: 'customer_name',
      headerName: 'Customer',
      flex: 1.2,
      minWidth: 180,
    },
    {
      field: 'invoice_date',
      headerName: 'Invoice Date',
      flex: 0.8,
      minWidth: 110,
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'due_date',
      headerName: 'Due Date',
      flex: 0.8,
      minWidth: 110,
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'balance_due',
      headerName: 'Due Amount',
      flex: 0.8,
      minWidth: 110,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatCurrency(value, tenant?.currency || 'USD'),
      renderCell: (params: GridRenderCellParams) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: params.row.balance_due > 0 ? 600 : 'normal',
            color: params.row.balance_due > 0 ? 'error.main' : 'success.main',
          }}
        >
          {formatCurrency(params.value, tenant?.currency || 'USD')}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={getStatusLabel(params.value)}
          color={getStatusColor(params.value)}
          size="small"
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={() => navigate(`/invoices/${params.row.id}`)}
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>

          {params.row.status === InvoiceStatus.DRAFT && (
            <Tooltip title="Send Invoice">
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleSendInvoice(params.row.id)}
              >
                <Send fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {(params.row.status === InvoiceStatus.DRAFT || params.row.status === InvoiceStatus.SENT) &&
            params.row.payments_count === 0 && (
              <Tooltip title="Cancel Invoice">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleCancelInvoice(params.row.id)}
                >
                  <Cancel fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

          {params.row.balance_due > 0 &&
            params.row.status !== InvoiceStatus.CANCELLED &&
            params.row.status !== InvoiceStatus.DRAFT && (
              <Tooltip title="Record Payment">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => navigate(`/invoices/${params.row.id}?action=payment`)}
                >
                  <Payment fontSize="small" />
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
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  const filteredInvoices = invoices;

  return (
    <DashboardLayout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Invoices
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/invoices/new')}
          >
            Create Invoice
          </Button>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Invoices
                </Typography>
                <Typography variant="h5">{stats.total_invoices}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Draft
                </Typography>
                <Typography variant="h5">{stats.draft_count}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Sent
                </Typography>
                <Typography variant="h5">{stats.sent_count}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Paid
                </Typography>
                <Typography variant="h5" color="success.main">
                  {stats.paid_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Overdue
                </Typography>
                <Typography variant="h5" color="error.main">
                  {stats.overdue_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Outstanding
                </Typography>
                <Typography variant="h5" color="warning.main">
                  {formatCurrency(stats.total_outstanding, tenant?.currency || 'USD')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Card>
          <CardContent>
            {/* Status Filter Tabs */}
            <Tabs
              value={statusFilter}
              onChange={(_, value) => setStatusFilter(value)}
              sx={{ mb: 2 }}
            >
              <Tab label="All" value="all" />
              <Tab label="Draft" value={InvoiceStatus.DRAFT} />
              <Tab label="Sent" value={InvoiceStatus.SENT} />
              <Tab label="Partially Paid" value={InvoiceStatus.PARTIALLY_PAID} />
              <Tab label="Paid" value={InvoiceStatus.PAID} />
              <Tab label="Overdue" value={InvoiceStatus.OVERDUE} />
              <Tab label="Cancelled" value={InvoiceStatus.CANCELLED} />
            </Tabs>

            <DataGrid
              rows={filteredInvoices}
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
                  sortModel: [{ field: 'created_at', sort: 'desc' }],
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
                  display: 'flex',
                  alignItems: 'center',
                },
                '& .MuiDataGrid-row:hover': {
                  cursor: 'pointer',
                },
              }}
            />
          </CardContent>
        </Card>

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
