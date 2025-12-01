import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Helper: get stored user safely
const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (e) {
    return {};
  }
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // optional: short timeout to avoid hanging requests during dev
  timeout: 20000,
});

// Request interceptor: attach access token if present
api.interceptors.request.use(
  (config) => {
    const user = getStoredUser();
    if (user.access_token) {
      // ensure header object exists
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${user.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: improved logging + refresh token flow
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If there's no response (network error / CORS), log it clearly
    if (!error.response) {
      console.error('Network / CORS error:', error.message, error);
      // bubble up so caller can show an error
      return Promise.reject(error);
    }

    const { status, data, config: originalRequest } = error.response;

    console.error('API response error:', {
      status,
      url: originalRequest?.url,
      method: originalRequest?.method,
      requestData: originalRequest?.data,
      responseData: data,
      headers: error.response.headers,
    });

    // 401 handling & refresh flow
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const user = getStoredUser();

      // IMPORTANT: try to use a refresh_token (not the access_token) if available
      const refreshToken = user.refresh_token;
      if (!refreshToken) {
        // No refresh token: force logout
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // call refresh endpoint with refresh_token in Authorization or body depending on your backend
        // adjust as required by your backend auth contract
        const refreshResp = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken
        }, {
          headers: { 'Content-Type': 'application/json' }
        });

        // Expect new tokens in refreshResp.data
        const newAccessToken = refreshResp.data.access_token;
        const newRefreshToken = refreshResp.data.refresh_token || refreshToken;

        // Update localStorage
        const newUser = { ...user, access_token: newAccessToken, refresh_token: newRefreshToken };
        localStorage.setItem('user', JSON.stringify(newUser));

        // Attach new token and retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        console.error('Token refresh failed:', refreshErr.response?.data || refreshErr.message || refreshErr);
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }

    // For other statuses, just reject but we've logged details above
    return Promise.reject(error);
  }
);

// --------------------- API definitions (unchanged usage) --------------------- //
// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => {
    // Since we're not using JWT, just return success
    return Promise.resolve({ data: { message: 'Logged out successfully' } });
  },
  getCurrentUser: () => api.get('/auth/me'),
  refreshToken: (payload) => api.post('/auth/refresh', payload),
  getUsers: () => api.get('/auth/users'),
};

// Assets API
export const assetsAPI = {
  getAll: (params) => api.get('/assets', { params }),
  create: (data) => api.post('/assets', data),
  update: (id, data) => api.put(`/assets/${id}`, data),
  delete: (id) => api.delete(`/assets/${id}`),
  getHistory: (id) => api.get(`/assets/${id}/history`),
  getSummary: () => api.get('/assets/stats/summary'),
};

// Topology API
export const topologyAPI = {
  getCustomer: (id) => api.get(`/topology/customer/${id}`),
  getFDH: (id) => api.get(`/topology/fdh/${id}`),
  searchDevice: (serial) => api.get(`/topology/search/device/${serial}`),
  getHeadends: () => api.get('/topology/headends'),
  getFDHs: () => api.get('/topology/fdhs'),
  getSplitters: (fdhId) => api.get('/topology/splitters', { params: { fdh_id: fdhId } }),
};

// Customers API
export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  get: (id) => api.get(`/customers/${id}`),
  getDetails: (id) => api.get(`/customers/${id}/details`),
  create: (data) => api.post('/customers', data),
  onboard: (data) => api.post('/customers/onboard', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  deactivate: (id, reason) => api.post(`/customers/${id}/deactivate`, null, { params: { reason } }),
  activate: (id) => api.post(`/customers/${id}/activate`),
  getAvailablePorts: (splitterId) => api.get(`/customers/splitter/${splitterId}/available-ports`),
  assignAssets: (customerId, ontId, routerId) =>
    api.post(`/customers/${customerId}/assign-assets`, null, { params: { ont_id: ontId, router_id: routerId } }),
};

