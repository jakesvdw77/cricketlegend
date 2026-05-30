import api from './axiosConfig';

export interface ClubFinancialAdminDTO {
  id: number;
  managerId: number;
  managerDisplayName: string;
  managerEmail: string;
  clubId: number;
  clubName: string;
}

export const financialAdminApi = {
  // System admin CRUD
  getAllAssignments: () =>
    api.get<ClubFinancialAdminDTO[]>('/admin/financial-admins').then(r => r.data),

  assign: (managerId: number, clubId: number) =>
    api.post<ClubFinancialAdminDTO>('/admin/financial-admins', { managerId, clubId }).then(r => r.data),

  unassign: (id: number) =>
    api.delete(`/admin/financial-admins/${id}`),

  // Current financial admin's club
  getMyClubId: () =>
    api.get<number | null>('/financial-admin/my-club-id').then(r => r.data).catch(() => null),

  // Scoped data endpoints
  getMyPlayers: (orderBy?: string) =>
    api.get('/players/financial-admin', { params: { orderBy } }).then(r => r.data),

  getMyPayments: (params: { status?: string; year?: number; month?: number; page?: number; size?: number }) =>
    api.get('/payments/financial-admin', { params }).then(r => r.data),

  getMyWalletBalances: () =>
    api.get<Record<number, number>>('/payments/wallet/financial-admin').then(r => r.data),

  getMyAllocations: (params: { playerId?: number; category?: string; year?: number; month?: number; page?: number; size?: number }) =>
    api.get('/payments/allocations/financial-admin', { params }).then(r => r.data),

  getMyClubAllocationTotals: (clubId: number) =>
    api.get<Record<number, number>>(`/payments/allocations/club/${clubId}`).then(r => r.data),

  allocateAnnualSubscription: (playerId: number, amount: number, year?: number) =>
    api.post(`/payments/allocate/annual-subscription/financial-admin/player/${playerId}`, null, { params: { amount, year } }).then(r => r.data),

  allocateOther: (playerId: number, amount: number, description: string) =>
    api.post(`/payments/allocate/other/financial-admin/player/${playerId}`, null, { params: { amount, description } }).then(r => r.data),

  getMyMatchFeePlayerData: (matchId: number, sideIds: number[]) =>
    api.get('/payments/match-fee/financial-admin/players', { params: { matchId, sideIds } }).then(r => r.data),

  allocateMatchFee: (playerId: number, amount: number, matchId: number, matchFee?: number, description?: string) =>
    api.post(`/payments/allocate/match-fee/financial-admin/player/${playerId}`, null, { params: { amount, matchId, matchFee, description } }).then(r => r.data),

  getMyTournamentFeePlayerData: (tournamentId: number) =>
    api.get('/payments/tournament-fee/financial-admin/players', { params: { tournamentId } }).then(r => r.data),

  allocateTournamentFee: (playerId: number, amount: number, tournamentId: number, registrationFee?: number, description?: string) =>
    api.post(`/payments/allocate/tournament-fee/financial-admin/player/${playerId}`, null, { params: { amount, tournamentId, registrationFee, description } }).then(r => r.data),

  approvePayment: (id: number, payment: any) =>
    api.put(`/payments/${id}`, { ...payment, status: 'APPROVED' }).then(r => r.data),

  rejectPayment: (id: number, payment: any, rejectionReason: string) =>
    api.put(`/payments/${id}`, { ...payment, status: 'REJECTED', rejectionReason }).then(r => r.data),
};
