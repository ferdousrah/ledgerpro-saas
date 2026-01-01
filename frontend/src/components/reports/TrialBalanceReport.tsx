import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, Chip } from '@mui/material';
import { CheckCircle, Error } from '@mui/icons-material';
import type { TrialBalance } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/dateFormatter';
import { useAuthStore } from '../../store/authStore';

interface TrialBalanceReportProps {
  data: TrialBalance;
}

export default function TrialBalanceReport({ data }: TrialBalanceReportProps) {
  const { tenant } = useAuthStore();
  const currency = tenant?.currency || 'USD';

  return (
    <Box>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight="bold">
          Trial Balance
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {data.year_name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          As of {formatDate(data.as_of_date, tenant?.date_format || 'DD/MM/YYYY')}
        </Typography>
      </Box>

      {data.is_balanced ? (
        <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <strong>Trial Balance is Balanced</strong>
            <Chip label="Debit = Credit" size="small" color="success" />
          </Box>
        </Alert>
      ) : (
        <Alert severity="error" icon={<Error />} sx={{ mb: 2 }}>
          <strong>Trial Balance is NOT Balanced</strong>
          <Typography variant="body2">
            There is a discrepancy between debits and credits. Please review your transactions.
          </Typography>
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell><strong>Account Name</strong></TableCell>
              <TableCell><strong>Account Type</strong></TableCell>
              <TableCell align="right"><strong>Debit</strong></TableCell>
              <TableCell align="right"><strong>Credit</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.accounts.map((account, index) => (
              <TableRow key={index} hover>
                <TableCell>{account.account_name}</TableCell>
                <TableCell>
                  <Chip label={account.account_type} size="small" variant="outlined" />
                </TableCell>
                <TableCell align="right" sx={{ color: account.debit > 0 ? 'primary.main' : 'text.secondary', fontWeight: account.debit > 0 ? 500 : 400 }}>
                  {account.debit > 0 ? formatCurrency(account.debit, currency) : '-'}
                </TableCell>
                <TableCell align="right" sx={{ color: account.credit > 0 ? 'success.main' : 'text.secondary', fontWeight: account.credit > 0 ? 500 : 400 }}>
                  {account.credit > 0 ? formatCurrency(account.credit, currency) : '-'}
                </TableCell>
              </TableRow>
            ))}

            {/* Total Row */}
            <TableRow sx={{ bgcolor: 'primary.50', borderTop: 2, borderColor: 'divider' }}>
              <TableCell colSpan={2}>
                <Typography variant="h6" fontWeight="bold">
                  Total
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" fontWeight="bold" color="primary.main">
                  {formatCurrency(data.total_debit, currency)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" fontWeight="bold" color="success.main">
                  {formatCurrency(data.total_credit, currency)}
                </Typography>
              </TableCell>
            </TableRow>

            {/* Difference Row (if not balanced) */}
            {!data.is_balanced && (
              <TableRow sx={{ bgcolor: 'error.50' }}>
                <TableCell colSpan={2}>
                  <Typography variant="subtitle2" fontWeight="bold" color="error">
                    Difference
                  </Typography>
                </TableCell>
                <TableCell align="right" colSpan={2}>
                  <Typography variant="subtitle2" fontWeight="bold" color="error">
                    {formatCurrency(Math.abs(data.total_debit - data.total_credit), currency)}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Note:</strong> In single-entry accounting, debits represent increases in assets and expenses,
          while credits represent income and decreases in assets.
        </Typography>
      </Box>
    </Box>
  );
}
