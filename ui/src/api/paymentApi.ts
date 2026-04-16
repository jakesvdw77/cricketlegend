import api from './axiosConfig';
import { Payment, PaymentType } from '../types';

export interface PaymentFilters {
  playerId?: number;
  sponsorId?: number;
  tournamentId?: number;
  paymentType?: PaymentType;
  status?: string;
  year?: number;
  month?: number;
}

export const paymentApi = {
  findAll: (filters: PaymentFilters = {}) => {
    const params: Record<string, string | number> = {};
    if (filters.playerId != null) params.playerId = filters.playerId;
    if (filters.sponsorId != null) params.sponsorId = filters.sponsorId;
    if (filters.tournamentId != null) params.tournamentId = filters.tournamentId;
    if (filters.paymentType) params.paymentType = filters.paymentType;
    if (filters.status) params.status = filters.status;
    if (filters.year != null) params.year = filters.year;
    if (filters.month != null) params.month = filters.month;
    return api.get<Payment[]>('/payments', { params }).then(r => r.data);
  },
  create: (dto: Payment) => api.post<Payment>('/payments', dto).then(r => r.data),
  update: (id: number, dto: Payment) => api.put<Payment>(`/payments/${id}`, dto).then(r => r.data),
  delete: (id: number) => api.delete(`/payments/${id}`),
  approve: (id: number, current: Payment) =>
    api.put<Payment>(`/payments/${id}`, { ...current, status: 'APPROVED' }).then(r => r.data),
  reject: (id: number, current: Payment) =>
    api.put<Payment>(`/payments/${id}`, { ...current, status: 'REJECTED' }).then(r => r.data),

  /** Get the calling player's own payment submissions */
  findMine: () => api.get<Payment[]>('/payments/mine').then(r => r.data),

  /** Player-initiated payment submission (proof of payment) */
  submitProof: (dto: { tournamentId: number; amount: number; description?: string; proofOfPaymentUrl: string }) =>
    api.post<Payment>('/payments/submit', dto).then(r => r.data),

  uploadFile: (formData: FormData) =>
    api.post<{ url: string }>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.url),

  /** Fetches the file with auth token and opens it in a new tab as a blob URL */
  openProof: async (storedUrl: string): Promise<void> => {
    const path = storedUrl.replace('/api/v1', '');
    const response = await api.get(path, { responseType: 'blob' });
    const blobUrl = URL.createObjectURL(response.data);
    const win = window.open(blobUrl, '_blank');
    if (win) setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  },
};
