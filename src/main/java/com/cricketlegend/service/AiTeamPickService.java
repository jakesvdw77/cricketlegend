package com.cricketlegend.service;

import com.cricketlegend.domain.AiAnalysisCache;
import com.cricketlegend.domain.Match;
import com.cricketlegend.domain.MatchAvailabilityPoll;
import com.cricketlegend.domain.MatchSide;
import com.cricketlegend.domain.Player;
import com.cricketlegend.domain.PlayerAvailability;
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

    private static final String TYPE = "ai_team_pick";
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
    private final AiService                      aiService;
    private final AiAnalysisCacheRepository      cacheRepository;

    @Transactional
    public AiTeamPickDTO pick(Long matchId, Long teamId, boolean regenerate) {
        if (!regenerate) {
            Optional<AiAnalysisCache> cached =
                    cacheRepository.findByAnalysisTypeAndPrimaryIdAndSecondaryId(TYPE, matchId, teamId);
            if (cached.isPresent()) {
                try {
                    AiTeamPickDTO dto = MAPPER.readValue(cached.get().getResultJson(), AiTeamPickDTO.class);
                    dto.setGeneratedAt(cached.get().getGeneratedAt());
                    return dto;
                } catch (Exception e) {
                    log.warn("Failed to deserialize cached team pick for match {} team {}, regenerating", matchId, teamId, e);
                }
            }
        }
        return generate(matchId, teamId);
    }

    private AiTeamPickDTO generate(Long matchId, Long teamId) {
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

        String systemPrompt = buildSystemPrompt(teamName, inTournament);
        String userPrompt   = buildUserPrompt(teamName, oppName, match, squad, availMap, appearanceMap, inTournament);

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
        saveCache(matchId, teamId, dto);
        return dto;
    }

    private void saveCache(Long matchId, Long teamId, AiTeamPickDTO dto) {
        try {
            String resultJson = MAPPER.writeValueAsString(dto);
            Optional<AiAnalysisCache> existing =
                    cacheRepository.findByAnalysisTypeAndPrimaryIdAndSecondaryId(TYPE, matchId, teamId);
            AiAnalysisCache entry = existing.map(c -> {
                c.setResultJson(resultJson);
                c.setGeneratedAt(dto.getGeneratedAt());
                return c;
            }).orElseGet(() -> AiAnalysisCache.builder()
                    .analysisType(TYPE)
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

    private String buildSystemPrompt(String teamName, boolean inTournament) {
        String fairnessClause = inTournament
                ? "Consider the tournament appearances column — give players with fewer appearances a fair opportunity, all else being equal."
                : "";
        return """
                You are an expert cricket team selector for amateur and club-level cricket.
                Select the best possible playing XI for %s for the upcoming match.

                Selection rules (STRICT):
                - NEVER select a player marked UNAVAILABLE (NO).
                - Players marked AVAILABLE (YES) are preferred.
                - Players with NO RESPONSE are still eligible — treat them as potentially available.
                - Players marked UNSURE may be selected if they are the best option.
                - %s
                - Always include exactly one wicket-keeper in the XI.
                - Ensure the XI has adequate batting depth AND bowling options.
                - Return ONLY valid JSON — no markdown, no code fences, no explanations.
                - For any unavailable numeric field, use JSON null, NEVER a string.

                Return exactly this JSON schema:
                {
                  "selectionRationale": "string (2-3 sentences on overall selection strategy)",
                  "bowlingRotation": "string (who opens the bowling, who bowls death overs, part-timers)",
                  "fairnessNote": "string (comment on opportunity/rotation if relevant, else null)",
                  "selectedXi": [
                    {
                      "name": "string (exact name as given in squad list)",
                      "battingPosition": number (1-11),
                      "role": "BAT|BOWL|AR|WK",
                      "selectionReason": "string (one sentence)"
                    }
                  ],
                  "twelfthMan": {
                    "name": "string (exact name as given in squad list)",
                    "battingPosition": null,
                    "role": "BAT|BOWL|AR|WK",
                    "selectionReason": "string"
                  }
                }

                selectedXi must contain EXACTLY 11 players sorted by battingPosition 1-11.
                """.formatted(teamName, fairnessClause);
    }

    private String buildUserPrompt(String teamName, String oppName, Match match,
                                   List<Player> squad, Map<Long, AvailabilityStatus> availMap,
                                   Map<Long, Integer> appearanceMap, boolean inTournament) {
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

        sb.append("\nApps = matches played in this tournament in the playing XI.\n");
        sb.append("Select the best XI for ").append(teamName)
          .append(" and return the JSON selection.");
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
