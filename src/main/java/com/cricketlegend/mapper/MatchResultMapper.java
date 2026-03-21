package com.cricketlegend.mapper;

import com.cricketlegend.domain.MatchResult;
import com.cricketlegend.dto.MatchResultDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface MatchResultMapper {
    @Mapping(source = "match.matchId", target = "matchId")
    @Mapping(source = "winningTeam.teamId", target = "winningTeamId")
    @Mapping(source = "winningTeam.teamName", target = "winningTeamName")
    @Mapping(source = "manOfTheMatch.playerId", target = "manOfTheMatchId")
    @Mapping(expression = "java(entity.getManOfTheMatch() != null ? entity.getManOfTheMatch().getName() + ' ' + entity.getManOfTheMatch().getSurname() : null)", target = "manOfTheMatchName")
    @Mapping(source = "sideBattingFirst.teamId", target = "sideBattingFirstId")
    @Mapping(source = "sideBattingFirst.teamName", target = "sideBattingFirstName")
    MatchResultDTO toDto(MatchResult entity);

    @Mapping(target = "match", ignore = true)
    @Mapping(target = "winningTeam", ignore = true)
    @Mapping(target = "manOfTheMatch", ignore = true)
    @Mapping(target = "sideBattingFirst", ignore = true)
    MatchResult toEntity(MatchResultDTO dto);
}
