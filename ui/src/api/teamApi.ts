import api from './axiosConfig';
import { Player, Team } from '../types';

export const teamApi = {
  findAll: () => api.get<Team[]>('/teams').then(r => r.data),
  findById: (id: number) => api.get<Team>(`/teams/${id}`).then(r => r.data),
  create: (dto: Team) => api.post<Team>('/teams', dto).then(r => r.data),
  update: (id: number, dto: Team) => api.put<Team>(`/teams/${id}`, dto).then(r => r.data),
  delete: (id: number) => api.delete(`/teams/${id}`),

  getSquad: (teamId: number) => api.get<Player[]>(`/teams/${teamId}/squad`).then(r => r.data),
  addToSquad: (teamId: number, playerId: number) => api.post(`/teams/${teamId}/squad/${playerId}`),
  removeFromSquad: (teamId: number, playerId: number) => api.delete(`/teams/${teamId}/squad/${playerId}`),
};
