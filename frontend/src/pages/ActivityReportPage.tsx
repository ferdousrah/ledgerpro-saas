import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  TextField,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { History } from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import { activityLogsApi, type ActivityLog } from '../services/activityLogsApi';
import { formatDateTime } from '../utils/dateFormatter';
import { useAuthStore } from '../store/authStore';

export default function ActivityReportPage() {
  const { tenant } = useAuthStore();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, [activityTypeFilter, entityTypeFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await activityLogsApi.list({
        activity_type: activityTypeFilter || undefined,
        entity_type: entityTypeFilter || undefined,
        limit: 1000,
      });
      setLogs(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const getActivityTypeColor = (type: string) => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
      login: 'success',
      logout: 'default',
      register: 'info',
      create: 'primary',
      update: 'warning',
      delete: 'error',
      view: 'default',
      export: 'secondary',
      import: 'secondary',
      settings_change: 'info',
    };
    return colors[type] || 'default';
  };

  const getEntityTypeColor = (type: string) => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
      user: 'primary',
      tenant: 'secondary',
      account: 'info',
      category: 'warning',
      transaction: 'success',
      partner: 'primary',
      settings: 'default',
    };
    return colors[type] || 'default';
  };

  const formatActivityType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatEntityType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const columns: GridColDef[] = [
    {
      field: 'created_at',
      headerName: 'Date & Time',
      width: 180,
      valueFormatter: (params) => formatDateTime(params, tenant?.date_format || 'DD/MM/YYYY', false),
    },
    {
      field: 'user_name',
      headerName: 'User',
      width: 180,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.user_email}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'activity_type',
      headerName: 'Activity',
      width: 140,
      renderCell: (params) => (
        <Chip
          label={formatActivityType(params.value)}
          size="small"
          color={getActivityTypeColor(params.value)}
        />
      ),
    },
    {
      field: 'entity_type',
      headerName: 'Entity Type',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={formatEntityType(params.value)}
          size="small"
          color={getEntityTypeColor(params.value)}
          variant="outlined"
        />
      ),
    },
    {
      field: 'entity_name',
      headerName: 'Entity Name',
      flex: 1,
      minWidth: 200,
      valueGetter: (params) => params || '-',
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 250,
      valueGetter: (params) => params || '-',
    },
    {
      field: 'ip_address',
      headerName: 'IP Address',
      width: 130,
      valueGetter: (params) => params || '-',
    },
  ];

  if (loading && logs.length === 0) {
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
            User Activity Report
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track and monitor all user activities and system events
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap">
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Activity Type</InputLabel>
              <Select
                value={activityTypeFilter}
                onChange={(e) => setActivityTypeFilter(e.target.value)}
                label="Activity Type"
              >
                <MenuItem value="">All Activities</MenuItem>
                <MenuItem value="login">Login</MenuItem>
                <MenuItem value="logout">Logout</MenuItem>
                <MenuItem value="create">Create</MenuItem>
                <MenuItem value="update">Update</MenuItem>
                <MenuItem value="delete">Delete</MenuItem>
                <MenuItem value="view">View</MenuItem>
                <MenuItem value="export">Export</MenuItem>
                <MenuItem value="import">Import</MenuItem>
                <MenuItem value="settings_change">Settings Change</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Entity Type</InputLabel>
              <Select
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                label="Entity Type"
              >
                <MenuItem value="">All Entities</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="tenant">Tenant</MenuItem>
                <MenuItem value="account">Account</MenuItem>
                <MenuItem value="category">Category</MenuItem>
                <MenuItem value="transaction">Transaction</MenuItem>
                <MenuItem value="partner">Partner</MenuItem>
                <MenuItem value="settings">Settings</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {logs.length === 0 ? (
            <Box py={8} textAlign="center">
              <History sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No activity logs found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Activity logs will appear here as users interact with the system
              </Typography>
            </Box>
          ) : (
            <Box sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={logs}
                columns={columns}
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
                    paginationModel: { pageSize: 25 },
                  },
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                disableRowSelectionOnClick
                getRowHeight={() => 'auto'}
                sx={{
                  '& .MuiDataGrid-columnHeader': {
                    backgroundColor: 'background.default',
                  },
                  '& .MuiDataGrid-cell': {
                    display: 'flex',
                    alignItems: 'center',
                    borderColor: 'divider',
                  },
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
