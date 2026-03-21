package com.cricketlegend.mapper;

import com.cricketlegend.domain.Tournament;
import com.cricketlegend.dto.TournamentDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

// SponsorMapper referenced via uses = {...} — no direct import needed

@Mapper(uses = {TournamentPoolMapper.class, MediaContentMapper.class, SponsorMapper.class})
public interface TournamentMapper {
    @Mapping(source = "winningTeam.teamId", target = "winningTeamId")
    @Mapping(source = "winningTeam.teamName", target = "winningTeamName")
    TournamentDTO toDto(Tournament entity);

    @Mapping(target = "pools", ignore = true)
    @Mapping(target = "mediaContent", ignore = true)
    @Mapping(target = "sponsors", ignore = true)
    @Mapping(target = "winningTeam", ignore = true)
    Tournament toEntity(TournamentDTO dto);
}
