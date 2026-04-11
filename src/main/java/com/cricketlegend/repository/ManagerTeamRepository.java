package com.cricketlegend.repository;

import com.cricketlegend.domain.ManagerTeam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Set;

public interface ManagerTeamRepository extends JpaRepository<ManagerTeam, Long> {

    List<ManagerTeam> findByManagerManagerId(Long managerId);

    List<ManagerTeam> findByTeamTeamId(Long teamId);

    boolean existsByManagerManagerIdAndTeamTeamId(Long managerId, Long teamId);

    @Query("SELECT mt.team.teamId FROM ManagerTeam mt WHERE mt.manager.email = :email")
    Set<Long> findTeamIdsByManagerEmail(String email);

    @Query("SELECT COUNT(mt) > 0 FROM ManagerTeam mt WHERE mt.manager.email = :email AND mt.team.teamId = :teamId")
    boolean existsByManagerEmailAndTeamId(String email, Long teamId);
}
