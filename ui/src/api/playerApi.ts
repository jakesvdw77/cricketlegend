import api from './axiosConfig';
import { Player, PlayerResult } from '../types';

export const playerApi = {
  findAll: () => api.get<Player[]>('/players').then(r => r.data),
  findById: (id: number) => api.get<Player>(`/players/${id}`).then(r => r.data),
  findMe: () => api.get<Player>('/players/me').then(r => r.data),
  updateMe: (dto: Player) => api.put<Player>('/players/me', dto).then(r => r.data),
  search: (query: string) => api.get<Player[]>('/players/search', { params: { query } }).then(r => r.data),
  getStatistics: (id: number) => api.get<PlayerResult[]>(`/players/${id}/statistics`).then(r => r.data),
  create: (dto: Player) => api.post<Player>('/players', dto).then(r => r.data),
  update: (id: number, dto: Player) => api.put<Player>(`/players/${id}`, dto).then(r => r.data),
  delete: (id: number) => api.delete(`/players/${id}`),
};
