package com.cricketlegend.service.impl;

import com.cricketlegend.domain.*;
import com.cricketlegend.dto.*;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.mapper.TournamentMapper;
import com.cricketlegend.mapper.TournamentPoolMapper;
import com.cricketlegend.repository.*;
import com.cricketlegend.service.FileStorageService;
import com.cricketlegend.service.TournamentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TournamentServiceImpl implements TournamentService {

    private final TournamentRepository tournamentRepository;
    private final TournamentPoolRepository poolRepository;
    private final TeamRepository teamRepository;
    private final SponsorRepository sponsorRepository;
    private final MatchRepository matchRepository;
    private final TournamentMapper tournamentMapper;
    private final TournamentPoolMapper poolMapper;
    private final FileStorageService fileStorageService;

    @Override
    public List<TournamentDTO> findAll() {
        return tournamentRepository.findAll().stream().map(tournamentMapper::toDto).toList();
    }

    @Override
    public TournamentDTO findById(Long id) {
        return tournamentRepository.findById(id)
                .map(tournamentMapper::toDto)
                .orElseThrow(() -> NotFoundException.of("Tournament", id));
    }

    @Override
    @Transactional
    public TournamentDTO create(TournamentDTO dto) {
        Tournament tournament = tournamentMapper.toEntity(dto);
        resolveSponsors(tournament, dto);
        resolveWinningTeam(tournament, dto);
        return tournamentMapper.toDto(tournamentRepository.save(tournament));
    }

    @Override
    @Transactional
    public TournamentDTO update(Long id, TournamentDTO dto) {
        Tournament existing = tournamentRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Tournament", id));
        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setStartDate(dto.getStartDate());
        existing.setEndDate(dto.getEndDate());
        existing.setCricketFormat(dto.getCricketFormat());
        existing.setAgeGroup(dto.getAgeGroup());
        existing.setTournamentGender(dto.getTournamentGender());
        existing.setBannerUrl(dto.getBannerUrl());
        existing.setLogoUrl(dto.getLogoUrl());
        existing.setPlayingConditionsUrl(dto.getPlayingConditionsUrl());
        existing.setWebsiteLink(dto.getWebsiteLink());
        existing.setFacebookLink(dto.getFacebookLink());
        existing.setInstagramLink(dto.getInstagramLink());
        existing.setYoutubeLink(dto.getYoutubeLink());
        existing.setRegistrationPageUrl(dto.getRegistrationPageUrl());
        existing.setEntryFee(dto.getEntryFee());
        existing.setRegistrationFee(dto.getRegistrationFee());
        existing.setMatchFee(dto.getMatchFee());
        existing.setPointsForWin(dto.getPointsForWin());
        existing.setPointsForDraw(dto.getPointsForDraw());
        existing.setPointsForNoResult(dto.getPointsForNoResult());
        existing.setPointsForBonus(dto.getPointsForBonus());
        resolveSponsors(existing, dto);
        resolveWinningTeam(existing, dto);
        return tournamentMapper.toDto(tournamentRepository.save(existing));
    }

    private void resolveWinningTeam(Tournament tournament, TournamentDTO dto) {
        if (dto.getWinningTeamId() == null) {
            tournament.setWinningTeam(null);
        } else {
            tournament.setWinningTeam(teamRepository.findById(dto.getWinningTeamId())
                    .orElseThrow(() -> NotFoundException.of("Team", dto.getWinningTeamId())));
        }
    }

    private void resolveSponsors(Tournament tournament, TournamentDTO dto) {
        if (dto.getSponsors() == null) {
            tournament.getSponsors().clear();
            return;
        }
        List<Long> ids = dto.getSponsors().stream()
                .map(s -> s.getSponsorId())
                .filter(Objects::nonNull)
                .toList();
        List<Sponsor> sponsors = new ArrayList<>(sponsorRepository.findAllById(ids));
        tournament.getSponsors().clear();
        tournament.getSponsors().addAll(sponsors);
    }

    @Override
    @Transactional
    public void removeLogo(Long id) {
        Tournament existing = tournamentRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Tournament", id));
        fileStorageService.deleteFile(existing.getLogoUrl());
        existing.setLogoUrl(null);
        tournamentRepository.save(existing);
    }

    @Override
    @Transactional
    public void removeBanner(Long id) {
        Tournament existing = tournamentRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Tournament", id));
        fileStorageService.deleteFile(existing.getBannerUrl());
        existing.setBannerUrl(null);
        tournamentRepository.save(existing);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!tournamentRepository.existsById(id)) throw NotFoundException.of("Tournament", id);
        tournamentRepository.deleteById(id);
    }

    @Override
    @Transactional
    public TournamentPoolDTO addPool(Long tournamentId, TournamentPoolDTO poolDTO) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> NotFoundException.of("Tournament", tournamentId));
        TournamentPool pool = poolMapper.toEntity(poolDTO);
        pool.setTournament(tournament);
        return poolMapper.toDto(poolRepository.save(pool));
    }

    @Override
    @Transactional
    public void addTeamToPool(Long poolId, Long teamId) {
        TournamentPool pool = poolRepository.findById(poolId)
                .orElseThrow(() -> NotFoundException.of("TournamentPool", poolId));
        var team = teamRepository.findById(teamId)
                .orElseThrow(() -> NotFoundException.of("Team", teamId));
        TournamentTeam tt = TournamentTeam.builder().pool(pool).team(team).build();
        pool.getTeams().add(tt);
        poolRepository.save(pool);
    }

    @Override
    @Transactional
    public void deletePool(Long poolId) {
        if (!poolRepository.existsById(poolId)) throw NotFoundException.of("TournamentPool", poolId);
        poolRepository.deleteById(poolId);
    }

    @Override
    @Transactional
    public void removeTeamFromPool(Long poolId, Long teamId) {
        TournamentPool pool = poolRepository.findById(poolId)
                .orElseThrow(() -> NotFoundException.of("TournamentPool", poolId));
        pool.getTeams().removeIf(t -> t.getTeam().getTeamId().equals(teamId));
        poolRepository.save(pool);
    }

    @Override
    public List<PoolStandingsDTO> getStandings(Long tournamentId) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> NotFoundException.of("Tournament", tournamentId));
        List<Match> allMatches = matchRepository.findByTournamentTournamentId(tournamentId);
        return tournament.getPools().stream()
                .map(pool -> buildPoolStandings(pool, allMatches, tournament))
                .toList();
    }

    private PoolStandingsDTO buildPoolStandings(TournamentPool pool, List<Match> allMatches, Tournament tournament) {
        Set<Long> poolTeamIds = pool.getTeams().stream()
                .map(t -> t.getTeam().getTeamId())
                .collect(Collectors.toSet());

        List<Match> poolMatches = allMatches.stream()
                .filter(m -> m.getHomeTeam() != null && m.getOppositionTeam() != null)
                .filter(m -> poolTeamIds.contains(m.getHomeTeam().getTeamId())
                        && poolTeamIds.contains(m.getOppositionTeam().getTeamId()))
                .toList();

        List<PoolStandingEntryDTO> entries = pool.getTeams().stream()
                .map(tt -> buildEntry(tt.getTeam(), poolMatches, tournament))
                .sorted(Comparator.comparingInt(PoolStandingEntryDTO::getPoints).reversed()
                        .thenComparing(Comparator.comparingDouble(PoolStandingEntryDTO::getNetRunRate).reversed()))
                .toList();

        return PoolStandingsDTO.builder()
                .poolId(pool.getPoolId())
                .poolName(pool.getPoolName())
                .entries(entries)
                .build();
    }

    private PoolStandingEntryDTO buildEntry(Team team, List<Match> poolMatches, Tournament tournament) {
        int played = 0, won = 0, lost = 0, noResults = 0, draws = 0, bonusPoints = 0;
        double runsScored = 0, oversFaced = 0, runsConceded = 0, oversBowled = 0;

        for (Match m : poolMatches) {
            MatchResult r = m.getResult();
            if (r == null || !Boolean.TRUE.equals(r.getMatchCompleted())) continue;

            Long teamId = team.getTeamId();
            boolean involved = m.getHomeTeam().getTeamId().equals(teamId)
                    || m.getOppositionTeam().getTeamId().equals(teamId);
            if (!involved) continue;

            played++;

            if (Boolean.TRUE.equals(r.getMatchDrawn())) {
                draws++;
            } else if (r.getWinningTeam() == null) {
                noResults++;
            } else if (r.getWinningTeam().getTeamId().equals(teamId)) {
                won++;
                if (Boolean.TRUE.equals(r.getWonWithBonusPoint())) bonusPoints++;
            } else {
                lost++;
            }

            if (!Boolean.TRUE.equals(r.getForfeited()) && !Boolean.TRUE.equals(r.getNoResult())) {
                boolean battedFirst = r.getSideBattingFirst() != null
                        && r.getSideBattingFirst().getTeamId().equals(teamId);
                if (battedFirst) {
                    runsScored += r.getScoreBattingFirst() != null ? r.getScoreBattingFirst() : 0;
                    oversFaced += toDecimalOvers(r.getOversBattingFirst());
                    runsConceded += r.getScoreBattingSecond() != null ? r.getScoreBattingSecond() : 0;
                    oversBowled += toDecimalOvers(r.getOversBattingSecond());
                } else {
                    runsScored += r.getScoreBattingSecond() != null ? r.getScoreBattingSecond() : 0;
                    oversFaced += toDecimalOvers(r.getOversBattingSecond());
                    runsConceded += r.getScoreBattingFirst() != null ? r.getScoreBattingFirst() : 0;
                    oversBowled += toDecimalOvers(r.getOversBattingFirst());
                }
            }
        }

        int pts = won * pts(tournament.getPointsForWin(), 2)
                + draws * pts(tournament.getPointsForDraw(), 1)
                + noResults * pts(tournament.getPointsForNoResult(), 1)
                + bonusPoints * pts(tournament.getPointsForBonus(), 1);

        double nrr = (oversFaced > 0 && oversBowled > 0)
                ? Math.round(((runsScored / oversFaced) - (runsConceded / oversBowled)) * 1000.0) / 1000.0
                : 0.0;

        return PoolStandingEntryDTO.builder()
                .teamId(team.getTeamId())
                .teamName(team.getTeamName())
                .logoUrl(team.getLogoUrl())
                .gamesPlayed(played)
                .won(won)
                .lost(lost)
                .noResults(noResults)
                .draws(draws)
                .points(pts)
                .bonusPoints(bonusPoints)
                .netRunRate(nrr)
                .build();
    }

    private static int pts(Integer configured, int defaultVal) {
        return configured != null ? configured : defaultVal;
    }

    private static double toDecimalOvers(String overs) {
        if (overs == null || overs.isBlank()) return 0;
        try {
            String[] parts = overs.split("\\.");
            int full = Integer.parseInt(parts[0]);
            int balls = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
            return full + balls / 6.0;
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
