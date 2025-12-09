import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  TextField,
  Button,
  Alert,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, Visibility, VisibilityOff, Lock as LockIcon } from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: user?.name || '',
  });

  // Password change state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleEdit = () => {
    setEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      name: user?.name || '',
    });
    setError('');
  };

  const handleSave = async () => {
    try {
      setError('');
      setSuccess('');

      const updatedUser = await authAPI.updateProfile(formData);
      setUser(updatedUser);
      setEditing(false);
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile. Backend endpoint not implemented yet.');
    }
  };

  const handleOpenPasswordDialog = () => {
    setPasswordDialogOpen(true);
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
  };

  const handleClosePasswordDialog = () => {
    setPasswordDialogOpen(false);
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
  };

  const handleChangePassword = async () => {
    try {
      setPasswordError('');
      setPasswordSuccess('');

      // Validate passwords match
      if (passwordData.new_password !== passwordData.confirm_password) {
        setPasswordError('New passwords do not match');
        return;
      }

      // Validate password length
      if (passwordData.new_password.length < 8) {
        setPasswordError('New password must be at least 8 characters');
        return;
      }

      await authAPI.updatePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      setPasswordSuccess('Password changed successfully!');
      setTimeout(() => {
        handleClosePasswordDialog();
      }, 2000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || 'Failed to change password');
    }
  };

  return (
    <DashboardLayout>
      <Box mb={3}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          My Profile
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your personal information
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" flexDirection="column" alignItems="center" py={4}>
                <Avatar sx={{ width: 120, height: 120, mb: 2, bgcolor: 'primary.main', fontSize: 48 }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {user?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  {user?.email}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    bgcolor: 'primary.50',
                    color: 'primary.main',
                    px: 2,
                    py: 0.5,
                    borderRadius: 1,
                    fontWeight: 'medium',
                  }}
                >
                  {user?.role}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold">
                  Personal Information
                </Typography>
                {!editing && (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={handleEdit}
                    size="small"
                  >
                    Edit
                  </Button>
                )}
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Full Name"
                    fullWidth
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!editing}
                    variant={editing ? 'outlined' : 'filled'}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email"
                    fullWidth
                    type="email"
                    value={user?.email}
                    disabled
                    variant="filled"
                    helperText="Email cannot be changed (used for login)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Role"
                    fullWidth
                    value={user?.role}
                    disabled
                    variant="filled"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Account Status"
                    fullWidth
                    value={user?.is_active ? 'Active' : 'Inactive'}
                    disabled
                    variant="filled"
                  />
                </Grid>
              </Grid>

              {editing && (
                <Box mt={3} display="flex" gap={2}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={!formData.name}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Security
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary" paragraph>
                Manage your password and account security settings.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<LockIcon />}
                onClick={handleOpenPasswordDialog}
              >
                Change Password
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={handleClosePasswordDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          {passwordError && <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>}
          {passwordSuccess && <Alert severity="success" sx={{ mb: 2 }}>{passwordSuccess}</Alert>}

          <TextField
            label="Current Password"
            type={showCurrentPassword ? 'text' : 'password'}
            fullWidth
            margin="normal"
            value={passwordData.current_password}
            onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    edge="end"
                  >
                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="New Password"
            type={showNewPassword ? 'text' : 'password'}
            fullWidth
            margin="normal"
            value={passwordData.new_password}
            onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
            required
            helperText="Must be at least 8 characters"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Confirm New Password"
            type={showConfirmPassword ? 'text' : 'password'}
            fullWidth
            margin="normal"
            value={passwordData.confirm_password}
            onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePasswordDialog}>Cancel</Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            disabled={
              !passwordData.current_password ||
              !passwordData.new_password ||
              !passwordData.confirm_password ||
              passwordSuccess !== ''
            }
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}
