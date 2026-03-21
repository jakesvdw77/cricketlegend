package com.cricketlegend.mapper;

import com.cricketlegend.domain.MediaContent;
import com.cricketlegend.dto.MediaContentDTO;
import org.mapstruct.Mapper;

@Mapper
public interface MediaContentMapper {
    MediaContentDTO toDto(MediaContent entity);
    MediaContent toEntity(MediaContentDTO dto);
}
