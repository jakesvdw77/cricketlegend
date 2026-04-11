import api from './axiosConfig';

export interface ManagerDTO {
  managerId: number;
  playerId?: number;
  playerDisplayName?: string;
  name?: string;
  surname?: string;
  email: string;
  phone?: string;
  displayName: string;
}

export interface ManagerTeamAssignment {
  id: number;
  managerId: number;
  managerDisplayName: string;
  managerEmail: string;
  teamId: number;
  teamName: string;
}

export const managerApi = {
  // Manager CRUD
  findAllManagers: () =>
    api.get<ManagerDTO[]>('/admin/managers').then(r => r.data),

  createManager: (dto: Omit<ManagerDTO, 'managerId' | 'displayName' | 'playerDisplayName'>) =>
    api.post<ManagerDTO>('/admin/managers', dto).then(r => r.data),

  updateManager: (id: number, dto: Omit<ManagerDTO, 'managerId' | 'displayName' | 'playerDisplayName'>) =>
    api.put<ManagerDTO>(`/admin/managers/${id}`, dto).then(r => r.data),

  deleteManager: (id: number) =>
    api.delete(`/admin/managers/${id}`),

  // Manager-Team assignments
  getAllAssignments: () =>
    api.get<ManagerTeamAssignment[]>('/admin/manager-teams').then(r => r.data),

  assign: (managerId: number, teamId: number) =>
    api.post<ManagerTeamAssignment>('/admin/manager-teams', { managerId, teamId }).then(r => r.data),

  unassign: (id: number) =>
    api.delete(`/admin/manager-teams/${id}`),

  // Current manager's access
  getMyTeams: () =>
    api.get<number[]>('/managers/my-teams').then(r => r.data),

  getMySquadPlayerIds: () =>
    api.get<number[]>('/managers/my-squad-player-ids').then(r => r.data),
};
