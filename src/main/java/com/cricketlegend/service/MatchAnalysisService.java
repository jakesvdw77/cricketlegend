package com.cricketlegend.service;

import com.cricketlegend.domain.AiAnalysisCache;
import com.cricketlegend.domain.MatchResult;
import com.cricketlegend.domain.scorecard.BattingEntry;
import com.cricketlegend.domain.scorecard.BowlingEntry;
import com.cricketlegend.domain.scorecard.ScorecardData;
import com.cricketlegend.domain.scorecard.TeamScorecard;
import com.cricketlegend.dto.MatchAnalysisDTO;
import com.cricketlegend.exception.NotFoundException;
import com.cricketlegend.repository.AiAnalysisCacheRepository;
import com.cricketlegend.repository.MatchResultRepository;
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
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MatchAnalysisService {

    private static final String TYPE = "match_analysis";
    private static final ObjectMapper LENIENT_MAPPER = buildLenientMapper();

    private static ObjectMapper buildLenientMapper() {
        ObjectMapper m = new ObjectMapper();
        m.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        // When the AI returns a string like "Data unavailable" for a numeric field, treat it as null
        m.coercionConfigFor(LogicalType.Float)
                .setCoercion(CoercionInputShape.String, CoercionAction.AsNull);
        m.coercionConfigFor(LogicalType.Integer)
                .setCoercion(CoercionInputShape.String, CoercionAction.AsNull);
        m.registerModule(new JavaTimeModule());
        m.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return m;
    }

    private final MatchResultRepository matchResultRepository;
    private final TeamRepository teamRepository;
    private final AiService aiService;
    private final AiAnalysisCacheRepository cacheRepository;

    @Transactional
    public MatchAnalysisDTO analyze(Long matchId, Long teamId, boolean regenerate) {
        if (!regenerate) {
            Optional<AiAnalysisCache> cached =
                    cacheRepository.findByAnalysisTypeAndPrimaryIdAndSecondaryId(TYPE, matchId, teamId);
            if (cached.isPresent()) {
                try {
                    MatchAnalysisDTO dto = LENIENT_MAPPER.readValue(cached.get().getResultJson(), MatchAnalysisDTO.class);
                    dto.setGeneratedAt(cached.get().getGeneratedAt());
                    return dto;
                } catch (Exception e) {
                    log.warn("Failed to deserialize cached match analysis for match {} team {}, regenerating", matchId, teamId, e);
                }
            }
        }
        return generate(matchId, teamId);
    }

    private MatchAnalysisDTO generate(Long matchId, Long teamId) {
        MatchResult result = matchResultRepository.findByMatchMatchId(matchId)
                .orElseThrow(() -> new NotFoundException("No result found for match " + matchId));

        String teamName = teamRepository.findById(teamId)
                .map(t -> t.getTeamName())
                .orElse("Your Team");

        String homeTeamName = result.getMatch().getHomeTeam() != null
                ? result.getMatch().getHomeTeam().getTeamName() : "Home Team";
        String oppTeamName = result.getMatch().getOppositionTeam() != null
                ? result.getMatch().getOppositionTeam().getTeamName() : "Opposition";
        String matchDate = result.getMatch().getMatchDate() != null
                ? result.getMatch().getMatchDate().toString() : "Unknown";

        ScorecardData scoreCard = result.getScoreCard();
        TeamScorecard myCard = null;
        TeamScorecard oppCard = null;
        if (scoreCard != null) {
            TeamScorecard teamA = scoreCard.getTeamA();
            TeamScorecard teamB = scoreCard.getTeamB();
            if (teamA != null && teamId.equals(teamA.getTeamId())) {
                myCard = teamA;
                oppCard = teamB;
            } else if (teamB != null && teamId.equals(teamB.getTeamId())) {
                myCard = teamB;
                oppCard = teamA;
            } else {
                myCard = teamA;
                oppCard = teamB;
            }
        }

        String systemPrompt = buildSystemPrompt(teamName);
        String userPrompt = buildUserPrompt(result, teamName, homeTeamName, oppTeamName, matchDate, myCard, oppCard);

        String raw = aiService.call(null, null, TYPE, systemPrompt, userPrompt);

        String json = raw.trim();
        if (json.startsWith("```")) {
            json = json.replaceFirst("(?s)```[a-z]*\\s*", "").replaceFirst("(?s)```\\s*$", "").trim();
        }

        MatchAnalysisDTO dto;
        try {
            dto = LENIENT_MAPPER.readValue(json, MatchAnalysisDTO.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse AI analysis: " + e.getMessage(), e);
        }

        dto.setGeneratedAt(LocalDateTime.now());
        saveCache(matchId, teamId, dto);
        return dto;
    }

    private void saveCache(Long matchId, Long teamId, MatchAnalysisDTO dto) {
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
            log.warn("Failed to cache match analysis for match {} team {}", matchId, teamId, e);
        }
    }

    private String buildSystemPrompt(String teamName) {
        return """
                You are an expert cricket analyst specialising in amateur and club-level cricket.
                Your role is to provide deep, insightful match analysis focused entirely on %s's performance.

                Guidelines:
                - Be specific and data-driven — reference real player names and statistics from the scorecard
                - Focus on %s's perspective: their batting, bowling, and match strategy
                - Be encouraging yet honest; identify both strengths and clear areas for improvement
                - Rate batting and bowling performance out of 10 based on the scorecard data
                - For any numeric field where data is unavailable, use JSON null — NEVER a string like "N/A" or "Data unavailable"
                - Return ONLY valid JSON — no markdown, no explanations, no code fences
                - NEVER invent or assume any facts not present in the data — no locations, cities, countries, nicknames, team histories, or context of any kind
                - Refer to teams only by the names provided; do not add descriptors like city names or regional labels

                You MUST return a JSON object matching this exact schema:
                {
                  "matchSummary": "string (2-3 sentences describing the match and outcome)",
                  "teamPerformance": {
                    "battingRating": number (1.0-10.0),
                    "bowlingRating": number (1.0-10.0),
                    "overallRating": number (1.0-10.0),
                    "verdict": "string (1-2 sentences summarising the overall display)"
                  },
                  "keyInsights": ["string", "string", "string"],
                  "playerHighlights": [
                    { "name": "string", "role": "BAT or BOWL", "achievement": "string", "isStandout": true or false }
                  ],
                  "recommendations": ["string", "string", "string"],
                  "chartData": {
                    "battingContributions": [
                      { "player": "string", "runs": number, "balls": number, "strikeRate": number, "fours": number, "sixes": number, "isTopPerformer": true or false }
                    ],
                    "bowlingAnalysis": [
                      { "player": "string", "overs": number, "runs": number, "wickets": number, "economy": number, "maidens": number, "isTopPerformer": true or false }
                    ],
                    "dismissalBreakdown": [
                      { "type": "string", "count": number }
                    ],
                    "teamComparison": {
                      "myTeam": { "name": "string", "runs": number, "wickets": number, "overs": "string", "runRate": number },
                      "opposition": { "name": "string", "runs": number, "wickets": number, "overs": "string", "runRate": number }
                    }
                  }
                }
                """.formatted(teamName, teamName);
    }

    private String buildUserPrompt(MatchResult result, String teamName,
                                    String homeTeamName, String oppTeamName, String matchDate,
                                    TeamScorecard myCard, TeamScorecard oppCard) {
        StringBuilder sb = new StringBuilder();
        sb.append("MATCH: ").append(homeTeamName).append(" vs ").append(oppTeamName)
          .append(" | Date: ").append(matchDate).append("\n");
        sb.append("FOCUS TEAM: ").append(teamName).append("\n");
        sb.append("RESULT: ").append(Objects.toString(result.getMatchOutcomeDescription(), "Not specified")).append("\n\n");

        if (result.getScoreBattingFirst() != null) {
            String battingFirstName = result.getSideBattingFirst() != null
                    ? result.getSideBattingFirst().getTeamName() : "First innings";
            sb.append("1ST INNINGS (").append(battingFirstName).append("): ")
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

        if (myCard != null) {
            sb.append("\n=== ").append(teamName).append(" — BATTING ===\n");
            appendBatting(sb, myCard);

            sb.append("\n=== ").append(teamName).append(" — BOWLING ===\n");
            appendBowling(sb, myCard);

            if (myCard.getByes() != null || myCard.getLegByes() != null
                    || myCard.getWides() != null || myCard.getNoBalls() != null) {
                sb.append("  Extras (conceded): byes=").append(myCard.getByes() != null ? myCard.getByes() : 0)
                  .append(" legbyes=").append(myCard.getLegByes() != null ? myCard.getLegByes() : 0)
                  .append(" wides=").append(myCard.getWides() != null ? myCard.getWides() : 0)
                  .append(" noballs=").append(myCard.getNoBalls() != null ? myCard.getNoBalls() : 0)
                  .append("\n");
            }
        }

        if (oppCard != null) {
            sb.append("\n=== OPPOSITION — BATTING ===\n");
            appendBatting(sb, oppCard);

            sb.append("\n=== OPPOSITION — BOWLING (vs ").append(teamName).append(") ===\n");
            appendBowling(sb, oppCard);
        }

        sb.append("\nAnalyse this match from ").append(teamName)
          .append("'s perspective and return the JSON analysis object only.");
        return sb.toString();
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
