import api from './axiosConfig';
import { Sponsor } from '../types';

export const sponsorApi = {
  findAll: () => api.get<Sponsor[]>('/sponsors').then(r => r.data),
  findById: (id: number) => api.get<Sponsor>(`/sponsors/${id}`).then(r => r.data),
  create: (dto: Sponsor) => api.post<Sponsor>('/sponsors', dto).then(r => r.data),
  update: (id: number, dto: Sponsor) => api.put<Sponsor>(`/sponsors/${id}`, dto).then(r => r.data),
  delete: (id: number) => api.delete(`/sponsors/${id}`),
};
