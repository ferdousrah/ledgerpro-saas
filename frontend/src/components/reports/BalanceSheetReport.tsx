import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, Chip } from '@mui/material';
import { CheckCircle, Warning } from '@mui/icons-material';
import type { BalanceSheet } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/dateFormatter';
import { useAuthStore } from '../../store/authStore';

interface BalanceSheetReportProps {
  data: BalanceSheet;
}

export default function BalanceSheetReport({ data }: BalanceSheetReportProps) {
  const { tenant } = useAuthStore();
  const currency = tenant?.currency || 'USD';
  const isBalanced = Math.abs(data.total_assets - data.total_equity) < 0.01;

  return (
    <Box>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight="bold">
          Balance Sheet
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {data.year_name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          As of {formatDate(data.as_of_date, tenant?.date_format || 'DD/MM/YYYY')}
        </Typography>
      </Box>

      {isBalanced ? (
        <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <strong>Balance Sheet is Balanced</strong>
            <Chip label="Assets = Equity" size="small" color="success" />
          </Box>
        </Alert>
      ) : (
        <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
          <strong>Minor discrepancy detected</strong>
          <Typography variant="body2">
            Difference: {formatCurrency(Math.abs(data.total_assets - data.total_equity), currency)}
          </Typography>
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableBody>
            {/* Assets Section */}
            <TableRow sx={{ bgcolor: 'primary.50' }}>
              <TableCell colSpan={2}>
                <Typography variant="h6" fontWeight="bold" color="primary.main">
                  Assets
                </Typography>
              </TableCell>
            </TableRow>
            {data.assets.length > 0 ? (
              data.assets.map((asset, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ pl: 4 }}>{asset.account_name}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 500 }}>
                    {formatCurrency(asset.amount, currency)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} sx={{ pl: 4, color: 'text.secondary', fontStyle: 'italic' }}>
                  No assets recorded
                </TableCell>
              </TableRow>
            )}
            <TableRow sx={{ bgcolor: 'primary.100' }}>
              <TableCell>
                <Typography variant="subtitle1" fontWeight="bold">
                  Total Assets
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                  {formatCurrency(data.total_assets, currency)}
                </Typography>
              </TableCell>
            </TableRow>

            {/* Spacer */}
            <TableRow>
              <TableCell colSpan={2} sx={{ height: 24, p: 0 }} />
            </TableRow>

            {/* Equity Section */}
            <TableRow sx={{ bgcolor: 'success.50' }}>
              <TableCell colSpan={2}>
                <Typography variant="h6" fontWeight="bold" color="success.main">
                  Equity
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Retained Earnings (Previous Years)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 500 }}>
                {formatCurrency(data.retained_earnings, currency)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>
                Current Period {data.current_period_profit_loss >= 0 ? 'Profit' : 'Loss'}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 500, color: data.current_period_profit_loss >= 0 ? 'success.main' : 'error.main' }}>
                {formatCurrency(data.current_period_profit_loss, currency)}
              </TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'success.100' }}>
              <TableCell>
                <Typography variant="subtitle1" fontWeight="bold">
                  Total Equity
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                  {formatCurrency(data.total_equity, currency)}
                </Typography>
              </TableCell>
            </TableRow>

            {/* Spacer */}
            <TableRow>
              <TableCell colSpan={2} sx={{ height: 16, p: 0 }} />
            </TableRow>

            {/* Verification Row */}
            <TableRow sx={{ bgcolor: isBalanced ? 'success.50' : 'warning.50', borderTop: 2, borderColor: 'divider' }}>
              <TableCell>
                <Typography variant="h6" fontWeight="bold">
                  Difference (Assets - Equity)
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color={isBalanced ? 'success.main' : 'warning.main'}
                >
                  {formatCurrency(Math.abs(data.total_assets - data.total_equity), currency)}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Note:</strong> In single-entry accounting, the balance sheet shows total assets
          against equity (retained earnings + current period profit/loss).
          Assets should equal equity for a balanced sheet.
        </Typography>
      </Box>
    </Box>
  );
}