// Deployment API
export const deploymentAPI = {
  getTasks: (params) => api.get('/deployment/tasks', { params }),
  getTask: (id) => {
    if (!id && id !== 0) throw new Error('getTask called with undefined id');
    return api.get(`/deployment/tasks/${id}`);
  },
  createTask: (data) => api.post('/deployment/tasks', data),
  updateTask: (id, data) => api.patch(`/deployment/tasks/${id}`, data),
  updateStatus: (id, data) => api.patch(`/deployment/tasks/${id}/status`, data),
  addNotes: (id, notes) => {
  if (!id && id !== 0) throw new Error('addNotes called with undefined id');
  return api.post(`/deployment/tasks/${id}/notes`, { notes });
},
  deleteTask: (id) => api.delete(`/deployment/tasks/${id}`),
  getMyTasks: (userId) => api.get(`/deployment/my-tasks/${userId}`),
  getTechnicians: () => api.get('/deployment/technicians'),
  getStats: () => api.get('/deployment/stats/summary'),
  updateTaskStatus: (taskId, status, notes = null) => {
    if (!taskId && taskId !== 0) throw new Error('updateTaskStatus called with undefined taskId');
    // Prefer JSON body if backend expects it — change to {status, notes} body if needed
    return api.patch(`/deployment/tasks/${taskId}/status`, { status, notes });
  },
};

// Lifecycle API
export const lifecycleAPI = {
  reclaimAssets: (customerId) => api.post(`/lifecycle/reclaim/${customerId}`),
  reassignAsset: (assetId, newCustomerId) =>
    api.post(`/lifecycle/reassign/${assetId}`, null, { params: { new_customer_id: newCustomerId } }),
  replaceFaulty: (oldAssetId, newAssetId) =>
    api.post('/lifecycle/replace-faulty', null, { params: { old_asset_id: oldAssetId, new_asset_id: newAssetId } }),
  retireAsset: (assetId, reason) => api.post(`/lifecycle/retire/${assetId}`, null, { params: { reason } }),
  getAssetDetails: (assetId) => api.get(`/lifecycle/asset/${assetId}/details`),
  getUtilizationStats: () => api.get('/lifecycle/stats/utilization'),
  getAssetLifecycle: (assetId) => api.get(`/lifecycle/asset/${assetId}/details`),
  getInactiveCustomers: () => api.get('/lifecycle/inactive-customers'), 
  replaceFaultyAsset: (oldAssetId, newAssetId) =>  // Add alias for consistency
    api.post('/lifecycle/replace-faulty', null, { params: { old_asset_id: oldAssetId, new_asset_id: newAssetId } }), 
};

// Audit API
export const auditAPI = {
  getLogs: (params) => api.get('/audit/logs', { params }),
  getLog: (id) => api.get(`/audit/logs/${id}`),
  getUserActivity: (userId, days) => api.get(`/audit/user/${userId}/activity`, { params: { days } }),
  getSummary: (days) => api.get('/audit/stats/summary', { params: { days } }),
  exportLogs: (params) => api.get('/audit/export', { params }),
};

// Dashboard API
export const dashboardAPI = {
  getPlanner: (userId) => api.get(`/dashboards/planner/${userId}`),
  getTechnician: (userId) => api.get(`/dashboards/technician/${userId}`),
  getAdmin: (userId) => api.get(`/dashboards/admin/${userId}`),
  getSupport: (userId) => api.get(`/dashboards/support/${userId}`),
};

// AI Assistant
export const aiAPI = {
  chat: (message, context, role) => api.post('/ai-assistant/chat', { message, context, role }),
  getSuggestions: (role) => api.get(`/ai-assistant/suggestions/${role}`),
  getQuickActions: (role) => api.get(`/ai-assistant/quick-actions/${role}`),
  healthCheck: () => api.get('/ai-assistant/health'),
};

export default api;
