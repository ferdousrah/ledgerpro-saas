import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Container, Box, Card, CardContent, TextField, Button, Typography, Alert, CircularProgress, Link, Stepper, Step, StepLabel, FormControl, InputLabel, Select, MenuItem, Grid, Chip } from '@mui/material';
import { useAuthStore } from '../store/authStore';
import { AccountingType, SubscriptionPlan } from '../types';

const steps = ['Type', 'Company', 'Admin', 'Preferences', 'Plan', 'Review'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    accounting_type: '' as AccountingType | '',
    company_name: '',
    company_email: '',
    phone: '',
    admin_name: '',
    admin_email: '',
    password: '',
    confirmPassword: '',
    currency: 'USD',
    fiscal_year_start: new Date().toISOString().split('T')[0],
    timezone: 'UTC',
    plan: '' as SubscriptionPlan | '',
  });

  const handleNext = () => {
    setError('');
    if (activeStep === 0 && !formData.accounting_type) { setError('Please select accounting type'); return; }
    if (activeStep === 1 && (!formData.company_name || !formData.company_email)) { setError('Please fill required fields'); return; }
    if (activeStep === 2) {
      if (!formData.admin_name || !formData.admin_email || !formData.password) { setError('Please fill required fields'); return; }
      if (formData.password.length < 8) { setError('Password must be at least 8 characters'); return; }
      if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    }
    if (activeStep === 4 && !formData.plan) { setError('Please select a plan'); return; }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSubmit = async () => {
    setError('');
    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  const singlePlans = [
    { value: SubscriptionPlan.FREE, label: 'Free', price: '$0/mo' },
    { value: SubscriptionPlan.BASIC, label: 'Basic', price: '$5/mo' },
    { value: SubscriptionPlan.PRO, label: 'Pro', price: '$12/mo' },
  ];
  const doublePlans = [
    { value: SubscriptionPlan.STARTER, label: 'Starter', price: '$15/mo' },
    { value: SubscriptionPlan.BUSINESS, label: 'Business', price: '$35/mo' },
    { value: SubscriptionPlan.ENTERPRISE, label: 'Enterprise', price: '$75/mo' },
  ];
  const plans = formData.accounting_type === AccountingType.SINGLE ? singlePlans : doublePlans;

  return (
    <Box sx={{ minHeight: '100vh', py: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Container maxWidth="md">
        <Card elevation={8}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>🧾 CloudFin SaaS</Typography>
            <Typography variant="body2" color="text.secondary" align="center" mb={4}>Create your account</Typography>

            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (<Step key={label}><StepLabel>{label}</StepLabel></Step>))}
            </Stepper>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {activeStep === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card variant="outlined" sx={{ p: 2, cursor: 'pointer', border: formData.accounting_type === AccountingType.SINGLE ? 2 : 1, borderColor: formData.accounting_type === AccountingType.SINGLE ? 'success.main' : 'divider' }} onClick={() => setFormData({ ...formData, accounting_type: AccountingType.SINGLE })}>
                    <Typography variant="h5" mb={1}>📗 Single Entry</Typography>
                    <Typography variant="body2" color="text.secondary">Simple income/expense tracking</Typography>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined" sx={{ p: 2, cursor: 'pointer', border: formData.accounting_type === AccountingType.DOUBLE ? 2 : 1, borderColor: formData.accounting_type === AccountingType.DOUBLE ? 'primary.main' : 'divider' }} onClick={() => setFormData({ ...formData, accounting_type: AccountingType.DOUBLE })}>
                    <Typography variant="h5" mb={1}>📘 Double Entry</Typography>
                    <Typography variant="body2" color="text.secondary">Professional accounting system</Typography>
                  </Card>
                </Grid>
              </Grid>
            )}

            {activeStep === 1 && (
              <Box>
                <TextField label="Company Name *" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} fullWidth margin="normal" />
                <TextField label="Company Email *" type="email" value={formData.company_email} onChange={(e) => setFormData({ ...formData, company_email: e.target.value })} fullWidth margin="normal" />
                <TextField label="Phone (Optional)" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} fullWidth margin="normal" />
              </Box>
            )}

            {activeStep === 2 && (
              <Box>
                <TextField label="Your Name *" value={formData.admin_name} onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })} fullWidth margin="normal" />
                <TextField label="Your Email *" type="email" value={formData.admin_email} onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })} fullWidth margin="normal" />
                <TextField label="Password *" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} fullWidth margin="normal" helperText="At least 8 characters" />
                <TextField label="Confirm Password *" type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} fullWidth margin="normal" />
              </Box>
            )}

            {activeStep === 3 && (
              <Box>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Currency</InputLabel>
                  <Select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} label="Currency">
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                    <MenuItem value="GBP">GBP</MenuItem>
                  </Select>
                </FormControl>
                <TextField label="Fiscal Year Start" type="date" value={formData.fiscal_year_start} onChange={(e) => setFormData({ ...formData, fiscal_year_start: e.target.value })} fullWidth margin="normal" InputLabelProps={{ shrink: true }} />
              </Box>
            )}

            {activeStep === 4 && (
              <Grid container spacing={2}>
                {plans.map((plan) => (
                  <Grid item xs={4} key={plan.value}>
                    <Card variant="outlined" sx={{ p: 2, cursor: 'pointer', border: formData.plan === plan.value ? 2 : 1, borderColor: formData.plan === plan.value ? 'primary.main' : 'divider' }} onClick={() => setFormData({ ...formData, plan: plan.value })}>
                      <Typography variant="h6">{plan.label}</Typography>
                      <Typography variant="h5" color="primary" fontWeight="bold">{plan.price}</Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {activeStep === 5 && (
              <Box>
                <Typography variant="h6" gutterBottom>Review & Confirm</Typography>
                <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2"><strong>Type:</strong> {formData.accounting_type === AccountingType.SINGLE ? 'Single Entry' : 'Double Entry'}</Typography>
                  <Typography variant="body2"><strong>Company:</strong> {formData.company_name}</Typography>
                  <Typography variant="body2"><strong>Admin:</strong> {formData.admin_name}</Typography>
                  <Typography variant="body2"><strong>Plan:</strong> {plans.find(p => p.value === formData.plan)?.label}</Typography>
                </Box>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button onClick={handleBack} disabled={activeStep === 0}>Back</Button>
              {activeStep < steps.length - 1 ? (
                <Button variant="contained" onClick={handleNext}>Next</Button>
              ) : (
                <Button variant="contained" color="success" onClick={handleSubmit} disabled={isLoading} startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}>
                  {isLoading ? 'Creating...' : 'Create Account'}
                </Button>
              )}
            </Box>

            {activeStep === 0 && (
              <Box textAlign="center" mt={3}>
                <Typography variant="body2" color="text.secondary">Already have an account? <Link component={RouterLink} to="/login" underline="hover">Sign in</Link></Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
