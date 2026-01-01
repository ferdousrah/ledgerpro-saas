import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  PersonOff as DeactivateIcon,
  PersonAdd as ReactivateIcon,
} from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import DialogHeader from '../components/DialogHeader';
import { useAuthStore } from '../store/authStore';

import {
  getUsers,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
} from '../services/usersApi';
import type { User, CreateUserRequest, UpdateUserRequest } from '../services/usersApi';

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'accountant' | 'viewer';
}

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'accountant',
  });
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers(showInactive);
      setUsers(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [showInactive]);

  const handleCreateUser = async () => {
    try {
      setError(null);
      const userData: CreateUserRequest = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };
      await createUser(userData);
      setCreateDialogOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'accountant' });
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      setError(null);
      const updateData: UpdateUserRequest = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      };
      await updateUser(selectedUser.id, updateData);
      setEditDialogOpen(false);
      setSelectedUser(null);
      setFormData({ name: '', email: '', password: '', role: 'accountant' });
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user');
    }
  };

  const handleDeactivateUser = async (user: User) => {
    if (
      !window.confirm(
        `Are you sure you want to deactivate ${user.name}? They will no longer be able to access the system.`
      )
    ) {
      return;
    }

    try {
      setError(null);
      await deactivateUser(user.id);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to deactivate user');
    }
  };

  const handleReactivateUser = async (user: User) => {
    try {
      setError(null);
      await reactivateUser(user.id);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reactivate user');
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    });
    setEditDialogOpen(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'accountant':
        return 'primary';
      case 'viewer':
        return 'default';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Box p={3}>
          <Alert severity="error">
            You don't have permission to access user management. Only administrators can manage users.
          </Alert>
        </Box>
      </DashboardLayout>
    );
  }

  // Define columns for DataGrid
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1.2,
      minWidth: 180,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" alignItems="center" gap={1}>
          {params.value}
          {params.row.id === currentUser?.id && (
            <Chip label="You" size="small" />
          )}
        </Box>
      ),
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1.5,
      minWidth: 200,
    },
    {
      field: 'role',
      headerName: 'Role',
      flex: 0.8,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={getRoleLabel(params.value)}
          color={getRoleColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'is_active',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 110,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'last_login',
      headerName: 'Last Login',
      flex: 1.2,
      minWidth: 180,
      valueFormatter: (value) => (value ? formatDate(value) : 'Never'),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      flex: 1.2,
      minWidth: 180,
      valueFormatter: (value) => formatDate(value),
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
        <Box display="flex" gap={0.5} justifyContent="center">
          <Tooltip title="Edit user">
            <span>
              <IconButton
                size="small"
                onClick={() => openEditDialog(params.row)}
                disabled={!params.row.is_active}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          {params.row.is_active ? (
            <Tooltip title="Deactivate user">
              <IconButton
                size="small"
                onClick={() => handleDeactivateUser(params.row)}
                color="error"
              >
                <DeactivateIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Reactivate user">
              <IconButton
                size="small"
                onClick={() => handleReactivateUser(params.row)}
                color="success"
              >
                <ReactivateIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">User Management</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
            }
            label="Show inactive users"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setFormData({ name: '', email: '', password: '', role: 'accountant' });
              setCreateDialogOpen(true);
            }}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <DataGrid
            rows={users}
            columns={columns}
            loading={loading}
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
                sortModel: [{ field: 'created_at', sort: 'desc' }],
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
                display: 'flex',
                alignItems: 'center',
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogHeader title="Add New User" onClose={() => setCreateDialogOpen(false)} />
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              helperText="Minimum 8 characters"
            />
            <TextField
              select
              label="Role"
              fullWidth
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value as 'admin' | 'accountant' | 'viewer',
                })
              }
            >
              <MenuItem value="admin">Admin - Full access</MenuItem>
              <MenuItem value="accountant">Accountant - Manage transactions and data</MenuItem>
              <MenuItem value="viewer">Viewer - Read-only access</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={
              !formData.name ||
              !formData.email ||
              !formData.password ||
              formData.password.length < 8
            }
          >
            Create User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogHeader title="Edit User" onClose={() => setEditDialogOpen(false)} />
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <TextField
              select
              label="Role"
              fullWidth
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value as 'admin' | 'accountant' | 'viewer',
                })
              }
            >
              <MenuItem value="admin">Admin - Full access</MenuItem>
              <MenuItem value="accountant">Accountant - Manage transactions and data</MenuItem>
              <MenuItem value="viewer">Viewer - Read-only access</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateUser}
            variant="contained"
            disabled={!formData.name || !formData.email}
          >
            Update User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </DashboardLayout>
  );
};

export default UsersPage;
