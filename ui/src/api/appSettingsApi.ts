import api from './axiosConfig';
import { AppSettings } from '../types';

export const appSettingsApi = {
  get: () => api.get<AppSettings>('/app-settings').then(r => r.data),
  update: (dto: AppSettings) => api.put<AppSettings>('/app-settings', dto).then(r => r.data),
};
