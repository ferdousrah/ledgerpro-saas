import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Grid, Card, CardContent, Typography, Box, CircularProgress, Alert, Chip,
  List, ListItem, ListItemText, Divider, IconButton, Skeleton
} from '@mui/material';
import {
  TrendingUp, TrendingDown, AccountBalance, CalendarToday,
  Receipt, AttachMoney, ArrowForward, MonetizationOn
} from '@mui/icons-material';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuthStore } from '../store/authStore';
import { useYearStore } from '../store/yearStore';
import { AccountingType, FinancialYearStatus } from '../types';
import { transactionsApi, accountsApi, type Transaction, TransactionType } from '../services/singleEntryApi';
import { fiscalYearsApi } from '../services/fiscalYearsApi';
import { invoicesApi } from '../services/invoicesApi';
import { formatCurrency } from '../utils/currency';
import { formatDateRange, formatDate } from '../utils/dateFormatter';

// Animated counter component
const AnimatedCounter = ({ value, currency }: { value: number; currency: string }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500; // 1.5 seconds
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;
      if (step >= steps) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{formatCurrency(displayValue, currency)}</span>;
};

// Color palette for charts
const CHART_COLORS = {
  income: '#10b981', // green
  expense: '#ef4444', // red
  net: '#3b82f6', // blue
  categories: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6', '#f97316'],
};

