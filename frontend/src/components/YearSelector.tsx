import { useEffect } from 'react';
import { FormControl, Select, MenuItem, Chip, Box, CircularProgress } from '@mui/material';
import { useYearStore } from '../store/yearStore';
import { FinancialYearStatus } from '../types';

export default function YearSelector() {
  const { selectedYear, years, isLoading, fetchYears, setSelectedYear } = useYearStore();

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  const handleYearChange = (yearId: string) => {
    const year = years.find(y => y.id === yearId);
    if (year) {
      setSelectedYear(year);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" sx={{ minWidth: 200 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (!years.length) {
    return null;
  }

  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <Select
        value={selectedYear?.id || ''}
        onChange={(e) => handleYearChange(e.target.value)}
        displayEmpty
        sx={{
          bgcolor: 'background.paper',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'divider',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main',
          },
        }}
      >
        {years.map((year) => (
          <MenuItem key={year.id} value={year.id}>
            <Box display="flex" alignItems="center" gap={1} width="100%">
              <span>{year.year_name}</span>
              <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
                {year.is_current && (
                  <Chip
                    label="Current"
                    size="small"
                    color="primary"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )}
                {year.status === FinancialYearStatus.CLOSED && (
                  <Chip
                    label="Closed"
                    size="small"
                    color="default"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )}
                {year.status === FinancialYearStatus.OPEN && !year.is_current && (
                  <Chip
                    label="Open"
                    size="small"
                    color="success"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
