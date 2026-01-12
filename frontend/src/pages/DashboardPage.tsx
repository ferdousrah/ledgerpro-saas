import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Grid, Card, CardContent, Typography, Box, CircularProgress, Alert, Chip,
  List, ListItem, ListItemText, Divider, IconButton, Skeleton, TextField,
  Popover, Button
} from '@mui/material';
import {
  TrendingUp, TrendingDown, AccountBalance, CalendarToday,
  Receipt, AttachMoney, ArrowForward, Warning,
  AccountBalanceWallet, CreditCard, Savings
} from '@mui/icons-material';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuthStore } from '../store/authStore';
import { AccountingType, InvoiceStatus, type InvoiceWithDetails } from '../types';
import { transactionsApi, accountsApi, type Transaction, TransactionType } from '../services/singleEntryApi';
import { invoicesApi } from '../services/invoicesApi';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/dateFormatter';

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
  income: '#c7d2fe', // light blue
  expense: '#4f46e5', // dark indigo blue
  net: '#3b82f6', // blue
  categories: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6', '#f97316'],
};

export default function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, tenant } = useAuthStore();
    const isSingleEntry = tenant?.accounting_type === AccountingType.SINGLE;

  const [stats, setStats] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [accountBalances, setAccountBalances] = useState<any[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<InvoiceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  // Chart date filter - defaults to current year
  const currentYear = new Date().getFullYear();
  const [chartStartDate, setChartStartDate] = useState(`${currentYear}-01-01`);
  const [chartEndDate, setChartEndDate] = useState(`${currentYear}-12-31`);
  const [dateRangeAnchor, setDateRangeAnchor] = useState<null | HTMLElement>(null);
  const [chartViewMode, setChartViewMode] = useState<'year' | 'month'>('month');

  
  // Recalculate chart data when date range or view mode changes
  useEffect(() => {
    if (allTransactions.length > 0) {
      if (chartViewMode === 'month') {
        const monthlyStats = calculateMonthlyStats(allTransactions, chartStartDate, chartEndDate);
        setMonthlyData(monthlyStats);
      } else {
        const yearlyStats = calculateYearlyStats(allTransactions);
        setMonthlyData(yearlyStats);
      }
    }
  }, [chartStartDate, chartEndDate, allTransactions, chartViewMode]);

  const fetchDashboardData = useCallback(async () => {
    if (!isSingleEntry) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Current year date range for stats
      const yearStart = new Date(`${currentYear}-01-01`);
      const yearEnd = new Date(`${currentYear}-12-31`);

      // Fetch all data in parallel
      const [accounts, transactions, overdue] = await Promise.all([
        accountsApi.list(),
        transactionsApi.list({}),
        invoicesApi.list({ status_filter: InvoiceStatus.OVERDUE })
      ]);

      // Filter transactions for current year
      const currentYearTransactions = transactions.filter(t => {
        const date = new Date(t.transaction_date);
        return date >= yearStart && date <= yearEnd;
      });

      // Calculate stats from current year transactions
      const totalIncome = currentYearTransactions
        .filter(t => t.transaction_type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = currentYearTransactions
        .filter(t => t.transaction_type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);

      setStats({
        total_income: totalIncome,
        total_expense: totalExpense,
        net_balance: totalIncome - totalExpense,
        active_accounts: accounts.filter(a => a.is_active).length,
        total_transactions: currentYearTransactions.length,
      });

      // Store all transactions for chart filtering
      setAllTransactions(transactions);

      // Calculate monthly data (will be recalculated when date range changes)
      const monthlyStats = calculateMonthlyStats(transactions, chartStartDate, chartEndDate);
      setMonthlyData(monthlyStats);

      // Calculate category breakdown for current year
      const categoryStats = calculateCategoryStats(currentYearTransactions);
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

      // Set overdue invoices
      setOverdueInvoices(overdue);

      setError('');
    } catch (err: any) {
      console.error('[Dashboard] Error fetching data:', err);
      setError(err.response?.data?.detail || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [isSingleEntry, currentYear, chartStartDate, chartEndDate]);

  // Calculate monthly income vs expense
  const calculateMonthlyStats = (transactions: Transaction[], startDate: string, endDate: string) => {
    const monthlyMap = new Map<string, { income: number; expense: number }>();
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Initialize 12 months with short month names only
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 0; i < 12; i++) {
      const date = new Date(start);
      date.setMonth(start.getMonth() + i);
      const monthKey = monthNames[date.getMonth()];
      monthlyMap.set(monthKey, { income: 0, expense: 0 });
    }

    // Filter and aggregate transactions within the date range
    transactions
      .filter(transaction => {
        const date = new Date(transaction.transaction_date);
        return date >= start && date <= end;
      })
      .forEach(transaction => {
        const date = new Date(transaction.transaction_date);
        const monthKey = monthNames[date.getMonth()];
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

  // Calculate yearly income vs expense (last 5 years)
  const calculateYearlyStats = (transactions: Transaction[]) => {
    const yearlyMap = new Map<number, { income: number; expense: number }>();

    // Initialize last 5 years
    for (let i = 4; i >= 0; i--) {
      const year = currentYear - i;
      yearlyMap.set(year, { income: 0, expense: 0 });
    }

    // Aggregate transactions by year
    transactions.forEach(transaction => {
      const date = new Date(transaction.transaction_date);
      const year = date.getFullYear();
      const existing = yearlyMap.get(year);

      if (existing) {
        if (transaction.transaction_type === TransactionType.INCOME) {
          existing.income += transaction.amount;
        } else {
          existing.expense += transaction.amount;
        }
      }
    });

    return Array.from(yearlyMap.entries()).map(([year, data]) => ({
      month: year.toString(),
      income: data.income,
      expense: data.expense,
      net: data.income - data.expense
    }));
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
      if (!document.hidden && isSingleEntry) {
        fetchDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSingleEntry, fetchDashboardData]);

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
        mb={3}
        sx={{
          animation: 'fadeInDown 0.6s ease-out',
          '@keyframes fadeInDown': {
            '0%': { opacity: 0, transform: 'translateY(-20px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' }
          }
        }}
      >
        <Typography variant="h4" fontWeight="bold">
          Welcome back, {user?.name}! 👋
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Stats Cards with Animation */}
      <Grid container spacing={3} mb={4}>
        {[
          {
            title: 'Total Income',
            value: stats?.total_income || 0,
            icon: <AccountBalance />,
            color: 'success',
            bgColor: '#ecfdf5',
            iconColor: '#10b981',
            percentChange: 12.5,
            isUp: true,
            delay: '0.1s'
          },
          {
            title: 'Total Expenses',
            value: stats?.total_expense || 0,
            icon: <Receipt />,
            color: 'error',
            bgColor: '#fef2f2',
            iconColor: '#ef4444',
            percentChange: 8.2,
            isUp: false,
            delay: '0.2s'
          },
          {
            title: 'Net Balance',
            value: stats?.net_balance || 0,
            icon: <AttachMoney />,
            color: 'primary',
            bgColor: '#eff6ff',
            iconColor: '#3b82f6',
            showInfo: true,
            delay: '0.3s'
          }
        ].map((stat, index) => (
          <Grid size={{ xs: 12, md: 4 }} key={index}>
            <Card
              elevation={0}
              sx={{
                animation: 'fadeInUp 0.6s ease-out',
                animationDelay: stat.delay,
                animationFillMode: 'backwards',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
                },
                '@keyframes fadeInUp': {
                  '0%': { opacity: 0, transform: 'translateY(30px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              <CardContent sx={{ py: 3, px: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box
                    sx={{
                      bgcolor: stat.bgColor,
                      p: 1.5,
                      borderRadius: 2,
                      color: stat.iconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {stat.icon}
                  </Box>
                  {stat.percentChange !== undefined && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {stat.isUp ? (
                        <TrendingUp sx={{ fontSize: 18, color: 'success.main' }} />
                      ) : (
                        <TrendingDown sx={{ fontSize: 18, color: 'error.main' }} />
                      )}
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={stat.isUp ? 'success.main' : 'error.main'}
                      >
                        {stat.percentChange}%
                      </Typography>
                    </Box>
                  )}
                  {stat.showInfo && (
                    <Box
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 'bold'
                      }}
                    >
                      i
                    </Box>
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" fontWeight={500} mb={1}>
                  {stat.title}
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="text.primary">
                  <AnimatedCounter value={stat.value} currency={tenant?.currency || 'USD'} />
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Second Row: Income vs Expense Chart + Account Balances */}
      <Grid container spacing={3} mb={4}>
        {/* Income vs Expense Chart */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              minHeight: 500,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              animation: 'fadeIn 0.8s ease-out 0.4s backwards',
              '@keyframes fadeIn': {
                '0%': { opacity: 0 },
                '100%': { opacity: 1 }
              }
            }}
          >
            <CardContent sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
              {/* Header Row */}
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                {/* Title and Subtitle */}
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Income vs Expense
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monthly comparison for {currentYear}
                  </Typography>
                </Box>

                {/* Legend and Toggle */}
                <Box display="flex" alignItems="center" gap={3}>
                  {/* Custom Legend */}
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#c7d2fe' }} />
                      <Typography variant="body2" color="text.secondary">Income</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4f46e5' }} />
                      <Typography variant="body2" color="text.secondary">Expense</Typography>
                    </Box>
                  </Box>

                  {/* Year/Month Toggle */}
                  <Box
                    sx={{
                      display: 'flex',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      overflow: 'hidden'
                    }}
                  >
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => setChartViewMode('year')}
                      sx={{
                        px: 2,
                        py: 0.5,
                        borderRadius: 0,
                        textTransform: 'none',
                        fontWeight: 500,
                        bgcolor: chartViewMode === 'year' ? 'grey.100' : 'transparent',
                        color: chartViewMode === 'year' ? 'text.primary' : 'text.secondary',
                        '&:hover': { bgcolor: chartViewMode === 'year' ? 'grey.200' : 'action.hover' }
                      }}
                    >
                      Year
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => setChartViewMode('month')}
                      sx={{
                        px: 2,
                        py: 0.5,
                        borderRadius: 0,
                        textTransform: 'none',
                        fontWeight: 500,
                        bgcolor: chartViewMode === 'month' ? 'grey.100' : 'transparent',
                        color: chartViewMode === 'month' ? 'text.primary' : 'text.secondary',
                        '&:hover': { bgcolor: chartViewMode === 'month' ? 'grey.200' : 'action.hover' }
                      }}
                    >
                      Month
                    </Button>
                  </Box>
                </Box>
              </Box>

              {/* Chart */}
              <Box flexGrow={1} minHeight={0}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      style={{ fontSize: '11px' }}
                      tick={{ fill: '#94a3b8' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      style={{ fontSize: '11px' }}
                      tick={{ fill: '#94a3b8' }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        border: 'none'
                      }}
                      formatter={(value: number) => formatCurrency(value, tenant?.currency || 'USD')}
                    />
                    <Bar
                      dataKey="income"
                      fill={CHART_COLORS.income}
                      radius={[4, 4, 0, 0]}
                      name="Income"
                    />
                    <Bar
                      dataKey="expense"
                      fill={CHART_COLORS.expense}
                      radius={[4, 4, 0, 0]}
                      name="Expense"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Balances */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              minHeight: 500,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              animation: 'fadeIn 0.8s ease-out 0.7s backwards',
              '@keyframes fadeIn': {
                '0%': { opacity: 0 },
                '100%': { opacity: 1 }
              }
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold">
                  Account Balances
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => navigate('/accounts')}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <ArrowForward fontSize="small" />
                </IconButton>
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                {accountBalances.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                    No accounts yet
                  </Typography>
                ) : (
                  accountBalances.map((account, index) => {
                    const getAccountIcon = (type: string) => {
                      const lowerType = type?.toLowerCase() || '';
                      if (lowerType.includes('bank')) {
                        return { icon: <AccountBalance sx={{ fontSize: 20 }} />, bgColor: '#eff6ff', iconColor: '#3b82f6' };
                      } else if (lowerType.includes('cash')) {
                        return { icon: <AccountBalanceWallet sx={{ fontSize: 20 }} />, bgColor: '#f0fdf4', iconColor: '#22c55e' };
                      } else if (lowerType.includes('credit') || lowerType.includes('card')) {
                        return { icon: <CreditCard sx={{ fontSize: 20 }} />, bgColor: '#fef3c7', iconColor: '#f59e0b' };
                      } else if (lowerType.includes('saving')) {
                        return { icon: <Savings sx={{ fontSize: 20 }} />, bgColor: '#fce7f3', iconColor: '#ec4899' };
                      }
                      return { icon: <AccountBalance sx={{ fontSize: 20 }} />, bgColor: '#eff6ff', iconColor: '#3b82f6' };
                    };
                    const accountStyle = getAccountIcon(account.type);

                    return (
                      <Box
                        key={index}
                        display="flex"
                        alignItems="center"
                        gap={2}
                        py={2}
                      >
                        <Box
                          sx={{
                            bgcolor: accountStyle.bgColor,
                            p: 1.5,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: accountStyle.iconColor
                          }}
                        >
                          {accountStyle.icon}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body1" fontWeight={600}>
                            {account.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: accountStyle.iconColor,
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5
                            }}
                          >
                            {account.type}
                          </Typography>
                        </Box>
                        <Typography variant="body1" fontWeight="bold" color="text.primary">
                          {formatCurrency(account.balance, tenant?.currency || 'USD')}
                        </Typography>
                      </Box>
                    );
                  })
                )}
              </Box>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate('/accounts')}
                sx={{
                  mt: 2,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: 'divider',
                  color: 'primary.main',
                  bgcolor: '#f8fafc',
                  '&:hover': {
                    bgcolor: '#eff6ff',
                    borderColor: 'primary.main'
                  }
                }}
              >
                + Add New Account
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Third Row: Overdue Invoices */}
      <Grid container spacing={3}>
        <Grid size={12}>
          <Card
            elevation={2}
            sx={{
              animation: 'fadeIn 0.8s ease-out 0.8s backwards',
              '@keyframes fadeIn': {
                '0%': { opacity: 0 },
                '100%': { opacity: 1 }
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Warning sx={{ color: 'warning.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    Overdue Invoices
                  </Typography>
                  {overdueInvoices.length > 0 && (
                    <Chip
                      label={overdueInvoices.length}
                      size="small"
                      color="error"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>
                <IconButton
                  size="small"
                  onClick={() => navigate('/invoices')}
                  sx={{
                    bgcolor: 'primary.50',
                    '&:hover': { bgcolor: 'primary.100' }
                  }}
                >
                  <ArrowForward fontSize="small" />
                </IconButton>
              </Box>
              {overdueInvoices.length === 0 ? (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  py={4}
                >
                  <Typography variant="body2" color="text.secondary">
                    No overdue invoices
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Box
                    component="table"
                    sx={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      '& th, & td': {
                        p: 2,
                        textAlign: 'left',
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                      },
                      '& th': {
                        fontWeight: 600,
                        color: 'text.secondary',
                        fontSize: '0.875rem'
                      },
                      '& tr:hover td': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Customer</th>
                        <th>Due Date</th>
                        <th>Days Overdue</th>
                        <th style={{ textAlign: 'right' }}>Amount Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueInvoices.map((invoice) => {
                        const daysOverdue = Math.floor(
                          (new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)
                        );
                        return (
                          <tr
                            key={invoice.id}
                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td>
                              <Typography variant="body2" fontWeight={500}>
                                {invoice.invoice_number}
                              </Typography>
                            </td>
                            <td>
                              <Typography variant="body2">
                                {invoice.customer_name || 'Unknown'}
                              </Typography>
                            </td>
                            <td>
                              <Typography variant="body2">
                                {formatDate(invoice.due_date, tenant?.date_format || 'DD/MM/YYYY')}
                              </Typography>
                            </td>
                            <td>
                              <Chip
                                label={`${daysOverdue} days`}
                                size="small"
                                color={daysOverdue > 30 ? 'error' : 'warning'}
                                sx={{ fontWeight: 500 }}
                              />
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <Typography variant="body2" fontWeight="bold" color="error.main">
                                {formatCurrency(invoice.balance_due, tenant?.currency || 'USD')}
                              </Typography>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
}
