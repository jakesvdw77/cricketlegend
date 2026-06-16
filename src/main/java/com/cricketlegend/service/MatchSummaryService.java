package com.cricketlegend.service;

import com.cricketlegend.domain.AiAnalysisCache;
import com.cricketlegend.domain.MatchResult;
import com.cricketlegend.domain.scorecard.BattingEntry;
import com.cricketlegend.domain.scorecard.BowlingEntry;
import com.cricketlegend.domain.scorecard.ScorecardData;
import com.cricketlegend.domain.scorecard.TeamScorecard;
import com.cricketlegend.dto.MatchSummaryDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.repository.AiAnalysisCacheRepository;
import com.cricketlegend.repository.MatchResultRepository;
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
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MatchSummaryService {

    private static final String TYPE = "match_summary";
    // secondaryId = 0 — match summary is not team-specific
    private static final long NO_TEAM = 0L;

    private static final ObjectMapper LENIENT_MAPPER = buildLenientMapper();

    private static ObjectMapper buildLenientMapper() {
        ObjectMapper m = new ObjectMapper();
        m.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        m.coercionConfigFor(LogicalType.Float).setCoercion(CoercionInputShape.String, CoercionAction.AsNull);
        m.coercionConfigFor(LogicalType.Integer).setCoercion(CoercionInputShape.String, CoercionAction.AsNull);
        m.registerModule(new JavaTimeModule());
        m.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return m;
    }

    private final MatchResultRepository matchResultRepository;
    private final AiService aiService;
    private final AiAnalysisCacheRepository cacheRepository;

    @Transactional
    public MatchSummaryDTO summarize(Long matchId, boolean regenerate) {
        if (!regenerate) {
            Optional<AiAnalysisCache> cached =
                    cacheRepository.findByAnalysisTypeAndPrimaryIdAndSecondaryId(TYPE, matchId, NO_TEAM);
            if (cached.isPresent()) {
                try {
                    MatchSummaryDTO dto = LENIENT_MAPPER.readValue(cached.get().getResultJson(), MatchSummaryDTO.class);
                    dto.setGeneratedAt(cached.get().getGeneratedAt());
                    return dto;
                } catch (Exception e) {
                    log.warn("Failed to deserialize cached match summary for match {}, regenerating", matchId, e);
                }
            }
        }
        return generate(matchId);
    }

    private MatchSummaryDTO generate(Long matchId) {
        MatchResult result = matchResultRepository.findByMatchMatchId(matchId)
                .orElseThrow(() -> new NotFoundException("No result found for match " + matchId));

        String homeTeamName = result.getMatch().getHomeTeam() != null
                ? result.getMatch().getHomeTeam().getTeamName() : "Home Team";
        String oppTeamName = result.getMatch().getOppositionTeam() != null
                ? result.getMatch().getOppositionTeam().getTeamName() : "Opposition";
        String matchDate = result.getMatch().getMatchDate() != null
                ? result.getMatch().getMatchDate().toString() : "Unknown";

        String userPrompt = buildUserPrompt(result, homeTeamName, oppTeamName, matchDate);
        String raw = aiService.call(null, null, TYPE, buildSystemPrompt(), userPrompt);

        String json = raw.trim();
        if (json.startsWith("```")) {
            json = json.replaceFirst("(?s)```[a-z]*\\s*", "").replaceFirst("(?s)```\\s*$", "").trim();
        }

        MatchSummaryDTO dto;
        try {
            dto = LENIENT_MAPPER.readValue(json, MatchSummaryDTO.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse AI match summary: " + e.getMessage(), e);
        }

        dto.setGeneratedAt(LocalDateTime.now());
        saveCache(matchId, dto);
        return dto;
    }

    private void saveCache(Long matchId, MatchSummaryDTO dto) {
        try {
            String resultJson = LENIENT_MAPPER.writeValueAsString(dto);
            Optional<AiAnalysisCache> existing =
                    cacheRepository.findByAnalysisTypeAndPrimaryIdAndSecondaryId(TYPE, matchId, NO_TEAM);
            AiAnalysisCache entry = existing.map(c -> {
                c.setResultJson(resultJson);
                c.setGeneratedAt(dto.getGeneratedAt());
                return c;
            }).orElseGet(() -> AiAnalysisCache.builder()
                    .analysisType(TYPE)
                    .primaryId(matchId)
                    .secondaryId(NO_TEAM)
                    .generatedAt(dto.getGeneratedAt())
                    .resultJson(resultJson)
                    .build());
            cacheRepository.save(entry);
        } catch (Exception e) {
            log.warn("Failed to cache match summary for match {}", matchId, e);
        }
    }

    private String buildSystemPrompt() {
        return """
                You are an expert cricket reporter providing an objective, neutral match summary for both teams.

                Guidelines:
                - Be strictly objective — do NOT favour either team
                - Report only what the scorecard data shows — NEVER invent or assume facts, player histories, venues, cities, team backgrounds, or any context not in the data
                - Refer to teams and players only by the names provided; do not add nicknames, city names, or regional labels
                - Summarise both teams' batting and bowling based solely on the numbers given
                - Highlight notable individual performances from BOTH sides
                - For numeric fields where data is unavailable, use JSON null — NEVER a string like "N/A"
                - Return ONLY valid JSON — no markdown, no code fences, no explanations

                You MUST return a JSON object matching this exact schema:
                {
                  "narrative": "string (3-4 sentences: what happened, who batted/bowled well, how the match was won — objective, both sides)",
                  "matchVerdict": "string (1-2 sentences: the decisive factor that determined the outcome)",
                  "keyMoments": ["string", "string", "string"],
                  "teamSummaries": [
                    {
                      "teamName": "string",
                      "innings": { "runs": number, "wickets": number, "overs": "string", "runRate": number },
                      "battingSummary": "string (2-3 sentences on this team's batting performance based on the data)",
                      "bowlingSummary": "string (2-3 sentences on this team's bowling performance based on the data)",
                      "notablePlayers": [
                        { "name": "string", "role": "BAT or BOWL", "contribution": "string (stat-based, e.g. 45 off 32 balls or 3/18 in 4 overs)" }
                      ]
                    }
                  ]
                }
                """;
    }

    private String buildUserPrompt(MatchResult result, String homeTeamName, String oppTeamName, String matchDate) {
        StringBuilder sb = new StringBuilder();
        sb.append("MATCH: ").append(homeTeamName).append(" vs ").append(oppTeamName)
          .append(" | Date: ").append(matchDate).append("\n");
        sb.append("RESULT: ").append(Objects.toString(result.getMatchOutcomeDescription(), "Not specified")).append("\n");

        if (result.getScoreBattingFirst() != null) {
            String firstName = result.getSideBattingFirst() != null
                    ? result.getSideBattingFirst().getTeamName() : "1st innings";
            sb.append("1ST INNINGS (").append(firstName).append("): ")
              .append(result.getScoreBattingFirst())
              .append("/").append(Objects.toString(result.getWicketsLostBattingFirst(), "10"))
              .append(" (").append(Objects.toString(result.getOversBattingFirst(), "?")).append(" overs)\n");
        }
        if (result.getScoreBattingSecond() != null) {
            sb.append("2ND INNINGS: ")
              .append(result.getScoreBattingSecond())
              .append("/").append(Objects.toString(result.getWicketsLostBattingSecond(), "10"))
              .append(" (").append(Objects.toString(result.getOversBattingSecond(), "?")).append(" overs)\n");
        }

        ScorecardData sc = result.getScoreCard();
        if (sc != null) {
            appendTeam(sb, sc.getTeamA(), homeTeamName);
            appendTeam(sb, sc.getTeamB(), oppTeamName);
        }

        sb.append("\nProvide an objective match summary for both teams based strictly on the data above.");
        return sb.toString();
    }

    private void appendTeam(StringBuilder sb, TeamScorecard card, String teamName) {
        if (card == null) return;
        sb.append("\n=== ").append(teamName).append(" — BATTING ===\n");
        appendBatting(sb, card);
        sb.append("\n=== ").append(teamName).append(" — BOWLING ===\n");
        appendBowling(sb, card);
    }

    private void appendBatting(StringBuilder sb, TeamScorecard card) {
        List<BattingEntry> batting = card.getBatting();
        if (batting == null || batting.isEmpty()) { sb.append("  (no data)\n"); return; }
        for (BattingEntry b : batting) {
            if (!Boolean.TRUE.equals(b.getBatted()) && b.getScore() == null) continue;
            sb.append(String.format("  %-25s %3d (%3d balls) 4s:%-2d 6s:%-2d dots:%-3d %s\n",
                    b.getPlayerName(),
                    b.getScore() != null ? b.getScore() : 0,
                    b.getBallsFaced() != null ? b.getBallsFaced() : 0,
                    b.getFours() != null ? b.getFours() : 0,
                    b.getSixes() != null ? b.getSixes() : 0,
                    b.getDots() != null ? b.getDots() : 0,
                    b.getDismissalType() != null
                            ? "[" + b.getDismissalType() + (b.getDismissedBowler() != null ? " b." + b.getDismissedBowler() : "") + "]"
                            : "[not out]"
            ));
        }
    }

    private void appendBowling(StringBuilder sb, TeamScorecard card) {
        List<BowlingEntry> bowling = card.getBowling();
        if (bowling == null || bowling.isEmpty()) { sb.append("  (no data)\n"); return; }
        for (BowlingEntry bw : bowling) {
            sb.append(String.format("  %-25s %5s ov  %dW/%dR  maidens:%-2d wides:%-2d noballs:%-2d\n",
                    bw.getPlayerName(),
                    bw.getOvers(),
                    bw.getWickets() != null ? bw.getWickets() : 0,
                    bw.getRuns() != null ? bw.getRuns() : 0,
                    bw.getMaidens() != null ? bw.getMaidens() : 0,
                    bw.getWides() != null ? bw.getWides() : 0,
                    bw.getNoBalls() != null ? bw.getNoBalls() : 0
            ));
        }
    }
}
