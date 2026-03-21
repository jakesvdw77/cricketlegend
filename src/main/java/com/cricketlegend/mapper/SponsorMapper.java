package com.cricketlegend.mapper;

import com.cricketlegend.domain.Sponsor;
import com.cricketlegend.dto.SponsorDTO;
import org.mapstruct.Mapper;

@Mapper
public interface SponsorMapper {
    SponsorDTO toDto(Sponsor entity);
    Sponsor toEntity(SponsorDTO dto);
}
