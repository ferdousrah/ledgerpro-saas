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
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add,
  Edit,
  Delete,
  Pause,
  PlayArrow,
  Receipt,
} from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import { recurringInvoicesApi } from '../services/invoicesApi';
import type { RecurringInvoiceWithDetails, RecurrenceFrequency } from '../types';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/dateFormatter';

export default function RecurringInvoicesPage() {
  const [templates, setTemplates] = useState<RecurringInvoiceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadTemplates();
  }, [activeFilter]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const filters =
        activeFilter === 'all' ? undefined : { is_active: activeFilter === 'active' };
      const data = await recurringInvoicesApi.list(filters);
      setTemplates(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load recurring invoice templates');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await recurringInvoicesApi.pause(id);
      setSuccessMessage('Recurring invoice paused');
      loadTemplates();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to pause recurring invoice');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await recurringInvoicesApi.resume(id);
      setSuccessMessage('Recurring invoice resumed');
      loadTemplates();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resume recurring invoice');
    }
  };

  const handleGenerateNow = async (id: string) => {
    if (!confirm('Generate invoice from this template now?')) return;

    try {
      await recurringInvoicesApi.generateNow(id);
      setSuccessMessage('Invoice generated successfully');
      loadTemplates();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate invoice');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring invoice template?')) return;

    try {
      await recurringInvoicesApi.delete(id);
      setSuccessMessage('Recurring invoice template deleted');
      loadTemplates();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete template');
    }
  };

  const getFrequencyLabel = (frequency: RecurrenceFrequency): string => {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  };

  const calculateNextTotal = (template: RecurringInvoiceWithDetails): number => {
    return template.line_items.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unit_price;
      return sum + lineTotal;
    }, 0);
  };

  const columns: GridColDef[] = [
    {
      field: 'template_name',
      headerName: 'Template Name',
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ fontWeight: 'bold' }}>{params.value}</Box>
      ),
    },
    {
      field: 'customer_name',
      headerName: 'Customer',
      width: 180,
    },
    {
      field: 'frequency',
      headerName: 'Frequency',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={getFrequencyLabel(params.value)} size="small" variant="outlined" />
      ),
    },
    {
      field: 'next_invoice_date',
      headerName: 'Next Invoice',
      width: 130,
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'last_generated_date',
      headerName: 'Last Generated',
      width: 130,
      valueFormatter: (value) => (value ? formatDate(value) : 'Never'),
    },
    {
      field: 'line_items',
      headerName: 'Est. Amount',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (value, row) => calculateNextTotal(row),
      valueFormatter: (value) => formatCurrency(value),
    },
    {
      field: 'generated_invoices_count',
      headerName: 'Generated',
      width: 100,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? 'Active' : 'Paused'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          {params.row.is_active ? (
            <Tooltip title="Pause">
              <IconButton size="small" onClick={() => handlePause(params.row.id)}>
                <Pause />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Resume">
              <IconButton
                size="small"
                color="success"
                onClick={() => handleResume(params.row.id)}
              >
                <PlayArrow />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Generate Now">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleGenerateNow(params.row.id)}
              disabled={!params.row.is_active}
            >
              <Receipt />
            </IconButton>
          </Tooltip>

          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => alert('Edit functionality coming soon')}
            >
              <Edit />
            </IconButton>
          </Tooltip>

          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDelete(params.row.id)}
            >
              <Delete />
            </IconButton>
          </Tooltip>
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
            Recurring Invoices
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => alert('Create template functionality coming soon')}
          >
            Create Template
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Card>
          <CardContent>
            {/* Active Filter Tabs */}
            <Tabs
              value={activeFilter}
              onChange={(_, value) => setActiveFilter(value)}
              sx={{ mb: 2 }}
            >
              <Tab label="All Templates" value="all" />
              <Tab label="Active" value="active" />
              <Tab label="Paused" value="inactive" />
            </Tabs>

            <DataGrid
              rows={templates}
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
                  sortModel: [{ field: 'next_invoice_date', sort: 'asc' }],
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
