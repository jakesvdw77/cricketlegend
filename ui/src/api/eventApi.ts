import api from './axiosConfig';
import { ClubEvent } from '../types';

export const eventApi = {
  getMyEvents: () => api.get<ClubEvent[]>('/events/my').then(r => r.data),
  getByClub: (clubId: number) => api.get<ClubEvent[]>(`/events/club/${clubId}`).then(r => r.data),
  create: (dto: ClubEvent) => api.post<ClubEvent>('/events', dto).then(r => r.data),
  update: (eventId: number, dto: ClubEvent) => api.put<ClubEvent>(`/events/${eventId}`, dto).then(r => r.data),
  delete: (eventId: number) => api.delete(`/events/${eventId}`),
  deleteSeries: (seriesId: number) => api.delete(`/events/series/${seriesId}`),
};
