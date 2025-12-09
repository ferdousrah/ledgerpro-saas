import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Container, Box, Card, CardContent, TextField, Button, Typography, Alert, CircularProgress, Link } from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Container maxWidth="sm">
        <Card elevation={8}>
          <CardContent sx={{ p: 4 }}>
            <Box textAlign="center" mb={4}>
              <Typography variant="h4" fontWeight="bold" gutterBottom>🧾 LedgerPro SaaS</Typography>
              <Typography variant="body2" color="text.secondary">Sign in to your account</Typography>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth margin="normal" autoFocus />
              <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth margin="normal" />
              <Button type="submit" fullWidth variant="contained" size="large" disabled={isLoading} startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />} sx={{ mt: 3, mb: 2 }}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              <Box textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  Don't have an account? <Link component={RouterLink} to="/register" underline="hover">Sign up</Link>
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Typography variant="caption" display="block" textAlign="center" mt={2} color="white">Secure Multi-Tenant Accounting Platform</Typography>
      </Container>
    </Box>
  );
}
