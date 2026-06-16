import api from './axiosConfig';
import { Player, PlayerResult, PlayerStatsReport, Team } from '../types';

export const playerApi = {
  findAll: (orderBy?: 'name' | 'surname') => api.get<Player[]>('/players', { params: orderBy ? { orderBy } : undefined }).then(r => r.data),
  findById: (id: number) => api.get<Player>(`/players/${id}`).then(r => r.data),
  findMe: () => api.get<Player>('/players/me').then(r => r.data),
  findMyTeams: () => api.get<Team[]>('/players/me/teams').then(r => r.data),
  updateMe: (dto: Player) => api.put<Player>('/players/me', dto).then(r => r.data),
  search: (query: string, orderBy?: 'name' | 'surname') => api.get<Player[]>('/players/search', { params: { query, orderBy } }).then(r => r.data),
  getStatistics: (id: number) => api.get<PlayerResult[]>(`/players/${id}/statistics`).then(r => r.data),
  getStatsAnalysis: (id: number, tournamentId: number, stats: object, regenerate = false) =>
    api.post<PlayerStatsReport>(
      `/players/${id}/stats/analysis?tournamentId=${tournamentId}&regenerate=${regenerate}`,
      stats,
    ).then(r => r.data),
  create: (dto: Player) => api.post<Player>('/players', dto).then(r => r.data),
  update: (id: number, dto: Player) => api.put<Player>(`/players/${id}`, dto).then(r => r.data),
  delete: (id: number) => api.delete(`/players/${id}`),
};
