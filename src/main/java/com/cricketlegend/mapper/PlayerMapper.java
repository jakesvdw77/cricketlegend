package com.cricketlegend.mapper;

import com.cricketlegend.domain.Player;
import com.cricketlegend.dto.PlayerDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(uses = {MediaContentMapper.class})
public interface PlayerMapper {

    @Mapping(source = "homeClub.clubId", target = "homeClubId")
    @Mapping(source = "homeClub.name", target = "homeClubName")
    PlayerDTO toDto(Player entity);

    @Mapping(target = "homeClub", ignore = true)
    Player toEntity(PlayerDTO dto);
}
