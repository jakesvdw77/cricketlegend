import api from './axiosConfig';
import { Club } from '../types';

export const clubApi = {
  findAll: () => api.get<Club[]>('/clubs').then(r => r.data),
  findById: (id: number) => api.get<Club>(`/clubs/${id}`).then(r => r.data),
  create: (dto: Club) => api.post<Club>('/clubs', dto).then(r => r.data),
  update: (id: number, dto: Club) => api.put<Club>(`/clubs/${id}`, dto).then(r => r.data),
  delete: (id: number) => api.delete(`/clubs/${id}`),
};
