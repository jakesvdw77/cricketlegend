package com.cricketlegend.service.impl;

import com.cricketlegend.domain.*;
import com.cricketlegend.domain.enums.AvailabilityStatus;
import com.cricketlegend.domain.enums.NotificationType;
import com.cricketlegend.dto.MatchPollDTO;
import com.cricketlegend.dto.PlayerAvailabilityDTO;
import com.cricketlegend.dto.PlayerNotificationDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.repository.*;
import com.cricketlegend.service.ManagerTeamService;
import com.cricketlegend.service.MatchPollService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class MatchPollServiceImpl implements MatchPollService {

    private final MatchRepository matchRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final MatchAvailabilityPollRepository pollRepository;
    private final PlayerAvailabilityRepository availabilityRepository;
    private final PlayerNotificationRepository notificationRepository;
    private final ManagerTeamService managerTeamService;

    @Override
    public MatchPollDTO togglePoll(Long matchId, Long teamId, boolean open) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> NotFoundException.of("Match", matchId));
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> NotFoundException.of("Team", teamId));

        MatchAvailabilityPoll poll = pollRepository
                .findByMatchMatchIdAndTeamTeamId(matchId, teamId)
                .orElseGet(() -> MatchAvailabilityPoll.builder()
                        .match(match)
                        .team(team)
                        .createdAt(LocalDateTime.now())
                        .build());

        boolean wasOpen = poll.isOpen();
        poll.setOpen(open);
        poll.setUpdatedAt(LocalDateTime.now());
        poll = pollRepository.save(poll);

        if (open && !wasOpen) {
            sendPollNotifications(poll, match, team);
        }

        return buildPollDTO(poll);
    }

    @Override
    @Transactional(readOnly = true)
    public MatchPollDTO getPoll(Long matchId, Long teamId) {
        MatchAvailabilityPoll poll = pollRepository
                .findByMatchMatchIdAndTeamTeamId(matchId, teamId)
                .orElseThrow(() -> new NotFoundException("No poll found for match " + matchId + " and team " + teamId));
        return buildPollDTO(poll);
    }

    @Override
    public void setMyAvailability(Long matchId, Long teamId, AvailabilityStatus status, String email) {
        Player player = playerRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new NotFoundException("Player not found for email: " + email));

        MatchAvailabilityPoll poll = pollRepository
                .findByMatchMatchIdAndTeamTeamId(matchId, teamId)
                .orElseThrow(() -> new NotFoundException("No poll found for match " + matchId + " and team " + teamId));

        if (!poll.isOpen()) {
            throw new IllegalStateException("Poll is not open");
        }

        PlayerAvailability availability = availabilityRepository
                .findByPollPollIdAndPlayerPlayerId(poll.getPollId(), player.getPlayerId())
                .orElseGet(() -> PlayerAvailability.builder()
                        .poll(poll)
                        .player(player)
                        .build());

        availability.setStatus(status);
        availability.setUpdatedAt(LocalDateTime.now());
        availabilityRepository.save(availability);
    }

    @Override
    public void setPlayerAvailability(Long matchId, Long teamId, Long playerId, AvailabilityStatus status) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> NotFoundException.of("Player", playerId));

        MatchAvailabilityPoll poll = pollRepository
                .findByMatchMatchIdAndTeamTeamId(matchId, teamId)
                .orElseThrow(() -> new NotFoundException("No poll found for match " + matchId + " and team " + teamId));

        PlayerAvailability availability = availabilityRepository
                .findByPollPollIdAndPlayerPlayerId(poll.getPollId(), playerId)
                .orElseGet(() -> PlayerAvailability.builder()
                        .poll(poll)
                        .player(player)
                        .build());

        availability.setStatus(status);
        availability.setUpdatedAt(LocalDateTime.now());
        availabilityRepository.save(availability);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlayerNotificationDTO> getMyNotifications(String email) {
        Player player = playerRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new NotFoundException("Player not found for email: " + email));

        return notificationRepository
                .findByPlayerPlayerIdOrderByCreatedAtDesc(player.getPlayerId())
                .stream()
                .map(n -> toNotificationDTO(n, player))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long countUnreadNotifications(String email) {
        return playerRepository.findByEmailIgnoreCase(email)
                .map(p -> notificationRepository.countByPlayerPlayerIdAndReadFalse(p.getPlayerId()))
                .orElse(0L);
    }

    @Override
    public void markNotificationRead(Long notificationId, String email) {
        Player player = playerRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new NotFoundException("Player not found for email: " + email));

        PlayerNotification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> NotFoundException.of("Notification", notificationId));

        if (!notification.getPlayer().getPlayerId().equals(player.getPlayerId())) {
            throw new IllegalStateException("Not authorised to mark this notification");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Override
    public void markAllNotificationsRead(String email) {
        Player player = playerRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new NotFoundException("Player not found for email: " + email));
        List<PlayerNotification> unread = notificationRepository.findByPlayerPlayerIdAndReadFalse(player.getPlayerId());
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    @Override
    public void clearAllNotifications(String email) {
        Player player = playerRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new NotFoundException("Player not found for email: " + email));
        notificationRepository.deleteByPlayerPlayerId(player.getPlayerId());
    }

    @Override
    public void sendManagerNotification(String subject, String message, String managerEmail, boolean isAdmin, Long teamId) {
        List<Player> players;
        if (isAdmin) {
            players = playerRepository.findAll();
        } else if (teamId != null) {
            Team team = teamRepository.findById(teamId)
                    .orElseThrow(() -> NotFoundException.of("Team", teamId));
            List<Long> squadIds = team.getSquadPlayerIds();
            if (squadIds == null || squadIds.isEmpty()) return;
            players = playerRepository.findAllById(squadIds);
        } else {
            Set<Long> playerIds = managerTeamService.getSquadPlayerIdsForManager(managerEmail);
            if (playerIds.isEmpty()) return;
            players = playerRepository.findAllById(playerIds);
        }

        if (players.isEmpty()) return;

        List<PlayerNotification> notifications = players.stream()
                .map(p -> PlayerNotification.builder()
                        .player(p)
                        .type(NotificationType.MANAGER_MESSAGE)
                        .subject(subject)
                        .message(message)
                        .read(false)
                        .createdAt(LocalDateTime.now())
                        .build())
                .toList();

        notificationRepository.saveAll(notifications);
    }

    private void sendPollNotifications(MatchAvailabilityPoll poll, Match match, Team team) {
        List<Long> squadIds = team.getSquadPlayerIds();
        if (squadIds == null || squadIds.isEmpty()) return;

        List<Player> squadPlayers = playerRepository.findAllById(squadIds);
        List<PlayerNotification> notifications = squadPlayers.stream()
                .map(p -> PlayerNotification.builder()
                        .player(p)
                        .type(NotificationType.POLL_AVAILABLE)
                        .matchId(match.getMatchId())
                        .teamId(team.getTeamId())
                        .read(false)
                        .createdAt(LocalDateTime.now())
                        .build())
                .toList();

        notificationRepository.saveAll(notifications);
    }

    private MatchPollDTO buildPollDTO(MatchAvailabilityPoll poll) {
        Match match = poll.getMatch();
        Team team = poll.getTeam();

        List<Long> squadIds = team.getSquadPlayerIds();
        List<Player> squadPlayers = squadIds != null && !squadIds.isEmpty()
                ? playerRepository.findAllById(squadIds)
                : new ArrayList<>();

        List<PlayerAvailability> responses = availabilityRepository.findByPollPollId(poll.getPollId());
        Map<Long, AvailabilityStatus> statusMap = responses.stream()
                .collect(Collectors.toMap(
                        a -> a.getPlayer().getPlayerId(),
                        PlayerAvailability::getStatus));

        List<PlayerAvailabilityDTO> availability = squadPlayers.stream()
                .map(p -> PlayerAvailabilityDTO.builder()
                        .playerId(p.getPlayerId())
                        .playerName(p.getName() + " " + p.getSurname())
                        .status(statusMap.get(p.getPlayerId()))
                        .build())
                .toList();

        return MatchPollDTO.builder()
                .pollId(poll.getPollId())
                .matchId(match.getMatchId())
                .matchDate(match.getMatchDate() != null ? match.getMatchDate().toString() : null)
                .homeTeamName(match.getHomeTeam() != null ? match.getHomeTeam().getTeamName() : null)
                .oppositionTeamName(match.getOppositionTeam() != null ? match.getOppositionTeam().getTeamName() : null)
                .teamId(team.getTeamId())
                .teamName(team.getTeamName())
                .open(poll.isOpen())
                .availability(availability)
                .build();
    }

    private PlayerNotificationDTO toNotificationDTO(PlayerNotification n, Player player) {
        Match match = n.getMatchId() != null
                ? matchRepository.findById(n.getMatchId()).orElse(null)
                : null;

        AvailabilityStatus availabilityStatus = null;
        if (n.getType() == NotificationType.POLL_AVAILABLE && match != null && n.getTeamId() != null) {
            availabilityStatus = pollRepository
                    .findByMatchMatchIdAndTeamTeamId(n.getMatchId(), n.getTeamId())
                    .flatMap(poll -> availabilityRepository
                            .findByPollPollIdAndPlayerPlayerId(poll.getPollId(), player.getPlayerId()))
                    .map(PlayerAvailability::getStatus)
                    .orElse(null);
        }

        return PlayerNotificationDTO.builder()
                .notificationId(n.getNotificationId())
                .type(n.getType())
                .matchId(n.getMatchId())
                .teamId(n.getTeamId())
                .matchDate(match != null && match.getMatchDate() != null ? match.getMatchDate().toString() : null)
                .homeTeamName(match != null && match.getHomeTeam() != null ? match.getHomeTeam().getTeamName() : null)
                .oppositionTeamName(match != null && match.getOppositionTeam() != null ? match.getOppositionTeam().getTeamName() : null)
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .subject(n.getSubject())
                .message(n.getMessage())
                .availabilityStatus(availabilityStatus)
                .build();
    }
}
