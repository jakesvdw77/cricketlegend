package com.cricketlegend.service.impl;

import com.cricketlegend.domain.*;
import com.cricketlegend.domain.enums.EventCategory;
import com.cricketlegend.domain.enums.NotificationType;
import com.cricketlegend.domain.enums.RecurrenceType;
import com.cricketlegend.dto.ClubEventDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.repository.*;
import com.cricketlegend.service.ClubEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ClubEventServiceImpl implements ClubEventService {

    private static final int MAX_OCCURRENCES = 52;
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private final ClubEventRepository eventRepository;
    private final ClubRepository clubRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final PlayerNotificationRepository notificationRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ClubEventDTO> getMyEvents(String email) {
        Player player = playerRepository.findByEmailIgnoreCase(email).orElse(null);
        if (player == null || player.getHomeClub() == null) return List.of();

        Long clubId = player.getHomeClub().getClubId();
        LocalDate today = LocalDate.now().minusDays(1);

        // Find all teams the player belongs to in this club
        List<Team> playerTeams = teamRepository.findBySquadPlayerIdsContaining(player.getPlayerId())
                .stream()
                .filter(t -> t.getAssociatedClub() != null && t.getAssociatedClub().getClubId().equals(clubId))
                .toList();

        List<ClubEvent> events = new ArrayList<>(eventRepository.findClubWideFrom(clubId, today));
        for (Team team : playerTeams) {
            eventRepository.findUpcomingByClub(clubId, today).stream()
                    .filter(e -> e.getTeam() != null && e.getTeam().getTeamId().equals(team.getTeamId()))
                    .forEach(events::add);
        }

        return events.stream()
                .distinct()
                .sorted((a, b) -> {
                    int d = a.getEventDate().compareTo(b.getEventDate());
                    if (d != 0) return d;
                    if (a.getStartTime() == null) return 1;
                    if (b.getStartTime() == null) return -1;
                    return a.getStartTime().compareTo(b.getStartTime());
                })
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClubEventDTO> getByClub(Long clubId) {
        return eventRepository.findByClubClubIdOrderByEventDateAscStartTimeAsc(clubId)
                .stream().map(this::toDto).toList();
    }

    @Override
    public ClubEventDTO create(ClubEventDTO dto, String creatorEmail) {
        Club club = clubRepository.findById(dto.getClubId())
                .orElseThrow(() -> NotFoundException.of("Club", dto.getClubId()));
        Team team = dto.getTeamId() != null
                ? teamRepository.findById(dto.getTeamId()).orElse(null)
                : null;
        Player creator = playerRepository.findByEmailIgnoreCase(creatorEmail).orElse(null);

        List<LocalDate> dates = buildDates(
                LocalDate.parse(dto.getEventDate()),
                dto.getRecurrence() != null ? dto.getRecurrence() : RecurrenceType.NONE,
                dto.getRecurrenceEndDate() != null ? LocalDate.parse(dto.getRecurrenceEndDate()) : null
        );

        List<ClubEvent> saved = new ArrayList<>();
        for (LocalDate date : dates) {
            ClubEvent event = ClubEvent.builder()
                    .club(club)
                    .team(team)
                    .category(dto.getCategory())
                    .title(dto.getTitle())
                    .notes(dto.getNotes())
                    .eventDate(date)
                    .startTime(dto.getStartTime() != null ? LocalTime.parse(dto.getStartTime(), TIME_FMT) : null)
                    .endTime(dto.getEndTime() != null ? LocalTime.parse(dto.getEndTime(), TIME_FMT) : null)
                    .locationName(dto.getLocationName())
                    .googleMapsUrl(dto.getGoogleMapsUrl())
                    .meetingUrl(dto.getMeetingUrl())
                    .recurrence(dto.getRecurrence() != null ? dto.getRecurrence() : RecurrenceType.NONE)
                    .recurrenceEndDate(dto.getRecurrenceEndDate() != null ? LocalDate.parse(dto.getRecurrenceEndDate()) : null)
                    .createdAt(LocalDateTime.now())
                    .createdBy(creator)
                    .build();
            saved.add(eventRepository.save(event));
        }

        // Set seriesId on all events in the series
        if (saved.size() > 1) {
            Long seriesId = saved.get(0).getEventId();
            saved.forEach(e -> e.setSeriesId(seriesId));
            eventRepository.saveAll(saved);
        }

        sendEventNotifications(saved.get(0), club, team);
        return toDto(saved.get(0));
    }

    @Override
    public ClubEventDTO update(Long eventId, ClubEventDTO dto) {
        ClubEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> NotFoundException.of("ClubEvent", eventId));
        Team team = dto.getTeamId() != null
                ? teamRepository.findById(dto.getTeamId()).orElse(null)
                : null;

        event.setTeam(team);
        event.setCategory(dto.getCategory());
        event.setTitle(dto.getTitle());
        event.setNotes(dto.getNotes());
        event.setEventDate(LocalDate.parse(dto.getEventDate()));
        event.setStartTime(dto.getStartTime() != null ? LocalTime.parse(dto.getStartTime(), TIME_FMT) : null);
        event.setEndTime(dto.getEndTime() != null ? LocalTime.parse(dto.getEndTime(), TIME_FMT) : null);
        event.setLocationName(dto.getLocationName());
        event.setGoogleMapsUrl(dto.getGoogleMapsUrl());
        event.setMeetingUrl(dto.getMeetingUrl());
        return toDto(eventRepository.save(event));
    }

    @Override
    public void delete(Long eventId) {
        if (!eventRepository.existsById(eventId)) throw NotFoundException.of("ClubEvent", eventId);
        eventRepository.deleteById(eventId);
    }

    @Override
    public void deleteSeries(Long seriesId) {
        List<ClubEvent> series = eventRepository.findBySeriesId(seriesId);
        eventRepository.deleteAll(series);
    }

    // ---- helpers ----

    private List<LocalDate> buildDates(LocalDate start, RecurrenceType recurrence, LocalDate endDate) {
        List<LocalDate> dates = new ArrayList<>();
        dates.add(start);
        if (recurrence == RecurrenceType.NONE) return dates;

        LocalDate limit = endDate != null ? endDate : start.plusYears(1);
        LocalDate current = next(start, recurrence);
        while (!current.isAfter(limit) && dates.size() < MAX_OCCURRENCES) {
            dates.add(current);
            current = next(current, recurrence);
        }
        return dates;
    }

    private LocalDate next(LocalDate date, RecurrenceType recurrence) {
        return switch (recurrence) {
            case WEEKLY -> date.plusWeeks(1);
            case FORTNIGHTLY -> date.plusWeeks(2);
            case MONTHLY -> date.plusMonths(1);
            default -> date;
        };
    }

    private void sendEventNotifications(ClubEvent event, Club club, Team team) {
        List<Player> recipients = team != null
                ? playerRepository.findAllById(team.getSquadPlayerIds())
                : playerRepository.findByHomeClubClubId(club.getClubId());

        String subject = categoryLabel(event.getCategory()) + ": " +
                (event.getTitle() != null ? event.getTitle() : club.getName());
        String body = event.getEventDate().toString()
                + (event.getStartTime() != null ? " at " + event.getStartTime().format(TIME_FMT) : "")
                + (event.getLocationName() != null ? " — " + event.getLocationName() : "");

        List<PlayerNotification> notifications = recipients.stream()
                .map(p -> PlayerNotification.builder()
                        .player(p)
                        .type(NotificationType.CLUB_EVENT)
                        .eventId(event.getEventId())
                        .subject(subject)
                        .message(body)
                        .read(false)
                        .createdAt(LocalDateTime.now())
                        .build())
                .toList();
        notificationRepository.saveAll(notifications);
    }

    private String categoryLabel(EventCategory category) {
        return switch (category) {
            case TEAM_PRACTISE -> "Team Practice";
            case AWARD_CEREMONY -> "Award Ceremony";
            case CAPPING_CEREMONY -> "Capping Ceremony";
            case TEAM_MEETING -> "Team Meeting";
        };
    }

    private ClubEventDTO toDto(ClubEvent e) {
        return ClubEventDTO.builder()
                .eventId(e.getEventId())
                .clubId(e.getClub().getClubId())
                .clubName(e.getClub().getName())
                .teamId(e.getTeam() != null ? e.getTeam().getTeamId() : null)
                .teamName(e.getTeam() != null ? e.getTeam().getTeamName() : null)
                .category(e.getCategory())
                .title(e.getTitle())
                .notes(e.getNotes())
                .eventDate(e.getEventDate().toString())
                .startTime(e.getStartTime() != null ? e.getStartTime().format(TIME_FMT) : null)
                .endTime(e.getEndTime() != null ? e.getEndTime().format(TIME_FMT) : null)
                .locationName(e.getLocationName())
                .googleMapsUrl(e.getGoogleMapsUrl())
                .meetingUrl(e.getMeetingUrl())
                .recurrence(e.getRecurrence())
                .recurrenceEndDate(e.getRecurrenceEndDate() != null ? e.getRecurrenceEndDate().toString() : null)
                .seriesId(e.getSeriesId())
                .createdByName(e.getCreatedBy() != null
                        ? e.getCreatedBy().getName() + " " + e.getCreatedBy().getSurname()
                        : null)
                .build();
    }
}
