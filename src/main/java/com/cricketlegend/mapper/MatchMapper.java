package com.cricketlegend.mapper;

import com.cricketlegend.domain.Match;
import com.cricketlegend.dto.MatchDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface MatchMapper {
    @Mapping(source = "homeTeam.teamId", target = "homeTeamId")
    @Mapping(source = "homeTeam.teamName", target = "homeTeamName")
    @Mapping(source = "homeTeam.logoUrl", target = "homeTeamLogoUrl")
    @Mapping(source = "oppositionTeam.teamId", target = "oppositionTeamId")
    @Mapping(source = "oppositionTeam.teamName", target = "oppositionTeamName")
    @Mapping(source = "oppositionTeam.logoUrl", target = "oppositionTeamLogoUrl")
    @Mapping(source = "field.fieldId", target = "fieldId")
    @Mapping(source = "field.name", target = "fieldName")
    @Mapping(source = "field.googleMapsUrl", target = "fieldGoogleMapsUrl")
    @Mapping(source = "tournament.tournamentId", target = "tournamentId")
    @Mapping(source = "tournament.name", target = "tournamentName")
    MatchDTO toDto(Match entity);

    @Mapping(target = "homeTeam", ignore = true)
    @Mapping(target = "oppositionTeam", ignore = true)
    @Mapping(target = "field", ignore = true)
    @Mapping(target = "tournament", ignore = true)
    @Mapping(target = "result", ignore = true)
    Match toEntity(MatchDTO dto);
}
