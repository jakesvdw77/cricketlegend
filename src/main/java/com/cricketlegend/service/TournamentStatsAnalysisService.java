package com.cricketlegend.service;

import com.cricketlegend.domain.AiAnalysisCache;
import com.cricketlegend.dto.TournamentStatsReportDTO;
import com.cricketlegend.dto.TournamentStatsRequestDTO;
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
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TournamentStatsAnalysisService {

    private static final String TYPE = "tournament_stats_analysis";

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
    public TournamentStatsReportDTO analyze(Long tournamentId, TournamentStatsRequestDTO stats, boolean regenerate) {
        if (!regenerate) {
            Optional<AiAnalysisCache> cached =
                    cacheRepository.findByAnalysisTypeAndPrimaryIdAndSecondaryIdIsNull(TYPE, tournamentId);
            if (cached.isPresent()) {
                try {
                    TournamentStatsReportDTO dto = MAPPER.readValue(cached.get().getResultJson(), TournamentStatsReportDTO.class);
                    dto.setGeneratedAt(cached.get().getGeneratedAt());
                    return dto;
                } catch (Exception e) {
                    log.warn("Failed to deserialize cached tournament stats analysis for tournament {}, regenerating", tournamentId, e);
                }
            }
        }

        String raw = aiService.call(null, null, TYPE, buildSystemPrompt(), buildUserPrompt(stats));

        String json = raw.trim();
        if (json.startsWith("```")) {
            json = json.replaceFirst("(?s)```[a-z]*\\s*", "").replaceFirst("(?s)```\\s*$", "").trim();
        }

        TournamentStatsReportDTO dto;
        try {
            dto = MAPPER.readValue(json, TournamentStatsReportDTO.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse tournament stats analysis: " + e.getMessage(), e);
        }

        dto.setGeneratedAt(LocalDateTime.now());
        saveCache(tournamentId, dto);
        return dto;
    }

    private void saveCache(Long tournamentId, TournamentStatsReportDTO dto) {
        try {
            String resultJson = MAPPER.writeValueAsString(dto);
            Optional<AiAnalysisCache> existing =
                    cacheRepository.findByAnalysisTypeAndPrimaryIdAndSecondaryIdIsNull(TYPE, tournamentId);
            AiAnalysisCache entry = existing.map(c -> {
                c.setResultJson(resultJson);
                c.setGeneratedAt(dto.getGeneratedAt());
                return c;
            }).orElseGet(() -> AiAnalysisCache.builder()
                    .analysisType(TYPE)
                    .primaryId(tournamentId)
                    .generatedAt(dto.getGeneratedAt())
                    .resultJson(resultJson)
                    .build());
            cacheRepository.save(entry);
        } catch (Exception e) {
            log.warn("Failed to cache tournament stats analysis for tournament {}", tournamentId, e);
        }
    }

    private String buildSystemPrompt() {
        return """
                You are an expert cricket performance analyst specialising in club and amateur cricket.
                Analyse the provided tournament statistics and return a structured, insightful performance report.

                Guidelines:
                - Be specific and data-driven — reference actual numbers from the stats provided
                - Name individual players where their stats make them noteworthy
                - Rate the overall team performance honestly on a 1–10 scale
                - Keep each text section concise but meaningful (2–4 sentences)
                - For overallRating: use a number between 1.0 and 10.0 — NEVER a string
                - Return ONLY valid JSON — no markdown, no explanations, no code fences

                You MUST return a JSON object matching exactly this schema:
                {
                  "summary": "string (3–4 sentence overall tournament performance narrative)",
                  "battingAnalysis": "string (analysis of batting performance, referencing run rate, averages, boundaries)",
                  "bowlingAnalysis": "string (analysis of bowling performance, referencing economy, wickets, best figures)",
                  "extrasAnalysis": "string (commentary on discipline — wides, no-balls — and whether extras were costly)",
                  "keyPerformers": ["string (player name + specific achievement)", ...],
                  "strengths": ["string", "string", "string"],
                  "areasForImprovement": ["string", "string"],
                  "recommendations": ["string", "string", "string"],
                  "overallRating": number
                }
                """;
    }

    private String buildUserPrompt(TournamentStatsRequestDTO s) {
        StringBuilder sb = new StringBuilder();
        sb.append("TOURNAMENT: ").append(s.getTournamentName()).append("\n\n");

        sb.append("=== MATCH RECORD ===\n");
        sb.append(String.format("Played: %d | Won: %d | Lost: %d | Drawn: %d | No Result: %d\n",
                s.getMatchesPlayed(), s.getWins(), s.getLosses(), s.getDraws(), s.getNoResults()));
        sb.append(String.format("Win Rate: %.1f%% | NRR: %+.3f\n\n", s.getWinPct(), s.getNrr()));

        sb.append("=== BATTING ===\n");
        sb.append(String.format("Innings: %d | Total Runs: %d | Wickets Lost: %d\n",
                s.getBattingInnings(), s.getRunsScored(), s.getWicketsLost()));
        sb.append(String.format("Average Score: %.1f | Run Rate: %.2f rpo\n", s.getAveScore(), s.getRunRate()));
        sb.append(String.format("Boundaries: %d fours, %d sixes (%.1f%% of runs from boundaries)\n",
                s.getFours(), s.getSixes(), s.getBoundaryPct()));
        sb.append(String.format("Dot Ball%%: %.1f%% | Highest: %d/%d | Lowest: %d/%d\n\n",
                s.getDotPctBat(), s.getHighestScore(), s.getHighestScoreWickets(),
                s.getLowestScore(), s.getLowestScoreWickets()));

        if (s.getTopBatters() != null && !s.getTopBatters().isEmpty()) {
            sb.append("TOP BATTERS:\n");
            s.getTopBatters().forEach(b -> sb.append("  • ").append(b).append("\n"));
            sb.append("\n");
        }

        sb.append("=== BOWLING ===\n");
        sb.append(String.format("Innings: %d | Wickets: %d | Runs Conceded: %d\n",
                s.getBowlingInnings(), s.getWicketsTaken(), s.getRunsConceded()));
        sb.append(String.format("Average Conceded: %.1f | Economy: %.2f | Bowling SR: %.1f\n",
                s.getAveConc(), s.getEconomy(), s.getBowlingStrikeRate()));
        sb.append(String.format("Maidens: %d | Dot Ball%%: %.1f%% | Best Bowling: %s\n\n",
                s.getMaidens(), s.getDotPctBowl(), s.getBestBowling() != null ? s.getBestBowling() : "—"));

        if (s.getTopBowlers() != null && !s.getTopBowlers().isEmpty()) {
            sb.append("TOP BOWLERS:\n");
            s.getTopBowlers().forEach(b -> sb.append("  • ").append(b).append("\n"));
            sb.append("\n");
        }

        sb.append("=== EXTRAS CONCEDED ===\n");
        sb.append(String.format("Wides: %d | No-balls: %d | Byes: %d | Leg-byes: %d\n",
                s.getExtrasWides(), s.getExtrasNoBalls(), s.getExtrasByes(), s.getExtrasLegByes()));
        sb.append(String.format("Total: %d | Average per innings: %.1f | %.1f%% of runs conceded\n",
                s.getExtrasTotal(), s.getAveExtras(), s.getExtrasPct()));

        sb.append("\nBased on these statistics, provide a comprehensive tournament performance analysis.");
        return sb.toString();
    }
}
