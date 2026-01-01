import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import type { IncomeStatement } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDateRange } from '../../utils/dateFormatter';
import { useAuthStore } from '../../store/authStore';

interface IncomeStatementReportProps {
  data: IncomeStatement;
}

export default function IncomeStatementReport({ data }: IncomeStatementReportProps) {
  const { tenant } = useAuthStore();
  const currency = tenant?.currency || 'USD';
  const isProfit = data.net_profit_loss >= 0;

  return (
    <Box>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight="bold">
          Income Statement (P&L)
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {data.year_name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {formatDateRange(data.period_start, data.period_end, tenant?.date_format || 'DD/MM/YYYY')}
        </Typography>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableBody>
            {/* Income Section */}
            <TableRow sx={{ bgcolor: 'success.50' }}>
              <TableCell colSpan={3}>
                <Typography variant="h6" fontWeight="bold" color="success.main">
                  Income
                </Typography>
              </TableCell>
            </TableRow>
            {data.income_items.length > 0 ? (
              data.income_items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ pl: 4 }}>{item.category_name}</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary' }}>
                    {item.percentage.toFixed(1)}%
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'success.main', fontWeight: 500 }}>
                    {formatCurrency(item.amount, currency)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} sx={{ pl: 4, color: 'text.secondary', fontStyle: 'italic' }}>
                  No income recorded
                </TableCell>
              </TableRow>
            )}
            <TableRow sx={{ bgcolor: 'success.100' }}>
              <TableCell colSpan={2}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Total Income
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                  {formatCurrency(data.total_income, currency)}
                </Typography>
              </TableCell>
            </TableRow>

            {/* Spacer */}
            <TableRow>
              <TableCell colSpan={3} sx={{ height: 16, p: 0 }} />
            </TableRow>

            {/* Expenses Section */}
            <TableRow sx={{ bgcolor: 'error.50' }}>
              <TableCell colSpan={3}>
                <Typography variant="h6" fontWeight="bold" color="error.main">
                  Expenses
                </Typography>
              </TableCell>
            </TableRow>
            {data.expense_items.length > 0 ? (
              data.expense_items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ pl: 4 }}>{item.category_name}</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary' }}>
                    {item.percentage.toFixed(1)}%
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'error.main', fontWeight: 500 }}>
                    {formatCurrency(item.amount, currency)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} sx={{ pl: 4, color: 'text.secondary', fontStyle: 'italic' }}>
                  No expenses recorded
                </TableCell>
              </TableRow>
            )}
            <TableRow sx={{ bgcolor: 'error.100' }}>
              <TableCell colSpan={2}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Total Expenses
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle1" fontWeight="bold" color="error.main">
                  {formatCurrency(data.total_expense, currency)}
                </Typography>
              </TableCell>
            </TableRow>

            {/* Spacer */}
            <TableRow>
              <TableCell colSpan={3} sx={{ height: 16, p: 0 }} />
            </TableRow>

            {/* Net Profit/Loss */}
            <TableRow sx={{ bgcolor: isProfit ? 'success.50' : 'error.50', borderTop: 2, borderColor: 'divider' }}>
              <TableCell colSpan={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h5" fontWeight="bold">
                    {isProfit ? 'Net Profit' : 'Net Loss'}
                  </Typography>
                  <Chip
                    label={`${data.profit_margin_percentage.toFixed(1)}% Margin`}
                    color={isProfit ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </TableCell>
              <TableCell align="right">
                <Typography
                  variant="h5"
                  fontWeight="bold"
                  color={isProfit ? 'success.main' : 'error.main'}
                >
                  {formatCurrency(Math.abs(data.net_profit_loss), currency)}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Profit Margin:</strong> {data.profit_margin_percentage.toFixed(2)}%
          {isProfit ? ' (Profitable)' : ' (Loss-making)'}
        </Typography>
      </Box>
    </Box>
  );
}
