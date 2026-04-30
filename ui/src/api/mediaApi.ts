import api from './axiosConfig';
import { MediaContent, MediaFileType } from '../types';

export interface MediaSearchParams {
  playerId?: number;
  teamId?: number;
  matchId?: number;
  tournamentId?: number;
  fieldId?: number;
  clubId?: number;
  mediaType?: MediaFileType;
}

export const mediaApi = {
  upload: (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ url: string }>('/files/upload', form).then(r => r.data.url);
  },

  save: (dto: MediaContent) => api.post<MediaContent>('/media', dto).then(r => r.data),

  search: (params: MediaSearchParams) =>
    api.get<MediaContent[]>('/media', { params }).then(r => r.data),

  delete: (id: number) => api.delete(`/media/${id}`),
};
