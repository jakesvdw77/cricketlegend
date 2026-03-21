import api from './axiosConfig';
import { Match, MatchResult, MatchResultSummary, MatchSide } from '../types';

export const matchApi = {
  findAll: () => api.get<Match[]>('/matches').then(r => r.data),
  findById: (id: number) => api.get<Match>(`/matches/${id}`).then(r => r.data),
  findByTournament: (tournamentId: number) =>
    api.get<Match[]>(`/matches/tournament/${tournamentId}`).then(r => r.data),
  findResultsByTournament: (tournamentId: number) =>
    api.get<MatchResultSummary[]>(`/matches/tournament/${tournamentId}/results`).then(r => r.data),
  findPrevious: () => api.get<Match[]>('/matches/previous').then(r => r.data),
  findUpcoming: () => api.get<Match[]>('/matches/upcoming').then(r => r.data),
  create: (dto: Match) => api.post<Match>('/matches', dto).then(r => r.data),
  update: (id: number, dto: Match) => api.put<Match>(`/matches/${id}`, dto).then(r => r.data),
  delete: (id: number) => api.delete(`/matches/${id}`),
  getResult: (id: number) => api.get<MatchResult>(`/matches/${id}/result`).then(r => r.data),
  saveResult: (id: number, dto: MatchResult) =>
    api.post<MatchResult>(`/matches/${id}/result`, dto).then(r => r.data),
  getTeamSheet: (id: number) => api.get<MatchSide[]>(`/matches/${id}/teamsheet`).then(r => r.data),
  saveTeamSheet: (id: number, dto: MatchSide) =>
    api.post<MatchSide>(`/matches/${id}/teamsheet`, dto).then(r => r.data),
};
