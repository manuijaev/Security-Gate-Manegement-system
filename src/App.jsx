
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
import WorkIcon from '@mui/icons-material/Work';
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

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  // Header styled to match dark dashboard
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 60, 'F');

  doc.setTextColor(226, 232, 240);
  doc.setFontSize(16);
  doc.text(title, marginX, 30);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  const generatedAt = new Date().toLocaleString('en-KE', {
    timeZone: 'Africa/Nairobi'
  });
  doc.text(`Generated: ${generatedAt} (EAT)`, marginX, 46);
  doc.text(`Rows: ${rows.length}`, pageWidth - marginX - 80, 46);

  autoTable(doc, {
    startY: 70,
    head: [columns.map((column) => column.label)],
    body: pdfRows.map((record) => columns.map((column) => String(record[column.key] ?? '-'))),
    styles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: [226, 232, 240],
      fillColor: [15, 23, 42]
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [249, 250, 251],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [15, 23, 42]
    },
    theme: 'grid',
    didDrawPage: (data) => {
      const footerY = doc.internal.pageSize.getHeight() - 20;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Security Gate Management · ${title}`,
        marginX,
        footerY
      );
      doc.text(
        `Page ${doc.internal.getNumberOfPages()}`,
        pageWidth - marginX - 40,
        footerY
      );
    }
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
    { key: 'Repossessed Vehicles', icon: <InventoryIcon /> }
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
      { key: 'purpose_of_visit', label: 'Purpose of Visit', multiline: true }
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
      // Reset form fields so guard can capture the next record immediately
      const reset = {};
      template.forEach((field) => {
        reset[field.key] = '';
      });
      setFormData(reset);

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
    <Box
      sx={{
        p: 1.5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background:
          'radial-gradient(circle at 0 0, rgba(37, 99, 235, 0.45), transparent 55%)'
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{
          p: 1,
          mb: 1.5,
          borderRadius: 2.5,
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(148, 163, 184, 0.4)'
        }}
      >
        <Avatar
          sx={{
            bgcolor: 'info.main',
            width: 34,
            height: 34,
            boxShadow: '0 6px 14px rgba(37, 99, 235, 0.65)'
          }}
        >
          <AssignmentIndIcon fontSize="small" />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={800} fontSize={13}>
            Guard Workspace
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user.fullName}
          </Typography>
        </Box>
        <Chip
          size="small"
          label="On shift"
          color="success"
          variant="outlined"
          sx={{ borderRadius: 999, fontSize: 10, px: 0.5 }}
        />
      </Stack>

      <Typography
        variant="caption"
        sx={{
          textTransform: 'uppercase',
          letterSpacing: 2,
          color: 'text.secondary',
          px: 1,
          mb: 0.5
        }}
      >
        Views
      </Typography>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <List dense>
          {guardViews.map((view) => (
            <ListItemButton
              key={view.key}
              selected={activeView === view.key}
              onClick={() => {
                setActiveView(view.key);
                setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2.5,
                mb: 0.4,
                px: 1.2,
                py: 0.7,
                transition:
                  'background-color 140ms ease-out, transform 140ms cubic-bezier(.34,1.56,.64,1), box-shadow 140ms',
                '&.Mui-selected': {
                  background:
                    'linear-gradient(90deg, rgba(59, 130, 246, 0.9), rgba(34, 197, 94, 0.8))',
                  boxShadow: '0 10px 26px rgba(15, 23, 42, 0.9)'
                },
                '&.Mui-selected:hover': {
                  background:
                    'linear-gradient(90deg, rgba(59, 130, 246, 1), rgba(34, 197, 94, 1))'
                },
                '&:hover': {
                  transform: 'translateX(3px)',
                  backgroundColor: 'rgba(15, 23, 42, 0.9)'
                }
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 34,
                  color: 'inherit',
                  '& svg': { fontSize: 20 }
                }}
              >
                {view.icon}
              </ListItemIcon>
              <ListItemText
                primaryTypographyProps={{
                  fontSize: 13,
                  fontWeight: activeView === view.key ? 800 : 600
                }}
                primary={view.key}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Divider sx={{ my: 1.2 }} />
      <Button
        fullWidth
        variant="outlined"
        color="error"
        startIcon={<LogoutIcon />}
        onClick={onLogout}
        sx={{
          borderRadius: 999,
          textTransform: 'none',
          fontWeight: 700,
          py: 0.7,
          borderColor: 'rgba(248, 113, 113, 0.7)',
          '&:hover': {
            borderColor: 'rgba(248, 113, 113, 1)',
            backgroundColor: 'rgba(127, 29, 29, 0.6)'
          }
        }}
      >
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
    <Grid
      container
      spacing={2.5}
      sx={{
        alignItems: 'stretch',
        background:
          'radial-gradient(circle at 0 0, rgba(30, 64, 175, 0.55), transparent 55%), radial-gradient(circle at 100% 100%, rgba(22, 163, 74, 0.4), transparent 50%)',
        borderRadius: 3,
        p: 1.5
      }}
    >
      <Grid size={{ xs: 12, md: 7 }}>
        <Card
          sx={{
            background:
              'linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.98))',
            borderRadius: 3,
            border: '1px solid rgba(148, 163, 184, 0.7)',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(18px)'
          }}
        >
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
              <Button
                variant="contained"
                color="success"
                onClick={submitGuardForm}
                startIcon={<FactCheckIcon />}
              >
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
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Card
          sx={{
            background:
              'linear-gradient(160deg, rgba(15, 23, 42, 0.98), rgba(8, 47, 73, 0.96))',
            borderRadius: 3,
            border: '1px solid rgba(56, 189, 248, 0.5)',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(18px)'
          }}
        >
          <CardContent>
            {activeView === 'Register Visitor' && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 1.5 }} fontWeight={800}>
                  Visitors inside today
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Use this panel to quickly see who is already in the compound while you register a
                  new visitor.
                </Typography>
                <TableContainer component={Paper} sx={{ backgroundColor: '#020617', maxHeight: 260, overflowX: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Clock In</TableCell>
                        <TableCell>Subject</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {currentVisitors.slice(0, 6).map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatEatTimestamp(row.timeIn)}</TableCell>
                          <TableCell>{row.subject}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {activeView === 'Vehicle Entry' && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 1.5 }} fontWeight={800}>
                  Vehicles currently inside
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Check for duplicates before recording a new entry.
                </Typography>
                <TableContainer component={Paper} sx={{ backgroundColor: '#020617', maxHeight: 260, overflowX: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Clock In</TableCell>
                        <TableCell>Reg</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {currentVehicles.slice(0, 6).map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatEatTimestamp(row.timeIn)}</TableCell>
                          <TableCell>{row.subject}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {activeView === 'Deliveries' && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 1.5 }} fontWeight={800}>
                  Delivery tips
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Make sure the company, driver name, and vehicle registration are captured clearly.
                  You can match this later with exit records and reports.
                </Typography>
              </>
            )}

            {activeView === 'Yard Exit' && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 1.5 }} fontWeight={800}>
                  Remember approvals
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Always confirm supervisor approval and reasons before marking a vehicle as removed
                  from the yard.
                </Typography>
              </>
            )}

            {activeView === 'Repossessed Vehicles' && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 1.5 }} fontWeight={800}>
                  Condition notes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Capture visible damage and the recovery company accurately so repossessed records
                  line up with insurance or legal documentation.
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderDashboard = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 1.5
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={900}>
            Good {dayjs().hour() < 12 ? 'morning' : dayjs().hour() < 18 ? 'afternoon' : 'evening'},
            <Box component="span" sx={{ color: 'info.main', ml: 0.5 }}>
              {user.fullName}
            </Box>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Here is your live gate situation. Use the chips and cards to jump into actions.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip label="Guard dashboard" color="info" variant="outlined" size="small" />
          <Chip
            label={`${currentVisitors.length} inside · ${currentVehicles.length} vehicles`}
            size="small"
            sx={{ borderColor: 'rgba(148, 163, 184, 0.6)', color: 'text.secondary' }}
          />
        </Stack>
      </Box>

      <Grid container spacing={1.5}>
        {[
          {
            label: 'Visitors Today',
            value: summary.visitorsToday,
            helper: 'Checked in via this gate'
          },
          {
            label: 'Vehicles Logged',
            value: summary.vehiclesLogged,
            helper: 'Currently or recently inside'
          },
          {
            label: 'Deliveries',
            value: summary.deliveries,
            helper: 'Registered drop–offs'
          },
          {
            label: 'Yard Exits',
            value: summary.yardExits,
            helper: 'Vehicles removed'
          },
          {
            label: 'Repossessed',
            value: movements.filter((row) => row.type === 'Repossessed Vehicle').length,
            helper: 'Flagged units'
          }
        ].map((card) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              sx={{
                background: 'radial-gradient(circle at 0 0, #0B1120, #020617)',
                borderRadius: 3,
                border: '1px solid rgba(148, 163, 184, 0.25)',
                boxShadow: '0 10px 35px rgba(15, 23, 42, 0.65)',
                transform: 'translateY(0px)',
                transition: 'transform 180ms ease-out, box-shadow 180ms ease-out, border-color 180ms',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 18px 50px rgba(15, 23, 42, 0.9)',
                  borderColor: 'rgba(129, 140, 248, 0.7)'
                }
              }}
            >
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  {card.label}
                </Typography>
                <Typography variant="h4" sx={{ mt: 0.5 }}>
                  {card.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {card.helper}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {notifications.length > 0 && (
        <Card
          sx={{
            background:
              'linear-gradient(90deg, rgba(248, 113, 113, 0.12), rgba(251, 191, 36, 0.06))',
            border: '1px solid rgba(248, 113, 113, 0.6)',
            borderRadius: 3,
            boxShadow: '0 10px 30px rgba(127, 29, 29, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 2.5,
            py: 1.5
          }}
        >
          <Avatar sx={{ bgcolor: 'error.main', width: 40, height: 40 }}>
            <ReportProblemIcon />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {notifications.length} active alert
              {notifications.length > 1 ? 's' : ''} for overdue visitors or vehicles
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Open the exit screen to resolve them once confirmed.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="error"
            onClick={() => setActiveView('Visitor Exit')}
            sx={{
              borderRadius: 999,
              px: 2.5,
              textTransform: 'none',
              fontWeight: 800
            }}
          >
            Review now
          </Button>
        </Card>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
        <Card
          sx={{
            background:
              'radial-gradient(circle at 0 0, rgba(30, 64, 175, 0.9), rgba(15, 23, 42, 0.98))',
            borderRadius: 3,
            border: '1px solid rgba(59, 130, 246, 0.8)',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.9)',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: 0.12,
              background:
                'radial-gradient(circle at 20% 0%, rgba(59, 130, 246, 1), transparent 55%), radial-gradient(circle at 120% 120%, rgba(16, 185, 129, 1), transparent 55%)'
            }}
          />
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Avatar
                  sx={{
                    bgcolor: 'info.main',
                    width: 30,
                    height: 30,
                    boxShadow: '0 8px 18px rgba(37, 99, 235, 0.8)'
                  }}
                >
                  <AddIcon fontSize="small" />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={800}>
                    Quick Actions
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tap a card to open the right form.
                  </Typography>
                </Box>
                <Chip
                  label="Fast lane"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ borderRadius: 999 }}
                />
              </Stack>

              <Stack sx={{ mt: 2 }} spacing={1.2}>
                {quickActions.map((action, index) => (
                  <Button
                    key={action.label}
                    fullWidth
                    variant="outlined"
                    startIcon={action.icon}
                    onClick={() => setActiveView(action.target)}
                    sx={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      whiteSpace: 'normal',
                      lineHeight: 1.25,
                      borderRadius: 2,
                      borderColor: 'rgba(148, 163, 184, 0.6)',
                      color: '#E5E7EB',
                      px: 1.4,
                      py: 1,
                      transform: 'translateX(0) scale(1)',
                      transition:
                        'transform 200ms cubic-bezier(.34,1.56,.64,1), box-shadow 200ms, border-color 200ms, background-color 200ms',
                      boxShadow: '0 0 0 rgba(15, 23, 42, 0)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        background:
                          'linear-gradient(90deg, rgba(59, 130, 246, 0.25), transparent 55%)',
                        opacity: 0,
                        transform: 'translateX(-40%)',
                        transition: 'opacity 220ms ease-out, transform 220ms ease-out'
                      },
                      '& .MuiButton-startIcon': { color: 'inherit' },
                      '&:hover::before': {
                        opacity: 1,
                        transform: 'translateX(40%)'
                      },
                      '&:hover': {
                        borderColor: 'rgba(129, 140, 248, 0.9)',
                        transform: 'translateX(4px) scale(1.01)',
                        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.85)',
                        backgroundColor: 'rgba(15, 23, 42, 0.9)'
                      }
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ backgroundColor: '#020617', borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={800}>
                  Activity Feed
                </Typography>
                <Chip
                  label="Live"
                  size="small"
                  color="success"
                  variant="outlined"
                  icon={<CheckCircleOutlineIcon fontSize="small" />}
                />
              </Stack>
              <TableContainer
                component={Paper}
                sx={{
                  backgroundColor: '#0B1120',
                  maxHeight: 320,
                  overflowX: 'auto'
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Clock In (EAT)</TableCell>
                      <TableCell>Clock Out (EAT)</TableCell>
                      <TableCell>Activity</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {movements.slice(0, 10).map((row) => (
                      <TableRow
                        key={row.id}
                        hover
                        sx={{
                          transition: 'background-color 120ms ease-out, transform 120ms ease-out',
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            backgroundColor: 'rgba(30, 64, 175, 0.25)'
                          }
                        }}
                      >
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
      </Grid>
    </Box>
  );

  const renderExitTable = (rows, label) => (
    <Card sx={{ backgroundColor: '#020617' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1.5 }}>{label}</Typography>
        <TableContainer component={Paper} sx={{ backgroundColor: '#111827', overflowX: 'auto' }}>
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
        <TableContainer component={Paper} sx={{ backgroundColor: '#111827', overflowX: 'auto' }}>
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

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 1.2, sm: 2 }, mt: 8 }}>
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
    { key: 'Departments', icon: <WorkIcon /> },
    { key: 'Staff', icon: <AssignmentIndIcon /> },
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
        message: `New visitor registered: ${latestVisitorIn.subject} registered to see ${latestVisitorIn.personToSee}.`
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
    <Box
      sx={{
        p: 1.5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background:
          'radial-gradient(circle at 0 0, rgba(37, 99, 235, 0.5), transparent 55%)'
      }}
    >
      <Stack
        direction="row"
        spacing={1.2}
        alignItems="center"
        sx={{
          mb: 1.5,
          px: 1,
          py: 1,
          borderRadius: 2.5,
          backgroundColor: 'rgba(15, 23, 42, 0.96)',
          border: '1px solid rgba(148, 163, 184, 0.5)'
        }}
      >
        <Avatar
          sx={{
            bgcolor: 'info.main',
            width: 34,
            height: 34,
            boxShadow: '0 6px 16px rgba(37, 99, 235, 0.75)'
          }}
        >
          <DashboardIcon fontSize="small" />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={800} fontSize={13}>
            {user.role === 'admin' ? 'Admin Control Center' : 'Supervisor Console'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user.fullName}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={user.role === 'admin' ? 'Admin' : 'Supervisor'}
          color="success"
          variant="outlined"
          sx={{ borderRadius: 999, fontSize: 10 }}
        />
      </Stack>

      <Typography
        variant="caption"
        sx={{
          textTransform: 'uppercase',
          letterSpacing: 2,
          color: 'text.secondary',
          px: 1,
          mb: 0.5
        }}
      >
        Navigation
      </Typography>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <List dense>
          {sidebarItems.map((item) => (
            <ListItemButton
              key={item.key}
              selected={adminView === item.key}
              sx={{
                borderRadius: 2.5,
                mb: 0.4,
                px: 1.2,
                py: 0.7,
                transition:
                  'background-color 140ms ease-out, transform 140ms cubic-bezier(.34,1.56,.64,1), box-shadow 140ms',
                '&.Mui-selected': {
                  background:
                    'linear-gradient(90deg, rgba(59, 130, 246, 0.95), rgba(45, 212, 191, 0.9))',
                  boxShadow: '0 10px 26px rgba(15, 23, 42, 0.9)'
                },
                '&.Mui-selected:hover': {
                  background:
                    'linear-gradient(90deg, rgba(59, 130, 246, 1), rgba(45, 212, 191, 1))'
                },
                '&:hover': {
                  transform: 'translateX(3px)',
                  backgroundColor: 'rgba(15, 23, 42, 0.9)'
                }
              }}
              onClick={() => {
                setAdminView(item.key);
                setDrawerOpen(false);
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 34,
                  color: 'inherit',
                  '& svg': { fontSize: 20 }
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primaryTypographyProps={{
                  fontSize: 13,
                  fontWeight: adminView === item.key ? 800 : 600
                }}
                primary={item.key}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Divider sx={{ my: 1.5 }} />
      <Button
        fullWidth
        variant="outlined"
        color="error"
        startIcon={<LogoutIcon />}
        onClick={onLogout}
        sx={{
          borderRadius: 999,
          textTransform: 'none',
          fontWeight: 700,
          py: 0.7,
          borderColor: 'rgba(248, 113, 113, 0.7)',
          '&:hover': {
            borderColor: 'rgba(248, 113, 113, 1)',
            backgroundColor: 'rgba(127, 29, 29, 0.6)'
          }
        }}
      >
        Logout
      </Button>
    </Box>
  );

  const showDocumentColumns = adminView === 'Reports';
  const logsTable = (
    <TableContainer component={Paper} sx={{ backgroundColor: '#111827', overflowX: 'auto' }}>
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 1.5
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={900}>
              {user.role === 'admin' ? 'Admin overview' : 'Supervisor overview'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              High-level view of visitors, vehicles, and deliveries for {selectedDate}.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip
              label={user.role === 'admin' ? 'Admin mode' : 'Supervisor mode'}
              color="info"
              variant="outlined"
              size="small"
            />
            <Chip
              label={`${movements.length} movements`}
              size="small"
              sx={{ borderColor: 'rgba(148, 163, 184, 0.6)', color: 'text.secondary' }}
            />
          </Stack>
        </Box>

        <Grid container spacing={1.5}>
          {cards.map((card) => (
            <Grid key={card.label} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card
                sx={{
                  background: 'radial-gradient(circle at 0 0, #0B1120, #020617)',
                  borderRadius: 3,
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  boxShadow: '0 10px 35px rgba(15, 23, 42, 0.65)',
                  transform: 'translateY(0px)',
                  transition:
                    'transform 180ms ease-out, box-shadow 180ms ease-out, border-color 180ms',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 18px 50px rgba(15, 23, 42, 0.9)',
                    borderColor: 'rgba(129, 140, 248, 0.7)'
                  }
                }}
              >
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    {card.label}
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                    {card.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card
              sx={{
                background:
                  'linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.98))',
                borderRadius: 3,
                border: '1px solid rgba(148, 163, 184, 0.7)',
                boxShadow: '0 18px 40px rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(18px)'
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1.5 }}>
                  Operations Overview
                </Typography>
                <Stack spacing={1.2}>
                  {Object.entries(groupedCounts).map(([label, value]) => (
                    <Box key={label}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">{label}</Typography>
                        <Typography variant="body2">{value}</Typography>
                      </Stack>
                      <Box
                        sx={{
                          height: 8,
                          borderRadius: 999,
                          bgcolor: '#1F2937',
                          overflow: 'hidden'
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${Math.min(100, value * 10)}%`,
                            background:
                              'linear-gradient(90deg, rgba(59, 130, 246, 1), rgba(34, 197, 94, 1))'
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <Card
              sx={{
                backgroundColor: '#020617',
                borderRadius: 3,
                border: '1px solid rgba(30, 64, 175, 0.6)'
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1.5 }}>
                  Live Activity Feed
                </Typography>
                <TableContainer component={Paper} sx={{ backgroundColor: '#111827', overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Event</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {movements.slice(0, 10).map((row) => (
                        <TableRow
                          key={row.id}
                          hover
                          sx={{
                            transition:
                              'background-color 120ms ease-out, transform 120ms ease-out',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              backgroundColor: 'rgba(30, 64, 175, 0.25)'
                            }
                          }}
                        >
                          <TableCell>{formatEatTimestamp(row.timeIn)}</TableCell>
                          <TableCell>{`${row.type} - ${row.subject}`}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
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
          <TableContainer component={Paper} sx={{ backgroundColor: '#111827', overflowX: 'auto' }}>
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
  } else if (adminView === 'Departments') {
    content = (
      <Card sx={{ backgroundColor: '#020617' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">Departments / Divisions</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDepartmentDialog({ open: true, mode: 'create', data: {} })}>
              Add Department
            </Button>
          </Stack>
          <TableContainer component={Paper} sx={{ backgroundColor: '#111827', overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell>{dept.id}</TableCell>
                    <TableCell>{dept.name}</TableCell>
                    <TableCell>{formatEatTimestamp(dept.created_at)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() =>
                          setDepartmentDialog({
                            open: true,
                            mode: 'edit',
                            data: { id: dept.id, name: dept.name }
                          })
                        }
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => {
                          if (!window.confirm('Delete this department? Staff members in this department will also be deleted.')) return;
                          deleteDepartment(dept.id)
                            .then(loadData)
                            .then(() => notify('Department deleted.', 'success'))
                            .catch((error) => notify(error.message, 'error'));
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!departments.length && (
                  <TableRow>
                    <TableCell colSpan={4}>No departments found. Click "Add Department" to create one.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  } else if (adminView === 'Staff') {
    content = (
      <Card sx={{ backgroundColor: '#020617' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">Staff Members</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setStaffDialog({ open: true, mode: 'create', data: {} })} disabled={!departments.length}>
              Add Staff Member
            </Button>
          </Stack>
          {!departments.length && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Please create at least one department before adding staff members.
            </Alert>
          )}
          <TableContainer component={Paper} sx={{ backgroundColor: '#111827', overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Full Name</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staffMembers.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell>{staff.id}</TableCell>
                    <TableCell>{staff.full_name}</TableCell>
                    <TableCell>{staff.department_name}</TableCell>
                    <TableCell>{staff.title || '-'}</TableCell>
                    <TableCell>{formatEatTimestamp(staff.created_at)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() =>
                          setStaffDialog({
                            open: true,
                            mode: 'edit',
                            data: {
                              id: staff.id,
                              full_name: staff.full_name,
                              department_id: staff.department_id,
                              title: staff.title || ''
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
                          if (!window.confirm('Delete this staff member?')) return;
                          deleteStaff(staff.id)
                            .then(loadData)
                            .then(() => notify('Staff member deleted.', 'success'))
                            .catch((error) => notify(error.message, 'error'));
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!staffMembers.length && (
                  <TableRow>
                    <TableCell colSpan={6}>No staff members found. Click "Add Staff Member" to create one.</TableCell>
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
    content = (<Card sx={{ backgroundColor: '#020617' }}><CardContent><Typography variant="h6" sx={{ mb: 1.5 }}>Audit Logs</Typography><TableContainer component={Paper} sx={{ backgroundColor: '#111827', overflowX: 'auto' }}><Table size="small"><TableHead><TableRow><TableCell>Time</TableCell><TableCell>User</TableCell><TableCell>Action</TableCell></TableRow></TableHead><TableBody>{movements.slice(0, 20).map((row) => (<TableRow key={`audit-${row.id}`}><TableCell>{formatEatTimestamp(row.timeIn)}</TableCell><TableCell>{row.type === 'Visitor' ? 'Guard' : 'System'}</TableCell><TableCell>{`${row.type} record ${row.id} captured`}</TableCell></TableRow>))}</TableBody></Table></TableContainer></CardContent></Card>);
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

      <Box component="main" sx={{ flexGrow: 1, mt: 8, p: { xs: 1.2, sm: 2 } }}>{content}</Box>

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

      <Dialog
        open={guardDialog.open}
        onClose={() => setGuardDialog({ open: false, mode: 'create', data: {} })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {guardDialog.mode === 'create' ? 'Add User' : 'Edit User'}
        </DialogTitle>
        <DialogContent
          sx={{
            mt: 1,
            background:
              'radial-gradient(circle at 0 0, rgba(30, 64, 175, 0.5), rgba(15, 23, 42, 0.98))'
          }}
        >
          <Stack spacing={2.2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Full Name"
                fullWidth
                value={guardDialog.data.full_name || ''}
                onChange={(event) =>
                  setGuardDialog((prev) => ({
                    ...prev,
                    data: { ...prev.data, full_name: event.target.value }
                  }))
                }
              />
              <TextField
                label="Username"
                fullWidth
                value={guardDialog.data.username || ''}
                onChange={(event) =>
                  setGuardDialog((prev) => ({
                    ...prev,
                    data: { ...prev.data, username: event.target.value }
                  }))
                }
              />
            </Stack>
            <TextField
              label="Password"
              type="password"
              value={guardDialog.data.password || ''}
              onChange={(event) =>
                setGuardDialog((prev) => ({
                  ...prev,
                  data: { ...prev.data, password: event.target.value }
                }))
              }
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  label="Role"
                  value={guardDialog.data.role || 'guard'}
                  onChange={(event) =>
                    setGuardDialog((prev) => ({
                      ...prev,
                      data: { ...prev.data, role: event.target.value }
                    }))
                  }
                  disabled={user.role !== 'admin'}
                >
                  <MenuItem value="guard">Guard</MenuItem>
                  {user.role === 'admin' && (
                    <MenuItem value="supervisor">Supervisor</MenuItem>
                  )}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={guardDialog.data.status || 'active'}
                  onChange={(event) =>
                    setGuardDialog((prev) => ({
                      ...prev,
                      data: { ...prev.data, status: event.target.value }
                    }))
                  }
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="disabled">Disabled</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setGuardDialog({ open: false, mode: 'create', data: {} })}
            sx={outlinedLightButtonSx}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => upsertGuard().catch((error) => notify(error.message, 'error'))}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={departmentDialog.open}
        onClose={() => setDepartmentDialog({ open: false, mode: 'create', data: {} })}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {departmentDialog.mode === 'create' ? 'Create Department' : 'Edit Department'}
        </DialogTitle>
        <DialogContent
          sx={{
            mt: 1,
            background:
              'radial-gradient(circle at 0 0, rgba(45, 212, 191, 0.4), rgba(15, 23, 42, 0.98))'
          }}
        >
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Department Name"
              value={departmentDialog.data.name || ''}
              onChange={(event) =>
                setDepartmentDialog((prev) => ({
                  ...prev,
                  data: { ...prev.data, name: event.target.value }
                }))
              }
            />
            <TextField
              fullWidth
              label="Description (optional)"
              value={departmentDialog.data.description || ''}
              multiline
              rows={2}
              onChange={(event) =>
                setDepartmentDialog((prev) => ({
                  ...prev,
                  data: { ...prev.data, description: event.target.value }
                }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDepartmentDialog({ open: false, mode: 'create', data: {} })}
            sx={outlinedLightButtonSx}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => upsertDepartment().catch((error) => notify(error.message, 'error'))}
          >
            Save
          </Button>
        </DialogActions>
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
