package com.cricketlegend.service;

import com.cricketlegend.domain.AiAnalysisCache;
import com.cricketlegend.domain.Match;
import com.cricketlegend.domain.MatchAvailabilityPoll;
import com.cricketlegend.domain.MatchSide;
import com.cricketlegend.domain.Player;
import com.cricketlegend.domain.PlayerAvailability;
import com.cricketlegend.domain.PlayerResult;
import com.cricketlegend.domain.enums.AvailabilityStatus;
import com.cricketlegend.domain.enums.BowlingType;
import com.cricketlegend.dto.AiTeamPickDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.repository.AiAnalysisCacheRepository;
import com.cricketlegend.repository.MatchAvailabilityPollRepository;
import com.cricketlegend.repository.MatchRepository;
import com.cricketlegend.repository.MatchSideRepository;
import com.cricketlegend.repository.PlayerAvailabilityRepository;
import com.cricketlegend.repository.PlayerRepository;
import com.cricketlegend.repository.PlayerResultRepository;
import com.cricketlegend.repository.TeamRepository;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.cfg.CoercionAction;
import com.fasterxml.jackson.databind.cfg.CoercionInputShape;
import com.fasterxml.jackson.databind.type.LogicalType;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiTeamPickService {

    private static final String TYPE_STRONGEST = "ai_team_pick";
    private static final String TYPE_ROTATION  = "ai_team_pick_rotation";
    private static final ObjectMapper MAPPER = buildMapper();

    private static ObjectMapper buildMapper() {
        ObjectMapper m = new ObjectMapper();
        m.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        m.coercionConfigFor(LogicalType.Float).setCoercion(CoercionInputShape.String, CoercionAction.AsNull);
        m.coercionConfigFor(LogicalType.Integer).setCoercion(CoercionInputShape.String, CoercionAction.AsNull);
        m.registerModule(new JavaTimeModule());
        m.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return m;
    }

    private final MatchRepository                matchRepository;
    private final TeamRepository                 teamRepository;
    private final PlayerRepository               playerRepository;
    private final MatchSideRepository            matchSideRepository;
    private final MatchAvailabilityPollRepository pollRepository;
    private final PlayerAvailabilityRepository   availabilityRepository;
    private final PlayerResultRepository         playerResultRepository;
    private final AiService                      aiService;
    private final AiAnalysisCacheRepository      cacheRepository;

    @Transactional
    public AiTeamPickDTO pick(Long matchId, Long teamId, boolean regenerate, String strategy) {
        String cacheType = "ROTATION".equalsIgnoreCase(strategy) ? TYPE_ROTATION : TYPE_STRONGEST;
        if (!regenerate) {
            Optional<AiAnalysisCache> cached =
                    cacheRepository.findByAnalysisTypeAndPrimaryIdAndSecondaryId(cacheType, matchId, teamId);
            if (cached.isPresent()) {
                try {
                    AiTeamPickDTO dto = MAPPER.readValue(cached.get().getResultJson(), AiTeamPickDTO.class);
                    dto.setGeneratedAt(cached.get().getGeneratedAt());
                    return dto;
                } catch (Exception e) {
                    log.warn("Failed to deserialize cached team pick ({}) for match {} team {}, regenerating", cacheType, matchId, teamId, e);
                }
            }
        }
        return generate(matchId, teamId, strategy);
    }

    private AiTeamPickDTO generate(Long matchId, Long teamId, String strategy) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> NotFoundException.of("Match", matchId));

        var team = teamRepository.findById(teamId)
                .orElseThrow(() -> NotFoundException.of("Team", teamId));

        List<Long>   squadIds = team.getSquadPlayerIds();
        List<Player> squad    = playerRepository.findAllById(squadIds);

        // ── Availability ──────────────────────────────────────────────────────
        Map<Long, AvailabilityStatus> availMap = new HashMap<>();
        Optional<MatchAvailabilityPoll> pollOpt = pollRepository.findByMatchMatchIdAndTeamTeamId(matchId, teamId);
        if (pollOpt.isPresent()) {
            availabilityRepository.findByPollPollId(pollOpt.get().getPollId())
                    .forEach(a -> availMap.put(a.getPlayer().getPlayerId(), a.getStatus()));
        }

        // ── Tournament appearances ─────────────────────────────────────────────
        Map<Long, Integer> appearanceMap = new HashMap<>();
        if (match.getTournament() != null) {
            Long tournamentId = match.getTournament().getTournamentId();
            matchSideRepository.findCompletedByTournamentAndTeam(tournamentId, teamId)
                    .forEach(ms -> ms.getPlayingXi()
                            .forEach(pid -> appearanceMap.merge(pid, 1, Integer::sum)));
        }

        String teamName  = team.getTeamName();
        String oppName   = teamId.equals(match.getHomeTeam() != null ? match.getHomeTeam().getTeamId() : null)
                ? (match.getOppositionTeam() != null ? match.getOppositionTeam().getTeamName() : "Opposition")
                : (match.getHomeTeam()       != null ? match.getHomeTeam().getTeamName()       : "Home Team");
        boolean inTournament = match.getTournament() != null;
        boolean useRotation  = "ROTATION".equalsIgnoreCase(strategy);

        Map<Long, PlayerResult[]> tournamentStatsMap = new HashMap<>();
        if (inTournament) {
            List<PlayerResult> results = playerResultRepository.findByTournamentAndTeam(
                    match.getTournament().getTournamentId(), teamId);
            Set<Long> squadIdSet = squad.stream().map(Player::getPlayerId).collect(Collectors.toSet());
            results.stream()
                    .filter(r -> squadIdSet.contains(r.getPlayer().getPlayerId()))
                    .collect(Collectors.groupingBy(r -> r.getPlayer().getPlayerId()))
                    .forEach((pid, list) -> tournamentStatsMap.put(pid, list.toArray(new PlayerResult[0])));
        }

        String systemPrompt = buildSystemPrompt(teamName, inTournament, useRotation);
        String userPrompt   = buildUserPrompt(teamName, oppName, match, squad, availMap, appearanceMap, tournamentStatsMap, inTournament, useRotation);

        String raw = aiService.call(null, null, "team_pick", systemPrompt, userPrompt);
        String json = raw.trim();
        if (json.startsWith("```")) {
            json = json.replaceFirst("(?s)```[a-z]*\\s*", "").replaceFirst("(?s)```\\s*$", "").trim();
        }

        AiTeamPickDTO dto;
        try {
            dto = MAPPER.readValue(json, AiTeamPickDTO.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse AI team pick: " + e.getMessage(), e);
        }

        // ── Resolve names → player IDs ────────────────────────────────────────
        Map<String, Long> nameToId = squad.stream().collect(Collectors.toMap(
                p -> (p.getName() + " " + p.getSurname()).toLowerCase(),
                Player::getPlayerId,
                (a, b) -> a
        ));

        List<Long> xiIds = new ArrayList<>();
        if (dto.getSelectedXi() != null) {
            dto.getSelectedXi().stream()
                    .sorted(Comparator.comparingInt(p -> p.getBattingPosition() != null ? p.getBattingPosition() : 99))
                    .forEach(p -> {
                        Long pid = nameToId.get(p.getName().toLowerCase());
                        if (pid != null) xiIds.add(pid);
                    });
        }
        dto.setResolvedXiPlayerIds(xiIds);

        if (dto.getTwelfthMan() != null && dto.getTwelfthMan().getName() != null) {
            dto.setResolvedTwelfthManId(nameToId.get(dto.getTwelfthMan().getName().toLowerCase()));
        }

        // ── Build chart data ──────────────────────────────────────────────────
        Set<Long> selectedSet = new HashSet<>(xiIds);

        int available = 0, unavailable = 0, unsure = 0, noResponse = 0;
        for (Player p : squad) {
            AvailabilityStatus s = availMap.get(p.getPlayerId());
            if (s == null)                       noResponse++;
            else if (s == AvailabilityStatus.YES) available++;
            else if (s == AvailabilityStatus.NO)  unavailable++;
            else                                  unsure++;
        }

        List<AiTeamPickDTO.LabelCount> availSummary = new ArrayList<>();
        if (available   > 0) availSummary.add(new AiTeamPickDTO.LabelCount("Available",    available));
        if (noResponse  > 0) availSummary.add(new AiTeamPickDTO.LabelCount("No Response",  noResponse));
        if (unsure      > 0) availSummary.add(new AiTeamPickDTO.LabelCount("Unsure",        unsure));
        if (unavailable > 0) availSummary.add(new AiTeamPickDTO.LabelCount("Unavailable",   unavailable));

        List<AiTeamPickDTO.PlayerAppearance> appearances = squad.stream()
                .filter(p -> availMap.getOrDefault(p.getPlayerId(), null) != AvailabilityStatus.NO)
                .sorted(Comparator.comparingInt((Player p) -> appearanceMap.getOrDefault(p.getPlayerId(), 0)).reversed())
                .map(p -> new AiTeamPickDTO.PlayerAppearance(
                        p.getName() + " " + p.getSurname(),
                        appearanceMap.getOrDefault(p.getPlayerId(), 0),
                        selectedSet.contains(p.getPlayerId())
                )).collect(Collectors.toList());

        dto.setChartData(new AiTeamPickDTO.ChartData(availSummary, appearances));
        dto.setGeneratedAt(LocalDateTime.now());
        saveCache(matchId, teamId, dto, "ROTATION".equalsIgnoreCase(strategy) ? TYPE_ROTATION : TYPE_STRONGEST);
        return dto;
    }

    private void saveCache(Long matchId, Long teamId, AiTeamPickDTO dto, String cacheType) {
        try {
            String resultJson = MAPPER.writeValueAsString(dto);
            Optional<AiAnalysisCache> existing =
                    cacheRepository.findByAnalysisTypeAndPrimaryIdAndSecondaryId(cacheType, matchId, teamId);
            AiAnalysisCache entry = existing.map(c -> {
                c.setResultJson(resultJson);
                c.setGeneratedAt(dto.getGeneratedAt());
                return c;
            }).orElseGet(() -> AiAnalysisCache.builder()
                    .analysisType(cacheType)
                    .primaryId(matchId)
                    .secondaryId(teamId)
                    .generatedAt(dto.getGeneratedAt())
                    .resultJson(resultJson)
                    .build());
            cacheRepository.save(entry);
        } catch (Exception e) {
            log.warn("Failed to cache team pick for match {} team {}", matchId, teamId, e);
        }
    }

    private String buildSystemPrompt(String teamName, boolean inTournament, boolean useRotation) {
        String strategyClause;
        if (useRotation && inTournament) {
            strategyClause = """
                    SELECTION STRATEGY: PLAYER ROTATION
                    - Prioritise players who have had FEWER tournament appearances — give everyone a fair opportunity.
                    - The Apps column shows how many matches each player has already played this tournament.
                    - Strongly prefer lower-Apps players over higher-Apps players of similar ability.
                    - Only choose a high-Apps player over a low-Apps player when the skill difference is significant AND squad balance demands it.
                    - MUST still maintain squad balance: include a wicket-keeper, genuine bowling options, and adequate batting depth.
                    """;
        } else {
            strategyClause = """
                    SELECTION STRATEGY: STRONGEST XI
                    - Select the single best available playing XI based purely on player skill, form, and role.
                    - Ignore the Apps (appearances) column entirely — do NOT factor in rotation.
                    - Focus entirely on fielding the most competitive side possible.
                    - MUST still maintain squad balance: include a wicket-keeper, genuine bowling options, and adequate batting depth.
                    """;
        }

        return """
                You are an expert cricket team selector for amateur and club-level cricket.
                Select the playing XI for %s for the upcoming match.

                STRICT AVAILABILITY RULES:
                - NEVER select a player marked UNAVAILABLE (NO).
                - Players marked AVAILABLE (YES) are the primary pool.
                - Players with NO RESPONSE are still eligible — treat them as potentially available.
                - Players marked UNSURE may be selected if necessary.

                SQUAD BALANCE REQUIREMENTS (apply regardless of strategy):
                - MUST include exactly one wicket-keeper (marked WK in the squad).
                - MUST include at least 4 genuine bowling options (non-part-time bowlers).
                - MUST have at least 5 specialist or capable batters.
                - Aim for at least one all-rounder to provide depth in both disciplines.
                - Consider bowling variety (pace, medium, spin) where available.

                TOURNAMENT STATS (when provided):
                - Use the "TOURNAMENT STATS" table to assess current form and contribution in this tournament.
                - Inn = batting innings played, Runs = total runs, Avg = batting average, SR = strike rate.
                - Wkts = total wickets taken, Overs = total overs bowled.
                - Players not appearing in the stats table have not yet had a result recorded — use profile info.
                - Prioritise players showing strong current form where selection is otherwise equal.

                %s

                OUTPUT FORMAT:
                - Return ONLY valid JSON — no markdown, no code fences, no explanations.
                - For any unavailable numeric field, use JSON null — NEVER a string.

                Return exactly this JSON schema:
                {
                  "selectionRationale": "string (2-3 sentences on overall selection strategy and balance)",
                  "bowlingRotation": "string (who opens the bowling, who bowls at death, part-timers)",
                  "fairnessNote": "string (comment on rotation considerations or null if strongest XI)",
                  "selectedXi": [
                    {
                      "name": "string (exact name as given in squad list)",
                      "battingPosition": number (1-11),
                      "role": "BAT|BOWL|AR|WK",
                      "selectionReason": "string (one sentence — include why this player fits the strategy)"
                    }
                  ],
                  "twelfthMan": {
                    "name": "string (exact name as given in squad list)",
                    "battingPosition": null,
                    "role": "BAT|BOWL|AR|WK",
                    "selectionReason": "string"
                  }
                }

                selectedXi must contain EXACTLY 11 players sorted by battingPosition ascending (1 = opener, 11 = last).
                """.formatted(teamName, strategyClause);
    }

    private String buildUserPrompt(String teamName, String oppName, Match match,
                                   List<Player> squad, Map<Long, AvailabilityStatus> availMap,
                                   Map<Long, Integer> appearanceMap, Map<Long, PlayerResult[]> tournamentStatsMap,
                                   boolean inTournament, boolean useRotation) {
        StringBuilder sb = new StringBuilder();
        sb.append("MATCH: ").append(teamName).append(" vs ").append(oppName);
        if (match.getMatchDate() != null) sb.append(" | ").append(match.getMatchDate());
        if (match.getMatchStage() != null) sb.append(" | ").append(match.getMatchStage().name().replace('_', ' '));
        if (match.getTournament() != null) sb.append(" | Tournament: ").append(match.getTournament().getName());
        sb.append("\n\n");

        sb.append("=== AVAILABLE SQUAD ===\n");
        sb.append(String.format("%-26s %-12s %-6s  %-22s  %s\n",
                "Player", "Availability", "Apps", "Batting", "Bowling"));
        sb.append("-".repeat(90)).append("\n");

        squad.stream()
             .sorted(Comparator.comparing(p -> p.getName() + " " + p.getSurname()))
             .forEach(p -> {
                 AvailabilityStatus avail = availMap.get(p.getPlayerId());
                 String availStr  = avail != null ? avail.name() : "NO_RESPONSE";
                 int    apps      = inTournament ? appearanceMap.getOrDefault(p.getPlayerId(), 0) : 0;
                 String batPos    = p.getBattingPosition() != null ? formatEnum(p.getBattingPosition().name()) : "Unknown";
                 String wkSuffix  = Boolean.TRUE.equals(p.getWicketKeeper()) ? " (WK)" : "";
                 String bowlStr   = "";
                 if (p.getBowlingType() != null && p.getBowlingType() != BowlingType.NONE) {
                     bowlStr = formatEnum(p.getBowlingType().name());
                     if (Boolean.TRUE.equals(p.getPartTimeBowler())) bowlStr += " (PT)";
                     if (p.getBowlingArm() != null) bowlStr += " " + formatEnum(p.getBowlingArm().name());
                 }
                 sb.append(String.format("%-26s %-12s %-6d  %-22s  %s\n",
                         p.getName() + " " + p.getSurname() + wkSuffix,
                         availStr, apps, batPos, bowlStr));
             });

        sb.append("\nApps = number of times this player appeared in the playing XI in this tournament.\n");

        if (inTournament && !tournamentStatsMap.isEmpty()) {
            sb.append("\n=== TOURNAMENT STATS (this tournament) ===\n");
            sb.append(String.format("%-26s  %3s %4s %5s %5s  |  %4s %6s\n",
                    "Player", "Inn", "Runs", "Avg", "SR", "Wkts", "Overs"));
            sb.append("-".repeat(70)).append("\n");

            squad.stream()
                 .sorted(Comparator.comparing(p -> p.getName() + " " + p.getSurname()))
                 .forEach(p -> {
                     PlayerResult[] prs = tournamentStatsMap.get(p.getPlayerId());
                     if (prs == null || prs.length == 0) return;

                     int innings = 0, totalRuns = 0, dismissed = 0, totalBalls = 0;
                     int totalWkts = 0;
                     double totalOvers = 0;

                     for (PlayerResult pr : prs) {
                         if (pr.getScore() != null) {
                             innings++;
                             totalRuns += pr.getScore();
                             if (Boolean.TRUE.equals(pr.getDismissed())) dismissed++;
                             if (pr.getBallsFaced() != null) totalBalls += pr.getBallsFaced();
                         }
                         if (pr.getWickets() != null) totalWkts += pr.getWickets();
                         if (pr.getOversBowled() != null && !pr.getOversBowled().isBlank()) {
                             try {
                                 String[] parts = pr.getOversBowled().split("\\.");
                                 int ov = Integer.parseInt(parts[0]);
                                 int balls = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
                                 totalOvers += ov + balls / 6.0;
                             } catch (NumberFormatException ignored) {}
                         }
                     }

                     String batAvg = dismissed > 0
                             ? String.format("%.1f", (double) totalRuns / dismissed)
                             : (innings > 0 ? "N/O" : "-");
                     String batSR  = totalBalls > 0
                             ? String.format("%.1f", totalRuns * 100.0 / totalBalls)
                             : "-";
                     String overs  = totalOvers > 0 ? String.format("%.1f", totalOvers) : "-";

                     sb.append(String.format("%-26s  %3d %4d %5s %5s  |  %4d %6s\n",
                             p.getName() + " " + p.getSurname(),
                             innings, totalRuns, batAvg, batSR, totalWkts, overs));
                 });
        }

        if (useRotation && inTournament) {
            sb.append("\nSTRATEGY: ROTATION — favour lower-Apps players to ensure fair opportunity across the squad.\n");
        } else {
            sb.append("\nSTRATEGY: STRONGEST XI — ignore Apps; select purely on merit and availability.\n");
        }
        sb.append("\nSelect the XI for ").append(teamName).append(" and return the JSON selection.");
        return sb.toString();
    }

    private String formatEnum(String raw) {
        String[] words = raw.replace('_', ' ').toLowerCase().split(" ");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (!w.isEmpty()) sb.append(Character.toUpperCase(w.charAt(0))).append(w.substring(1)).append(' ');
        }
        return sb.toString().trim();
    }
}
