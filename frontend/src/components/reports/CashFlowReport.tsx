import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Divider, Alert } from '@mui/material';
import type { CashFlowStatement } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDateRange } from '../../utils/dateFormatter';
import { useAuthStore } from '../../store/authStore';

interface CashFlowReportProps {
  data: CashFlowStatement;
}

export default function CashFlowReport({ data }: CashFlowReportProps) {
  const { tenant } = useAuthStore();
  const currency = tenant?.currency || 'USD';

  return (
    <Box>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight="bold">
          Cash Flow Statement
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
            {/* Opening Balance */}
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell colSpan={2}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Opening Cash Balance
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle2" fontWeight="bold">
                  {formatCurrency(data.opening_cash_balance, currency)}
                </Typography>
              </TableCell>
            </TableRow>

            {/* Cash Inflows */}
            <TableRow>
              <TableCell colSpan={3} sx={{ bgcolor: 'success.50', py: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="success.main">
                  Cash Inflows
                </Typography>
              </TableCell>
            </TableRow>
            {data.cash_inflows.map((item, index) => (
              <TableRow key={index}>
                <TableCell sx={{ pl: 4 }}>{item.category}</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary' }}>
                  {item.percentage.toFixed(1)}%
                </TableCell>
                <TableCell align="right" sx={{ color: 'success.main', fontWeight: 500 }}>
                  {formatCurrency(item.amount, currency)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: 'success.100' }}>
              <TableCell colSpan={2}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Total Inflows
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle2" fontWeight="bold" color="success.main">
                  {formatCurrency(data.total_inflows, currency)}
                </Typography>
              </TableCell>
            </TableRow>

            {/* Cash Outflows */}
            <TableRow>
              <TableCell colSpan={3} sx={{ bgcolor: 'error.50', py: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="error.main">
                  Cash Outflows
                </Typography>
              </TableCell>
            </TableRow>
            {data.cash_outflows.map((item, index) => (
              <TableRow key={index}>
                <TableCell sx={{ pl: 4 }}>{item.category}</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary' }}>
                  {item.percentage.toFixed(1)}%
                </TableCell>
                <TableCell align="right" sx={{ color: 'error.main', fontWeight: 500 }}>
                  {formatCurrency(item.amount, currency)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: 'error.100' }}>
              <TableCell colSpan={2}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Total Outflows
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle2" fontWeight="bold" color="error.main">
                  {formatCurrency(data.total_outflows, currency)}
                </Typography>
              </TableCell>
            </TableRow>

            {/* Net Cash Flow */}
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell colSpan={2}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Net Cash Flow
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  color={data.net_cash_flow >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatCurrency(data.net_cash_flow, currency)}
                </Typography>
              </TableCell>
            </TableRow>

            {/* Closing Balance */}
            <TableRow sx={{ bgcolor: 'primary.50' }}>
              <TableCell colSpan={2}>
                <Typography variant="h6" fontWeight="bold">
                  Closing Cash Balance
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" fontWeight="bold" color="primary.main">
                  {formatCurrency(data.closing_cash_balance, currency)}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Account Balances Summary */}
      {data.account_balances && data.account_balances.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Account Balances
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Account</strong></TableCell>
                  <TableCell align="right"><strong>Opening</strong></TableCell>
                  <TableCell align="right"><strong>Inflows</strong></TableCell>
                  <TableCell align="right"><strong>Outflows</strong></TableCell>
                  <TableCell align="right"><strong>Closing</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.account_balances.map((balance) => (
                  <TableRow key={balance.id}>
                    <TableCell>{balance.account_name}</TableCell>
                    <TableCell align="right">{formatCurrency(balance.opening_balance, currency)}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      {formatCurrency(balance.total_income, currency)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      {formatCurrency(balance.total_expense, currency)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                      {formatCurrency(balance.closing_balance, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
}
