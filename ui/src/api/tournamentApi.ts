import api from './axiosConfig';
import { Tournament, TournamentPool, PoolStandings } from '../types';

export const tournamentApi = {
  findAll: () => api.get<Tournament[]>('/tournaments').then(r => r.data),
  findById: (id: number) => api.get<Tournament>(`/tournaments/${id}`).then(r => r.data),
  create: (dto: Tournament) => api.post<Tournament>('/tournaments', dto).then(r => r.data),
  update: (id: number, dto: Tournament) => api.put<Tournament>(`/tournaments/${id}`, dto).then(r => r.data),
  delete: (id: number) => api.delete(`/tournaments/${id}`),
  addPool: (tournamentId: number, pool: TournamentPool) =>
    api.post<TournamentPool>(`/tournaments/${tournamentId}/pools`, pool).then(r => r.data),
  addTeamToPool: (poolId: number, teamId: number) =>
    api.post(`/tournaments/pools/${poolId}/teams/${teamId}`),
  deletePool: (poolId: number) =>
    api.delete(`/tournaments/pools/${poolId}`),
  removeTeamFromPool: (poolId: number, teamId: number) =>
    api.delete(`/tournaments/pools/${poolId}/teams/${teamId}`),
  getStandings: (tournamentId: number) =>
    api.get<PoolStandings[]>(`/tournaments/${tournamentId}/standings`).then(r => r.data),
};
