import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Button,
  Chip,
} from '@mui/material';
import { Print, Download, Refresh } from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import { useYearStore } from '../store/yearStore';
import { reportsApi } from '../services/reportsApi';
import CashFlowReport from '../components/reports/CashFlowReport';
import TrialBalanceReport from '../components/reports/TrialBalanceReport';
import IncomeStatementReport from '../components/reports/IncomeStatementReport';
import BalanceSheetReport from '../components/reports/BalanceSheetReport';
import type {
  CashFlowStatement,
  TrialBalance,
  IncomeStatement,
  BalanceSheet,
} from '../types';

type ReportType = 'cash-flow' | 'trial-balance' | 'income-statement' | 'balance-sheet';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ReportsPage() {
  const { selectedYear, initializeYear } = useYearStore();

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Report data states
  const [cashFlowData, setCashFlowData] = useState<CashFlowStatement | null>(null);
  const [trialBalanceData, setTrialBalanceData] = useState<TrialBalance | null>(null);
  const [incomeStatementData, setIncomeStatementData] = useState<IncomeStatement | null>(null);
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheet | null>(null);

  useEffect(() => {
    initializeYear();
  }, [initializeYear]);

  useEffect(() => {
    if (selectedYear) {
      loadReport(getReportTypeFromTab(activeTab));
    }
  }, [selectedYear, activeTab]);

  const getReportTypeFromTab = (tabIndex: number): ReportType => {
    switch (tabIndex) {
      case 0: return 'cash-flow';
      case 1: return 'trial-balance';
      case 2: return 'income-statement';
      case 3: return 'balance-sheet';
      default: return 'cash-flow';
    }
  };

  const loadReport = async (reportType: ReportType) => {
    if (!selectedYear) {
      setError('Please select a financial year');
      return;
    }

    setLoading(true);
    setError('');

    try {
      switch (reportType) {
        case 'cash-flow':
          if (!cashFlowData) {
            const data = await reportsApi.getCashFlowStatement(selectedYear.id);
            setCashFlowData(data);
          }
          break;
        case 'trial-balance':
          if (!trialBalanceData) {
            const data = await reportsApi.getTrialBalance(selectedYear.id);
            setTrialBalanceData(data);
          }
          break;
        case 'income-statement':
          if (!incomeStatementData) {
            const data = await reportsApi.getIncomeStatement(selectedYear.id);
            setIncomeStatementData(data);
          }
          break;
        case 'balance-sheet':
          if (!balanceSheetData) {
            const data = await reportsApi.getBalanceSheet(selectedYear.id);
            setBalanceSheetData(data);
          }
          break;
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to load ${reportType} report`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    const reportType = getReportTypeFromTab(activeTab);

    // Clear cached data for current report
    switch (reportType) {
      case 'cash-flow':
        setCashFlowData(null);
        break;
      case 'trial-balance':
        setTrialBalanceData(null);
        break;
      case 'income-statement':
        setIncomeStatementData(null);
        break;
      case 'balance-sheet':
        setBalanceSheetData(null);
        break;
    }

    // Reload
    loadReport(reportType);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // TODO: Implement export functionality (CSV/PDF)
    alert('Export functionality coming soon!');
  };

  if (!selectedYear) {
    return (
      <DashboardLayout>
        <Alert severity="warning">
          Please select a financial year to view reports.
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Financial Reports
          </Typography>
          <Box display="flex" alignItems="center" gap={1} mt={0.5}>
            <Typography variant="body2" color="text.secondary">
              {selectedYear.year_name}
            </Typography>
            {selectedYear.is_current && (
              <Chip label="Current Year" size="small" color="primary" />
            )}
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={handlePrint}
            className="no-print"
          >
            Print
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            className="no-print"
          >
            Export
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
            sx={{ bgcolor: 'grey.50' }}
          >
            <Tab label="Cash Flow Statement" />
            <Tab label="Trial Balance" />
            <Tab label="Income Statement" />
            <Tab label="Balance Sheet" />
          </Tabs>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TabPanel value={activeTab} index={0}>
              {cashFlowData ? (
                <CashFlowReport data={cashFlowData} />
              ) : (
                <Alert severity="info">Loading Cash Flow Statement...</Alert>
              )}
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              {trialBalanceData ? (
                <TrialBalanceReport data={trialBalanceData} />
              ) : (
                <Alert severity="info">Loading Trial Balance...</Alert>
              )}
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              {incomeStatementData ? (
                <IncomeStatementReport data={incomeStatementData} />
              ) : (
                <Alert severity="info">Loading Income Statement...</Alert>
              )}
            </TabPanel>

            <TabPanel value={activeTab} index={3}>
              {balanceSheetData ? (
                <BalanceSheetReport data={balanceSheetData} />
              ) : (
                <Alert severity="info">Loading Balance Sheet...</Alert>
              )}
            </TabPanel>
          </>
        )}
      </Card>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
