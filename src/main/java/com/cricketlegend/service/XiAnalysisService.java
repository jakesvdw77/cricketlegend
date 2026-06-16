package com.cricketlegend.service;

import com.cricketlegend.domain.AiAnalysisCache;
import com.cricketlegend.domain.Match;
import com.cricketlegend.domain.MatchSide;
import com.cricketlegend.domain.Player;
import com.cricketlegend.domain.enums.BowlingType;
import com.cricketlegend.dto.XiAnalysisDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.repository.AiAnalysisCacheRepository;
import com.cricketlegend.repository.MatchRepository;
import com.cricketlegend.repository.MatchSideRepository;
import com.cricketlegend.repository.PlayerRepository;
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
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class XiAnalysisService {

    private static final String TYPE = "xi_analysis";
    private static final ObjectMapper LENIENT_MAPPER = buildMapper();

    private static ObjectMapper buildMapper() {
        ObjectMapper m = new ObjectMapper();
        m.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        m.coercionConfigFor(LogicalType.Float).setCoercion(CoercionInputShape.String, CoercionAction.AsNull);
        m.coercionConfigFor(LogicalType.Integer).setCoercion(CoercionInputShape.String, CoercionAction.AsNull);
        m.registerModule(new JavaTimeModule());
        m.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return m;
    }

    private final MatchRepository matchRepository;
    private final MatchSideRepository matchSideRepository;
    private final PlayerRepository playerRepository;
    private final AiService aiService;
    private final AiAnalysisCacheRepository cacheRepository;

    @Transactional
    public XiAnalysisDTO analyze(Long matchId, Long teamId, boolean regenerate) {
        if (!regenerate) {
            Optional<AiAnalysisCache> cached =
                    cacheRepository.findByAnalysisTypeAndPrimaryIdAndSecondaryId(TYPE, matchId, teamId);
            if (cached.isPresent()) {
                try {
                    XiAnalysisDTO dto = LENIENT_MAPPER.readValue(cached.get().getResultJson(), XiAnalysisDTO.class);
                    dto.setGeneratedAt(cached.get().getGeneratedAt());
                    return dto;
                } catch (Exception e) {
                    log.warn("Failed to deserialize cached XI analysis for match {} team {}, regenerating", matchId, teamId, e);
                }
            }
        }
        return generate(matchId, teamId);
    }

    private XiAnalysisDTO generate(Long matchId, Long teamId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> NotFoundException.of("Match", matchId));

        MatchSide side = matchSideRepository.findByMatchMatchIdAndTeamTeamId(matchId, teamId)
                .orElseThrow(() -> new NotFoundException(
                        "No team sheet found for team " + teamId + " in match " + matchId));

        List<Long> xiIds = side.getPlayingXi();
        if (xiIds == null || xiIds.isEmpty()) {
            throw new IllegalStateException("No players have been selected in the playing XI yet.");
        }

        Map<Long, Player> playerMap = playerRepository.findAllById(xiIds).stream()
                .collect(Collectors.toMap(Player::getPlayerId, Function.identity()));

        String teamName  = side.getTeam().getTeamName();
        String oppName   = teamId.equals(match.getHomeTeam() != null ? match.getHomeTeam().getTeamId() : null)
                ? (match.getOppositionTeam() != null ? match.getOppositionTeam().getTeamName() : "Opposition")
                : (match.getHomeTeam()       != null ? match.getHomeTeam().getTeamName()       : "Home Team");
        String matchDate = match.getMatchDate() != null ? match.getMatchDate().toString() : "TBC";
        String stage     = match.getMatchStage() != null ? match.getMatchStage().name() : null;

        String systemPrompt = buildSystemPrompt(teamName);
        String userPrompt   = buildUserPrompt(teamName, oppName, matchDate, stage, side, xiIds, playerMap);

        String raw = aiService.call(null, null, TYPE, systemPrompt, userPrompt);
        String json = raw.trim();
        if (json.startsWith("```")) {
            json = json.replaceFirst("(?s)```[a-z]*\\s*", "").replaceFirst("(?s)```\\s*$", "").trim();
        }

        XiAnalysisDTO dto;
        try {
            dto = LENIENT_MAPPER.readValue(json, XiAnalysisDTO.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse XI analysis: " + e.getMessage(), e);
        }

        dto.setGeneratedAt(LocalDateTime.now());
        saveCache(matchId, teamId, dto);
        return dto;
    }

    private void saveCache(Long matchId, Long teamId, XiAnalysisDTO dto) {
        try {
            String resultJson = LENIENT_MAPPER.writeValueAsString(dto);
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
            log.warn("Failed to cache XI analysis for match {} team {}", matchId, teamId, e);
        }
    }

    private String buildSystemPrompt(String teamName) {
        return """
                You are an expert cricket team selector and match strategist for amateur and club-level cricket.
                Analyse the playing XI selected for %s and return tactical insights to help the captain and coach.

                Guidelines:
                - Assess batting depth, bowling options, balance, and fielding coverage
                - Suggest a batting order (1-11) based on player roles
                - Outline a bowling plan (who opens, who bowls the death overs)
                - Flag any gaps or concerns in the selection
                - Rate the XI across 5 dimensions out of 10
                - For unavailable numeric fields use JSON null — NEVER a string like "N/A"
                - Return ONLY valid JSON — no markdown, no explanations, no code fences
                - NEVER invent or assume any facts not present in the data — no locations, cities, countries, nicknames, team histories, or context of any kind
                - Refer to teams only by the names provided; do not add descriptors like city names or regional labels

                You MUST return exactly this JSON schema:
                {
                  "xiSummary": "string (2-3 sentences on the XI composition)",
                  "battingOrderSuggestion": "string (suggested 1-11 with reasoning, as a single string)",
                  "bowlingPlanSuggestion": "string (bowling rotation plan, as a single string)",
                  "strengths": ["string", "string"],
                  "concerns": ["string", "string"],
                  "recommendations": ["string", "string", "string"],
                  "chartData": {
                    "xiStrengthRadar": [
                      { "skill": "Batting Depth", "score": number },
                      { "skill": "Bowling Attack", "score": number },
                      { "skill": "Balance", "score": number },
                      { "skill": "Fielding", "score": number },
                      { "skill": "Depth", "score": number }
                    ],
                    "battingPositionBreakdown": [
                      { "label": "string", "count": number }
                    ],
                    "bowlingVariety": [
                      { "label": "string", "count": number }
                    ],
                    "playerRoles": [
                      { "name": "string", "battingPosition": number (1-11), "role": "BAT|BOWL|AR|WK", "rating": number (1.0-10.0), "keyContribution": "string" }
                    ]
                  }
                }
                """.formatted(teamName);
    }

    private String buildUserPrompt(String teamName, String oppName, String matchDate, String stage,
                                   MatchSide side, List<Long> xiIds, Map<Long, Player> playerMap) {
        StringBuilder sb = new StringBuilder();
        sb.append("MATCH: ").append(teamName).append(" vs ").append(oppName)
          .append(" | ").append(matchDate);
        if (stage != null) sb.append(" | ").append(stage.replace('_', ' '));
        sb.append("\n\n");

        sb.append("=== PLAYING XI (").append(xiIds.size()).append(" players) ===\n");
        for (int i = 0; i < xiIds.size(); i++) {
            Player p = playerMap.get(xiIds.get(i));
            if (p == null) continue;

            sb.append(String.format("%2d. %-25s", i + 1, p.getName() + " " + p.getSurname()));

            boolean isWk  = Boolean.TRUE.equals(p.getWicketKeeper()) ||
                            Objects.equals(side.getWicketKeeperPlayerId(), p.getPlayerId());
            boolean isCap = Objects.equals(side.getCaptainPlayerId(), p.getPlayerId());

            if (isWk)  sb.append("  WK");
            if (isCap) sb.append("  (C)");

            if (p.getBattingPosition() != null) {
                sb.append("  Bat:").append(formatEnum(p.getBattingPosition().name()));
            }
            if (p.getBowlingType() != null && p.getBowlingType() != BowlingType.NONE) {
                String bowling = formatEnum(p.getBowlingType().name());
                if (Boolean.TRUE.equals(p.getPartTimeBowler())) bowling += " (PT)";
                sb.append("  Bowl:").append(bowling);
                if (p.getBowlingArm() != null) sb.append(" ").append(formatEnum(p.getBowlingArm().name()));
            }
            sb.append("\n");
        }

        if (side.getTwelfthManPlayerId() != null) {
            Player twelfth = playerRepository.findById(side.getTwelfthManPlayerId()).orElse(null);
            if (twelfth != null) {
                sb.append("\n12th Man: ").append(twelfth.getName()).append(" ").append(twelfth.getSurname()).append("\n");
            }
        }

        sb.append("\nAnalyse this playing XI and return the JSON tactical assessment.");
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
