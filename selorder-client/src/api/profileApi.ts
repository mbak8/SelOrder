// src/api/profileApi.ts
import { apiClient } from './client'; // Importujemy klienta z pliku obok

// --- TYPY DANYCH ---
export interface UserProfile {
  userId: number;
  login: string;
  firstName: string;
  lastName: string;
  email: string;
  languageCode: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  email: string;
  languageCode: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

// --- LOGIKA API ---
export const profileApi = {
  // 1. Pobierz dane
  getProfile: async () => {
    const response = await apiClient.get<UserProfile>('/api/profile/me');
    return response.data;
  },

  // 2. Aktualizuj dane
  updateProfile: async (data: UpdateProfileRequest) => {
    const response = await apiClient.put('/api/profile/me', data);
    return response.data;
  },

  // 3. Zmień hasło
  changePassword: async (data: PasswordChange) => {
    const response = await apiClient.put('/api/profile/password', data);
    return response.data;
  }
};