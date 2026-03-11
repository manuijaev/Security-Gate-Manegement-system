import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
  ThemeProvider,
  createTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import DeleteIcon from '@mui/icons-material/Delete';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import EditIcon from '@mui/icons-material/Edit';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import GroupIcon from '@mui/icons-material/Group';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LogoutIcon from '@mui/icons-material/Logout';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import SummarizeIcon from '@mui/icons-material/Summarize';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import LightModeIcon from '@mui/icons-material/LightMode';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ShieldIcon from '@mui/icons-material/Shield';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import {
  changePassword,
  createDelivery,
  createDepartment,
  createGuard,
  createStaff,
  createRepossessedVehicle,
  createVehicleEntry,
  createVisitor,
  createYardExit,
  deleteDepartment,
  deleteGuard,
  deleteStaff,
  deleteMovement,
  getAdminDepartments,
  getAdminStaff,
  getAnalytics,
  getCurrentUser,
  getDepartments,
  getGuardNotifications,
  getGuards,
  getMovements,
  getStaff,
  getSummary,
  getToken,
  login,
  logout,
  markExit,
  setToken,
  updateDepartment,
  updateGuard,
  updateStaff
} from './lib/api';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const guardDrawerWidth = 280;

function formatEatTimestamp(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date(value));
}

function formatDurationCompact(ms) {
  if (!ms || ms < 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function getReportColumns(includeDocuments = false) {
  const base = [
    { key: 'id', label: 'ID' },
    { key: 'type', label: 'Type' },
    { key: 'subject', label: 'Subject' },
    { key: includeDocuments ? 'personVisited' : 'destination', label: includeDocuments ? 'Person Visited' : 'Department' },
    { key: 'timeIn', label: 'Clock In (EAT)' },
    { key: 'timeOut', label: 'Clock Out (EAT)' },
    { key: 'status', label: 'Status' }
  ];
  if (!includeDocuments) return base;
  return [
    ...base,
    { key: 'idNumber', label: 'ID Number' },
    { key: 'vehicleRegistration', label: 'Vehicle Reg' },
    { key: 'notes', label: 'Notes' }
  ];
}

function mapReportRow(row, includeDocuments = false) {
  return {
    id: row.id ?? '-',
    type: row.type ?? '-',
    subject: row.subject ?? '-',
    destination: row.destination ?? '-',
    personVisited: row.personToSee ?? '-',
    timeIn: formatEatTimestamp(row.timeIn),
    timeOut: formatEatTimestamp(row.timeOut),
    status: row.status ?? '-',
    idNumber: row.idNumber ?? '-',
    vehicleRegistration: row.vehicleRegistration ?? '-',
    notes: row.notes ?? '-'
  };
}

function exportRowsAsCsv(rows, fileName, includeDocuments = false) {
  if (!rows.length) return false;
  const columns = getReportColumns(includeDocuments);
  const csvRows = rows.map((row) => mapReportRow(row, includeDocuments));
  const headers = columns.map((column) => column.label);
  const body = csvRows.map((record) => columns.map((column) => record[column.key]));
  const csv = [headers, ...body]
    .map((line) => line.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
  return true;
}

async function exportRowsAsExcel(rows, fileName, includeDocuments = false) {
  if (!rows.length) return false;
  const columns = getReportColumns(includeDocuments);
  const excelRows = rows.map((row) => {
    const mapped = mapReportRow(row, includeDocuments);
    const result = {};
    columns.forEach((column) => {
      result[column.label] = mapped[column.key];
    });
    return result;
  });
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reports');
  worksheet.columns = columns.map((column) => ({
    header: column.label,
    key: column.label,
    width: 24
  }));
  excelRows.forEach((row) => {
    worksheet.addRow(row);
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
  return true;
}

function exportRowsAsPdf(rows, fileName, title, includeDocuments = false) {
  if (!rows.length) return false;
  const columns = getReportColumns(includeDocuments);
  const pdfRows = rows.map((row) => mapReportRow(row, includeDocuments));
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text(title, 40, 32);
  autoTable(doc, {
    startY: 44,
    head: [columns.map((column) => column.label)],
    body: pdfRows.map((record) => columns.map((column) => String(record[column.key] ?? '-'))),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [37, 99, 235] }
  });
  doc.save(fileName);
  return true;
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#0F172A' },
    info: { main: '#2563EB' },
    success: { main: '#22C55E' },
    warning: { main: '#F59E0B' },
    error: { main: '#EF4444' },
    background: { default: '#111827', paper: '#020617' },
    text: { primary: '#E5E7EB', secondary: '#94A3B8' }
  },
  shape: { borderRadius: 12 },
  components: {
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#94A3B8',
          '&.Mui-focused': { color: '#93C5FD' }
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          color: '#E5E7EB',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(148, 163, 184, 0.5)'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#93C5FD'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#60A5FA'
          },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: '#EF4444'
          }
        },
        input: {
          color: '#E5E7EB',
          WebkitTextFillColor: '#E5E7EB',
          caretColor: '#E5E7EB'
        }
      }
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          '&:-webkit-autofill': {
            WebkitTextFillColor: '#E5E7EB',
            transition: 'background-color 9999s ease-out 0s',
            boxShadow: '0 0 0 1000px rgba(2, 6, 23, 0.01) inset'
          }
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: '#E5E7EB'
        }
      }
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          color: '#94A3B8',
          '&.Mui-error': {
            color: '#FCA5A5'
          }
        }
      }
    }
  }
});

const outlinedLightButtonSx = {
  color: '#E5E7EB',
  borderColor: 'rgba(229, 231, 235, 0.45)',
  '&:hover': {
    borderColor: '#E5E7EB',
    backgroundColor: 'rgba(229, 231, 235, 0.08)'
  }
};

function StatusChip({ status }) {
  let color = 'default';
  if (status === 'Inside') color = 'info';
  if (status === 'Exited' || status === 'Completed') color = 'success';
  if (status === 'Approved' || status === 'Recorded') color = 'warning';
  return <Chip label={status} color={color} size="small" />;
}

