package com.cricketlegend.mapper;

import com.cricketlegend.domain.TournamentTeam;
import com.cricketlegend.dto.TournamentTeamDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface TournamentTeamMapper {
    @Mapping(source = "pool.poolId", target = "poolId")
    @Mapping(source = "team.teamId", target = "teamId")
    @Mapping(source = "team.teamName", target = "teamName")
    TournamentTeamDTO toDto(TournamentTeam entity);

    @Mapping(target = "pool", ignore = true)
    @Mapping(target = "team", ignore = true)
    TournamentTeam toEntity(TournamentTeamDTO dto);
}
