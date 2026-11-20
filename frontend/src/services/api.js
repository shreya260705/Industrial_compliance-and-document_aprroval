import axios from 'axios';
import { loadBusinessLocations } from '../utils/facilityLocations.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject JWT Bearer Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bizpermit_access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Expiration & Rotation
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('bizpermit_refresh_token');

      if (!refreshToken || originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/refresh')) {
        localStorage.removeItem('bizpermit_access_token');
        localStorage.removeItem('bizpermit_refresh_token');
        localStorage.removeItem('bizpermit_user');
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const newTokens = refreshResponse.data?.data;
        if (newTokens?.access_token) {
          localStorage.setItem('bizpermit_access_token', newTokens.access_token);
          if (newTokens.refresh_token) {
            localStorage.setItem('bizpermit_refresh_token', newTokens.refresh_token);
          }
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${newTokens.access_token}`;
          originalRequest.headers['Authorization'] = `Bearer ${newTokens.access_token}`;
          processQueue(null, newTokens.access_token);
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('bizpermit_access_token');
        localStorage.removeItem('bizpermit_refresh_token');
        localStorage.removeItem('bizpermit_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (payload) => apiClient.post('/auth/register', payload),
  login: (payload) => apiClient.post('/auth/login', payload),
  requestPasswordReset: (email) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (payload) => apiClient.post('/auth/reset-password', payload),
  getProfile: () => apiClient.get('/auth/me'),
  refreshToken: (refreshToken) => apiClient.post('/auth/refresh', { refresh_token: refreshToken }),
  logout: (refreshToken) => apiClient.post('/auth/logout', { refresh_token: refreshToken }),
};

export const businessAPI = {
  list: () => apiClient.get('/businesses'),
  create: (data) => apiClient.post('/businesses', data),
  get: (id) => apiClient.get(`/businesses/${id}`),
  update: (id, data) => apiClient.patch(`/businesses/${id}`, data),
  delete: (id) => apiClient.delete(`/businesses/${id}`),
  listLocations: (businessId) => apiClient.get(`/businesses/${businessId}/locations`),
  createLocation: (businessId, data) => apiClient.post(`/businesses/${businessId}/locations`, data),
};

export const locationAPI = {
  get: (id) => apiClient.get(`/locations/${id}`),
  update: (id, data) => apiClient.patch(`/locations/${id}`, data),
  delete: (id) => apiClient.delete(`/locations/${id}`),
  evaluate: (id, payload = {}) => apiClient.post(`/locations/${id}/evaluate`, payload),
  getApprovals: (id) => apiClient.get(`/locations/${id}/approvals`),
};

export const documentAPI = {
  list: (params = {}) => apiClient.get('/documents', { params }),
  get: (id) => apiClient.get(`/documents/${id}`),
  uploadSession: (data) => apiClient.post('/documents/upload-session', data),
  confirmUpload: (data) => apiClient.post('/documents/confirm-upload', data),
  directUpload: (formData) => apiClient.post('/documents/direct-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  preview: (id) => apiClient.get(`/documents/${id}/preview`),
  download: (id) => apiClient.get(`/documents/${id}/download`),
  update: (id, data) => apiClient.patch(`/documents/${id}`, data),
  delete: (id) => apiClient.delete(`/documents/${id}`),
  verify: (id, data) => apiClient.post(`/documents/${id}/verify`, data),
  resubmit: (id, formData) => apiClient.post(`/documents/${id}/resubmit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  assign: (id, data) => apiClient.post(`/documents/${id}/assign`, data),
};

export const jurisdictionAPI = {
  getStates: () => apiClient.get('/jurisdictions/states'),
  getDetail: (code) => apiClient.get(`/jurisdictions/${code}`),
  getChildren: (code) => apiClient.get(`/jurisdictions/${code}/children`),
  getHierarchy: (code) => apiClient.get(`/jurisdictions/${code}/hierarchy`),
};

export const departmentAPI = {
  list: (params = {}) => apiClient.get('/departments', { params }),
  get: (code) => apiClient.get(`/departments/${code}`),
  create: (data) => apiClient.post('/departments', data),
};

export const approvalAPI = {
  list: (params = {}) => apiClient.get('/approvals', { params }),
  get: (code) => apiClient.get(`/approvals/${code}`),
  create: (data) => apiClient.post('/approvals', data),
};

export const kyaAPI = {
  evaluate: (payload) => apiClient.post('/kya/evaluate', payload),
};

export const applicationAPI = {
  list: (params = {}) => apiClient.get('/applications', { params }),
  getMetrics: (params = {}) => apiClient.get('/applications/metrics', { params }),
  create: (data) => apiClient.post('/applications', data),
  get: (id) => apiClient.get(`/applications/${id}`),
  update: (id, data) => apiClient.patch(`/applications/${id}`, data),
  delete: (id) => apiClient.delete(`/applications/${id}`),
  submit: (id, data = {}) => apiClient.post(`/applications/${id}/submit`, data),
  attachDocument: (id, vaultDocId) => apiClient.post(`/applications/${id}/attachments`, { vault_document_id: vaultDocId }),
  removeAttachment: (id, vaultDocId) => apiClient.delete(`/applications/${id}/attachments/${vaultDocId}`),
  downloadAcknowledgement: (id) => apiClient.get(`/applications/${id}/acknowledgement`, { responseType: 'blob' }),
  respondClarification: (id, data) => apiClient.post(`/applications/${id}/respond-clarification`, data),
  assign: (id, data) => apiClient.post(`/applications/${id}/assign`, data),
};

export const officerAPI = {
  listQueue: (params = {}) => apiClient.get('/officer/applications', { params }),
  getDetail: (id) => apiClient.get(`/officer/applications/${id}`),
  action: (id, data) => apiClient.post(`/officer/applications/${id}/action`, data),
  getDashboardMetrics: () => apiClient.get('/admin/officer/metrics'),
};

export const notificationAPI = {
  list: (params = {}) => apiClient.get('/notifications', { params }),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.post('/notifications/read-all'),
};

export const complianceAPI = {
  listObligations: (params = {}) => apiClient.get('/compliance/obligations', { params }),
  getObligation: (id) => apiClient.get(`/compliance/obligations/${id}`),
  createObligation: (data) => apiClient.post('/compliance/obligations', data),
  updateObligation: (id, data) => apiClient.patch(`/compliance/obligations/${id}`, data),
  deleteObligation: (id) => apiClient.delete(`/compliance/obligations/${id}`),
  generateForLocation: (locationId) => apiClient.post(`/compliance/locations/${locationId}/generate`),
  confirmDate: (id, data) => apiClient.post(`/compliance/obligations/${id}/confirm-date`, data),
  completeObligation: (id, data) => apiClient.post(`/compliance/obligations/${id}/complete`, data),
  reviewObligation: (id, recordId, data) => apiClient.post(`/compliance/obligations/${id}/records/${recordId}/review`, data),
  getCalendarEvents: (params = {}) => apiClient.get('/compliance/calendar', { params }),
  getMetrics: (params = {}) => apiClient.get('/compliance/metrics', { params }),
  getRenewals: (params = {}) => apiClient.get('/compliance/renewals', { params }),
  getAdminOverview: (params = {}) => apiClient.get('/compliance/admin/overview', { params }),
  getAdminTemplates: (params = {}) => apiClient.get('/compliance/admin/templates', { params }),
};

export const schemeAPI = {
  list: (params = {}) => apiClient.get('/schemes/', { params }),
  get: (code) => apiClient.get(`/schemes/${code}/`),
  evaluate: (data) => apiClient.post('/schemes/evaluate/', data),
  getRecommendations: (params = {}) => apiClient.get('/schemes/recommendations/', { params }),
};

export const schemeApplicationAPI = {
  list: (params = {}) => apiClient.get('/scheme-applications/', { params }),
  create: (data) => apiClient.post('/scheme-applications/', data),
  get: (id) => apiClient.get(`/scheme-applications/${id}/`),
  update: (id, data) => apiClient.patch(`/scheme-applications/${id}/`, data),
  attachDocument: (id, data) => apiClient.post(`/scheme-applications/${id}/documents/`, data),
  removeDocument: (id, vaultDocId) => apiClient.delete(`/scheme-applications/${id}/documents/${vaultDocId}/`),
  attest: (id, data) => apiClient.post(`/scheme-applications/${id}/attest/`, data),
  respondClarification: (id, data) => apiClient.post(`/scheme-applications/${id}/respond-clarification/`, data),
  withdrawReview: (id, data) => apiClient.post(`/scheme-applications/${id}/withdraw/`, data),
};

export const officerSchemeReviewAPI = {
  getQueue: (params = {}) => apiClient.get('/officer/scheme-reviews/', { params }),
  getDetail: (id) => apiClient.get(`/officer/scheme-reviews/${id}/`),
  assignReview: (id, data = {}) => apiClient.post(`/officer/scheme-reviews/${id}/assign/`, data),
  startReview: (id, data = {}) => apiClient.post(`/officer/scheme-reviews/${id}/start/`, data),
  requestClarification: (id, data) => apiClient.post(`/officer/scheme-reviews/${id}/clarification/`, data),
  completeReview: (id, data) => apiClient.post(`/officer/scheme-reviews/${id}/complete/`, data),
  referForManualReview: (id, data) => apiClient.post(`/officer/scheme-reviews/${id}/refer/`, data),
};

export const adminSchemeReviewAPI = {
  getOversight: (params = {}) => apiClient.get('/admin/scheme-reviews/oversight/', { params }),
  reassignReview: (id, data) => apiClient.post(`/admin/scheme-reviews/${id}/reassign/`, data),
};

export const adminSchemeAPI = {
  list: (params = {}) => apiClient.get('/admin/schemes/', { params }),
  get: (code) => apiClient.get(`/admin/schemes/${code}/`),
  create: (data) => apiClient.post('/admin/schemes/', data),
  update: (code, data) => apiClient.patch(`/admin/schemes/${code}/`, data),
  createRuleVersion: (code, data) => apiClient.post(`/admin/schemes/${code}/rules/`, data),
  submitVerification: (code, data) => apiClient.post(`/admin/schemes/${code}/submit-verification/`, data),
  verify: (code, data) => apiClient.post(`/admin/schemes/${code}/verify/`, data),
  activate: (code, data) => apiClient.post(`/admin/schemes/${code}/activate/`, data),
  getHistory: (code) => apiClient.get(`/admin/schemes/${code}/history/`),
};

export const facilitiesAPI = {
  list: async () => {
    const businessResponse = await businessAPI.list();
    const businesses = businessResponse.data?.data;
    const locations = await loadBusinessLocations(
      businesses,
      (businessId) => businessAPI.listLocations(businessId)
    );
    return { data: { data: locations } };
  }
};

export const documentVaultAPI = documentAPI;

export const grievancesAPI = {
  list: (params = {}) => apiClient.get('/grievances/', { params }),
  get: (id) => apiClient.get(`/grievances/${id}/`),
  getDetail: (id) => apiClient.get(`/grievances/${id}/`),
  create: (data) => apiClient.post('/grievances/', data),
  respondClarification: (id, data) => apiClient.post(`/grievances/${id}/respond-clarification/`, data),
  reopen: (id, data) => apiClient.post(`/grievances/${id}/reopen/`, data),
  withdraw: (id, data) => apiClient.post(`/grievances/${id}/withdraw/`, data),
  feedback: (id, data) => apiClient.post(`/grievances/${id}/feedback/`, data),
  categories: (params = {}) => apiClient.get('/grievances/categories/', { params }),
};

export const officerGrievancesAPI = {
  queue: (params = {}) => apiClient.get('/officer/grievances/', { params }),
  get: (id) => apiClient.get(`/officer/grievances/${id}/`),
  getDetail: (id) => apiClient.get(`/officer/grievances/${id}/`),
  assign: (id, data = {}) => apiClient.post(`/officer/grievances/${id}/assign/`, data),
  selfAssign: (id, data = {}) => apiClient.post(`/officer/grievances/${id}/assign/`, data),
  startReview: (id, data = {}) => apiClient.post(`/officer/grievances/${id}/start-review/`, data),
  clarification: (id, data) => apiClient.post(`/officer/grievances/${id}/clarification/`, data),
  requestClarification: (id, data) => apiClient.post(`/officer/grievances/${id}/clarification/`, data),
  notes: (id, data) => apiClient.post(`/officer/grievances/${id}/notes/`, data),
  addNote: (id, data) => apiClient.post(`/officer/grievances/${id}/notes/`, data),
  proposeResolution: (id, data) => apiClient.post(`/officer/grievances/${id}/propose-resolution/`, data),
  resolve: (id, data) => apiClient.post(`/officer/grievances/${id}/resolve/`, data),
  close: (id, data = {}) => apiClient.post(`/officer/grievances/${id}/close/`, data),
  escalate: (id, data) => apiClient.post(`/officer/grievances/${id}/escalate/`, data),
};

export const adminGrievancesAPI = {
  oversight: (params = {}) => apiClient.get('/admin/grievances/oversight/', { params }),
  getOversight: (params = {}) => apiClient.get('/admin/grievances/oversight/', { params }),
  listAll: (params = {}) => apiClient.get('/admin/grievances/oversight/', { params }),
  reassign: (id, data) => apiClient.post(`/admin/grievances/${id}/reassign/`, data),
  categories: (params = {}) => apiClient.get('/admin/grievances/categories/', { params }),
  listCategories: (params = {}) => apiClient.get('/admin/grievances/categories/', { params }),
  createCategory: (data) => apiClient.post('/admin/grievances/categories/', data),
  escalationRules: (params = {}) => apiClient.get('/admin/grievances/escalation-rules/', { params }),
  listEscalationRules: (params = {}) => apiClient.get('/admin/grievances/escalation-rules/', { params }),
  createEscalationRule: (data) => apiClient.post('/admin/grievances/escalation-rules/', data),
  updateEscalationRule: (code, data) => apiClient.put(`/admin/grievances/escalation-rules/${code}/`, data),
  audit: (params = {}) => apiClient.get('/admin/grievances/audit/', { params }),
  listAuditLogs: (params = {}) => apiClient.get('/admin/grievances/audit/', { params }),
  exportCSV: () => apiClient.get('/admin/grievances/export/csv/', { responseType: 'blob' }),
};

export const healthAPI = {
  check: () => apiClient.get('/health'),
};

export const adminAPI = {
  getPlatformOverview: () => apiClient.get('/admin/platform-overview'),
  listUsers: (params = {}) => apiClient.get('/admin/users', { params }),
  getUserDetail: (id) => apiClient.get(`/admin/users/${id}`),
  updateUserStatus: (id, data) => apiClient.patch(`/admin/users/${id}/status`, data),
  listOfficers: (params = {}) => apiClient.get('/admin/officers', { params }),
  createOfficer: (data) => apiClient.post('/admin/officers', data),
  updateOfficer: (id, data) => apiClient.put(`/admin/officers/${id}`, data),
  listJurisdictions: (params = {}) => apiClient.get('/admin/jurisdictions', { params }),
  createJurisdiction: (data) => apiClient.post('/admin/jurisdictions', data),
  updateJurisdiction: (code, data) => apiClient.put(`/admin/jurisdictions/${code}`, data),
  listApplications: (params = {}) => apiClient.get('/admin/applications', { params }),
  listAuditLogs: (params = {}) => apiClient.get('/admin/audit-logs', { params }),
  listDepartments: (params = {}) => apiClient.get('/departments', { params }),
  getDepartments: (params = {}) => apiClient.get('/departments', { params }),
  createDepartment: (data) => apiClient.post('/departments', data),
  updateDepartment: (code, data) => apiClient.put(`/departments/${code}`, data),
};

export default apiClient;
