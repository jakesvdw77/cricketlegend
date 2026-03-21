package com.cricketlegend.mapper;

import com.cricketlegend.domain.PlayerResult;
import com.cricketlegend.dto.PlayerResultDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface PlayerResultMapper {
    @Mapping(source = "player.playerId", target = "playerId")
    @Mapping(expression = "java(entity.getPlayer() != null ? entity.getPlayer().getName() + ' ' + entity.getPlayer().getSurname() : null)", target = "playerName")
    @Mapping(source = "match.matchId", target = "matchId")
    @Mapping(source = "team.teamId", target = "teamId")
    @Mapping(source = "team.teamName", target = "teamName")
    @Mapping(source = "dismissedByBowler.playerId", target = "dismissedByBowlerId")
    @Mapping(expression = "java(entity.getDismissedByBowler() != null ? entity.getDismissedByBowler().getName() + ' ' + entity.getDismissedByBowler().getSurname() : null)", target = "dismissedByBowlerName")
    PlayerResultDTO toDto(PlayerResult entity);

    @Mapping(target = "player", ignore = true)
    @Mapping(target = "match", ignore = true)
    @Mapping(target = "team", ignore = true)
    @Mapping(target = "dismissedByBowler", ignore = true)
    PlayerResult toEntity(PlayerResultDTO dto);
}
