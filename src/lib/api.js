const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

let authToken = localStorage.getItem('sgm_token') || '';

export function setToken(token) {
  authToken = token || '';
  if (authToken) {
    localStorage.setItem('sgm_token', authToken);
  } else {
    localStorage.removeItem('sgm_token');
  }
}

export function getToken() {
  return authToken;
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}

export function login(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export function getCurrentUser() {
  return request('/auth/me');
}

export function logout() {
  return request('/auth/logout', { method: 'POST' });
}

export function changePassword(payload) {
  return request('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) });
}

export function getSummary(date) {
  return request(`/dashboard/summary?date=${date}`);
}

export function getMovements({ date, search, type, department }) {
  const params = new URLSearchParams({ date, search, type, department });
  return request(`/movements?${params.toString()}`);
}

export function getDepartments() {
  return request('/departments');
}

export function getStaff({ department = '', search = '' } = {}) {
  const params = new URLSearchParams({ department, search });
  return request(`/staff?${params.toString()}`);
}

export function markExit(entity, recordId) {
  return request(`/movements/${entity}/${recordId}/exit`, { method: 'POST' });
}

export function deleteMovement(entity, recordId) {
  return request(`/admin/movements/${entity}/${recordId}`, { method: 'DELETE' });
}

export function getAnalytics(date) {
  return request(`/admin/analytics?date=${date}`);
}

export function getGuards() {
  return request('/admin/guards');
}

export function createGuard(payload) {
  return request('/admin/guards', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateGuard(id, payload) {
  return request(`/admin/guards/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteGuard(id) {
  return request(`/admin/guards/${id}`, { method: 'DELETE' });
}

export function getAdminDepartments() {
  return request('/admin/departments');
}

export function createDepartment(payload) {
  return request('/admin/departments', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateDepartment(id, payload) {
  return request(`/admin/departments/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteDepartment(id) {
  return request(`/admin/departments/${id}`, { method: 'DELETE' });
}

export function getAdminStaff() {
  return request('/admin/staff');
}

export function createStaff(payload) {
  return request('/admin/staff', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateStaff(id, payload) {
  return request(`/admin/staff/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteStaff(id) {
  return request(`/admin/staff/${id}`, { method: 'DELETE' });
}

export function createVisitor(payload) {
  return request('/visitors', { method: 'POST', body: JSON.stringify(payload) });
}

export function createVehicleEntry(payload) {
  return request('/vehicle-entries', { method: 'POST', body: JSON.stringify(payload) });
}

export function createDelivery(payload) {
  return request('/deliveries', { method: 'POST', body: JSON.stringify(payload) });
}

export function createYardExit(payload) {
  return request('/yard-exits', { method: 'POST', body: JSON.stringify(payload) });
}

export function createRepossessedVehicle(payload) {
  return request('/repossessed-vehicles', { method: 'POST', body: JSON.stringify(payload) });
}

export function getGuardNotifications() {
  return request('/guard/notifications');
}
