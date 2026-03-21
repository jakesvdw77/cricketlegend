package com.cricketlegend.mapper;

import com.cricketlegend.domain.MatchSide;
import com.cricketlegend.dto.MatchSideDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface MatchSideMapper {
    @Mapping(source = "match.matchId", target = "matchId")
    @Mapping(source = "team.teamId", target = "teamId")
    @Mapping(source = "team.teamName", target = "teamName")
    MatchSideDTO toDto(MatchSide entity);

    @Mapping(target = "match", ignore = true)
    @Mapping(target = "team", ignore = true)
    MatchSide toEntity(MatchSideDTO dto);
}
