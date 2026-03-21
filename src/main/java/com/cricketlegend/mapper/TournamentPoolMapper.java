package com.cricketlegend.mapper;

import com.cricketlegend.domain.TournamentPool;
import com.cricketlegend.dto.TournamentPoolDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(uses = {TournamentTeamMapper.class})
public interface TournamentPoolMapper {
    @Mapping(source = "tournament.tournamentId", target = "tournamentId")
    TournamentPoolDTO toDto(TournamentPool entity);

    @Mapping(target = "tournament", ignore = true)
    TournamentPool toEntity(TournamentPoolDTO dto);
}
