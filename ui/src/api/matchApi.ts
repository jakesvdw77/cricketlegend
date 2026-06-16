import api from './axiosConfig';
import { AiTeamPick, Match, MatchAnalysis, MatchResult, MatchResultSummary, MatchSide, MatchSummary, ScorecardImageImportResponse, XiAnalysis } from '../types';

export const matchApi = {
  findAll: () => api.get<Match[]>('/matches').then(r => r.data),
  findById: (id: number) => api.get<Match>(`/matches/${id}`).then(r => r.data),
  findByTournament: (tournamentId: number) =>
    api.get<Match[]>(`/matches/tournament/${tournamentId}`).then(r => r.data),
  findResultsByTournament: (tournamentId: number) =>
    api.get<MatchResultSummary[]>(`/matches/tournament/${tournamentId}/results`).then(r => r.data),
  findRecentResults: (limit = 6) =>
    api.get<MatchResultSummary[]>(`/matches/recent-results?limit=${limit}`).then(r => r.data),
  findCompleted: () => api.get<Match[]>('/matches/completed').then(r => r.data),
  findLive: () => api.get<Match[]>('/matches/live').then(r => r.data),
  findUpcoming: () => api.get<Match[]>('/matches/upcoming').then(r => r.data),
  create: (dto: Match) => api.post<Match>('/matches', dto).then(r => r.data),
  update: (id: number, dto: Match) => api.put<Match>(`/matches/${id}`, dto).then(r => r.data),
  delete: (id: number) => api.delete(`/matches/${id}`),
  getResult: (id: number) => api.get<MatchResult>(`/matches/${id}/result`).then(r => r.data),
  getAnalysis: (id: number, teamId: number, regenerate = false) =>
    api.get<MatchAnalysis>(`/matches/${id}/analysis?teamId=${teamId}${regenerate ? '&regenerate=true' : ''}`).then(r => r.data),
  getSummary: (id: number, regenerate = false) =>
    api.get<MatchSummary>(`/matches/${id}/summary${regenerate ? '?regenerate=true' : ''}`).then(r => r.data),
  getXiAnalysis: (id: number, teamId: number, regenerate = false) =>
    api.get<XiAnalysis>(`/matches/${id}/teamsheet/analysis?teamId=${teamId}${regenerate ? '&regenerate=true' : ''}`).then(r => r.data),
  getAiTeamPick: (id: number, teamId: number, regenerate = false, strategy: 'STRONGEST' | 'ROTATION' = 'STRONGEST') =>
    api.get<AiTeamPick>(`/matches/${id}/teamsheet/pick?teamId=${teamId}&strategy=${strategy}${regenerate ? '&regenerate=true' : ''}`).then(r => r.data),
  saveResult: (id: number, dto: MatchResult) =>
    api.post<MatchResult>(`/matches/${id}/result`, dto).then(r => r.data),
  getTeamSheet: (id: number) => api.get<MatchSide[]>(`/matches/${id}/teamsheet`).then(r => r.data),
  saveTeamSheet: (id: number, dto: MatchSide) =>
    api.post<MatchSide>(`/matches/${id}/teamsheet`, dto).then(r => r.data),
  getMySchedule: () => api.get<Match[]>('/matches/my-schedule').then(r => r.data),
  importScorecardFromImages: (matchId: number, formData: FormData) =>
    api.post<ScorecardImageImportResponse>(`/matches/${matchId}/scorecard/import-from-images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
};
