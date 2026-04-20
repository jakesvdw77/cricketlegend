package com.cricketlegend.mapper;

import com.cricketlegend.domain.SocialMediaPage;
import com.cricketlegend.dto.SocialMediaPageDTO;
import org.mapstruct.Mapper;

@Mapper
public interface SocialMediaPageMapper {
    SocialMediaPageDTO toDto(SocialMediaPage entity);
    SocialMediaPage toEntity(SocialMediaPageDTO dto);
}
