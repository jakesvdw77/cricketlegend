package com.cricketlegend.service;

import com.cricketlegend.domain.AiAnalysisCache;
import com.cricketlegend.dto.PlayerStatsReportDTO;
import com.cricketlegend.dto.PlayerStatsRequestDTO;
import com.cricketlegend.repository.AiAnalysisCacheRepository;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlayerStatsAnalysisService {

    private static final String TYPE = "player_stats_analysis";

    private static final ObjectMapper MAPPER = buildMapper();

    private static ObjectMapper buildMapper() {
        ObjectMapper m = new ObjectMapper();
        m.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        m.registerModule(new JavaTimeModule());
        m.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return m;
    }

    private final AiService aiService;
    private final AiAnalysisCacheRepository cacheRepository;

    @Transactional
    public PlayerStatsReportDTO analyze(Long playerId, Long tournamentId, PlayerStatsRequestDTO stats, boolean regenerate) {
        if (!regenerate) {
            Optional<AiAnalysisCache> cached =
                    cacheRepository.findByAnalysisTypeAndPrimaryIdAndSecondaryId(TYPE, playerId, tournamentId);
            if (cached.isPresent()) {
                try {
                    PlayerStatsReportDTO dto = MAPPER.readValue(cached.get().getResultJson(), PlayerStatsReportDTO.class);
                    dto.setGeneratedAt(cached.get().getGeneratedAt());
                    return dto;
                } catch (Exception e) {
                    log.warn("Failed to deserialize cached player stats analysis for player {} tournament {}, regenerating", playerId, tournamentId, e);
                }
            }
        }

        String raw = aiService.call(null, null, TYPE, buildSystemPrompt(), buildUserPrompt(stats));

        String json = raw.trim();
        if (json.startsWith("```")) {
            json = json.replaceFirst("(?s)```[a-z]*\\s*", "").replaceFirst("(?s)```\\s*$", "").trim();
        }

        PlayerStatsReportDTO dto;
        try {
            dto = MAPPER.readValue(json, PlayerStatsReportDTO.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse player stats analysis: " + e.getMessage(), e);
        }

        dto.setGeneratedAt(LocalDateTime.now());
        saveCache(playerId, tournamentId, dto);
        return dto;
    }

    private void saveCache(Long playerId, Long tournamentId, PlayerStatsReportDTO dto) {
        try {
            String resultJson = MAPPER.writeValueAsString(dto);
            Optional<AiAnalysisCache> existing =
                    cacheRepository.findByAnalysisTypeAndPrimaryIdAndSecondaryId(TYPE, playerId, tournamentId);
            AiAnalysisCache entry = existing.map(c -> {
                c.setResultJson(resultJson);
                c.setGeneratedAt(dto.getGeneratedAt());
                return c;
            }).orElseGet(() -> AiAnalysisCache.builder()
                    .analysisType(TYPE)
                    .primaryId(playerId)
                    .secondaryId(tournamentId)
                    .generatedAt(dto.getGeneratedAt())
                    .resultJson(resultJson)
                    .build());
            cacheRepository.save(entry);
        } catch (Exception e) {
            log.warn("Failed to cache player stats analysis for player {} tournament {}", playerId, tournamentId, e);
        }
    }

    private String buildSystemPrompt() {
        return """
                You are an expert cricket performance analyst specialising in club and amateur cricket.
                Analyse the provided player statistics for a single tournament and return a structured, insightful performance report.

                Guidelines:
                - Be specific and data-driven — reference actual numbers from the stats provided
                - Address both batting and bowling if the player contributed in both disciplines
                - Rate the player's overall tournament performance honestly on a 1–10 scale
                - Keep each text section concise but meaningful (2–4 sentences)
                - For playerRating: use a number between 1.0 and 10.0 — NEVER a string
                - Return ONLY valid JSON — no markdown, no explanations, no code fences

                You MUST return a JSON object matching exactly this schema:
                {
                  "summary": "string (3–4 sentence overall player tournament performance narrative)",
                  "battingAnalysis": "string (analysis of batting — runs, average, strike rate, key innings — or 'Did not bat' if no innings)",
                  "bowlingAnalysis": "string (analysis of bowling — wickets, economy, best figures — or 'Did not bowl' if no overs)",
                  "strengths": ["string", "string"],
                  "areasForImprovement": ["string", "string"],
                  "recommendations": ["string", "string"],
                  "playerRating": number
                }
                """;
    }

    private String buildUserPrompt(PlayerStatsRequestDTO s) {
        StringBuilder sb = new StringBuilder();
        sb.append("PLAYER: ").append(s.getPlayerName()).append("\n");
        sb.append("TOURNAMENT: ").append(s.getTournamentName()).append("\n");
        sb.append("TEAM: ").append(s.getTeamName()).append("\n");
        if (s.getBattingStance() != null) sb.append("BATTING STYLE: ").append(s.getBattingStance()).append("\n");
        if (s.getBowlingType() != null) sb.append("BOWLING TYPE: ").append(s.getBowlingType()).append("\n");
        sb.append("\n");

        sb.append("=== BATTING ===\n");
        if (s.getBattingInnings() == 0) {
            sb.append("Did not bat in this tournament.\n\n");
        } else {
            String hs = s.getHighestScore() + (s.isHighestScoreNotOut() ? "*" : "");
            sb.append(String.format("Innings: %d | Runs: %d | Not Outs: %d | Dismissals: %d\n",
                    s.getBattingInnings(), s.getRuns(), s.getNotOuts(), s.getDismissals()));
            sb.append(String.format("Average: %.2f | Strike Rate: %.1f | Highest Score: %s\n",
                    s.getBattingAverage(), s.getStrikeRate(), hs));
            sb.append(String.format("Boundaries: %d fours, %d sixes | Dot Ball%%: %.1f%%\n\n",
                    s.getFours(), s.getSixes(), s.getDotPctBat()));
            if (s.getRecentBatting() != null && !s.getRecentBatting().isEmpty()) {
                sb.append("MATCH-BY-MATCH BATTING:\n");
                s.getRecentBatting().forEach(r -> sb.append("  • ").append(r).append("\n"));
                sb.append("\n");
            }
        }

        sb.append("=== BOWLING ===\n");
        if (s.getBowlingInnings() == 0) {
            sb.append("Did not bowl in this tournament.\n\n");
        } else {
            sb.append(String.format("Innings: %d | Overs: %s | Wickets: %d | Runs: %d\n",
                    s.getBowlingInnings(), s.getOversBowled(), s.getWickets(), s.getRunsConceded()));
            sb.append(String.format("Economy: %.2f | Bowling SR: %s | Best: %s | Maidens: %d\n",
                    s.getEconomy(),
                    s.getBowlingSR() > 0 ? String.format("%.1f", s.getBowlingSR()) : "—",
                    s.getBestBowling() != null ? s.getBestBowling() : "—",
                    s.getMaidens()));
            sb.append(String.format("Dot Ball%%: %.1f%%\n\n", s.getDotPctBowl()));
            if (s.getRecentBowling() != null && !s.getRecentBowling().isEmpty()) {
                sb.append("MATCH-BY-MATCH BOWLING:\n");
                s.getRecentBowling().forEach(r -> sb.append("  • ").append(r).append("\n"));
                sb.append("\n");
            }
        }

        sb.append("\nBased on these statistics, provide a comprehensive player performance analysis for this tournament.");
        return sb.toString();
    }
}
