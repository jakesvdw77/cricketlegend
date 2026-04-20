import api from './axiosConfig';
import { SocialMediaPage } from '../types';

export const socialMediaPageApi = {
  findAll: () => api.get<SocialMediaPage[]>('/social-media-pages').then(r => r.data),
  findEnabled: () => api.get<SocialMediaPage[]>('/social-media-pages/enabled').then(r => r.data),
  create: (dto: SocialMediaPage) => api.post<SocialMediaPage>('/social-media-pages', dto).then(r => r.data),
  update: (id: number, dto: SocialMediaPage) => api.put<SocialMediaPage>(`/social-media-pages/${id}`, dto).then(r => r.data),
  delete: (id: number) => api.delete(`/social-media-pages/${id}`),
};
