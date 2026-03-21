package com.cricketlegend.mapper;

import com.cricketlegend.domain.Field;
import com.cricketlegend.dto.FieldDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface FieldMapper {
    @Mapping(source = "homeClub.clubId", target = "homeClubId")
    @Mapping(source = "homeClub.name", target = "homeClubName")
    FieldDTO toDto(Field entity);

    @Mapping(target = "homeClub", ignore = true)
    Field toEntity(FieldDTO dto);
}
