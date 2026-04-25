import api from './axiosConfig';
import { PagedLoginEventResponse } from '../types';

export interface LoginEventFilters {
  name?: string;
  page?: number;
  size?: number;
}

export const loginEventApi = {
  record: () => api.post('/auth/login-event'),

  findAll: (filters: LoginEventFilters = {}) => {
    const params: Record<string, string | number> = {};
    if (filters.name) params.name = filters.name;
    if (filters.page != null) params.page = filters.page;
    if (filters.size != null) params.size = filters.size;
    return api.get<PagedLoginEventResponse>('/auth/login-events', { params }).then(r => r.data);
  },
};
