import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Collapse,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  AttachMoney as MoneyIcon,
  AccountBalance as AccountIcon,
  Assessment as ReportIcon,
  Settings as SettingsIcon,
  Receipt as ReceiptIcon,
  Category as CategoryIcon,
  People as PeopleIcon,
  Logout as LogoutIcon,
  AccountCircle,
  History as HistoryIcon,
  Group as GroupIcon,
  CalendarToday as CalendarIcon,
  Description as InvoiceIcon,
  Repeat as RecurringIcon,
  Inventory as ProductsIcon,
  Label as ProductCategoryIcon,
  Warehouse as WarehouseIcon,
  Build as AdjustmentIcon,
  SwapHoriz as MovementIcon,
  ExpandLess,
  ExpandMore,
  Receipt as TransactionIcon,
  Storage as MasterDataIcon,
  BusinessCenter as BusinessIcon,
  AdminPanelSettings as AdminIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { AccountingType } from '../types';
import YearSelector from '../components/YearSelector';
import DialogHeader from '../components/DialogHeader';

const DRAWER_WIDTH = 260;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface MenuGroup {
  text: string;
  icon: React.ReactNode;
  children: MenuItem[];
}

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  adminOnly?: boolean;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, tenant, logout } = useAuthStore();

  const isSingleEntry = tenant?.accounting_type === AccountingType.SINGLE;

  // Check if a path is active
  const isPathActive = (path: string) => location.pathname === path;

  const handleMenuToggle = (menuKey: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = () => {
    handleMenuClose();
    setLogoutDialogOpen(true);
  };

  const handleLogoutCancel = () => {
    setLogoutDialogOpen(false);
  };

  const handleLogoutConfirm = async () => {
    setLogoutDialogOpen(false);
    await logout();
    navigate('/login');
  };

  // Organized menu structure for Single Entry
  const singleEntryMenuGroups: (MenuItem | MenuGroup)[] = useMemo(() => [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    {
      text: 'Master Data',
      icon: <MasterDataIcon />,
      children: [
        { text: 'Accounts', icon: <AccountIcon />, path: '/accounts' },
        { text: 'Categories', icon: <CategoryIcon />, path: '/categories' },
        { text: 'Partners', icon: <PeopleIcon />, path: '/partners' },
      ],
    },
    {
      text: 'Transactions',
      icon: <TransactionIcon />,
      children: [
        { text: 'Income', icon: <MoneyIcon color="success" />, path: '/income' },
        { text: 'Expenses', icon: <MoneyIcon color="error" />, path: '/expenses' },
      ],
    },
    {
      text: 'Billing',
      icon: <BusinessIcon />,
      children: [
        { text: 'Invoices', icon: <InvoiceIcon />, path: '/invoices' },
        { text: 'Recurring Invoices', icon: <RecurringIcon />, path: '/recurring-invoices' },
      ],
    },
    {
      text: 'Reports',
      icon: <ReportIcon />,
      children: [
        { text: 'Financial Reports', icon: <ReportIcon />, path: '/reports' },
        { text: 'Activity Report', icon: <HistoryIcon />, path: '/activity-report' },
      ],
    },
    {
      text: 'Inventory',
      icon: <ProductsIcon />,
      children: [
        { text: 'Products/Services', icon: <ProductsIcon />, path: '/products' },
        { text: 'Product Categories', icon: <ProductCategoryIcon />, path: '/product-categories' },
        { text: 'Warehouses', icon: <WarehouseIcon />, path: '/warehouses' },
        { text: 'Stock Adjustments', icon: <AdjustmentIcon />, path: '/stock-adjustments' },
        { text: 'Stock Movements', icon: <MovementIcon />, path: '/stock-movements' },
      ],
    },
    {
      text: 'Administration',
      icon: <AdminIcon />,
      children: [
        { text: 'Financial Years', icon: <CalendarIcon />, path: '/financial-years', adminOnly: true },
        { text: 'Users', icon: <GroupIcon />, path: '/users', adminOnly: true },
        { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
      ],
    },
  ], []);

  // Organized menu structure for Double Entry
  const doubleEntryMenuGroups: (MenuItem | MenuGroup)[] = useMemo(() => [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Vouchers', icon: <ReceiptIcon />, path: '/vouchers' },
    { text: 'Chart of Accounts', icon: <AccountIcon />, path: '/accounts' },
    {
      text: 'Reports',
      icon: <ReportIcon />,
      children: [
        { text: 'Financial Reports', icon: <ReportIcon />, path: '/reports' },
        { text: 'Activity Report', icon: <HistoryIcon />, path: '/activity-report' },
      ],
    },
    {
      text: 'Administration',
      icon: <AdminIcon />,
      children: [
        { text: 'Financial Years', icon: <CalendarIcon />, path: '/financial-years', adminOnly: true },
        { text: 'Users', icon: <GroupIcon />, path: '/users', adminOnly: true },
        { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
      ],
    },
  ], []);

  const menuGroups = isSingleEntry ? singleEntryMenuGroups : doubleEntryMenuGroups;

  // Helper function to get initial open menus based on current route
  const getInitialOpenMenus = () => {
    const initialMenus: Record<string, boolean> = {};
    menuGroups.forEach((group) => {
      if ('children' in group) {
        const menuKey = group.text.toLowerCase().replace(/\s+/g, '');
        const hasActiveChild = group.children.some((child) => child.path === location.pathname);
        if (hasActiveChild) {
          initialMenus[menuKey] = true;
        }
      }
    });
    return initialMenus;
  };

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(getInitialOpenMenus);
  const prevAccountingType = useRef(isSingleEntry);

  // Only reset menus when accounting type actually changes
  useEffect(() => {
    if (prevAccountingType.current !== isSingleEntry) {
      prevAccountingType.current = isSingleEntry;
      setOpenMenus(getInitialOpenMenus());
    }
  }, [isSingleEntry, menuGroups, location.pathname]);

  const renderMenuItem = (item: MenuItem) => {
    if (item.adminOnly && user?.role !== 'admin') return null;

    const isActive = isPathActive(item.path);

    return (
      <ListItemButton
        key={item.path}
        onClick={() => navigate(item.path)}
        sx={{
          pl: 4,
          bgcolor: isActive ? 'primary.main' : 'transparent',
          color: isActive ? 'white' : 'inherit',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            bgcolor: isActive ? 'primary.dark' : 'action.hover',
            transform: isActive ? 'none' : 'translateX(4px)',
          },
        }}
      >
        <Box sx={{ minWidth: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography
            variant="body2"
            sx={{
              color: isActive ? 'white' : 'text.secondary',
              transition: 'color 0.2s ease-in-out',
            }}
          >
            —
          </Typography>
        </Box>
        <ListItemText
          primary={item.text}
          slotProps={{
            primary: {
              variant: 'body2',
            },
          }}
        />
      </ListItemButton>
    );
  };

  const renderMenuGroup = (group: MenuItem | MenuGroup) => {
    // Check if it's a MenuItem (has path property)
    if ('path' in group) {
      if (group.adminOnly && user?.role !== 'admin') return null;

      const isActive = isPathActive(group.path);

      return (
        <ListItem key={group.path} disablePadding>
          <ListItemButton
            onClick={() => navigate(group.path)}
            sx={{
              bgcolor: isActive ? 'primary.main' : 'transparent',
              color: isActive ? 'white' : 'inherit',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                bgcolor: isActive ? 'primary.dark' : 'action.hover',
                transform: isActive ? 'none' : 'translateX(4px)',
              },
              '& .MuiListItemIcon-root': {
                color: isActive ? 'white' : 'inherit',
                transition: 'all 0.2s ease-in-out',
              },
            }}
          >
            <ListItemIcon>{group.icon}</ListItemIcon>
            <ListItemText primary={group.text} />
          </ListItemButton>
        </ListItem>
      );
    }

    // It's a MenuGroup
    const menuKey = group.text.toLowerCase().replace(/\s+/g, '');
    const hasVisibleChildren = group.children.some(
      (child) => !child.adminOnly || user?.role === 'admin'
    );

    if (!hasVisibleChildren) return null;

    // Check if any child is active
    const hasActiveChild = group.children.some((child) => isPathActive(child.path));

    return (
      <Box key={menuKey}>
        <ListItemButton
          onClick={() => handleMenuToggle(menuKey)}
          sx={{
            bgcolor: hasActiveChild && !openMenus[menuKey] ? 'action.selected' : 'transparent',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              bgcolor: 'action.hover',
              transform: 'translateX(2px)',
            },
            '& .MuiListItemIcon-root': {
              transition: 'transform 0.2s ease-in-out',
            },
            '&:hover .MuiListItemIcon-root': {
              transform: 'scale(1.1)',
            },
          }}
        >
          <ListItemIcon>{group.icon}</ListItemIcon>
          <ListItemText primary={group.text} />
          {openMenus[menuKey] ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={openMenus[menuKey]} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {group.children.map(renderMenuItem)}
          </List>
        </Collapse>
      </Box>
    );
  };

  const drawer = (
    <Box>
      <Toolbar sx={{ bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" noWrap component="div">
          {isSingleEntry ? '📗 LedgerPro' : '📘 LedgerPro'}
        </Typography>
      </Toolbar>
      <Divider />

      {/* Company Info */}
      <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Typography variant="caption" color="text.secondary">
          {isSingleEntry ? 'Single Entry' : 'Double Entry'}
        </Typography>
        <Typography variant="subtitle2" fontWeight="bold">
          {tenant?.company_name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Currency: {tenant?.currency || 'USD'}
        </Typography>
      </Box>

      <Divider />

      <List sx={{ py: 1 }}>
        {menuGroups.map((group) => renderMenuGroup(group))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div">
            {tenant?.company_name}
          </Typography>

          {/* Year Selector */}
          {isSingleEntry && (
            <Box sx={{ ml: 3 }}>
              <YearSelector />
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* User Menu */}
          <IconButton
            onClick={handleMenuOpen}
            size="small"
            sx={{ ml: 2 }}
            aria-controls={Boolean(anchorEl) ? 'account-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            id="account-menu"
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2">{user?.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => navigate('/profile')}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={() => navigate('/settings')}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogoutClick}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        {children}
      </Box>

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onClose={handleLogoutCancel} maxWidth="xs" fullWidth>
        <DialogHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <WarningIcon color="warning" />
              <Typography variant="h6">Confirm Logout</Typography>
            </Box>
          }
          onClose={handleLogoutCancel}
        />
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Are you sure you want to logout?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleLogoutCancel} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleLogoutConfirm} variant="contained" color="error" autoFocus>
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
