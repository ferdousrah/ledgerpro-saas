import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const { user } = useAuthStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.email) {
      setError('User information not found');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify password by attempting login
      await authAPI.login({
        email: user.email,
        password,
      });

      // If successful, unlock the screen
      onUnlock();
      setPassword('');
    } catch (err: any) {
      setError('Invalid password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(10px)',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%', m: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <Lock sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Screen Locked
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Your session has been locked due to inactivity
            </Typography>
            <Typography variant="h3" fontWeight="bold" sx={{ mt: 2 }}>
              {currentTime}
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleUnlock}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Typography variant="subtitle2" gutterBottom>
              Logged in as: <strong>{user?.email}</strong>
            </Typography>

            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              autoFocus
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={loading || !password}
              sx={{ mt: 2 }}
              size="large"
            >
              {loading ? 'Unlocking...' : 'Unlock'}
            </Button>

            <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 2 }}>
              Enter your password to continue
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
