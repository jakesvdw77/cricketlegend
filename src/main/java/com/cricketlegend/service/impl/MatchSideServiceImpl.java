package com.cricketlegend.service.impl;

import com.cricketlegend.domain.MatchSide;
import com.cricketlegend.domain.Player;
import com.cricketlegend.domain.PlayerNotification;
import com.cricketlegend.domain.enums.NotificationType;
import com.cricketlegend.dto.MatchSideDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.mapper.MatchSideMapper;
import com.cricketlegend.repository.MatchRepository;
import com.cricketlegend.repository.MatchSideRepository;
import com.cricketlegend.repository.PlayerNotificationRepository;
import com.cricketlegend.repository.PlayerRepository;
import com.cricketlegend.repository.TeamRepository;
import com.cricketlegend.service.EmailService;
import com.cricketlegend.service.MatchSideService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MatchSideServiceImpl implements MatchSideService {

    private final MatchSideRepository matchSideRepository;
    private final MatchRepository matchRepository;
    private final TeamRepository teamRepository;
    private final MatchSideMapper matchSideMapper;
    private final PlayerRepository playerRepository;
    private final PlayerNotificationRepository notificationRepository;
    private final EmailService emailService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public List<MatchSideDTO> findByMatch(Long matchId) {
        return matchSideRepository.findByMatchMatchId(matchId)
                .stream().map(matchSideMapper::toDto).toList();
    }

    @Override
    public MatchSideDTO findById(Long id) {
        return matchSideRepository.findById(id)
                .map(matchSideMapper::toDto)
                .orElseThrow(() -> NotFoundException.of("MatchSide", id));
    }

    @Override
    @Transactional
    public MatchSideDTO save(MatchSideDTO dto) {
        MatchSide matchSide = dto.getMatchSideId() != null
                ? matchSideRepository.findById(dto.getMatchSideId())
                    .orElse(matchSideMapper.toEntity(dto))
                : matchSideMapper.toEntity(dto);

        boolean wasAnnounced = Boolean.TRUE.equals(matchSide.getTeamAnnounced());

        if (dto.getMatchId() != null) {
            matchSide.setMatch(matchRepository.findById(dto.getMatchId())
                    .orElseThrow(() -> NotFoundException.of("Match", dto.getMatchId())));
        }
        if (dto.getTeamId() != null) {
            matchSide.setTeam(teamRepository.findById(dto.getTeamId())
                    .orElseThrow(() -> NotFoundException.of("Team", dto.getTeamId())));
        }
        matchSide.setPlayingXi(dto.getPlayingXi());
        matchSide.setTwelfthManPlayerId(dto.getTwelfthManPlayerId());
        matchSide.setWicketKeeperPlayerId(dto.getWicketKeeperPlayerId());
        matchSide.setCaptainPlayerId(dto.getCaptainPlayerId());
        matchSide.setTeamAnnounced(dto.getTeamAnnounced());

        MatchSide saved = matchSideRepository.save(matchSide);

        boolean nowAnnounced = Boolean.TRUE.equals(saved.getTeamAnnounced());
        if (nowAnnounced && !wasAnnounced) {
            sendTeamAnnouncedNotifications(saved);
        }

        return matchSideMapper.toDto(saved);
    }

    private void sendTeamAnnouncedNotifications(MatchSide matchSide) {
        var match  = matchSide.getMatch();
        var team   = matchSide.getTeam();
        Long matchId = match.getMatchId();
        Long teamId  = team.getTeamId();

        notificationRepository.deleteByMatchIdAndTeamIdAndType(matchId, teamId, NotificationType.TEAM_ANNOUNCED);

        List<Long> playerIds = new ArrayList<>(matchSide.getPlayingXi() != null ? matchSide.getPlayingXi() : List.of());
        if (matchSide.getTwelfthManPlayerId() != null) playerIds.add(matchSide.getTwelfthManPlayerId());
        if (playerIds.isEmpty()) return;

        List<Player> players = playerRepository.findAllById(playerIds);

        List<PlayerNotification> notifications = players.stream()
                .map(p -> PlayerNotification.builder()
                        .player(p)
                        .type(NotificationType.TEAM_ANNOUNCED)
                        .matchId(matchId)
                        .teamId(teamId)
                        .read(false)
                        .createdAt(LocalDateTime.now())
                        .build())
                .toList();
        notificationRepository.saveAll(notifications);

        // Resolve all lazy data inside the transaction before firing async emails
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy");
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        String home  = match.getHomeTeam()        != null ? match.getHomeTeam().getTeamName()        : "TBD";
        String away  = match.getOppositionTeam()  != null ? match.getOppositionTeam().getTeamName()  : "TBD";
        String matchTitle   = home + " vs " + away;
        String matchDate    = match.getMatchDate()           != null ? match.getMatchDate().format(dateFmt)           : "TBD";
        String startTime    = match.getScheduledStartTime()  != null ? match.getScheduledStartTime().format(timeFmt)  : "TBD";
        String arrivalTime  = match.getArrivalTime()         != null ? match.getArrivalTime().format(timeFmt)         : "TBD";
        String tossTime     = match.getTossTime()            != null ? match.getTossTime().format(timeFmt)            : "TBD";
        String venue        = match.getField()               != null ? match.getField().getName()                     : "TBD";
        String venueAddress = match.getField()               != null ? match.getField().getAddress()                  : null;
        String mapsUrl      = match.getField()               != null ? match.getField().getGoogleMapsUrl()            : null;
        String tournament   = match.getTournament()          != null ? match.getTournament().getName()                : null;
        String matchStage   = match.getMatchStage()          != null ? match.getMatchStage().name().replace("_", " ") : null;
        String teamsheetUrl = frontendUrl + "/matches/" + matchId + "/teamsheet";

        players.stream()
                .filter(p -> Boolean.TRUE.equals(p.getConsentEmail()) && p.getEmail() != null)
                .forEach(p -> emailService.sendTeamAnnouncedEmail(new EmailService.TeamAnnouncedEmailData(
                        p.getEmail(),
                        p.getName() + " " + p.getSurname(),
                        p.getPlayerId().equals(matchSide.getCaptainPlayerId()),
                        p.getPlayerId().equals(matchSide.getWicketKeeperPlayerId()),
                        p.getPlayerId().equals(matchSide.getTwelfthManPlayerId()),
                        matchTitle, matchDate, startTime, arrivalTime, tossTime,
                        team.getTeamName(), venue, venueAddress, mapsUrl,
                        tournament, matchStage, teamsheetUrl
                )));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!matchSideRepository.existsById(id)) throw NotFoundException.of("MatchSide", id);
        matchSideRepository.deleteById(id);
    }
}
