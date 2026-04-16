import api from './axiosConfig';
import { MatchPoll, PlayerNotification, AvailabilityStatus } from '../types';

export const pollApi = {
  togglePoll: (matchId: number, teamId: number, open: boolean) =>
    api.post<MatchPoll>(`/matches/${matchId}/poll`, { teamId, open }).then(r => r.data),

  getPoll: (matchId: number, teamId: number) =>
    api.get<MatchPoll>(`/matches/${matchId}/poll/${teamId}`).then(r => r.data),

  setMyAvailability: (matchId: number, teamId: number, status: AvailabilityStatus) =>
    api.post(`/matches/${matchId}/poll/${teamId}/availability`, { status }),

  setPlayerAvailability: (matchId: number, teamId: number, playerId: number, status: AvailabilityStatus) =>
    api.put(`/matches/${matchId}/poll/${teamId}/players/${playerId}/availability`, { status }),

  getMyNotifications: () =>
    api.get<PlayerNotification[]>('/notifications').then(r => r.data),

  getUnreadCount: () =>
    api.get<{ count: number }>('/notifications/unread-count').then(r => r.data.count),

  markRead: (notificationId: number) =>
    api.put(`/notifications/${notificationId}/read`),

  sendNotification: (subject: string, message: string) =>
    api.post('/notifications/send', { subject, message }),
};
