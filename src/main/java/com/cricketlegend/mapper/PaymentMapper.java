package com.cricketlegend.mapper;

import com.cricketlegend.domain.Payment;
import com.cricketlegend.dto.PaymentDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface PaymentMapper {

    @Mapping(source = "player.playerId", target = "playerId")
    @Mapping(target = "playerName", expression = "java(entity.getPlayer() != null ? entity.getPlayer().getName() + ' ' + entity.getPlayer().getSurname() : null)")
    @Mapping(source = "sponsor.sponsorId", target = "sponsorId")
    @Mapping(source = "sponsor.name", target = "sponsorName")
    @Mapping(source = "tournament.tournamentId", target = "tournamentId")
    @Mapping(source = "tournament.name", target = "tournamentName")
    PaymentDTO toDto(Payment entity);

    @Mapping(target = "player", ignore = true)
    @Mapping(target = "sponsor", ignore = true)
    @Mapping(target = "tournament", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    Payment toEntity(PaymentDTO dto);
}
