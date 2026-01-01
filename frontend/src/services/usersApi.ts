import { api } from './api';

// User Management API Service

export interface User {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  role: 'admin' | 'accountant' | 'viewer';
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'accountant' | 'viewer';
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: 'admin' | 'accountant' | 'viewer';
}

/**
 * Get all users in the current tenant
 */
export const getUsers = async (includeInactive: boolean = false): Promise<User[]> => {
  const response = await api.get(`/users/`, {
    params: { include_inactive: includeInactive },
  });
  return response.data;
};

/**
 * Get a specific user by ID
 */
export const getUser = async (userId: string): Promise<User> => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

/**
 * Create a new user (admin only)
 */
export const createUser = async (userData: CreateUserRequest): Promise<User> => {
  const response = await api.post('/users/', userData);
  return response.data;
};

/**
 * Update a user's information (admin only)
 */
export const updateUser = async (
  userId: string,
  userData: UpdateUserRequest
): Promise<User> => {
  const response = await api.put(`/users/${userId}`, userData);
  return response.data;
};

/**
 * Deactivate a user (admin only)
 */
export const deactivateUser = async (userId: string): Promise<void> => {
  await api.delete(`/users/${userId}`);
};

/**
 * Reactivate a user (admin only)
 */
export const reactivateUser = async (userId: string): Promise<User> => {
  const response = await api.put(`/users/${userId}/reactivate`);
  return response.data;
};
