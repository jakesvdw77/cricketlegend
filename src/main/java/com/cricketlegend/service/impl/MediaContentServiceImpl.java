package com.cricketlegend.service.impl;

import com.cricketlegend.domain.MediaContent;
import com.cricketlegend.domain.enums.MediaType;
import com.cricketlegend.dto.MediaContentDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.repository.*;
import com.cricketlegend.service.MediaContentService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MediaContentServiceImpl implements MediaContentService {

    private final MediaContentRepository mediaContentRepository;
    private final PlayerRepository playerRepository;
    private final TeamRepository teamRepository;
    private final MatchRepository matchRepository;
    private final TournamentRepository tournamentRepository;
    private final FieldRepository fieldRepository;
    private final ClubRepository clubRepository;

    @Override
    @Transactional
    public MediaContentDTO create(MediaContentDTO dto) {
        MediaContent entity = MediaContent.builder()
                .url(dto.getUrl())
                .caption(dto.getCaption())
                .mediaType(dto.getMediaType())
                .uploadedAt(LocalDateTime.now())
                .build();

        if (dto.getPlayerId() != null) {
            entity.setPlayer(playerRepository.findById(dto.getPlayerId())
                    .orElseThrow(() -> NotFoundException.of("Player", dto.getPlayerId())));
        }
        if (dto.getTeamId() != null) {
            entity.setTeam(teamRepository.findById(dto.getTeamId())
                    .orElseThrow(() -> NotFoundException.of("Team", dto.getTeamId())));
        }
        if (dto.getMatchId() != null) {
            entity.setMatch(matchRepository.findById(dto.getMatchId())
                    .orElseThrow(() -> NotFoundException.of("Match", dto.getMatchId())));
        }
        if (dto.getTournamentId() != null) {
            entity.setTournament(tournamentRepository.findById(dto.getTournamentId())
                    .orElseThrow(() -> NotFoundException.of("Tournament", dto.getTournamentId())));
        }
        if (dto.getFieldId() != null) {
            entity.setField(fieldRepository.findById(dto.getFieldId())
                    .orElseThrow(() -> NotFoundException.of("Field", dto.getFieldId())));
        }
        if (dto.getClubId() != null) {
            entity.setClub(clubRepository.findById(dto.getClubId())
                    .orElseThrow(() -> NotFoundException.of("Club", dto.getClubId())));
        }

        return toDto(mediaContentRepository.save(entity));
    }

    @Override
    public List<MediaContentDTO> search(Long playerId, Long teamId, Long matchId,
                                         Long tournamentId, Long fieldId, Long clubId,
                                         MediaType mediaType) {
        Specification<MediaContent> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (playerId != null)     predicates.add(cb.equal(root.get("player").get("playerId"), playerId));
            if (teamId != null)       predicates.add(cb.equal(root.get("team").get("teamId"), teamId));
            if (matchId != null)      predicates.add(cb.equal(root.get("match").get("matchId"), matchId));
            if (tournamentId != null) predicates.add(cb.equal(root.get("tournament").get("tournamentId"), tournamentId));
            if (fieldId != null)      predicates.add(cb.equal(root.get("field").get("fieldId"), fieldId));
            if (clubId != null)       predicates.add(cb.equal(root.get("club").get("clubId"), clubId));
            if (mediaType != null)    predicates.add(cb.equal(root.get("mediaType"), mediaType));
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return mediaContentRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "uploadedAt"))
                .stream().map(this::toDto).toList();
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!mediaContentRepository.existsById(id)) throw NotFoundException.of("MediaContent", id);
        mediaContentRepository.deleteById(id);
    }

    private MediaContentDTO toDto(MediaContent m) {
        return MediaContentDTO.builder()
                .id(m.getId())
                .url(m.getUrl())
                .caption(m.getCaption())
                .mediaType(m.getMediaType())
                .playerId(m.getPlayer() != null ? m.getPlayer().getPlayerId() : null)
                .playerName(m.getPlayer() != null ? m.getPlayer().getName() + " " + m.getPlayer().getSurname() : null)
                .teamId(m.getTeam() != null ? m.getTeam().getTeamId() : null)
                .teamName(m.getTeam() != null ? m.getTeam().getTeamName() : null)
                .matchId(m.getMatch() != null ? m.getMatch().getMatchId() : null)
                .matchLabel(m.getMatch() != null ? buildMatchLabel(m) : null)
                .tournamentId(m.getTournament() != null ? m.getTournament().getTournamentId() : null)
                .tournamentName(m.getTournament() != null ? m.getTournament().getName() : null)
                .fieldId(m.getField() != null ? m.getField().getFieldId() : null)
                .fieldName(m.getField() != null ? m.getField().getName() : null)
                .clubId(m.getClub() != null ? m.getClub().getClubId() : null)
                .clubName(m.getClub() != null ? m.getClub().getName() : null)
                .uploadedAt(m.getUploadedAt())
                .build();
    }

    private String buildMatchLabel(MediaContent m) {
        var match = m.getMatch();
        String home = match.getHomeTeam() != null ? match.getHomeTeam().getTeamName() : "?";
        String opp  = match.getOppositionTeam() != null ? match.getOppositionTeam().getTeamName() : "?";
        String date = match.getMatchDate() != null ? " (" + match.getMatchDate() + ")" : "";
        return home + " vs " + opp + date;
    }
}
