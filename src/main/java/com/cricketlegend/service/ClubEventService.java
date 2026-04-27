package com.cricketlegend.service;

import com.cricketlegend.dto.ClubEventDTO;

import java.util.List;

public interface ClubEventService {
    List<ClubEventDTO> getMyEvents(String email);
    List<ClubEventDTO> getByClub(Long clubId);
    ClubEventDTO create(ClubEventDTO dto, String creatorEmail);
    ClubEventDTO update(Long eventId, ClubEventDTO dto);
    void delete(Long eventId);
    void deleteSeries(Long seriesId);
}
