import { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { TrendingUp, TrendingDown, AccountBalance } from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuthStore } from '../store/authStore';
import { AccountingType } from '../types';
import { transactionsApi, type DashboardStats } from '../services/singleEntryApi';
import { formatCurrency } from '../utils/currency';

export default function DashboardPage() {
  const { user, tenant } = useAuthStore();
  const isSingleEntry = tenant?.accounting_type === AccountingType.SINGLE;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      if (!isSingleEntry) {
        setLoading(false);
        return;
      }

      try {
        const data = await transactionsApi.getDashboardStats();
        setStats(data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isSingleEntry]);

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
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Welcome, {user?.name}!
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Your {isSingleEntry ? 'Single Entry' : 'Double Entry'} accounting dashboard
      </Typography>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      <Grid container spacing={3} mt={2}>
        <Grid item xs={12} sm={4}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <TrendingUp color="success" sx={{ mr: 1, fontSize: 32 }} />
                <Typography variant="h6">{isSingleEntry ? 'Total Income' : 'Revenue'}</Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold" color="success.main">
                {formatCurrency(stats?.total_income || 0, tenant?.currency || 'USD')}
              </Typography>
              <Typography variant="caption" color="text.secondary">All time</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <TrendingDown color="error" sx={{ mr: 1, fontSize: 32 }} />
                <Typography variant="h6">{isSingleEntry ? 'Total Expense' : 'Expenses'}</Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold" color="error.main">
                {formatCurrency(stats?.total_expense || 0, tenant?.currency || 'USD')}
              </Typography>
              <Typography variant="caption" color="text.secondary">All time</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <AccountBalance color="primary" sx={{ mr: 1, fontSize: 32 }} />
                <Typography variant="h6">{isSingleEntry ? 'Net Balance' : 'Net Profit'}</Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold" color="primary.main">
                {formatCurrency(stats?.net_balance || 0, tenant?.currency || 'USD')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats?.active_accounts || 0} accounts • {stats?.total_transactions || 0} transactions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {isSingleEntry && (
        <Card sx={{ mt: 4 }} elevation={2}>
          <CardContent>
            <Typography variant="h5" gutterBottom fontWeight="bold">Getting Started</Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Welcome to {tenant?.company_name}! Your Single Entry accounting system is ready to use.
            </Typography>
            <Box sx={{ bgcolor: 'success.50', p: 2, borderRadius: 1, mt: 2 }}>
              <Typography variant="body2" fontWeight="bold" color="success.main">Phase 2 In Progress!</Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                You can now manage accounts, categories, and transactions. Use the sidebar to get started!
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
