import api from './axiosConfig';
import { AiSettings } from '../types';

export const aiSettingsApi = {
  get: () => api.get<AiSettings>('/ai-settings').then(r => r.data),
  update: (dto: AiSettings) => api.put<AiSettings>('/ai-settings', dto).then(r => r.data),
};
