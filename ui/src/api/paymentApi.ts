import api from './axiosConfig';
import { AllocationResultDTO, MatchFeePlayerDataDTO, PagedAllocationResponse, PagedPaymentResponse, Payment, PaymentType, TournamentFeePlayerDataDTO, WalletDTO } from '../types';

export interface PaymentFilters {
  playerId?: number;
  sponsorId?: number;
  tournamentId?: number;
  paymentType?: PaymentType;
  status?: string;
  year?: number;
  month?: number;
  page?: number;
  size?: number;
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
    if (filters.page != null) params.page = filters.page;
    if (filters.size != null) params.size = filters.size;
    return api.get<PagedPaymentResponse>('/payments', { params }).then(r => r.data);
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
  submitProof: (dto: { tournamentId?: number; paymentCategory?: string; amount: number; description?: string; proofOfPaymentUrl: string }) =>
    api.post<Payment>('/payments/submit', dto).then(r => r.data),

  uploadFile: (formData: FormData) =>
    api.post<{ url: string }>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.url),

  /** Upload a proof-of-payment document to the secured proof store */
  uploadProofFile: (formData: FormData) =>
    api.post<{ url: string }>('/files/proof/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.url),

  /** Get the calling player's wallet balance and transactions */
  getWallet: () => api.get<WalletDTO>('/payments/wallet/me').then(r => r.data),

  /** Allocate annual subscription funds from player wallets for a club */
  allocateAnnualSubscription: (clubId: number) =>
    api.post<AllocationResultDTO>('/payments/allocate/annual-subscription', null, { params: { clubId } }).then(r => r.data),

  /** Allocate annual subscription funds for a single player */
  allocatePlayerAnnualSubscription: (playerId: number, amount: number, year: number) =>
    api.post<AllocationResultDTO>(`/payments/allocate/annual-subscription/player/${playerId}`, null, { params: { amount, year } }).then(r => r.data),

  /** Get all wallet allocations with optional filters (server-side paginated) */
  findAllocations: (filters: { playerId?: number; clubId?: number; category?: string; year?: number; month?: number; page?: number; size?: number } = {}) => {
    const params: Record<string, string | number> = {};
    if (filters.playerId != null) params.playerId = filters.playerId;
    if (filters.clubId != null) params.clubId = filters.clubId;
    if (filters.category) params.category = filters.category;
    if (filters.year != null) params.year = filters.year;
    if (filters.month != null) params.month = filters.month;
    if (filters.page != null) params.page = filters.page;
    if (filters.size != null) params.size = filters.size;
    return api.get<PagedAllocationResponse>('/payments/allocations', { params }).then(r => r.data);
  },

  /** Get wallet balances for all players in a club (admin) */
  getClubWalletBalances: (clubId: number) =>
    api.get<Record<number, number>>(`/payments/wallet/club/${clubId}`).then(r => r.data),

  /** Get annual subscription allocation totals per player for a club (admin) */
  getClubAllocationTotals: (clubId: number) =>
    api.get<Record<number, number>>(`/payments/allocations/club/${clubId}`).then(r => r.data),

  /** Get wallet balance + tournament payment count for players in selected match sides */
  getMatchFeePlayerData: (matchId: number, sideIds: number[]) =>
    api.get<MatchFeePlayerDataDTO[]>('/payments/match-fee/players', { params: { matchId, sideIds } }).then(r => r.data),

  /** Allocate match fee from a single player's wallet */
  allocatePlayerMatchFee: (playerId: number, amount: number, matchId: number, description: string, matchFee?: number) =>
    api.post<AllocationResultDTO>(`/payments/allocate/match-fee/player/${playerId}`, null, {
      params: { amount, matchId, description, ...(matchFee != null ? { matchFee } : {}) },
    }).then(r => r.data),

  /** Get wallet balance + tournament payment data for all players for a tournament */
  getTournamentFeePlayerData: (tournamentId: number) =>
    api.get<TournamentFeePlayerDataDTO[]>('/payments/tournament-fee/players', { params: { tournamentId } }).then(r => r.data),

  /** Allocate tournament registration fee from a single player's wallet */
  allocatePlayerTournamentFee: (playerId: number, amount: number, tournamentId: number, description: string, registrationFee?: number) =>
    api.post<AllocationResultDTO>(`/payments/allocate/tournament-fee/player/${playerId}`, null, {
      params: { amount, tournamentId, description, ...(registrationFee != null ? { registrationFee } : {}) },
    }).then(r => r.data),

  /** Allocate other funds from a single player's wallet */
  allocatePlayerOther: (playerId: number, amount: number, description: string) =>
    api.post<AllocationResultDTO>(`/payments/allocate/other/player/${playerId}`, null, {
      params: { amount, description },
    }).then(r => r.data),

  /** Fetches a proof document and returns a blob URL + mime type for in-dialog rendering */
  fetchProof: async (storedUrl: string): Promise<{ blobUrl: string; mimeType: string }> => {
    const path = storedUrl.replace('/api/v1', '');
    const response = await api.get(path, { responseType: 'blob' });
    const mimeType: string = response.data.type || 'application/octet-stream';
    const blobUrl = URL.createObjectURL(response.data);
    return { blobUrl, mimeType };
  },
};
