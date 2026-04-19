package com.cricketlegend.service;

import com.cricketlegend.dto.ManagerDTO;
import com.cricketlegend.dto.ManagerTeamDTO;

import java.util.List;
import java.util.Set;

public interface ManagerTeamService {

    List<ManagerTeamDTO> getAllAssignments();

    /** Returns the managers assigned to a specific team. */
    List<ManagerDTO> getManagersForTeam(Long teamId);

    ManagerTeamDTO assign(Long managerId, Long teamId);

    void unassign(Long id);

    /** Returns the team IDs this manager is allowed to manage. */
    Set<Long> getTeamIdsForManager(String email);

    /** Returns the teams (with names) this manager is assigned to. */
    List<ManagerTeamDTO> getManagedTeams(String email);

    /** Returns all squad player IDs across the manager's assigned teams. */
    Set<Long> getSquadPlayerIdsForManager(String email);

    boolean canManageTeam(String email, Long teamId);

    boolean canManagePlayer(String email, Long playerId);
}
