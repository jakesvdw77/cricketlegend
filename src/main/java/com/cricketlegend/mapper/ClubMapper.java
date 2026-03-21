package com.cricketlegend.mapper;

import com.cricketlegend.domain.Club;
import com.cricketlegend.dto.ClubDTO;
import org.mapstruct.Mapper;

@Mapper
public interface ClubMapper {
    ClubDTO toDto(Club entity);
    Club toEntity(ClubDTO dto);
}
