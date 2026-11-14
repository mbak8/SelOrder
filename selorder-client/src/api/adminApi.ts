import { apiClient } from './client';

// --- TYPY (zgodne z DTO z selorder-server/DTOs/AdminDto.cs) ---

export interface Tenant {
  id: string;
  code: string;
  companyName: string;
  isActive: boolean;
  isMaster: boolean;
  createdAt: string;
  userCount: number;
}

export interface CreateTenantRequest {
  code: string;
  companyName: string;
  isActive: boolean;
}

// Kod klienta jest nadawany tylko przy tworzeniu (trafia do numerów zamówień)
export interface UpdateTenantRequest {
  companyName: string;
  isActive: boolean;
}

export interface AdminUser {
  id: number;
  login: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string;
  isActive: boolean;
}

export interface CreateUserRequest {
  login: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string;
  password: string;
  isActive: boolean;
}

// Puste newPassword = hasło bez zmian
export interface UpdateUserRequest {
  login: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string;
  isActive: boolean;
  newPassword: string | null;
}

export interface PagedResponse<T> {
  items: T[];
  totalItems: number;
  pageSize: number;
  pageNumber: number;
  totalPages: number;
}

// Minimalna długość hasła - taka sama jak AdminService.MinPasswordLength na serwerze
export const MIN_PASSWORD_LENGTH = 8;

// --- API (panel administratora, tylko tenant nadrzędny) ---

export const adminApi = {
  getTenants: async (params: Record<string, string | number>) => {
    const response = await apiClient.get<PagedResponse<Tenant>>('/api/admin/tenants', { params });
    return response.data;
  },

  getTenant: async (id: string) => {
    const response = await apiClient.get<Tenant>(`/api/admin/tenants/${id}`);
    return response.data;
  },

  createTenant: async (data: CreateTenantRequest) => {
    const response = await apiClient.post<Tenant>('/api/admin/tenants', data);
    return response.data;
  },

  updateTenant: async (id: string, data: UpdateTenantRequest) => {
    await apiClient.put(`/api/admin/tenants/${id}`, data);
  },

  getUsers: async (tenantId: string) => {
    const response = await apiClient.get<AdminUser[]>(`/api/admin/tenants/${tenantId}/users`);
    return response.data;
  },

  createUser: async (tenantId: string, data: CreateUserRequest) => {
    const response = await apiClient.post<AdminUser>(`/api/admin/tenants/${tenantId}/users`, data);
    return response.data;
  },

  updateUser: async (tenantId: string, userId: number, data: UpdateUserRequest) => {
    await apiClient.put(`/api/admin/tenants/${tenantId}/users/${userId}`, data);
  }
};
