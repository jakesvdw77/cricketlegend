package com.cricketlegend.service;

import com.cricketlegend.domain.enums.MediaType;
import com.cricketlegend.dto.MediaContentDTO;

import java.util.List;

public interface MediaContentService {
    MediaContentDTO create(MediaContentDTO dto);
    List<MediaContentDTO> search(Long playerId, Long teamId, Long matchId,
                                  Long tournamentId, Long fieldId, Long clubId,
                                  MediaType mediaType);
    void delete(Long id);
}
