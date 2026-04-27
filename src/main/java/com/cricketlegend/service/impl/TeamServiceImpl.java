package com.cricketlegend.service.impl;

import com.cricketlegend.domain.Sponsor;
import com.cricketlegend.domain.Team;
import com.cricketlegend.dto.PlayerDTO;
import com.cricketlegend.dto.SponsorDTO;
import com.cricketlegend.dto.TeamDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.mapper.PlayerMapper;
import com.cricketlegend.mapper.TeamMapper;
import com.cricketlegend.domain.Player;
import com.cricketlegend.domain.Tournament;
import com.cricketlegend.repository.ClubRepository;
import com.cricketlegend.repository.FieldRepository;
import com.cricketlegend.repository.PlayerRepository;
import com.cricketlegend.repository.SponsorRepository;
import com.cricketlegend.repository.TeamRepository;
import com.cricketlegend.repository.TournamentRepository;
import com.cricketlegend.service.EmailService;
import com.cricketlegend.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeamServiceImpl implements TeamService {

    private final TeamRepository teamRepository;
    private final ClubRepository clubRepository;
    private final PlayerRepository playerRepository;
    private final FieldRepository fieldRepository;
    private final SponsorRepository sponsorRepository;
    private final TournamentRepository tournamentRepository;
    private final EmailService emailService;

    @Value("${app.frontend-url}")
    private String frontendUrl;
    private final TeamMapper teamMapper;
    private final PlayerMapper playerMapper;

    @Override
    public List<TeamDTO> findAll() {
        return teamRepository.findAll().stream().map(teamMapper::toDto).toList();
    }

    @Override
    public TeamDTO findById(Long id) {
        return teamRepository.findById(id)
                .map(teamMapper::toDto)
                .orElseThrow(() -> NotFoundException.of("Team", id));
    }

    @Override
    @Transactional
    public TeamDTO create(TeamDTO dto) {
        Team team = teamMapper.toEntity(dto);
        resolveAssociations(team, dto);
        resolveSponsors(team, dto);
        return teamMapper.toDto(teamRepository.save(team));
    }

    @Override
    @Transactional
    public TeamDTO update(Long id, TeamDTO dto) {
        Team existing = teamRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Team", id));
        existing.setTeamName(dto.getTeamName());
        existing.setAbbreviation(dto.getAbbreviation());
        existing.setCoach(dto.getCoach());
        existing.setManager(dto.getManager());
        existing.setAdministrator(dto.getAdministrator());
        existing.setEmail(dto.getEmail());
        existing.setContactNumber(dto.getContactNumber());
        existing.setSelector(dto.getSelector());
        existing.setLogoUrl(dto.getLogoUrl());
        existing.setTeamPhotoUrl(dto.getTeamPhotoUrl());
        existing.setWebsiteUrl(dto.getWebsiteUrl());
        existing.setFacebookUrl(dto.getFacebookUrl());
        existing.setInstagramUrl(dto.getInstagramUrl());
        existing.setYoutubeUrl(dto.getYoutubeUrl());
        resolveAssociations(existing, dto);
        resolveSponsors(existing, dto);
        return teamMapper.toDto(teamRepository.save(existing));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!teamRepository.existsById(id)) throw NotFoundException.of("Team", id);
        teamRepository.deleteById(id);
    }

    @Override
    public List<TeamDTO> findByPlayerId(Long playerId) {
        return teamRepository.findBySquadPlayerIdsContaining(playerId)
                .stream().map(teamMapper::toDto).toList();
    }

    @Override
    public List<PlayerDTO> getSquad(Long teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> NotFoundException.of("Team", teamId));
        return team.getSquadPlayerIds().stream()
                .map(pid -> playerRepository.findById(pid)
                        .map(playerMapper::toDto)
                        .orElse(null))
                .filter(p -> p != null)
                .sorted(Comparator.comparing(PlayerDTO::getName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Override
    @Transactional
    public void addToSquad(Long teamId, Long playerId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> NotFoundException.of("Team", teamId));
        if (!playerRepository.existsById(playerId)) throw NotFoundException.of("Player", playerId);
        if (!team.getSquadPlayerIds().contains(playerId)) {
            team.getSquadPlayerIds().add(playerId);
            teamRepository.save(team);
        }
    }

    @Override
    @Transactional
    public void removeFromSquad(Long teamId, Long playerId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> NotFoundException.of("Team", teamId));
        team.getSquadPlayerIds().remove(playerId);
        teamRepository.save(team);
    }

    private void resolveSponsors(Team team, TeamDTO dto) {
        if (dto.getSponsors() == null) {
            team.getSponsors().clear();
            return;
        }
        List<Long> ids = dto.getSponsors().stream()
                .map(SponsorDTO::getSponsorId)
                .filter(Objects::nonNull)
                .toList();
        List<Sponsor> sponsors = new ArrayList<>(sponsorRepository.findAllById(ids));
        team.getSponsors().clear();
        team.getSponsors().addAll(sponsors);
    }

    @Override
    @Transactional(readOnly = true)
    public void notifySquad(Long teamId, Long tournamentId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> NotFoundException.of("Team", teamId));

        List<Long> squadIds = team.getSquadPlayerIds();
        if (squadIds == null || squadIds.isEmpty()) return;

        List<Player> players = playerRepository.findAllById(squadIds);

        // Resolve all lazy associations in this transaction
        String captainName = team.getCaptain() != null
                ? team.getCaptain().getName() + " " + team.getCaptain().getSurname() : null;
        String homeField = team.getHomeField() != null ? team.getHomeField().getName() : null;

        Tournament tournament = tournamentId != null
                ? tournamentRepository.findById(tournamentId).orElse(null) : null;

        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("d MMMM yyyy");
        String tournamentName  = tournament != null ? tournament.getName() : null;
        String tournamentDates = tournament != null && (tournament.getStartDate() != null || tournament.getEndDate() != null)
                ? (tournament.getStartDate() != null ? tournament.getStartDate().format(dateFmt) : "")
                  + (tournament.getStartDate() != null && tournament.getEndDate() != null ? " – " : "")
                  + (tournament.getEndDate() != null ? tournament.getEndDate().format(dateFmt) : "")
                : null;
        String cricketFormat    = tournament != null && tournament.getCricketFormat() != null
                ? tournament.getCricketFormat().name().replace("_", " ") : null;
        String ageGroup         = tournament != null && tournament.getAgeGroup() != null
                ? tournament.getAgeGroup().name().replace("_", " ") : null;
        String tournamentGender = tournament != null && tournament.getTournamentGender() != null
                ? tournament.getTournamentGender().name().replace("_", " ") : null;
        String description      = tournament != null ? tournament.getDescription() : null;
        String websiteLink      = tournament != null ? tournament.getWebsiteLink() : null;
        String facebookLink     = tournament != null ? tournament.getFacebookLink() : null;
        String instagramLink    = tournament != null ? tournament.getInstagramLink() : null;
        String youtubeLink      = tournament != null ? tournament.getYoutubeLink() : null;
        String tournamentLogoUrl = tournament != null ? tournament.getLogoUrl() : null;
        String playingConditions = tournament != null ? tournament.getPlayingConditionsUrl() : null;
        String regFee  = tournament != null && tournament.getRegistrationFee() != null
                ? "R " + tournament.getRegistrationFee().setScale(2, java.math.RoundingMode.HALF_UP) : null;
        String matchFee = tournament != null && tournament.getMatchFee() != null
                ? "R " + tournament.getMatchFee().setScale(2, java.math.RoundingMode.HALF_UP) : null;
        String squadUrl = frontendUrl + "/admin/teams/" + teamId + "/squad";

        // Build squad list (sorted by name, captain first)
        Long captainId = team.getCaptain() != null ? team.getCaptain().getPlayerId() : null;
        List<EmailService.SquadPlayer> squadList = players.stream()
                .sorted(Comparator.comparing(p -> (p.getName() + " " + p.getSurname())))
                .map(p -> {
                    boolean isCap = p.getPlayerId().equals(captainId);
                    String role = buildRoleText(p);
                    return new EmailService.SquadPlayer(p.getName() + " " + p.getSurname(), role, isCap);
                })
                .toList();

        players.stream()
                .filter(p -> Boolean.TRUE.equals(p.getConsentEmail()) && p.getEmail() != null)
                .forEach(p -> emailService.sendSquadEmail(new EmailService.SquadEmailData(
                        p.getEmail(),
                        p.getName() + " " + p.getSurname(),
                        team.getTeamName(),
                        captainName,
                        team.getCoach(),
                        team.getManager(),
                        homeField,
                        squadList,
                        squadUrl,
                        tournamentName,
                        tournamentLogoUrl,
                        tournamentDates,
                        cricketFormat,
                        ageGroup,
                        tournamentGender,
                        description,
                        websiteLink,
                        facebookLink,
                        instagramLink,
                        youtubeLink,
                        playingConditions,
                        regFee,
                        matchFee
                )));
    }

    private String buildRoleText(Player p) {
        boolean isBowler = p.getBowlingType() != null
                && !p.getBowlingType().name().equals("NONE")
                && !Boolean.TRUE.equals(p.getPartTimeBowler());
        if (Boolean.TRUE.equals(p.getWicketKeeper())) return isBowler ? "WK / Bat" : "WK / Bat";
        if (isBowler) return "Bat / Bowl";
        return "Batsman";
    }

    private void resolveAssociations(Team team, TeamDTO dto) {
        if (dto.getAssociatedClubId() != null) {
            team.setAssociatedClub(clubRepository.findById(dto.getAssociatedClubId())
                    .orElseThrow(() -> NotFoundException.of("Club", dto.getAssociatedClubId())));
        }
        if (dto.getCaptainId() != null) {
            team.setCaptain(playerRepository.findById(dto.getCaptainId())
                    .orElseThrow(() -> NotFoundException.of("Player", dto.getCaptainId())));
        }
        if (dto.getHomeFieldId() != null) {
            team.setHomeField(fieldRepository.findById(dto.getHomeFieldId())
                    .orElseThrow(() -> NotFoundException.of("Field", dto.getHomeFieldId())));
        }
    }
}
