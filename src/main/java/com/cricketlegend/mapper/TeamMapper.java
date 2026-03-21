package com.cricketlegend.mapper;

import com.cricketlegend.domain.Team;
import com.cricketlegend.dto.TeamDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(uses = {MediaContentMapper.class})
public interface TeamMapper {
    @Mapping(source = "associatedClub.clubId", target = "associatedClubId")
    @Mapping(source = "associatedClub.name", target = "associatedClubName")
    @Mapping(source = "captain.playerId", target = "captainId")
    @Mapping(expression = "java(entity.getCaptain() != null ? entity.getCaptain().getName() + ' ' + entity.getCaptain().getSurname() : null)", target = "captainName")
    @Mapping(source = "homeField.fieldId", target = "homeFieldId")
    @Mapping(source = "homeField.name", target = "homeFieldName")
    TeamDTO toDto(Team entity);

    @Mapping(target = "associatedClub", ignore = true)
    @Mapping(target = "captain", ignore = true)
    @Mapping(target = "homeField", ignore = true)
    Team toEntity(TeamDTO dto);
}