export default function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, tenant } = useAuthStore();
  const { selectedYear, initializeYear } = useYearStore();
  const isSingleEntry = tenant?.accounting_type === AccountingType.SINGLE;

  const [stats, setStats] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [accountBalances, setAccountBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    initializeYear();
  }, [initializeYear]);

  const fetchDashboardData = useCallback(async () => {
    if (!isSingleEntry || !selectedYear) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch all data in parallel
      const [yearData, accounts, transactions] = await Promise.all([
        fiscalYearsApi.get(selectedYear.id),
        accountsApi.list(),
        transactionsApi.list({})
      ]);

      // Set basic stats
      setStats({
        total_income: yearData.total_income,
        total_expense: yearData.total_expense,
        net_balance: yearData.net_balance,
        active_accounts: yearData.active_accounts_count,
        total_transactions: yearData.total_transactions_count,
      });

      // Calculate monthly data
      const monthlyStats = calculateMonthlyStats(transactions, selectedYear.start_date);
      setMonthlyData(monthlyStats);

      // Calculate category breakdown
      const categoryStats = calculateCategoryStats(transactions);
      setCategoryData(categoryStats);

      // Get recent transactions (last 5)
      const sortedTransactions = [...transactions]
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
        .slice(0, 5);
      setRecentTransactions(sortedTransactions);

      // Set account balances
      setAccountBalances(accounts.map(acc => ({
        name: acc.name,
        balance: acc.current_balance,
        type: acc.account_type
      })));

      setError('');
    } catch (err: any) {
      console.error('[Dashboard] Error fetching data:', err);
      setError(err.response?.data?.detail || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [isSingleEntry, selectedYear]);

  // Calculate monthly income vs expense
  const calculateMonthlyStats = (transactions: Transaction[], startDate: string) => {
    const monthlyMap = new Map<string, { income: number; expense: number }>();
    const start = new Date(startDate);

    // Initialize 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(start);
      date.setMonth(start.getMonth() + i);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyMap.set(monthKey, { income: 0, expense: 0 });
    }

    // Aggregate transactions
    transactions.forEach(transaction => {
      const date = new Date(transaction.transaction_date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const existing = monthlyMap.get(monthKey);

      if (existing) {
        if (transaction.transaction_type === TransactionType.INCOME) {
          existing.income += transaction.amount;
        } else {
          existing.expense += transaction.amount;
        }
      }
    });

    return Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      net: data.income - data.expense
    })); // Show all 12 months
  };

  // Calculate category breakdown
  const calculateCategoryStats = (transactions: Transaction[]) => {
    const categoryMap = new Map<string, { name: string; income: number; expense: number }>();

    transactions.forEach(transaction => {
      const categoryName = transaction.category?.name || 'Uncategorized';
      const existing = categoryMap.get(categoryName) || { name: categoryName, income: 0, expense: 0 };

      if (transaction.transaction_type === TransactionType.INCOME) {
        existing.income += transaction.amount;
      } else {
        existing.expense += transaction.amount;
      }

      categoryMap.set(categoryName, existing);
    });

    return Array.from(categoryMap.values())
      .map(cat => ({
        name: cat.name,
        value: cat.expense, // Focus on expenses for pie chart
        income: cat.income
      }))
      .filter(cat => cat.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6 categories
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, location.pathname]);

  // Auto-refresh on focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedYear && isSingleEntry) {
        fetchDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedYear, isSingleEntry, fetchDashboardData]);

  if (loading) {
    return (
      <DashboardLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
        sx={{
          animation: 'fadeInDown 0.6s ease-out',
          '@keyframes fadeInDown': {
            '0%': { opacity: 0, transform: 'translateY(-20px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' }
          }
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Welcome back, {user?.name}! 👋
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {selectedYear?.year_name || 'No year selected'}
            </Typography>
            {selectedYear?.status === FinancialYearStatus.CLOSED && (
              <Chip label="Closed Year" size="small" color="warning" />
            )}
          </Box>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Stats Cards with Animation */}
      <Grid container spacing={3} mb={4}>
        {[
          {
            title: 'Total Income',
            value: stats?.total_income || 0,
            icon: <TrendingUp />,
            color: 'success',
            delay: '0.1s'
          },
          {
            title: 'Total Expense',
            value: stats?.total_expense || 0,
            icon: <TrendingDown />,
            color: 'error',
            delay: '0.2s'
          },
          {
            title: 'Net Balance',
            value: stats?.net_balance || 0,
            icon: <AccountBalance />,
            color: 'primary',
            delay: '0.3s'
          }
        ].map((stat, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card
              elevation={3}
              sx={{
                animation: 'fadeInUp 0.6s ease-out',
                animationDelay: stat.delay,
                animationFillMode: 'backwards',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 6
                },
                '@keyframes fadeInUp': {
                  '0%': { opacity: 0, transform: 'translateY(30px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              <CardContent sx={{ py: 3, px: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={500}>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color={`${stat.color}.main`} sx={{ mt: 1 }}>
                      <AnimatedCounter value={stat.value} currency={tenant?.currency || 'USD'} />
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      bgcolor: `${stat.color}.50`,
                      p: 1.5,
                      borderRadius: 2,
                      color: `${stat.color}.main`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Second Row: Income vs Expense Chart + Account Balances */}
      <Grid container spacing={3} mb={4}>
        {/* Income vs Expense Chart */}
        <Grid item xs={12} lg={8}>
          <Card
            elevation={2}
            sx={{
              height: '100%',
              minHeight: 480,
              animation: 'fadeIn 0.8s ease-out 0.4s backwards',
              '@keyframes fadeIn': {
                '0%': { opacity: 0 },
                '100%': { opacity: 1 }
              }
            }}
          >
            <CardContent sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom mb={3}>
                Income vs Expense
              </Typography>
              <Box flexGrow={1} minHeight={0}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="month"
                      style={{ fontSize: '12px' }}
                      tick={{ fill: '#666' }}
                    />
                    <YAxis
                      style={{ fontSize: '12px' }}
                      tick={{ fill: '#666' }}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => formatCurrency(value, tenant?.currency || 'USD')}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar
                      dataKey="income"
                      fill={CHART_COLORS.income}
                      radius={[8, 8, 0, 0]}
                      name="Income"
                    />
                    <Bar
                      dataKey="expense"
                      fill={CHART_COLORS.expense}
                      radius={[8, 8, 0, 0]}
                      name="Expense"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Balances */}
        <Grid item xs={12} lg={4}>
          <Card
            elevation={2}
            sx={{
              height: '100%',
              minHeight: 400,
              animation: 'fadeIn 0.8s ease-out 0.7s backwards',
              '@keyframes fadeIn': {
                '0%': { opacity: 0 },
                '100%': { opacity: 1 }
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold">
                  Account Balances
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => navigate('/master-data/accounts')}
                  sx={{
                    bgcolor: 'primary.50',
                    '&:hover': { bgcolor: 'primary.100' }
                  }}
                >
                  <ArrowForward fontSize="small" />
                </IconButton>
              </Box>
              <List sx={{ py: 0 }}>
                {accountBalances.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                    No accounts yet
                  </Typography>
                ) : (
                  accountBalances.map((account, index) => (
                    <Box key={index}>
                      <ListItem sx={{ px: 0, py: 2 }}>
                        <Box
                          sx={{
                            bgcolor: 'primary.50',
                            p: 1.2,
                            borderRadius: 1.5,
                            mr: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <MonetizationOn sx={{ fontSize: 22, color: 'primary.main' }} />
                        </Box>
                        <ListItemText
                          primary={
                            <Typography variant="body1" fontWeight={500}>
                              {account.name}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {account.type}
                            </Typography>
                          }
                        />
                        <Typography variant="h6" fontWeight="bold" color="primary.main">
                          {formatCurrency(account.balance, tenant?.currency || 'USD')}
                        </Typography>
                      </ListItem>
                      {index < accountBalances.length - 1 && <Divider />}
                    </Box>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
}
