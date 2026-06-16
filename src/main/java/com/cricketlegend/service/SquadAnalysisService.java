package com.cricketlegend.service;

import com.cricketlegend.domain.AiAnalysisCache;
import com.cricketlegend.domain.Player;
import com.cricketlegend.domain.Team;
import com.cricketlegend.domain.enums.BowlingType;
import com.cricketlegend.dto.SquadAnalysisDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.repository.AiAnalysisCacheRepository;
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
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SquadAnalysisService {

    private static final String TYPE = "squad_analysis";
    private static final ObjectMapper LENIENT_MAPPER = buildLenientMapper();

    private static ObjectMapper buildLenientMapper() {
        ObjectMapper m = new ObjectMapper();
        m.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        m.coercionConfigFor(LogicalType.Float)
                .setCoercion(CoercionInputShape.String, CoercionAction.AsNull);
        m.coercionConfigFor(LogicalType.Integer)
                .setCoercion(CoercionInputShape.String, CoercionAction.AsNull);
        m.registerModule(new JavaTimeModule());
        m.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return m;
    }

    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final AiService aiService;
    private final AiAnalysisCacheRepository cacheRepository;

    @Transactional
    public SquadAnalysisDTO analyze(Long teamId, boolean regenerate) {
        if (!regenerate) {
            Optional<AiAnalysisCache> cached =
                    cacheRepository.findByAnalysisTypeAndPrimaryIdAndSecondaryIdIsNull(TYPE, teamId);
            if (cached.isPresent()) {
                try {
                    SquadAnalysisDTO dto = LENIENT_MAPPER.readValue(cached.get().getResultJson(), SquadAnalysisDTO.class);
                    dto.setGeneratedAt(cached.get().getGeneratedAt());
                    return dto;
                } catch (Exception e) {
                    log.warn("Failed to deserialize cached squad analysis for team {}, regenerating", teamId, e);
                }
            }
        }

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> NotFoundException.of("Team", teamId));

        List<Long> ids = team.getSquadPlayerIds();
        if (ids == null || ids.isEmpty()) {
            throw new IllegalStateException("No squad players found for team " + team.getTeamName());
        }
        List<Player> squad = playerRepository.findAllById(ids);

        String systemPrompt = buildSystemPrompt(team.getTeamName());
        String userPrompt   = buildUserPrompt(team, squad);

        String raw = aiService.call(null, null, TYPE, systemPrompt, userPrompt);

        String json = raw.trim();
        if (json.startsWith("```")) {
            json = json.replaceFirst("(?s)```[a-z]*\\s*", "").replaceFirst("(?s)```\\s*$", "").trim();
        }

        SquadAnalysisDTO dto;
        try {
            dto = LENIENT_MAPPER.readValue(json, SquadAnalysisDTO.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse squad analysis: " + e.getMessage(), e);
        }

        dto.setGeneratedAt(LocalDateTime.now());
        saveCache(teamId, dto);
        return dto;
    }

    private void saveCache(Long teamId, SquadAnalysisDTO dto) {
        try {
            String resultJson = LENIENT_MAPPER.writeValueAsString(dto);
            Optional<AiAnalysisCache> existing =
                    cacheRepository.findByAnalysisTypeAndPrimaryIdAndSecondaryIdIsNull(TYPE, teamId);
            AiAnalysisCache entry = existing.map(c -> {
                c.setResultJson(resultJson);
                c.setGeneratedAt(dto.getGeneratedAt());
                return c;
            }).orElseGet(() -> AiAnalysisCache.builder()
                    .analysisType(TYPE)
                    .primaryId(teamId)
                    .generatedAt(dto.getGeneratedAt())
                    .resultJson(resultJson)
                    .build());
            cacheRepository.save(entry);
        } catch (Exception e) {
            log.warn("Failed to cache squad analysis for team {}", teamId, e);
        }
    }

    private String buildSystemPrompt(String teamName) {
        return """
                You are an expert cricket squad analyst for amateur and club-level cricket.
                Analyse the provided squad profile for %s and return a structured, insightful assessment.

                Guidelines:
                - Be specific about individual players by name where relevant
                - Identify genuine strengths and gaps in the squad makeup
                - Rate the team's skills honestly on a 1-10 scale
                - For any numeric field where data is unavailable, use JSON null — NEVER a string
                - Return ONLY valid JSON — no markdown, no explanations, no code fences
                - NEVER invent or assume any facts not present in the data — no locations, cities, countries, nicknames, team histories, or context of any kind
                - Refer to teams only by the names provided; do not add descriptors like city names or regional labels

                You MUST return a JSON object matching exactly this schema:
                {
                  "squadSummary": "string (2-3 sentence overview of the squad)",
                  "balanceVerdict": "string (1-2 sentences on overall squad balance)",
                  "strengths": ["string", "string", "string"],
                  "weaknesses": ["string", "string"],
                  "selectionRecommendations": ["string", "string", "string"],
                  "keyPlayers": [
                    { "name": "string", "primaryRole": "BAT|BOWL|WK|AR", "keySkill": "string", "rating": number (1.0-10.0), "isKeyPlayer": true or false }
                  ],
                  "chartData": {
                    "squadStrengthRadar": [
                      { "skill": "string", "score": number (1.0-10.0) }
                    ],
                    "roleDistribution": [
                      { "label": "string", "count": number }
                    ],
                    "bowlingVariety": [
                      { "label": "string", "count": number }
                    ],
                    "battingDepth": [
                      { "label": "string", "count": number }
                    ],
                    "playerProfiles": [
                      { "name": "string", "primaryRole": "BAT|BOWL|WK|AR", "rating": number (1.0-10.0), "keySkill": "string", "isKeyPlayer": true or false }
                    ]
                  }
                }

                For squadStrengthRadar include exactly these 5 skills in order: Batting, Bowling, Fielding, Balance, Depth.
                For roleDistribution use labels: Batsman, All-rounder, Bowler, Wicket-keeper.
                For bowlingVariety use labels: Pace, Medium, Spin (omit types with 0 players).
                For battingDepth use labels matching batting positions present in the squad.
                """.formatted(teamName);
    }

    private String buildUserPrompt(Team team, List<Player> squad) {
        StringBuilder sb = new StringBuilder();
        sb.append("TEAM: ").append(team.getTeamName()).append("\n");
        if (team.getCaptain() != null) {
            sb.append("CAPTAIN: ").append(team.getCaptain().getName())
              .append(" ").append(team.getCaptain().getSurname()).append("\n");
        }
        if (team.getCoach() != null)   sb.append("COACH: ").append(team.getCoach()).append("\n");
        if (team.getManager() != null) sb.append("MANAGER: ").append(team.getManager()).append("\n");
        sb.append("SQUAD SIZE: ").append(squad.size()).append("\n\n");

        sb.append("=== SQUAD PROFILES ===\n");
        for (int i = 0; i < squad.size(); i++) {
            Player p = squad.get(i);
            sb.append(String.format("%2d. %-25s", i + 1, p.getName() + " " + p.getSurname()));

            if (Boolean.TRUE.equals(p.getWicketKeeper())) sb.append("  WK");

            if (p.getBattingPosition() != null) {
                sb.append("  Bat:").append(formatEnum(p.getBattingPosition().name()));
            }

            if (p.getBowlingType() != null && p.getBowlingType() != BowlingType.NONE) {
                String bowling = formatEnum(p.getBowlingType().name());
                if (Boolean.TRUE.equals(p.getPartTimeBowler())) bowling += "(PT)";
                sb.append("  Bowl:").append(bowling);
            }

            if (p.getBowlingArm() != null) {
                sb.append("  Arm:").append(formatEnum(p.getBowlingArm().name()));
            }

            boolean isCaptain = team.getCaptain() != null &&
                                team.getCaptain().getPlayerId().equals(p.getPlayerId());
            if (isCaptain) sb.append("  (C)");

            sb.append("\n");
        }

        sb.append("\nBased on this squad profile, provide a comprehensive cricket squad analysis.");
        return sb.toString();
    }

    private String formatEnum(String raw) {
        String[] words = raw.replace('_', ' ').toLowerCase().split(" ");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (!w.isEmpty()) {
                sb.append(Character.toUpperCase(w.charAt(0))).append(w.substring(1)).append(' ');
            }
        }
        return sb.toString().trim();
    }
}
