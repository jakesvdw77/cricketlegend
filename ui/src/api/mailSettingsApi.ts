import api from './axiosConfig';
import { MailSettings } from '../types';

export const mailSettingsApi = {
  get: () => api.get<MailSettings>('/mail-settings').then(r => r.data),
  update: (dto: MailSettings) => api.put<MailSettings>('/mail-settings', dto).then(r => r.data),
  sendTest: (email: string) => api.post('/mail-settings/test', { email }).then(r => r.data),
};
