import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Tabs,
  Tab,
  Tooltip,
  Snackbar,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Add, Edit, Delete, People, Warning as WarningIcon } from '@mui/icons-material';
import DashboardLayout from '../layouts/DashboardLayout';
import DialogHeader from '../components/DialogHeader';
import { partnersApi, PartnerCategory, type Partner, type PartnerCreate } from '../services/singleEntryApi';

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'customer' | 'vendor' | 'employee' | 'other'>('all');
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState<PartnerCreate>({
    name: '',
    category: 'customer',
    email: '',
    phone: '',
    address: '',
    tax_id: '',
    registration_number: '',
    contact_person_name: '',
    contact_person_email: '',
    contact_person_mobile: '',
    employee_id: '',
    designation: '',
    department: '',
    nationality: '',
    date_of_birth: '',
    nid_passport_no: '',
    blood_group: '',
    photo_url: '',
    present_address: '',
    permanent_address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    employment_type: '',
    joining_date: '',
    end_date: '',
    description: '',
    is_active: true,
  });

  const [isCompanyType, setIsCompanyType] = useState(true);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      const data = await partnersApi.list();
      setPartners(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (partner?: Partner) => {
    if (partner) {
      setEditingPartner(partner);
      setFormData({
        name: partner.name,
        category: partner.category,
        email: partner.email || '',
        phone: partner.phone || '',
        address: partner.address || '',
        tax_id: partner.tax_id || '',
        registration_number: partner.registration_number || '',
        contact_person_name: partner.contact_person_name || '',
        contact_person_email: partner.contact_person_email || '',
        contact_person_mobile: partner.contact_person_mobile || '',
        employee_id: partner.employee_id || '',
        designation: partner.designation || '',
        department: partner.department || '',
        nationality: partner.nationality || '',
        date_of_birth: partner.date_of_birth || '',
        nid_passport_no: partner.nid_passport_no || '',
        blood_group: partner.blood_group || '',
        photo_url: partner.photo_url || '',
        present_address: partner.present_address || '',
        permanent_address: partner.permanent_address || '',
        emergency_contact_name: partner.emergency_contact_name || '',
        emergency_contact_phone: partner.emergency_contact_phone || '',
        emergency_contact_relationship: partner.emergency_contact_relationship || '',
        employment_type: partner.employment_type || '',
        joining_date: partner.joining_date || '',
        end_date: partner.end_date || '',
        description: partner.description || '',
        is_active: partner.is_active,
      });
      // Check if it's a company based on whether contact person or registration number exists
      const hasCompanyData = !!(partner.contact_person_name || partner.registration_number);
      setIsCompanyType(hasCompanyData);
    } else {
      setEditingPartner(null);
      // Pre-select category based on current tab (default to customer if on 'all' tab)
      const defaultCategory = selectedTab === 'all' ? 'customer' : selectedTab as 'customer' | 'vendor' | 'employee' | 'other';
      setFormData({
        name: '',
        category: defaultCategory,
        email: '',
        phone: '',
        address: '',
        tax_id: '',
        registration_number: '',
        contact_person_name: '',
        contact_person_email: '',
        contact_person_mobile: '',
        employee_id: '',
        designation: '',
        department: '',
        nationality: '',
        date_of_birth: '',
        nid_passport_no: '',
        blood_group: '',
        photo_url: '',
        present_address: '',
        permanent_address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: '',
        employment_type: '',
        joining_date: '',
        end_date: '',
        description: '',
        is_active: true,
      });
      setIsCompanyType(true);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPartner(null);
    setError('');
  };

  const handleSave = async () => {
    try {
      setError('');

      // Clean up form data based on category - create a new object with only relevant fields
      const cleanedData: any = {
        name: formData.name,
        category: formData.category,
        is_active: formData.is_active,
      };

      // Add common optional fields if they have values
      if (formData.email) cleanedData.email = formData.email;
      if (formData.phone) cleanedData.phone = formData.phone;
      if (formData.address) cleanedData.address = formData.address;
      if (formData.tax_id) cleanedData.tax_id = formData.tax_id;
      if (formData.description) cleanedData.description = formData.description;

      if (formData.category === 'customer' || formData.category === 'vendor') {
        // Add company-specific fields if it's a company
        if (isCompanyType) {
          if (formData.registration_number) cleanedData.registration_number = formData.registration_number;
          if (formData.contact_person_name) cleanedData.contact_person_name = formData.contact_person_name;
          if (formData.contact_person_email) cleanedData.contact_person_email = formData.contact_person_email;
          if (formData.contact_person_mobile) cleanedData.contact_person_mobile = formData.contact_person_mobile;
        }
      } else if (formData.category === 'employee') {
        // Add employee-specific fields
        if (formData.employee_id) cleanedData.employee_id = formData.employee_id;
        if (formData.designation) cleanedData.designation = formData.designation;
        if (formData.department) cleanedData.department = formData.department;

        // Personal Details
        if (formData.nationality) cleanedData.nationality = formData.nationality;
        if (formData.date_of_birth) cleanedData.date_of_birth = formData.date_of_birth;
        if (formData.nid_passport_no) cleanedData.nid_passport_no = formData.nid_passport_no;
        if (formData.blood_group) cleanedData.blood_group = formData.blood_group;
        if (formData.photo_url) cleanedData.photo_url = formData.photo_url;

        // Address Details
        if (formData.present_address) cleanedData.present_address = formData.present_address;
        if (formData.permanent_address) cleanedData.permanent_address = formData.permanent_address;

        // Emergency Contact
        if (formData.emergency_contact_name) cleanedData.emergency_contact_name = formData.emergency_contact_name;
        if (formData.emergency_contact_phone) cleanedData.emergency_contact_phone = formData.emergency_contact_phone;
        if (formData.emergency_contact_relationship) cleanedData.emergency_contact_relationship = formData.emergency_contact_relationship;

        // Employment Details
        if (formData.employment_type) cleanedData.employment_type = formData.employment_type;
        if (formData.joining_date) cleanedData.joining_date = formData.joining_date;
        if (formData.end_date) cleanedData.end_date = formData.end_date;
      } else if (formData.category === 'other') {
        // Add registration number for 'other' category if provided
        if (formData.registration_number) cleanedData.registration_number = formData.registration_number;
      }

      if (editingPartner) {
        await partnersApi.update(editingPartner.id, cleanedData);
        setSuccessMessage('Partner updated successfully');
      } else {
        await partnersApi.create(cleanedData);
        setSuccessMessage('Partner added successfully');
      }
      await loadPartners();
      handleCloseDialog();
    } catch (err: any) {
      // Handle FastAPI validation errors
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          // Validation error array
          const errorMsg = detail.map((e: any) => `${e.loc.join('.')}: ${e.msg}`).join(', ');
          setError(errorMsg);
        } else if (typeof detail === 'string') {
          setError(detail);
        } else {
          setError(JSON.stringify(detail));
        }
      } else {
        setError('Failed to save partner');
      }
    }
  };

  const openConfirmDialog = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setConfirmDialogOpen(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setConfirmDialogOpen(false);
    setConfirmAction(null);
  };

  const handleCancelConfirm = () => {
    setConfirmDialogOpen(false);
    setConfirmAction(null);
  };

  const handleDelete = async (id: string) => {
    openConfirmDialog('Are you sure you want to delete this partner?', async () => {
      try {
        setError('');
        await partnersApi.delete(id);
        await loadPartners();
        setSuccessMessage('Partner deleted successfully');
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to delete partner');
      }
    });
  };

  const getCategoryLabel = (category: PartnerCategory): string => {
    const labels: Record<PartnerCategory, string> = {
      [PartnerCategory.CUSTOMER]: 'Customer',
      [PartnerCategory.VENDOR]: 'Vendor',
      [PartnerCategory.EMPLOYEE]: 'Employee',
      [PartnerCategory.OTHER]: 'Other',
    };
    return labels[category];
  };

  const getCategoryColor = (category: PartnerCategory): 'primary' | 'success' | 'warning' | 'info' | 'default' => {
    const colors: Record<PartnerCategory, 'primary' | 'success' | 'warning' | 'info' | 'default'> = {
      [PartnerCategory.CUSTOMER]: 'primary',
      [PartnerCategory.VENDOR]: 'warning',
      [PartnerCategory.EMPLOYEE]: 'success',
      [PartnerCategory.OTHER]: 'default',
    };
    return colors[category];
  };

  // Filter partners based on selected tab
  const filteredPartners = selectedTab === 'all'
    ? partners
    : partners.filter(partner => partner.category === selectedTab);

  // Count partners by category
  const partnerCounts = {
    all: partners.length,
    customer: partners.filter(p => p.category === 'customer').length,
    vendor: partners.filter(p => p.category === 'vendor').length,
    employee: partners.filter(p => p.category === 'employee').length,
    other: partners.filter(p => p.category === 'other').length,
  };

  // Get columns based on selected tab
  const getColumns = () => {
    const baseNameColumn = {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 180,
      renderCell: (params: any) => (
        <Box sx={{ py: 1 }}>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
          {params.row.email && (
            <Typography variant="caption" color="text.secondary" display="block">
              {params.row.email}
            </Typography>
          )}
          {params.row.employee_id && (
            <Typography variant="caption" color="text.secondary" display="block">
              ID: {params.row.employee_id}
            </Typography>
          )}
        </Box>
      ),
    };

    const actionsColumn = {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params: any) => (
        <Box>
          <Tooltip title="Edit" arrow>
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleOpenDialog(params.row)}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete" arrow>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDelete(params.row.id)}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    };

    const statusColumn = {
      field: 'is_active',
      headerName: 'Status',
      width: 110,
      renderCell: (params: any) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          size="small"
          color={params.value ? 'success' : 'default'}
        />
      ),
    };

    // All tab - show category and most relevant fields
    if (selectedTab === 'all') {
      return [
        baseNameColumn,
        {
          field: 'category',
          headerName: 'Category',
          width: 130,
          renderCell: (params: any) => (
            <Chip
              label={getCategoryLabel(params.value)}
              size="small"
              color={getCategoryColor(params.value)}
            />
          ),
        },
        {
          field: 'phone',
          headerName: 'Phone/Mobile',
          width: 150,
          valueGetter: (params: any) => params?.row?.phone || params?.row?.contact_person_mobile || '-',
        },
        {
          field: 'tax_id',
          headerName: 'Tax ID',
          width: 130,
          valueGetter: (params: any) => params?.row?.tax_id || '-',
        },
        statusColumn,
        actionsColumn,
      ];
    }

    // Customer tab - customer-specific fields
    if (selectedTab === 'customer') {
      return [
        baseNameColumn,
        {
          field: 'phone',
          headerName: 'Phone',
          width: 150,
          valueGetter: (params: any) => params?.row?.phone || '-',
        },
        {
          field: 'tax_id',
          headerName: 'Tax ID',
          width: 130,
          valueGetter: (params: any) => params?.row?.tax_id || '-',
        },
        {
          field: 'address',
          headerName: 'Address',
          flex: 1,
          minWidth: 180,
          valueGetter: (params: any) => params?.row?.address || '-',
        },
        statusColumn,
        actionsColumn,
      ];
    }

    // Vendor tab - vendor-specific fields
    if (selectedTab === 'vendor') {
      return [
        baseNameColumn,
        {
          field: 'contact_person',
          headerName: 'Contact Person',
          width: 150,
          valueGetter: (params: any) => params?.row?.contact_person || '-',
        },
        {
          field: 'contact_person_mobile',
          headerName: 'Contact Mobile',
          width: 150,
          valueGetter: (params: any) => params?.row?.contact_person_mobile || '-',
        },
        {
          field: 'tax_id',
          headerName: 'Tax ID',
          width: 130,
          valueGetter: (params: any) => params?.row?.tax_id || '-',
        },
        statusColumn,
        actionsColumn,
      ];
    }

    // Employee tab - employee-specific fields
    if (selectedTab === 'employee') {
      return [
        baseNameColumn,
        {
          field: 'employee_id',
          headerName: 'Employee ID',
          width: 130,
          valueGetter: (params: any) => params?.row?.employee_id || '-',
        },
        {
          field: 'designation',
          headerName: 'Designation',
          width: 150,
          valueGetter: (params: any) => params?.row?.designation || '-',
        },
        {
          field: 'phone',
          headerName: 'Mobile',
          width: 150,
          valueGetter: (params: any) => params?.row?.phone || '-',
        },
        statusColumn,
        actionsColumn,
      ];
    }

    // Other tab - basic fields
    return [
      baseNameColumn,
      {
        field: 'phone',
        headerName: 'Phone',
        width: 150,
        valueGetter: (params: any) => params?.row?.phone || '-',
      },
      {
        field: 'address',
        headerName: 'Address',
        flex: 1,
        minWidth: 180,
        valueGetter: (params: any) => params?.row?.address || '-',
      },
      statusColumn,
      actionsColumn,
    ];
  };

  const renderFormFields = () => {
    const isCustomerOrVendor = formData.category === 'customer' || formData.category === 'vendor';
    const isEmployee = formData.category === 'employee';
    const isOther = formData.category === 'other';

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Category Selection - First */}
        <FormControl fullWidth required>
          <InputLabel>Category</InputLabel>
          <Select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as 'customer' | 'vendor' | 'employee' | 'other' })}
            label="Category"
          >
            <MenuItem value="customer">Customer</MenuItem>
            <MenuItem value="vendor">Vendor</MenuItem>
            <MenuItem value="employee">Employee</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </Select>
        </FormControl>

        {/* Company Type Checkbox for Customer/Vendor */}
        {isCustomerOrVendor && (
          <FormControlLabel
            control={
              <Checkbox
                checked={isCompanyType}
                onChange={(e) => setIsCompanyType(e.target.checked)}
              />
            }
            label="Is Company?"
          />
        )}

        {/* Name Field - Only for non-employee categories */}
        {!isEmployee && (
          <TextField
            label={(isCustomerOrVendor && isCompanyType) ? 'Company Name' : 'Name'}
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        )}

        {/* Customer/Vendor - Individual Fields */}
        {isCustomerOrVendor && !isCompanyType && (
          <>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <TextField
                label="Phone"
                fullWidth
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Box>

            <TextField
              label="Address"
              fullWidth
              multiline
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />

            <TextField
              label="Tax ID (Optional)"
              fullWidth
              value={formData.tax_id}
              onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.is_active ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </>
        )}

        {/* Customer/Vendor - Company Fields */}
        {isCustomerOrVendor && isCompanyType && (
          <>
            <TextField
              label="Address"
              fullWidth
              multiline
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <TextField
                label="Phone"
                fullWidth
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Tax ID / VAT Number"
                fullWidth
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              />
              <TextField
                label="Registration Number"
                fullWidth
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              />
            </Box>

            <Typography variant="subtitle2" color="primary" fontWeight="medium" sx={{ mt: 1 }}>
              Contact Person
            </Typography>

            <TextField
              label="Contact Person Name"
              fullWidth
              value={formData.contact_person_name}
              onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Contact Person Email"
                type="email"
                fullWidth
                value={formData.contact_person_email}
                onChange={(e) => setFormData({ ...formData, contact_person_email: e.target.value })}
              />
              <TextField
                label="Contact Person Mobile"
                fullWidth
                value={formData.contact_person_mobile}
                onChange={(e) => setFormData({ ...formData, contact_person_mobile: e.target.value })}
              />
            </Box>

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.is_active ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </>
        )}

        {/* Employee Fields - Organized in Categories */}
        {isEmployee && (
          <>
            {/* Personal Details Section */}
            <Typography variant="h6" sx={{ mt: 2, mb: 1, color: 'primary.main' }}>
              Personal Details
            </Typography>
            <TextField
              label="Employee Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <TextField
                label="Phone Number"
                fullWidth
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Nationality"
                fullWidth
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              />
              <TextField
                label="Date of Birth (YYYY-MM-DD)"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                inputProps={{ placeholder: 'YYYY-MM-DD' }}
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                helperText="International format: YYYY-MM-DD (e.g., 1990-12-31)"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="NID/Passport No."
                fullWidth
                value={formData.nid_passport_no}
                onChange={(e) => setFormData({ ...formData, nid_passport_no: e.target.value })}
              />
              <FormControl fullWidth>
                <InputLabel>Blood Group</InputLabel>
                <Select
                  value={formData.blood_group}
                  onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                  label="Blood Group"
                >
                  <MenuItem value="">-</MenuItem>
                  <MenuItem value="A+">A+</MenuItem>
                  <MenuItem value="A-">A-</MenuItem>
                  <MenuItem value="B+">B+</MenuItem>
                  <MenuItem value="B-">B-</MenuItem>
                  <MenuItem value="O+">O+</MenuItem>
                  <MenuItem value="O-">O-</MenuItem>
                  <MenuItem value="AB+">AB+</MenuItem>
                  <MenuItem value="AB-">AB-</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Photo Upload */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Photo (Max 2MB, JPG/PNG only)
              </Typography>
              <TextField
                label="Photo URL"
                fullWidth
                value={formData.photo_url}
                onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                helperText="Enter photo URL or upload using file upload service"
              />
            </Box>

            {/* Address Details Section */}
            <Typography variant="h6" sx={{ mt: 3, mb: 1, color: 'primary.main' }}>
              Address Details
            </Typography>
            <TextField
              label="Present Address"
              fullWidth
              multiline
              rows={2}
              value={formData.present_address}
              onChange={(e) => setFormData({ ...formData, present_address: e.target.value })}
            />
            <TextField
              label="Permanent Address"
              fullWidth
              multiline
              rows={2}
              value={formData.permanent_address}
              onChange={(e) => setFormData({ ...formData, permanent_address: e.target.value })}
            />

            {/* Emergency Contact Section */}
            <Typography variant="h6" sx={{ mt: 3, mb: 1, color: 'primary.main' }}>
              Emergency Contact
            </Typography>
            <TextField
              label="Contact Name"
              fullWidth
              value={formData.emergency_contact_name}
              onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Contact Phone"
                fullWidth
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
              />
              <TextField
                label="Relationship"
                fullWidth
                value={formData.emergency_contact_relationship}
                onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
              />
            </Box>

            {/* Employment Details Section */}
            <Typography variant="h6" sx={{ mt: 3, mb: 1, color: 'primary.main' }}>
              Employment Details
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Employee ID"
                fullWidth
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              />
              <TextField
                label="Designation"
                fullWidth
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Department"
                fullWidth
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
              <FormControl fullWidth>
                <InputLabel>Employment Type</InputLabel>
                <Select
                  value={formData.employment_type}
                  onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                  label="Employment Type"
                >
                  <MenuItem value="">-</MenuItem>
                  <MenuItem value="Full-time">Full-time</MenuItem>
                  <MenuItem value="Part-time">Part-time</MenuItem>
                  <MenuItem value="Contract">Contract</MenuItem>
                  <MenuItem value="Intern">Intern</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start Date (YYYY-MM-DD)"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                inputProps={{ placeholder: 'YYYY-MM-DD' }}
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                helperText="International format: YYYY-MM-DD (e.g., 2024-01-15)"
              />
              <TextField
                label="End Date (YYYY-MM-DD)"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                inputProps={{ placeholder: 'YYYY-MM-DD' }}
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                helperText="International format: YYYY-MM-DD (if applicable)"
              />
            </Box>

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.is_active ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </>
        )}

        {/* Other Category Fields */}
        {isOther && (
          <>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <TextField
                label="Phone"
                fullWidth
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Tax ID / VAT Number"
                fullWidth
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              />
              <TextField
                label="Registration Number"
                fullWidth
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              />
            </Box>

            <TextField
              label="Address"
              fullWidth
              multiline
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.is_active ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </>
        )}
      </Box>
    );
  };

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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Partners
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your customers, vendors, employees, and other business partners
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Partner
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Tabs for partner categories */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={selectedTab}
          onChange={(_, newValue) => setSelectedTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={`All (${partnerCounts.all})`} value="all" />
          <Tab label={`Customers (${partnerCounts.customer})`} value="customer" />
          <Tab label={`Vendors (${partnerCounts.vendor})`} value="vendor" />
          <Tab label={`Employees (${partnerCounts.employee})`} value="employee" />
          <Tab label={`Others (${partnerCounts.other})`} value="other" />
        </Tabs>
      </Box>

      <Card>
        <CardContent>
          {filteredPartners.length === 0 ? (
            <Box py={8} textAlign="center">
              <People sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {selectedTab === 'all' ? 'No partners yet' : `No ${selectedTab}s yet`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click "Add Partner" to create your first {selectedTab === 'all' ? 'business partner' : selectedTab}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={filteredPartners}
                columns={getColumns()}
                slots={{
                  toolbar: GridToolbar,
                }}
                slotProps={{
                  toolbar: {
                    showQuickFilter: true,
                    quickFilterProps: { debounceMs: 500 },
                  },
                }}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 10 },
                  },
                }}
                pageSizeOptions={[5, 10, 25, 50]}
                disableRowSelectionOnClick
                getRowHeight={() => 'auto'}
                sx={{
                  '& .MuiDataGrid-columnHeader': {
                    backgroundColor: 'background.default',
                  },
                  '& .MuiDataGrid-cell': {
                    display: 'flex',
                    alignItems: 'center',
                    borderColor: 'divider',
                  },
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogHeader title={editingPartner ? 'Edit Partner' : 'Add Partner'} onClose={handleCloseDialog} />
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box mt={1}>
            {renderFormFields()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.name}
          >
            {editingPartner ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={handleCancelConfirm} maxWidth="xs" fullWidth>
        <DialogHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <WarningIcon color="warning" />
              <Typography variant="h6">Confirm Action</Typography>
            </Box>
          }
          onClose={handleCancelConfirm}
        />
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>{confirmMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCancelConfirm} variant="outlined">Cancel</Button>
          <Button onClick={handleConfirm} variant="contained" color="error" autoFocus>Confirm</Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccessMessage('')} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