function LoginPage({ onLogin, busy }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ username: '', password: '' });

  const validate = () => {
    const next = { username: '', password: '' };
    if (!username.trim()) next.username = 'Username is required.';
    if (!password) next.password = 'Password is required.';
    setErrors(next);
    return !next.username && !next.password;
  };

  const AuthLoading = () => (
    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
      <Typography component="span" sx={{ fontWeight: 600 }}>
        Authenticating
      </Typography>
      {[0, 1, 2].map((index) => (
        <Box
          key={index}
          component="span"
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: '#E5E7EB',
            animation: 'loginDotPulse 900ms ease-in-out infinite',
            animationDelay: `${index * 150}ms`,
            '@keyframes loginDotPulse': {
              '0%, 80%, 100%': { opacity: 0.3, transform: 'translateY(0)' },
              '40%': { opacity: 1, transform: 'translateY(-3px)' }
            }
          }}
        />
      ))}
    </Stack>
  );

  const loginFieldSx = {
    '& .MuiInputLabel-root': { color: '#94A3B8' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#93C5FD' },
    '& .MuiOutlinedInput-root': {
      color: '#E5E7EB',
      '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.5)' },
      '&:hover fieldset': { borderColor: '#93C5FD' },
      '&.Mui-focused fieldset': { borderColor: '#60A5FA' }
    },
    '& .MuiOutlinedInput-input': {
      color: '#E5E7EB',
      WebkitTextFillColor: '#E5E7EB',
      caretColor: '#E5E7EB'
    },
    '& .MuiFormHelperText-root': {
      color: '#FCA5A5',
      minHeight: 20
    },
    '& .MuiFormHelperText-root.Mui-error': { color: '#FCA5A5' },
    '& input:-webkit-autofill': {
      WebkitTextFillColor: '#E5E7EB',
      transition: 'background-color 9999s ease-out 0s',
      boxShadow: '0 0 0 1000px rgba(2, 6, 23, 0.01) inset'
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    onLogin(username, password);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        background: 'linear-gradient(130deg, #020617 0%, #111827 52%, #0F172A 100%)',
        p: 2,
        '@keyframes loginFloatY': {
          '0%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(18px)' },
          '100%': { transform: 'translateY(0px)' }
        },
        '@keyframes loginDriftX': {
          '0%': { transform: 'translateX(0px)' },
          '50%': { transform: 'translateX(22px)' },
          '100%': { transform: 'translateX(0px)' }
        },
        '@keyframes loginCardIn': {
          from: { opacity: 0, transform: 'translateY(24px) scale(0.98)' },
          to: { opacity: 1, transform: 'translateY(0) scale(1)' }
        },
        '@keyframes loginScan': {
          '0%': { transform: 'translateY(-120%)' },
          '100%': { transform: 'translateY(120%)' }
        },
        '@keyframes loginPulseGlow': {
          '0%, 100%': { boxShadow: '0 0 0 rgba(37, 99, 235, 0.0)' },
          '50%': { boxShadow: '0 0 20px rgba(37, 99, 235, 0.45)' }
        },
        '@keyframes loginShimmer': {
          '0%': { transform: 'translateX(-130%)' },
          '100%': { transform: 'translateX(130%)' }
        },
        '@keyframes loginShieldOrbit': {
          '0%': { transform: 'translate(0, 0) rotate(0deg)' },
          '50%': { transform: 'translate(20px, -24px) rotate(10deg)' },
          '100%': { transform: 'translate(0, 0) rotate(0deg)' }
        },
        '@keyframes loginShieldBob': {
          '0%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-14px) rotate(-8deg)' },
          '100%': { transform: 'translateY(0px) rotate(0deg)' }
        },
        '@keyframes loginCardFloat3D': {
          '0%': { transform: 'translateY(0px) rotateX(0deg) rotateY(0deg)' },
          '25%': { transform: 'translateY(-6px) rotateX(1.5deg) rotateY(-1.5deg)' },
          '50%': { transform: 'translateY(-10px) rotateX(0deg) rotateY(0deg)' },
          '75%': { transform: 'translateY(-6px) rotateX(-1.5deg) rotateY(1.5deg)' },
          '100%': { transform: 'translateY(0px) rotateX(0deg) rotateY(0deg)' }
        }
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(2, 6, 23, 0.72), rgba(2, 6, 23, 0.78)), url('/login-security-bg.svg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'saturate(1.05)'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '-100px',
          left: '-80px',
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.32), rgba(37,99,235,0.01) 68%)',
          animation: 'loginFloatY 9s ease-in-out infinite'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          right: '-120px',
          bottom: '-120px',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.2), rgba(34,197,94,0.01) 72%)',
          animation: 'loginDriftX 12s ease-in-out infinite'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 60, md: 70 },
          right: { xs: 18, md: 90 },
          width: { xs: 90, md: 130 },
          height: { xs: 90, md: 130 },
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          background: 'radial-gradient(circle, rgba(37,99,235,0.28), rgba(37,99,235,0.03) 75%)',
          border: '1px solid rgba(147,197,253,0.35)',
          animation: 'loginShieldOrbit 6.4s ease-in-out infinite'
        }}
      >
        <ShieldIcon sx={{ fontSize: { xs: 42, md: 64 }, color: 'rgba(229, 231, 235, 0.85)' }} />
      </Box>
      <Box
        sx={{
          position: 'absolute',
          bottom: { xs: 80, md: 90 },
          left: { xs: 24, md: 140 },
          width: { xs: 64, md: 92 },
          height: { xs: 64, md: 92 },
          borderRadius: '50%',
          display: { xs: 'none', sm: 'grid' },
          placeItems: 'center',
          background: 'radial-gradient(circle, rgba(34,197,94,0.24), rgba(34,197,94,0.03) 74%)',
          border: '1px solid rgba(134,239,172,0.4)',
          animation: 'loginShieldBob 5.2s ease-in-out infinite'
        }}
      >
        <ShieldIcon sx={{ fontSize: { sm: 34, md: 46 }, color: 'rgba(229, 231, 235, 0.78)' }} />
      </Box>
      <Card
        sx={{
          width: '100%',
          maxWidth: 470,
          background:
            'linear-gradient(160deg, rgba(15,23,42,0.90) 0%, rgba(2,6,23,0.86) 55%, rgba(17,24,39,0.88) 100%)',
          border: '1px solid rgba(148, 163, 184, 0.35)',
          backdropFilter: 'blur(8px)',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1,
          boxShadow:
            '0 22px 68px rgba(2, 6, 23, 0.6), inset 0 1px 0 rgba(229, 231, 235, 0.1), inset 0 -1px 0 rgba(37, 99, 235, 0.18)',
          animation: 'loginCardIn 380ms ease-out both',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background:
              'linear-gradient(120deg, rgba(37,99,235,0.26) 0%, rgba(59,130,246,0.08) 28%, rgba(34,197,94,0.12) 58%, rgba(37,99,235,0.22) 100%)',
            mixBlendMode: 'screen',
            opacity: 0.75,
            pointerEvents: 'none'
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            backgroundImage:
              'radial-gradient(circle at 10% 8%, rgba(255,255,255,0.14), rgba(255,255,255,0) 38%), radial-gradient(circle at 90% 100%, rgba(37,99,235,0.24), rgba(37,99,235,0) 40%)',
            pointerEvents: 'none'
          }
        }}
      >
        <CardContent>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Avatar sx={{ bgcolor: 'info.main', width: 36, height: 36, animation: 'loginPulseGlow 2.4s ease-in-out infinite' }}>
              <ShieldIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Security Gate Login
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Authorized Access Portal
              </Typography>
            </Box>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 2.2 }}>
            Access control for Admin, Supervisor, and Guard
          </Typography>
          <Box component="form" onSubmit={submit}>
            <Stack spacing={2}>
              <TextField
                label="Username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  if (errors.username) setErrors((prev) => ({ ...prev, username: '' }));
                }}
                required
                fullWidth
                error={Boolean(errors.username)}
                helperText={errors.username || ' '}
                sx={loginFieldSx}
              />
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                required
                fullWidth
                error={Boolean(errors.password)}
                helperText={errors.password || ' '}
                sx={loginFieldSx}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton edge="end" onClick={() => setShowPassword((prev) => !prev)}>
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <Button
                type="submit"
                variant="contained"
                color="info"
                disabled={busy}
                sx={{ minHeight: 44 }}
              >
                {busy ? <AuthLoading /> : 'Login'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

function GuardPage({ user, onLogout, departments, notify, canViewFullReports }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [activeView, setActiveView] = useState('Dashboard');
  const [date, setDate] = useState(dayjs());
  const [summary, setSummary] = useState({ visitorsToday: 0, vehiclesLogged: 0, deliveries: 0, yardExits: 0 });
  const [movements, setMovements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [formData, setFormData] = useState({});
  const [staffOptions, setStaffOptions] = useState([]);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' });

  const selectedDate = date.format('YYYY-MM-DD');
  const isSupervisor = user.role === 'supervisor';

  const guardViews = [
    { key: 'Dashboard', icon: <DashboardIcon /> },
    { key: 'Register Visitor', icon: <PersonAddAlt1Icon /> },
    { key: 'Visitor Exit', icon: <MeetingRoomIcon /> },
    { key: 'Vehicle Entry', icon: <DirectionsCarIcon /> },
    { key: 'Vehicle Exit', icon: <SwapHorizIcon /> },
    { key: 'Deliveries', icon: <LocalShippingIcon /> },
    { key: 'Yard Exit', icon: <ExitToAppIcon /> },
    { key: 'Repossessed Vehicles', icon: <InventoryIcon /> },
    { key: 'Search', icon: <SearchIcon /> },
    { key: 'Reports', icon: <SummarizeIcon /> }
  ];

  const vehicleManufacturers = [
    'Toyota', 'Honda', 'Nissan', 'Mazda', 'Subaru', 'Mitsubishi', 'Suzuki', 'Lexus', 'Infiniti', 'Acura',
    'Ford', 'Chevrolet', 'GMC', 'Dodge', 'Chrysler', 'Jeep', 'Lincoln', 'Cadillac', 'Buick', 'Tesla',
    'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Porsche', 'Opel', 'Volvo', 'Saab',
    'Hyundai', 'Kia', 'Genesis', 'Daewoo',
    'Peugeot', 'Citroen', 'Renault', 'Alfa Romeo', 'Fiat', 'Lamborghini', 'Ferrari', 'Maserati',
    'Land Rover', 'Jaguar', 'Mini', 'Bentley', 'Rolls-Royce', 'Aston Martin',
    'Mahindra', 'Tata', 'Maruti Suzuki',
    'Chery', 'BYD', 'Geely', 'Great Wall', 'JAC', 'FAW', 'SAIC',
    'Other'
  ];

  const vehicleColors = [
    'White', 'Black', 'Silver', 'Grey', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Brown',
    'Beige', 'Gold', 'Burgundy', 'Navy', 'Teal', 'Pink', 'Purple', 'Other'
  ];

  const formTemplates = {
    'Register Visitor': [
      { key: 'first_name', label: 'First Name', required: true },
      { key: 'surname', label: 'Last Name', required: true },
      { key: 'phone_number', label: 'Phone Number' },
      { key: 'id_number', label: 'ID / Passport Number' },
      { key: 'department', label: 'Department', type: 'department', required: true },
      { key: 'person_to_see', label: 'Person To See', type: 'staff_person', required: true },
      { key: 'vehicle_registration', label: 'Vehicle Registration (Optional)' },
      { key: 'purpose_of_visit', label: 'Purpose of Visit', multiline: true },
      { key: 'visitor_photo', label: 'Visitor Photo URL (Optional)' },
      { key: 'id_photo', label: 'ID Photo URL (Optional)' }
    ],
    'Vehicle Entry': [
      { key: 'vehicle_registration', label: 'Vehicle Registration', required: true },
      { key: 'vehicle_manufacturer', label: 'Vehicle Manufacturer', type: 'manufacturer' },
      { key: 'vehicle_color', label: 'Vehicle Color', type: 'color' },
      { key: 'driver_name', label: 'Driver Name' },
      { key: 'vehicle_type', label: 'Vehicle Type', select: ['Company', 'Service', 'Customer'] },
      { key: 'purpose', label: 'Purpose' },
      { key: 'notes', label: 'Notes', multiline: true }
    ],
    Deliveries: [
      { key: 'delivery_company', label: 'Delivery Company', required: true },
      { key: 'driver_name', label: 'Driver Name' },
      { key: 'vehicle_model', label: 'Vehicle Model' },
      { key: 'vehicle_registration', label: 'Vehicle Registration' },
      { key: 'notes', label: 'Delivery Notes', multiline: true }
    ],
    'Yard Exit': [
      { key: 'vehicle_registration', label: 'Vehicle Registration', required: true },
      { key: 'person_taking_vehicle', label: 'Taken By' },
      { key: 'reason_for_removal', label: 'Reason', multiline: true },
      { key: 'supervisor_approval', label: 'Approved By' },
      { key: 'notes', label: 'Notes', multiline: true }
    ],
    'Repossessed Vehicles': [
      { key: 'vehicle_registration', label: 'Vehicle Registration', required: true },
      { key: 'recovery_company', label: 'Recovery Company' },
      { key: 'person_delivering_vehicle', label: 'Driver Name' },
      { key: 'condition', label: 'Condition' },
      { key: 'notes', label: 'Notes', multiline: true }
    ]
  };

  const template = formTemplates[activeView] || [];

  useEffect(() => {
    const next = {};
    template.forEach((field) => {
      next[field.key] = '';
    });
    setFormData(next);
  }, [activeView]);

  useEffect(() => {
    if (activeView !== 'Register Visitor' || !formData.department) {
      setStaffOptions([]);
      return;
    }

    getStaff({ department: formData.department, search: '' })
      .then((rows) => setStaffOptions(rows))
      .catch((error) => notify(error.message, 'error'));
  }, [activeView, formData.department]);

  const refreshGuardData = async () => {
    setIsLoading(true);
    try {
      const [summaryData, movementData, alertData] = await Promise.all([
        getSummary(selectedDate),
        getMovements({
          date: selectedDate,
          search,
          type: typeFilter,
          department: departmentFilter
        }),
        getGuardNotifications()
      ]);
      setSummary(summaryData);
      setMovements(movementData);
      setNotifications(alertData);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshGuardData();
  }, [selectedDate, search, typeFilter, departmentFilter]);

  const submitGuardForm = async () => {
    const timestamp = dayjs().toISOString();
    try {
      if (activeView === 'Register Visitor') {
        await createVisitor({ ...formData, time_in: timestamp, guard_name: user.fullName });
      } else if (activeView === 'Vehicle Entry') {
        await createVehicleEntry({ ...formData, time_in: timestamp });
      } else if (activeView === 'Deliveries') {
        await createDelivery({ ...formData, entry_time: timestamp });
      } else if (activeView === 'Yard Exit') {
        await createYardExit({ ...formData, exit_time: timestamp });
      } else if (activeView === 'Repossessed Vehicles') {
        await createRepossessedVehicle({ ...formData, recorded_at: timestamp });
      }

      notify(`${activeView} saved successfully.`, 'success');
      await refreshGuardData();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const handlePasswordChange = async () => {
    try {
      await changePassword(passwordForm);
      setPasswordDialogOpen(false);
      setPasswordForm({ current_password: '', new_password: '' });
      notify('Password changed.', 'success');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const currentVisitors = movements.filter((row) => row.type === 'Visitor' && row.status === 'Inside');
  const currentVehicles = movements.filter((row) => row.type === 'Vehicle Entry' && row.status === 'Inside');

  const drawer = (
    <Box sx={{ p: 1.5 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 1, mb: 1.5 }}>
        <Avatar sx={{ bgcolor: 'info.main', width: 34, height: 34 }}>
          <AssignmentIndIcon fontSize="small" />
        </Avatar>
        <Box>
          <Typography fontWeight={700}>Guard Workspace</Typography>
          <Typography variant="caption" color="text.secondary">
            {user.fullName}
          </Typography>
        </Box>
      </Stack>
      <List>
        {guardViews.map((view) => (
          <ListItemButton
            key={view.key}
            selected={activeView === view.key}
            onClick={() => {
              setActiveView(view.key);
              setMobileOpen(false);
            }}
            sx={{ borderRadius: 2, mb: 0.4 }}
          >
            <ListItemIcon sx={{ minWidth: 34, color: 'text.primary' }}>{view.icon}</ListItemIcon>
            <ListItemText primary={view.key} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ my: 1.5 }} />
      <Button fullWidth variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={onLogout}>
        Logout
      </Button>
    </Box>
  );

  const quickActions = [
    { label: 'Register Visitor', target: 'Register Visitor', icon: <PersonAddAlt1Icon /> },
    { label: 'Log Vehicle Entry', target: 'Vehicle Entry', icon: <DirectionsCarIcon /> },
    { label: 'Mark Visitor Exit', target: 'Visitor Exit', icon: <MeetingRoomIcon /> },
    { label: 'Mark Vehicle Exit', target: 'Vehicle Exit', icon: <SwapHorizIcon /> }
  ];

  const renderForm = () => (
    <Card sx={{ backgroundColor: '#020617' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {activeView}
        </Typography>
        <Grid container spacing={2}>
          {template.map((field) => (
            <Grid key={field.key} size={{ xs: 12, md: 6 }}>
              {field.type === 'department' ? (
                <FormControl fullWidth required={field.required}>
                  <InputLabel>{field.label}</InputLabel>
                  <Select
                    label={field.label}
                    value={formData[field.key] || ''}
                    onChange={(event) => {
                      const nextDepartment = event.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        [field.key]: nextDepartment,
                        person_to_see: ''
                      }));
                    }}
                  >
                    {departments.map((department) => (
                      <MenuItem key={department.id} value={department.name}>
                        {department.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : field.type === 'staff_person' ? (
                <Autocomplete
                  freeSolo
                  options={staffOptions}
                  getOptionLabel={(option) =>
                    typeof option === 'string'
                      ? option
                      : `${option.full_name}${option.title ? ` (${option.title})` : ''}`
                  }
                  value={formData[field.key] || ''}
                  onChange={(_, value) =>
                    setFormData((prev) => ({
                      ...prev,
                      [field.key]: typeof value === 'string' ? value : value?.full_name || ''
                    }))
                  }
                  onInputChange={(_, value) =>
                    setFormData((prev) => ({
                      ...prev,
                      [field.key]: value
                    }))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      required={field.required}
                      label={field.label}
                      helperText={
                        formData.department
                          ? 'Search and select staff in selected department'
                          : 'Select department first'
                      }
                    />
                  )}
                />
              ) : field.type === 'manufacturer' ? (
                <Autocomplete
                  freeSolo
                  options={vehicleManufacturers}
                  value={formData[field.key] || ''}
                  onChange={(_, value) =>
                    setFormData((prev) => ({
                      ...prev,
                      [field.key]: value || ''
                    }))
                  }
                  onInputChange={(_, value) =>
                    setFormData((prev) => ({
                      ...prev,
                      [field.key]: value
                    }))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={field.label}
                      helperText="Search or type a manufacturer"
                    />
                  )}
                />
              ) : field.type === 'color' ? (
                <Autocomplete
                  freeSolo
                  options={vehicleColors}
                  value={formData[field.key] || ''}
                  onChange={(_, value) =>
                    setFormData((prev) => ({
                      ...prev,
                      [field.key]: value || ''
                    }))
                  }
                  onInputChange={(_, value) =>
                    setFormData((prev) => ({
                      ...prev,
                      [field.key]: value
                    }))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={field.label}
                      helperText="Search or type a color"
                    />
                  )}
                />
              ) : field.select ? (
                <FormControl fullWidth required={field.required}>
                  <InputLabel>{field.label}</InputLabel>
                  <Select
                    label={field.label}
                    value={formData[field.key] || ''}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  >
                    {field.select.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  fullWidth
                  required={field.required}
                  label={field.label}
                  value={formData[field.key] || ''}
                  multiline={Boolean(field.multiline)}
                  rows={field.multiline ? 3 : undefined}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                />
              )}
            </Grid>
          ))}
        </Grid>
        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
          <Button variant="contained" color="success" onClick={submitGuardForm} startIcon={<FactCheckIcon />}>
            Save
          </Button>
          <Button
            variant="outlined"
            sx={outlinedLightButtonSx}
            onClick={() => {
              const reset = {};
              template.forEach((field) => {
                reset[field.key] = '';
              });
              setFormData(reset);
            }}
          >
            Cancel
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );

  const renderDashboard = () => (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
        <Card sx={{ backgroundColor: '#020617' }}><CardContent><Typography variant="body2" color="text.secondary">Visitors Today</Typography><Typography variant="h4">{summary.visitorsToday}</Typography></CardContent></Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
        <Card sx={{ backgroundColor: '#020617' }}><CardContent><Typography variant="body2" color="text.secondary">Vehicles Logged Today</Typography><Typography variant="h4">{summary.vehiclesLogged}</Typography></CardContent></Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
        <Card sx={{ backgroundColor: '#020617' }}><CardContent><Typography variant="body2" color="text.secondary">Deliveries Today</Typography><Typography variant="h4">{summary.deliveries}</Typography></CardContent></Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
        <Card sx={{ backgroundColor: '#020617' }}><CardContent><Typography variant="body2" color="text.secondary">Vehicles Removed</Typography><Typography variant="h4">{summary.yardExits}</Typography></CardContent></Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
        <Card sx={{ backgroundColor: '#020617' }}><CardContent><Typography variant="body2" color="text.secondary">Repossessed Vehicles</Typography><Typography variant="h4">{movements.filter((row) => row.type === 'Repossessed Vehicle').length}</Typography></CardContent></Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Card sx={{ backgroundColor: '#020617' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Quick Actions
            </Typography>
            <Grid container spacing={1.2}>
              {quickActions.map((action) => (
                <Grid key={action.label} size={{ xs: 12 }}>
                  <Button
                    fullWidth
                    size="large"
                    variant="outlined"
                    startIcon={action.icon}
                    sx={{
                      py: 1.2,
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      whiteSpace: 'normal',
                      lineHeight: 1.25,
                      color: '#E5E7EB',
                      borderColor: 'rgba(229, 231, 235, 0.35)',
                      '& .MuiButton-startIcon': { color: '#E5E7EB' },
                      '&:hover': { borderColor: '#E5E7EB' }
                    }}
                    onClick={() => setActiveView(action.target)}
                  >
                    {action.label}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <Card sx={{ backgroundColor: '#020617' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Activity Feed
            </Typography>
            <TableContainer component={Paper} sx={{ backgroundColor: '#111827' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Clock In (EAT)</TableCell>
                    <TableCell>Clock Out (EAT)</TableCell>
                    <TableCell>Activity</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movements.slice(0, 8).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatEatTimestamp(row.timeIn)}</TableCell>
                      <TableCell>{formatEatTimestamp(row.timeOut)}</TableCell>
                      <TableCell>{`${row.type}: ${row.subject}`}</TableCell>
                      <TableCell>
                        <StatusChip status={row.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card sx={{ backgroundColor: '#020617' }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <NotificationsIcon color="warning" />
              <Typography variant="h6">Notifications</Typography>
            </Stack>
            {!notifications.length && (
              <Typography variant="body2" color="text.secondary">
                No active alerts.
              </Typography>
            )}
            <Stack spacing={1}>
              {notifications.map((item) => (
                <Alert key={item.id} severity={item.level === 'warning' ? 'warning' : 'info'}>
                  {item.message}
                </Alert>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderExitTable = (rows, label) => (
    <Card sx={{ backgroundColor: '#020617' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1.5 }}>{label}</Typography>
        <TableContainer component={Paper} sx={{ backgroundColor: '#111827' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Department/Type</TableCell>
                <TableCell>Clock In (EAT)</TableCell>
                <TableCell>Clock Out (EAT)</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.id}</TableCell>
                  <TableCell>{row.subject}</TableCell>
                  <TableCell>{row.destination}</TableCell>
                  <TableCell>{formatEatTimestamp(row.timeIn)}</TableCell>
                  <TableCell>{formatEatTimestamp(row.timeOut)}</TableCell>
                  <TableCell>
                    <IconButton
                      color="warning"
                      onClick={() =>
                        markExit(row.entity, row.recordId)
                          .then(() => notify('Exit recorded.', 'success'))
                          .then(refreshGuardData)
                          .catch((error) => notify(error.message, 'error'))
                      }
                    >
                      <ExitToAppIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={6}>No active records.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  const renderSearch = () => (
    <Card sx={{ backgroundColor: '#020617' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Search Records
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} sx={{ mb: 1.5 }}>
          <TextField size="small" label="Visitor Name / Vehicle Reg / ID" value={search} onChange={(e) => setSearch(e.target.value)} />
          <DatePicker label="Date" value={date} onChange={(value) => setDate(value || dayjs())} slotProps={{ textField: { size: 'small' } }} />
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Type</InputLabel>
            <Select value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value)}>
              <MenuItem value="All Types">All Types</MenuItem>
              <MenuItem value="Visitor">Visitor</MenuItem>
              <MenuItem value="Vehicle Entry">Vehicle Entry</MenuItem>
              <MenuItem value="Delivery">Delivery</MenuItem>
              <MenuItem value="Yard Exit">Yard Exit</MenuItem>
              <MenuItem value="Repossessed Vehicle">Repossessed Vehicle</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        <TableContainer component={Paper} sx={{ backgroundColor: '#111827' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Clock In (EAT)</TableCell>
                <TableCell>Clock Out (EAT)</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movements.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.id}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>{row.subject}</TableCell>
                  <TableCell>{formatEatTimestamp(row.timeIn)}</TableCell>
                  <TableCell>{formatEatTimestamp(row.timeOut)}</TableCell>
                  <TableCell><StatusChip status={row.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  const renderReports = () => (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card sx={{ backgroundColor: '#020617' }}><CardContent><Typography variant="body2" color="text.secondary">Visitors Today</Typography><Typography variant="h4">{summary.visitorsToday}</Typography></CardContent></Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card sx={{ backgroundColor: '#020617' }}><CardContent><Typography variant="body2" color="text.secondary">Vehicles Today</Typography><Typography variant="h4">{summary.vehiclesLogged}</Typography></CardContent></Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card sx={{ backgroundColor: '#020617' }}><CardContent><Typography variant="body2" color="text.secondary">Deliveries Today</Typography><Typography variant="h4">{summary.deliveries}</Typography></CardContent></Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card sx={{ backgroundColor: '#020617' }}><CardContent><Typography variant="body2" color="text.secondary">Yard Exits Today</Typography><Typography variant="h4">{summary.yardExits}</Typography></CardContent></Card>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Card sx={{ backgroundColor: '#020617' }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mb: 1.5 }}>
              <Button
                variant="outlined"
                sx={outlinedLightButtonSx}
                onClick={() => {
                  const ok = exportRowsAsCsv(movements, 'guard_daily_report.csv', canViewFullReports);
                  if (!ok) notify('No data to export.', 'warning');
                }}
              >
                Export CSV
              </Button>
              <Button
                variant="outlined"
                sx={outlinedLightButtonSx}
                onClick={async () => {
                  const ok = await exportRowsAsExcel(movements, 'guard_daily_report.xlsx', canViewFullReports);
                  if (!ok) notify('No data to export.', 'warning');
                }}
              >
                Export Excel
              </Button>
              <Button
                variant="outlined"
                sx={outlinedLightButtonSx}
                onClick={() => {
                  const ok = exportRowsAsPdf(
                    movements,
                    'guard_daily_report.pdf',
                    'Guard Daily Activity Report',
                    canViewFullReports
                  );
                  if (!ok) notify('No data to export.', 'warning');
                }}
              >
                Export PDF
              </Button>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {canViewFullReports
                ? 'Supervisor access includes full analytics on the admin dashboard.'
                : 'Guard access shows daily operational summaries only.'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  let content = null;
  if (activeView === 'Dashboard') content = renderDashboard();
  if (activeView === 'Visitor Exit') content = renderExitTable(currentVisitors, 'Current Visitors');
  if (activeView === 'Vehicle Exit') content = renderExitTable(currentVehicles, 'Current Vehicles');
  if (activeView === 'Search') content = renderSearch();
  if (activeView === 'Reports') content = renderReports();
  if (formTemplates[activeView]) content = renderForm();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#111827' }}>
      <AppBar
        position="fixed"
        sx={{ width: { md: `calc(100% - ${guardDrawerWidth}px)` }, ml: { md: `${guardDrawerWidth}px` }, backgroundColor: '#0F172A' }}
      >
        <Toolbar>
          <IconButton color="inherit" onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' }, mr: 1 }}>
            <SettingsIcon />
          </IconButton>
          <Typography sx={{ flexGrow: 1 }} fontWeight={700}>{activeView}</Typography>
          <IconButton color="inherit" onClick={() => setNotificationModalOpen(true)} sx={{ mr: 1.5 }}>
            <Badge badgeContent={notifications.length} color="warning">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <IconButton color="inherit" onClick={(event) => setProfileMenuAnchor(event.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'info.main' }}>{user.fullName[0]}</Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: guardDrawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: guardDrawerWidth, backgroundColor: '#020617' } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: guardDrawerWidth, backgroundColor: '#020617' } }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: 2, mt: 8 }}>
        {isLoading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
            <CircularProgress color="info" />
          </Box>
        ) : (
          content
        )}
      </Box>

      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={() => setProfileMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setProfileDialogOpen(true);
            setProfileMenuAnchor(null);
          }}
        >
          <ListItemIcon><AssignmentIndIcon fontSize="small" /></ListItemIcon>
          <ListItemText>My Profile</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setPasswordDialogOpen(true);
            setProfileMenuAnchor(null);
          }}
        >
          <ListItemIcon><VpnKeyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Change Password</ListItemText>
        </MenuItem>
        <MenuItem onClick={onLogout}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>My Profile</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} sx={{ mt: 1 }}>
            <TextField label="Full Name" value={user.fullName} disabled fullWidth />
            <TextField label="Username" value={user.username} disabled fullWidth />
            <TextField label="Role" value={user.role} disabled fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} sx={{ mt: 1 }}>
            <TextField
              type="password"
              label="Current Password"
              value={passwordForm.current_password}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, current_password: event.target.value }))
              }
              fullWidth
            />
            <TextField
              type="password"
              label="New Password"
              value={passwordForm.new_password}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handlePasswordChange}>Update</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={notificationModalOpen} onClose={() => setNotificationModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Notifications</DialogTitle>
        <DialogContent>
          <Stack spacing={1}>
            {notifications.length ? (
              notifications.map((item) => (
                <Alert key={item.id} severity={item.level === 'warning' ? 'warning' : 'info'}>
                  {item.message}
                </Alert>
              ))
            ) : (
              <Typography color="text.secondary">No notifications available.</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setNotificationModalOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function App() {
  const [authUser, setAuthUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [busyLogin, setBusyLogin] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const timeoutRef = useRef(null);

  const notify = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const loadDepartments = async () => {
    const list = await getDepartments();
    setDepartments(list);
  };

  const handleLogout = async (silent = false) => {
    try {
      if (getToken()) {
        await logout();
      }
    } catch {
      // ignore
    }
    setToken('');
    setAuthUser(null);
    if (!silent) notify('Logged out.');
  };

  useEffect(() => {
    if (!authUser) return undefined;

    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        handleLogout(true);
        notify('Session timed out due to inactivity.', 'warning');
      }, SESSION_TIMEOUT_MS);
    };

    const events = ['click', 'keydown', 'mousemove', 'scroll'];
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer));
    resetTimer();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [authUser]);

  useEffect(() => {
    const bootstrap = async () => {
      const token = getToken();
      if (!token) {
        setInitializing(false);
        return;
      }

      try {
        const response = await getCurrentUser();
        setAuthUser(response.user);
        await loadDepartments();
      } catch {
        setToken('');
        setAuthUser(null);
      } finally {
        setInitializing(false);
      }
    };

    bootstrap();
  }, []);

  const handleLogin = async (username, password) => {
    setBusyLogin(true);
    try {
      const response = await login(username, password);
      setToken(response.token);
      setAuthUser(response.user);
      await loadDepartments();
      notify('Login successful.');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusyLogin(false);
    }
  };

  if (initializing) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', backgroundColor: '#111827' }}>
          <CircularProgress color="info" />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        {!authUser ? (
          <LoginPage onLogin={handleLogin} busy={busyLogin} />
        ) : authUser.role === 'admin' || authUser.role === 'supervisor' ? (
          <AdminPage user={authUser} onLogout={() => handleLogout(false)} notify={notify} />
        ) : (
          <GuardPage
            user={authUser}
            onLogout={() => handleLogout(false)}
            departments={departments}
            notify={notify}
            canViewFullReports={authUser.role === 'supervisor'}
          />
        )}

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3500}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            severity={snackbar.severity}
            variant="filled"
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

function AdminPage({ user, onLogout, notify }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminView, setAdminView] = useState('Dashboard');
  const [profileAnchor, setProfileAnchor] = useState(null);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState([]);
  const [dismissedOverstayIds, setDismissedOverstayIds] = useState([]);
  const [nowTick, setNowTick] = useState(Date.now());
  const [date, setDate] = useState(dayjs());
  const [isAltMode, setIsAltMode] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [movements, setMovements] = useState([]);
  const [guards, setGuards] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({ type: 'All Types', department: 'All Departments' });
  const [guardDialog, setGuardDialog] = useState({ open: false, mode: 'create', data: {} });
  const [departmentDialog, setDepartmentDialog] = useState({ open: false, mode: 'create', data: {} });
  const [staffDialog, setStaffDialog] = useState({ open: false, mode: 'create', data: {} });
  const [settingsState, setSettingsState] = useState({
    companyName: 'Security Gate Management',
    vehicleCategories: 'Company, Service, Customer',
    notificationRules: 'Visitor > 8 hours, Vehicle pending exit',
    securityPolicy: 'Session timeout 30 minutes'
  });
  const reminderTimestampsRef = useRef({});

  const selectedDate = date.format('YYYY-MM-DD');
  const isSupervisor = user.role === 'supervisor';

  const sidebarItems = [
    { key: 'Dashboard', icon: <DashboardIcon /> },
    { key: 'Visitors', icon: <PersonAddAlt1Icon /> },
    { key: 'Vehicles', icon: <DirectionsCarIcon /> },
    { key: 'Deliveries', icon: <LocalShippingIcon /> },
    { key: 'Yard Exit', icon: <ExitToAppIcon /> },
    { key: 'Repossessed Vehicles', icon: <InventoryIcon /> },
    { key: 'Reports', icon: <SummarizeIcon /> },
    { key: 'Users', icon: <GroupIcon /> },
    { key: 'Audit Logs', icon: <FactCheckIcon /> },
    { key: 'Settings', icon: <SettingsIcon /> }
  ];

  const loadData = async () => {
    const [analyticsData, movementData] = await Promise.all([
      getAnalytics(selectedDate),
      getMovements({ date: selectedDate, search: searchText, type: filters.type, department: filters.department })
    ]);

    setAnalytics(analyticsData);
    setMovements(movementData);

    if (user.role === 'admin') {
      const [guardData, departmentData, staffData] = await Promise.all([getGuards(), getAdminDepartments(), getAdminStaff()]);
      setGuards(guardData);
      setDepartments(departmentData);
      setStaffMembers(staffData);
    } else if (user.role === 'supervisor') {
      const guardData = await getGuards();
      setGuards(guardData);
      setDepartments([]);
      setStaffMembers([]);
    } else {
      setGuards([]);
      setDepartments([]);
      setStaffMembers([]);
    }
  };

  useEffect(() => {
    loadData().catch((error) => notify(error.message, 'error'));
  }, [selectedDate, searchText, filters.type, filters.department]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const headerNotifications = useMemo(() => {
    const byLatest = (rows, predicate = () => true) =>
      rows
        .filter(predicate)
        .sort((a, b) => new Date(b.timeIn || b.timeOut || 0) - new Date(a.timeIn || a.timeOut || 0))[0];

    const nowMs = nowTick;
    const visitorRows = movements.filter((m) => m.type === 'Visitor');
    const vehicleRows = movements.filter((m) => m.type === 'Vehicle Entry');
    const deliveryRows = movements.filter((m) => m.type === 'Delivery');

    const visitorsInside = movements.filter((m) => m.type === 'Visitor' && m.status === 'Inside');
    const vehiclesInside = movements.filter((m) => m.type === 'Vehicle Entry' && m.status === 'Inside');

    const latestVisitorIn = byLatest(visitorRows);
    const latestVisitorOut = byLatest(visitorRows, (m) => Boolean(m.timeOut));
    const latestVehicleIn = byLatest(vehicleRows);
    const latestVehicleOut = byLatest(vehicleRows, (m) => Boolean(m.timeOut));
    const latestDelivery = byLatest(deliveryRows);

    const overstayedVisitors = visitorsInside
      .filter((m) => nowMs - new Date(m.timeIn).getTime() > 8 * 60 * 60 * 1000)
      .map((m) => {
        const elapsedMs = nowMs - new Date(m.timeIn).getTime();
        const overstayMs = elapsedMs - 8 * 60 * 60 * 1000;
        return {
          id: m.recordId,
          entity: m.entity,
          recordId: m.recordId,
          name: m.subject,
          phoneNumber: m.phoneNumber || '-',
          idNumber: m.idNumber || '-',
          personToSee: m.personToSee || '-',
          department: m.destination || '-',
          vehicleRegistration: m.vehicleRegistration || '-',
          timeIn: m.timeIn,
          elapsedMs,
          overstayMs
        };
      });
    const vehicleInsideTooLongCount = vehiclesInside.filter(
      (m) => nowMs - new Date(m.timeIn).getTime() > 6 * 60 * 60 * 1000
    ).length;

    const result = [];
    if (latestVisitorIn) {
      result.push({
        id: 'visitor_registered',
        level: 'success',
        message: `New visitor registered: ${latestVisitorIn.subject} registered to see ${latestVisitorIn.destination}.`
      });
    }
    if (latestVisitorOut) {
      result.push({
        id: 'visitor_checked_out',
        level: 'info',
        message: `Visitor checked out: ${latestVisitorOut.subject} has exited the premises.`
      });
    }
    if (isSupervisor && overstayedVisitors.length > 0) {
      result.push({
        id: 'visitor_overstayed',
        type: 'visitor_overstay',
        level: 'warning',
        count: overstayedVisitors.length,
        visitors: overstayedVisitors,
        message: `Visitor overstayed: ${overstayedVisitors.length} visitor(s) have been inside for over 8 hours.`
      });
    }
    if (latestVehicleIn) {
      result.push({
        id: 'vehicle_entered',
        level: 'info',
        message: `Vehicle entered: ${latestVehicleIn.subject} entered the premises.`
      });
    }
    if (latestVehicleOut) {
      result.push({
        id: 'vehicle_exited',
        level: 'success',
        message: `Vehicle exited: ${latestVehicleOut.subject} exited the premises.`
      });
    }
    if (vehicleInsideTooLongCount > 0) {
      result.push({
        id: 'vehicle_inside_too_long',
        level: 'warning',
        message: `Vehicle inside too long: ${vehicleInsideTooLongCount} vehicle(s) have been inside for over 6 hours.`
      });
    }
    if (latestDelivery) {
      result.push({
        id: 'delivery_logged',
        level: 'info',
        message: `Delivery logged: Delivery from ${latestDelivery.subject} has arrived.`
      });
      if (latestDelivery.vehicleRegistration && latestDelivery.vehicleRegistration !== '-') {
        result.push({
          id: 'delivery_recorded',
          level: 'success',
          message: `Delivery recorded: Vehicle delivery ${latestDelivery.vehicleRegistration} has been logged.`
        });
      }
    }

    return result;
  }, [movements, nowTick, isSupervisor]);

  useEffect(() => {
    setNotificationItems((prev) => {
      const previousById = new Map(prev.map((item) => [item.id, item]));
      return headerNotifications.map((item) => ({
        ...item,
        read: previousById.get(item.id)?.read || false
      }));
    });
  }, [headerNotifications]);

  useEffect(() => {
    if (!isSupervisor) {
      reminderTimestampsRef.current = {};
      return;
    }

    const overstay = notificationItems.find((item) => item.type === 'visitor_overstay');
    if (!overstay?.visitors?.length) {
      reminderTimestampsRef.current = {};
      return;
    }

    const activeVisitors = overstay.visitors.filter(
      (visitor) => !dismissedOverstayIds.includes(visitor.recordId)
    );
    const activeIds = new Set(activeVisitors.map((visitor) => String(visitor.recordId)));

    Object.keys(reminderTimestampsRef.current).forEach((id) => {
      if (!activeIds.has(id)) {
        delete reminderTimestampsRef.current[id];
      }
    });

    const now = nowTick;
    activeVisitors.forEach((visitor) => {
      const key = String(visitor.recordId);
      const last = reminderTimestampsRef.current[key];
      if (!last) {
        reminderTimestampsRef.current[key] = now;
        return;
      }
      if (now - last >= 30 * 60 * 1000) {
        notify(
          `Reminder: ${visitor.name} is still overstayed (${formatDurationCompact(visitor.overstayMs)}).`,
          'warning'
        );
        reminderTimestampsRef.current[key] = now;
      }
    });
  }, [notificationItems, dismissedOverstayIds, nowTick, isSupervisor]);

  const cards = useMemo(
    () => [
      { label: 'Visitors Today', value: analytics?.visitors ?? 0 },
      { label: 'Vehicles Logged', value: analytics?.vehicle_entries ?? 0 },
      { label: 'Deliveries', value: analytics?.deliveries ?? 0 },
      { label: 'Vehicles Removed', value: analytics?.yard_exits ?? 0 },
      { label: 'Repossessed Vehicles', value: analytics?.repossessed ?? 0 },
      { label: 'Active Visitors Inside', value: movements.filter((m) => m.type === 'Visitor' && m.status === 'Inside').length }
    ],
    [analytics, movements]
  );

  const groupedCounts = useMemo(() => {
    const byType = { Visitor: 0, 'Vehicle Entry': 0, Delivery: 0, 'Yard Exit': 0 };
    movements.forEach((row) => {
      if (byType[row.type] !== undefined) byType[row.type] += 1;
    });
    return byType;
  }, [movements]);

  const rowsByView = useMemo(() => {
    if (adminView === 'Visitors') return movements.filter((m) => m.type === 'Visitor');
    if (adminView === 'Vehicles') return movements.filter((m) => m.type === 'Vehicle Entry');
    if (adminView === 'Deliveries') return movements.filter((m) => m.type === 'Delivery');
    if (adminView === 'Yard Exit') return movements.filter((m) => m.type === 'Yard Exit');
    if (adminView === 'Repossessed Vehicles') return movements.filter((m) => m.type === 'Repossessed Vehicle');
    return movements;
  }, [adminView, movements]);

  const upsertGuard = async () => {
    if (guardDialog.mode === 'create') await createGuard(guardDialog.data);
    else await updateGuard(guardDialog.data.id, guardDialog.data);
    setGuardDialog({ open: false, mode: 'create', data: {} });
    await loadData();
    notify('User saved.', 'success');
  };

  const upsertDepartment = async () => {
    if (departmentDialog.mode === 'create') await createDepartment(departmentDialog.data);
    else await updateDepartment(departmentDialog.data.id, departmentDialog.data);
    setDepartmentDialog({ open: false, mode: 'create', data: {} });
    await loadData();
    notify('Department saved.', 'success');
  };

  const upsertStaff = async () => {
    if (staffDialog.mode === 'create') await createStaff(staffDialog.data);
    else await updateStaff(staffDialog.data.id, staffDialog.data);
    setStaffDialog({ open: false, mode: 'create', data: {} });
    await loadData();
    notify('Staff member saved.', 'success');
  };

  const drawer = (
    <Box sx={{ p: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, px: 1 }}>
        <Avatar sx={{ bgcolor: 'info.main', width: 34, height: 34 }}><DashboardIcon fontSize="small" /></Avatar>
        <Box>
          <Typography fontWeight={700}>Admin Control Center</Typography>
          <Typography variant="caption" color="text.secondary">{user.fullName}</Typography>
        </Box>
      </Stack>
      <List>
        {sidebarItems.map((item) => (
          <ListItemButton key={item.key} selected={adminView === item.key} sx={{ borderRadius: 2, mb: 0.4 }} onClick={() => { setAdminView(item.key); setDrawerOpen(false); }}>
            <ListItemIcon sx={{ minWidth: 34, color: 'text.primary' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.key} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ my: 1.5 }} />
      <Button fullWidth variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={onLogout}>Logout</Button>
    </Box>
  );

  const showDocumentColumns = adminView === 'Reports';
  const logsTable = (
    <TableContainer component={Paper} sx={{ backgroundColor: '#111827' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Subject</TableCell>
            <TableCell>{showDocumentColumns ? 'Person Visited' : 'Department'}</TableCell>
            <TableCell>Clock In (EAT)</TableCell>
            <TableCell>Clock Out (EAT)</TableCell>
            {showDocumentColumns && <TableCell>ID Number</TableCell>}
            {showDocumentColumns && <TableCell>Vehicle Reg</TableCell>}
            {showDocumentColumns && <TableCell>Notes</TableCell>}
            <TableCell>Status</TableCell>
            {user.role === 'admin' && <TableCell>Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {rowsByView.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.id}</TableCell>
              <TableCell>{row.type}</TableCell>
              <TableCell>{row.subject}</TableCell>
              <TableCell>{showDocumentColumns ? row.personToSee || '-' : row.destination}</TableCell>
              <TableCell>{formatEatTimestamp(row.timeIn)}</TableCell>
              <TableCell>{formatEatTimestamp(row.timeOut)}</TableCell>
              {showDocumentColumns && <TableCell>{row.idNumber || '-'}</TableCell>}
              {showDocumentColumns && <TableCell>{row.vehicleRegistration || '-'}</TableCell>}
              {showDocumentColumns && <TableCell>{row.notes || '-'}</TableCell>}
              <TableCell><StatusChip status={row.status} /></TableCell>
              {user.role === 'admin' && <TableCell><IconButton color="error" size="small" onClick={() => deleteMovement(row.entity, row.recordId).then(loadData).then(() => notify('Record deleted.', 'success')).catch((error) => notify(error.message, 'error'))}><DeleteIcon fontSize="small" /></IconButton></TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  let content = null;
  if (adminView === 'Dashboard') {
    content = (
      <Grid container spacing={2}>
        {cards.map((card) => (<Grid key={card.label} size={{ xs: 12, sm: 6, lg: 2 }}><Card sx={{ backgroundColor: '#020617' }}><CardContent><Typography variant="body2" color="text.secondary">{card.label}</Typography><Typography variant="h4" fontWeight={700}>{card.value}</Typography></CardContent></Card></Grid>))}
        <Grid size={{ xs: 12, lg: 6 }}><Card sx={{ backgroundColor: '#020617' }}><CardContent><Typography variant="h6" sx={{ mb: 1.5 }}>Operations Overview</Typography><Stack spacing={1.2}>{Object.entries(groupedCounts).map(([label, value]) => (<Box key={label}><Stack direction="row" justifyContent="space-between"><Typography variant="body2">{label}</Typography><Typography variant="body2">{value}</Typography></Stack><Box sx={{ height: 8, borderRadius: 1, bgcolor: '#1F2937', overflow: 'hidden' }}><Box sx={{ height: '100%', width: `${Math.min(100, value * 10)}%`, bgcolor: 'info.main' }} /></Box></Box>))}</Stack></CardContent></Card></Grid>
        <Grid size={{ xs: 12, lg: 6 }}><Card sx={{ backgroundColor: '#020617' }}><CardContent><Typography variant="h6" sx={{ mb: 1.5 }}>Live Activity Feed</Typography><TableContainer component={Paper} sx={{ backgroundColor: '#111827' }}><Table size="small"><TableHead><TableRow><TableCell>Time</TableCell><TableCell>Event</TableCell></TableRow></TableHead><TableBody>{movements.slice(0, 8).map((row) => (<TableRow key={row.id}><TableCell>{formatEatTimestamp(row.timeIn)}</TableCell><TableCell>{`${row.type} - ${row.subject}`}</TableCell></TableRow>))}</TableBody></Table></TableContainer></CardContent></Card></Grid>
      </Grid>
    );
  } else if (['Visitors', 'Vehicles', 'Deliveries', 'Yard Exit', 'Repossessed Vehicles'].includes(adminView)) {
    content = (
      <Card sx={{ backgroundColor: '#020617' }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} sx={{ mb: 1.5 }}>
            <DatePicker label="Date" value={date} onChange={(value) => setDate(value || dayjs())} slotProps={{ textField: { size: 'small' } }} />
            <TextField size="small" label="Search" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
            <Button
              variant="outlined"
              sx={outlinedLightButtonSx}
              onClick={() => {
                const ok = exportRowsAsCsv(rowsByView, `${adminView.toLowerCase().replace(/\s+/g, '_')}.csv`);
                if (!ok) notify('No data to export.', 'warning');
              }}
            >
              Export CSV
            </Button>
          </Stack>
          {logsTable}
        </CardContent>
      </Card>
    );
  } else if (adminView === 'Users') {
    const canCreateUsers = user.role === 'admin' || user.role === 'supervisor';
    const canManageUsers = user.role === 'admin';
    const userRows = user.role === 'admin' ? guards : guards.filter((record) => record.role === 'guard');
    content = (
      <Card sx={{ backgroundColor: '#020617' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1.5 }}>Guards</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {user.role === 'admin'
              ? 'Admins can create supervisors and guards.'
              : 'Supervisors can create guards only.'}
          </Typography>
          {canCreateUsers && (
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() =>
                  setGuardDialog({
                    open: true,
                    mode: 'create',
                    data: { role: user.role === 'admin' ? 'guard' : 'guard', status: 'active' }
                  })
                }
              >
                Add User
              </Button>
            </Stack>
          )}
          <TableContainer component={Paper} sx={{ backgroundColor: '#111827' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  {canManageUsers && <TableCell>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {userRows.map((guard) => (
                  <TableRow key={guard.id}>
                    <TableCell>{guard.full_name}</TableCell>
                    <TableCell>@{guard.username}</TableCell>
                    <TableCell>{guard.role}</TableCell>
                    <TableCell>{guard.status || 'active'}</TableCell>
                    {canManageUsers && (
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() =>
                            setGuardDialog({
                              open: true,
                              mode: 'edit',
                              data: {
                                id: guard.id,
                                full_name: guard.full_name,
                                username: guard.username,
                                password: '',
                                role: guard.role,
                                status: guard.status || 'active'
                              }
                            })
                          }
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => {
                            if (!window.confirm('Delete this user?')) return;
                            deleteGuard(guard.id)
                              .then(loadData)
                              .then(() => notify('User deleted.', 'success'))
                              .catch((error) => notify(error.message, 'error'));
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {!userRows.length && (
                  <TableRow>
                    <TableCell colSpan={canManageUsers ? 5 : 4}>No users found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  } else if (adminView === 'Reports') {
    content = (
      <Card sx={{ backgroundColor: '#020617' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1.5 }}>Reports & Analytics</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} sx={{ mb: 1.5 }}>
            <DatePicker label="Report Date" value={date} onChange={(value) => setDate(value || dayjs())} slotProps={{ textField: { size: 'small' } }} />
            <Button
              variant="outlined"
              sx={outlinedLightButtonSx}
              onClick={() => {
                const ok = exportRowsAsCsv(movements, 'daily_activity_report.csv', true);
                if (!ok) notify('No data to export.', 'warning');
              }}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              sx={outlinedLightButtonSx}
              onClick={async () => {
                const ok = await exportRowsAsExcel(movements, 'daily_activity_report.xlsx', true);
                if (!ok) notify('No data to export.', 'warning');
              }}
            >
              Export Excel
            </Button>
            <Button
              variant="outlined"
              sx={outlinedLightButtonSx}
              onClick={() => {
                const ok = exportRowsAsPdf(movements, 'daily_activity_report.pdf', 'Daily Activity Report', true);
                if (!ok) notify('No data to export.', 'warning');
              }}
            >
              Export PDF
            </Button>
          </Stack>
          {logsTable}
        </CardContent>
      </Card>
    );
  } else if (adminView === 'Audit Logs') {
    content = (<Card sx={{ backgroundColor: '#020617' }}><CardContent><Typography variant="h6" sx={{ mb: 1.5 }}>Audit Logs</Typography><TableContainer component={Paper} sx={{ backgroundColor: '#111827' }}><Table size="small"><TableHead><TableRow><TableCell>Time</TableCell><TableCell>User</TableCell><TableCell>Action</TableCell></TableRow></TableHead><TableBody>{movements.slice(0, 20).map((row) => (<TableRow key={`audit-${row.id}`}><TableCell>{formatEatTimestamp(row.timeIn)}</TableCell><TableCell>{row.type === 'Visitor' ? 'Guard' : 'System'}</TableCell><TableCell>{`${row.type} record ${row.id} captured`}</TableCell></TableRow>))}</TableBody></Table></TableContainer></CardContent></Card>);
  } else if (adminView === 'Settings') {
    content = (<Card sx={{ backgroundColor: '#020617' }}><CardContent><Typography variant="h6" sx={{ mb: 1.5 }}>System Settings</Typography><Grid container spacing={2}><Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Company Name" value={settingsState.companyName} onChange={(event) => setSettingsState((prev) => ({ ...prev, companyName: event.target.value }))} /></Grid><Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Vehicle Categories" value={settingsState.vehicleCategories} onChange={(event) => setSettingsState((prev) => ({ ...prev, vehicleCategories: event.target.value }))} /></Grid><Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Notification Rules" value={settingsState.notificationRules} onChange={(event) => setSettingsState((prev) => ({ ...prev, notificationRules: event.target.value }))} /></Grid><Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Security Policies" value={settingsState.securityPolicy} onChange={(event) => setSettingsState((prev) => ({ ...prev, securityPolicy: event.target.value }))} /></Grid></Grid><Button sx={{ mt: 2 }} variant="contained" onClick={() => notify('Settings saved locally.', 'success')}>Save Settings</Button></CardContent></Card>);
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: isAltMode ? '#0b1220' : '#111827' }}>
      <AppBar position="fixed" sx={{ width: { md: `calc(100% - ${guardDrawerWidth}px)` }, ml: { md: `${guardDrawerWidth}px` }, backgroundColor: '#0F172A' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => setDrawerOpen(true)} sx={{ display: { md: 'none' }, mr: 1 }}><SettingsIcon /></IconButton>
          <Typography sx={{ flexGrow: 1 }} fontWeight={700}>{adminView}</Typography>
          <TextField size="small" placeholder="Search records..." value={searchText} onChange={(event) => setSearchText(event.target.value)} sx={{ display: { xs: 'none', md: 'block' }, mr: 1.2, minWidth: 260 }} />
          <IconButton color="inherit" onClick={() => setNotificationModalOpen(true)} sx={{ mr: 0.8 }}>
            <Badge badgeContent={notificationItems.filter((item) => !item.read).length} color="warning">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <IconButton color="inherit" onClick={() => setIsAltMode((prev) => !prev)} sx={{ mr: 1 }}>{isAltMode ? <LightModeIcon /> : <DarkModeIcon />}</IconButton>
          <IconButton color="inherit" onClick={(event) => setProfileAnchor(event.currentTarget)}><Avatar sx={{ width: 32, height: 32, bgcolor: 'info.main' }}>{user.fullName[0]}</Avatar></IconButton>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: guardDrawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer variant="temporary" open={drawerOpen} onClose={() => setDrawerOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: guardDrawerWidth, backgroundColor: '#020617' } }}>{drawer}</Drawer>
        <Drawer variant="permanent" open sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: guardDrawerWidth, backgroundColor: '#020617' } }}>{drawer}</Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, mt: 8, p: 2 }}>{content}</Box>

      <Menu anchorEl={profileAnchor} open={Boolean(profileAnchor)} onClose={() => setProfileAnchor(null)}>
        <MenuItem disabled>{user.fullName}</MenuItem>
        <MenuItem onClick={onLogout}>Logout</MenuItem>
      </Menu>

      <Dialog open={notificationModalOpen} onClose={() => setNotificationModalOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Notifications</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2}>
            {notificationItems.length ? (
              notificationItems.map((item) => (
                <Card key={item.id} sx={{ backgroundColor: '#111827', border: item.read ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid rgba(37, 99, 235, 0.45)' }}>
                  <CardContent sx={{ pb: '12px !important' }}>
                    {isSupervisor && item.type === 'visitor_overstay' ? (
                      <>
                        <Stack direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
                          <Typography variant="subtitle1" fontWeight={700}>
                            Visitor Overstay Alert
                          </Typography>
                          <Chip size="small" color={item.count > 3 ? 'error' : 'warning'} label={`Count ${item.count}`} />
                        </Stack>
                        <Alert severity={item.count > 3 ? 'error' : 'warning'} variant="outlined" sx={{ mb: 1 }}>
                          {item.message}
                        </Alert>
                        <Stack spacing={1}>
                          {(item.visitors || [])
                            .filter((visitor) => !dismissedOverstayIds.includes(visitor.recordId))
                            .map((visitor) => (
                              <Paper key={visitor.recordId} sx={{ p: 1.2, backgroundColor: '#0F172A' }}>
                                <Stack
                                  direction={{ xs: 'column', md: 'row' }}
                                  justifyContent="space-between"
                                  alignItems={{ xs: 'flex-start', md: 'center' }}
                                  spacing={1}
                                  sx={{ mb: 0.8 }}
                                >
                                  <Typography fontWeight={700}>{visitor.name}</Typography>
                                  <Chip
                                    size="small"
                                    color="warning"
                                    label={`Overstay +${formatDurationCompact(visitor.overstayMs)}`}
                                  />
                                </Stack>
                                <Grid container spacing={1}>
                                  <Grid size={{ xs: 12, md: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Phone</Typography>
                                    <Typography variant="body2">{visitor.phoneNumber || '-'}</Typography>
                                  </Grid>
                                  <Grid size={{ xs: 12, md: 6 }}>
                                    <Typography variant="caption" color="text.secondary">ID Number</Typography>
                                    <Typography variant="body2">{visitor.idNumber || '-'}</Typography>
                                  </Grid>
                                  <Grid size={{ xs: 12, md: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Department</Typography>
                                    <Typography variant="body2">{visitor.department || '-'}</Typography>
                                  </Grid>
                                  <Grid size={{ xs: 12, md: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Person To See</Typography>
                                    <Typography variant="body2">{visitor.personToSee || '-'}</Typography>
                                  </Grid>
                                  <Grid size={{ xs: 12, md: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Vehicle Reg</Typography>
                                    <Typography variant="body2">{visitor.vehicleRegistration || '-'}</Typography>
                                  </Grid>
                                  <Grid size={{ xs: 12, md: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Time In (EAT)</Typography>
                                    <Typography variant="body2">{formatEatTimestamp(visitor.timeIn)}</Typography>
                                  </Grid>
                                </Grid>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                      setSearchText(visitor.name || '');
                                      setAdminView('Visitors');
                                      setNotificationModalOpen(false);
                                    }}
                                  >
                                    View Visitor
                                  </Button>
                                  <Button
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                    onClick={() =>
                                      markExit(visitor.entity || 'visitors', visitor.recordId)
                                        .then(loadData)
                                        .then(() => notify(`Visitor ${visitor.name} marked as exited.`, 'success'))
                                        .catch((error) => notify(error.message, 'error'))
                                    }
                                  >
                                    Mark Exit
                                  </Button>
                                  <Button
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                    onClick={() => notify(`Escalation queued for ${visitor.name}.`, 'warning')}
                                  >
                                    Escalate
                                  </Button>
                                  <Button
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    onClick={() =>
                                      setDismissedOverstayIds((prev) =>
                                        prev.includes(visitor.recordId) ? prev : [...prev, visitor.recordId]
                                      )
                                    }
                                  >
                                    Dismiss
                                  </Button>
                                </Stack>
                              </Paper>
                            ))}
                          {!item.visitors?.filter((visitor) => !dismissedOverstayIds.includes(visitor.recordId)).length && (
                            <Typography variant="body2" color="text.secondary">
                              No active overstay alerts.
                            </Typography>
                          )}
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              setNotificationItems((prev) =>
                                prev.map((row) => (row.id === item.id ? { ...row, read: !row.read } : row))
                              )
                            }
                          >
                            {item.read ? 'Mark Unread' : 'Mark Read'}
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => setNotificationItems((prev) => prev.filter((row) => row.id !== item.id))}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </>
                    ) : (
                      <>
                        <Alert severity={item.level} variant="outlined" sx={{ mb: 1 }}>
                          {item.message}
                        </Alert>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              setNotificationItems((prev) =>
                                prev.map((row) => (row.id === item.id ? { ...row, read: !row.read } : row))
                              )
                            }
                          >
                            {item.read ? 'Mark Unread' : 'Mark Read'}
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => setNotificationItems((prev) => prev.filter((row) => row.id !== item.id))}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Typography color="text.secondary">No notifications available.</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotificationItems((prev) => prev.map((row) => ({ ...row, read: true })))}>
            Mark All Read
          </Button>
          <Button color="error" onClick={() => setNotificationItems([])}>
            Clear All
          </Button>
          <Button variant="contained" onClick={() => setNotificationModalOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={guardDialog.open} onClose={() => setGuardDialog({ open: false, mode: 'create', data: {} })} fullWidth maxWidth="sm">
        <DialogTitle>{guardDialog.mode === 'create' ? 'Add User' : 'Edit User'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Full Name" value={guardDialog.data.full_name || ''} onChange={(event) => setGuardDialog((prev) => ({ ...prev, data: { ...prev.data, full_name: event.target.value } }))} />
            <TextField label="Username" value={guardDialog.data.username || ''} onChange={(event) => setGuardDialog((prev) => ({ ...prev, data: { ...prev.data, username: event.target.value } }))} />
            <TextField label="Password" type="password" value={guardDialog.data.password || ''} onChange={(event) => setGuardDialog((prev) => ({ ...prev, data: { ...prev.data, password: event.target.value } }))} />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={guardDialog.data.role || 'guard'}
                onChange={(event) => setGuardDialog((prev) => ({ ...prev, data: { ...prev.data, role: event.target.value } }))}
                disabled={user.role !== 'admin'}
              >
                <MenuItem value="guard">Guard</MenuItem>
                {user.role === 'admin' && <MenuItem value="supervisor">Supervisor</MenuItem>}
              </Select>
            </FormControl>
            <FormControl fullWidth><InputLabel>Status</InputLabel><Select label="Status" value={guardDialog.data.status || 'active'} onChange={(event) => setGuardDialog((prev) => ({ ...prev, data: { ...prev.data, status: event.target.value } }))}><MenuItem value="active">Active</MenuItem><MenuItem value="disabled">Disabled</MenuItem></Select></FormControl>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setGuardDialog({ open: false, mode: 'create', data: {} })}>Cancel</Button><Button variant="contained" onClick={() => upsertGuard().catch((error) => notify(error.message, 'error'))}>Save</Button></DialogActions>
      </Dialog>

      <Dialog open={departmentDialog.open} onClose={() => setDepartmentDialog({ open: false, mode: 'create', data: {} })} fullWidth maxWidth="xs">
        <DialogTitle>{departmentDialog.mode === 'create' ? 'Create Department' : 'Edit Department'}</DialogTitle>
        <DialogContent><TextField fullWidth sx={{ mt: 1 }} label="Department Name" value={departmentDialog.data.name || ''} onChange={(event) => setDepartmentDialog((prev) => ({ ...prev, data: { ...prev.data, name: event.target.value } }))} /></DialogContent>
        <DialogActions><Button onClick={() => setDepartmentDialog({ open: false, mode: 'create', data: {} })}>Cancel</Button><Button variant="contained" onClick={() => upsertDepartment().catch((error) => notify(error.message, 'error'))}>Save</Button></DialogActions>
      </Dialog>

      <Dialog open={staffDialog.open} onClose={() => setStaffDialog({ open: false, mode: 'create', data: {} })} fullWidth maxWidth="sm">
        <DialogTitle>{staffDialog.mode === 'create' ? 'Create Staff Member' : 'Edit Staff Member'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Full Name" value={staffDialog.data.full_name || ''} onChange={(event) => setStaffDialog((prev) => ({ ...prev, data: { ...prev.data, full_name: event.target.value } }))} fullWidth />
            <FormControl fullWidth><InputLabel>Department</InputLabel><Select label="Department" value={staffDialog.data.department_id || ''} onChange={(event) => setStaffDialog((prev) => ({ ...prev, data: { ...prev.data, department_id: event.target.value } }))}>{departments.map((department) => (<MenuItem key={department.id} value={department.id}>{department.name}</MenuItem>))}</Select></FormControl>
            <TextField label="Title (Optional)" value={staffDialog.data.title || ''} onChange={(event) => setStaffDialog((prev) => ({ ...prev, data: { ...prev.data, title: event.target.value } }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setStaffDialog({ open: false, mode: 'create', data: {} })}>Cancel</Button><Button variant="contained" onClick={() => upsertStaff().catch((error) => notify(error.message, 'error'))}>Save</Button></DialogActions>
      </Dialog>
    </Box>
  );
}

export default App;
