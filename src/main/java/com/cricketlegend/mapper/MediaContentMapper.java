package com.cricketlegend.mapper;

import com.cricketlegend.domain.MediaContent;
import com.cricketlegend.dto.MediaContentDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface MediaContentMapper {

    @Mapping(source = "player.playerId", target = "playerId")
    @Mapping(target = "playerName", ignore = true)
    @Mapping(source = "team.teamId", target = "teamId")
    @Mapping(target = "teamName", ignore = true)
    @Mapping(source = "match.matchId", target = "matchId")
    @Mapping(target = "matchLabel", ignore = true)
    @Mapping(source = "tournament.tournamentId", target = "tournamentId")
    @Mapping(target = "tournamentName", ignore = true)
    @Mapping(source = "field.fieldId", target = "fieldId")
    @Mapping(target = "fieldName", ignore = true)
    @Mapping(source = "club.clubId", target = "clubId")
    @Mapping(target = "clubName", ignore = true)
    MediaContentDTO toDto(MediaContent entity);

    @Mapping(target = "player", ignore = true)
    @Mapping(target = "team", ignore = true)
    @Mapping(target = "match", ignore = true)
    @Mapping(target = "tournament", ignore = true)
    @Mapping(target = "field", ignore = true)
    @Mapping(target = "club", ignore = true)
    MediaContent toEntity(MediaContentDTO dto);
}
