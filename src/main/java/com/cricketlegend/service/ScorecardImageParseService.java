package com.cricketlegend.service;

import com.cricketlegend.domain.scorecard.BattingEntry;
import com.cricketlegend.domain.scorecard.BowlingEntry;
import com.cricketlegend.domain.scorecard.ScorecardData;
import com.cricketlegend.domain.scorecard.TeamScorecard;
import com.cricketlegend.dto.PlayerDTO;
import com.cricketlegend.dto.ScorecardImageImportResponse;
import com.cricketlegend.dto.ScorecardImageImportResponse.MatchStatus;
import com.cricketlegend.dto.ScorecardImageImportResponse.PlayerMatchResult;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.cfg.CoercionAction;
import com.fasterxml.jackson.databind.cfg.CoercionInputShape;
import com.fasterxml.jackson.databind.type.LogicalType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.content.Media;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScorecardImageParseService {

    private static final String FEATURE = "scorecard_image_import";

    private static final ObjectMapper MAPPER = buildMapper();

    private static ObjectMapper buildMapper() {
        ObjectMapper m = new ObjectMapper();
        m.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        m.coercionConfigFor(LogicalType.Float).setCoercion(CoercionInputShape.String, CoercionAction.AsNull);
        m.coercionConfigFor(LogicalType.Integer).setCoercion(CoercionInputShape.String, CoercionAction.AsNull);
        return m;
    }

    private final AiService aiService;

    /**
     * Parse scorecard images and match player names against the provided squads.
     *
     * @param teamAName     display name for team A (first innings batting)
     * @param teamBName     display name for team B (second innings batting)
     * @param teamASquad    known players for team A
     * @param teamBSquad    known players for team B
     * @param teamABatting  optional image of team A batting card
     * @param teamABowling  optional image of team A bowling card
     * @param teamBBatting  optional image of team B batting card
     * @param teamBBowling  optional image of team B bowling card
     */
    public ScorecardImageImportResponse parse(
            String teamAName, String teamBName,
            List<PlayerDTO> teamASquad, List<PlayerDTO> teamBSquad,
            MultipartFile teamABatting, MultipartFile teamABowling,
            MultipartFile teamBBatting, MultipartFile teamBBowling) throws IOException {

        List<Media> mediaItems = new ArrayList<>();
        List<String> imageLabels = new ArrayList<>();

        addImage(mediaItems, imageLabels, teamABatting, teamAName + " batting card");
        addImage(mediaItems, imageLabels, teamABowling, teamAName + " bowling card");
        addImage(mediaItems, imageLabels, teamBBatting, teamBName + " batting card");
        addImage(mediaItems, imageLabels, teamBBowling, teamBName + " bowling card");

        if (mediaItems.isEmpty()) {
            throw new IllegalArgumentException("At least one scorecard image is required.");
        }

        String systemPrompt = buildSystemPrompt();
        String userPrompt   = buildUserPrompt(teamAName, teamBName, teamASquad, teamBSquad, imageLabels);

        String raw = aiService.call(null, null, FEATURE, systemPrompt, userPrompt, mediaItems);

        ScorecardData scorecard = parseJson(raw);

        List<PlayerMatchResult> matches = matchPlayers(scorecard, teamASquad, teamBSquad);

        applyMatchedIds(scorecard, matches);

        return ScorecardImageImportResponse.builder()
                .scorecard(scorecard)
                .playerMatches(matches)
                .build();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void addImage(List<Media> mediaItems, List<String> labels,
                          MultipartFile file, String label) throws IOException {
        if (file == null || file.isEmpty()) return;
        String contentType = file.getContentType();
        if (contentType == null) contentType = "image/jpeg";
        MimeType mimeType = MimeType.valueOf(contentType);
        ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
            @Override public String getFilename() { return file.getOriginalFilename(); }
        };
        mediaItems.add(new Media(mimeType, resource));
        labels.add(label);
    }

    private String buildSystemPrompt() {
        return """
                You are a cricket scorecard parser. Extract ALL scorecard data from every provided image
                and respond with ONLY a valid JSON object — no markdown, no explanation, no extra text.

                IMPORTANT field mapping rules:
                - teamA = team that BATTED FIRST (1st innings)
                - teamB = team that BATTED SECOND (2nd innings)
                - teamA.batting[]  = rows from the 1st innings BATTING card (teamA's batters)
                - teamA.bowling[]  = rows from the 1st innings BOWLING figures (teamB's bowlers who bowled AT teamA)
                - teamB.batting[]  = rows from the 2nd innings BATTING card (teamB's batters)
                - teamB.bowling[]  = rows from the 2nd innings BOWLING figures (teamA's bowlers who bowled AT teamB)

                If an image is labelled as a "batting card" for a team, extract EVERY batter row into that team's batting[].
                If an image is labelled as a "bowling card" for a team, extract EVERY bowler row into that team's bowling[].
                A bowling card that shows teamA's bowlers (who bowled in the 2nd innings) goes into teamB.bowling[].

                The JSON schema:
                {
                  "teamA": {
                    "batting": [
                      {
                        "playerName": "string",
                        "battingPosition": integer,
                        "batted": true,
                        "score": integer,
                        "ballsFaced": integer,
                        "fours": integer,
                        "sixes": integer,
                        "dismissed": boolean,
                        "dismissalType": "NOT_OUT|BOWLED|CAUGHT|LBW|RUN_OUT|STUMPED|HIT_WICKET|RETIRED",
                        "dismissedBowler": "string or null",
                        "dismissedDescription": "string or null"
                      }
                    ],
                    "bowling": [
                      {
                        "playerName": "string",
                        "overs": "string e.g. 4.0",
                        "maidens": integer,
                        "runs": integer,
                        "wickets": integer,
                        "wides": integer,
                        "noBalls": integer
                      }
                    ],
                    "score": integer,
                    "wickets": integer,
                    "overs": "string",
                    "byes": integer,
                    "legByes": integer,
                    "wides": integer,
                    "noBalls": integer
                  },
                  "teamB": { /* identical structure */ }
                }

                Extract EVERY row visible — do not skip any batter or bowler.
                Use null for values not visible. For dismissalType, if unclear use BOWLED.
                Output ONLY the JSON object. No markdown fences, no explanation.
                """;
    }

    private String buildUserPrompt(String teamAName, String teamBName,
                                   List<PlayerDTO> teamASquad, List<PlayerDTO> teamBSquad,
                                   List<String> imageLabels) {
        StringBuilder sb = new StringBuilder();
        sb.append("Parse ALL scorecard data from the provided image(s).\n\n");
        sb.append("Teams:\n");
        sb.append("  teamA (batted 1st): ").append(teamAName).append("\n");
        sb.append("  teamB (batted 2nd): ").append(teamBName).append("\n\n");

        sb.append("Images provided (in order):\n");
        for (int i = 0; i < imageLabels.size(); i++) {
            sb.append("  Image ").append(i + 1).append(": ").append(imageLabels.get(i)).append("\n");
        }
        sb.append("\n");

        sb.append("Extraction rules per image:\n");
        sb.append("  - '").append(teamAName).append(" batting card'  → extract every batter row into teamA.batting[]\n");
        sb.append("  - '").append(teamAName).append(" bowling card'  → these are ").append(teamAName)
          .append("'s bowlers (bowled in 2nd innings) → extract into teamB.bowling[]\n");
        sb.append("  - '").append(teamBName).append(" batting card'  → extract every batter row into teamB.batting[]\n");
        sb.append("  - '").append(teamBName).append(" bowling card'  → these are ").append(teamBName)
          .append("'s bowlers (bowled in 1st innings) → extract into teamA.bowling[]\n\n");

        if (!teamASquad.isEmpty()) {
            sb.append("Known ").append(teamAName).append(" players: ");
            sb.append(squadNames(teamASquad)).append("\n");
        }
        if (!teamBSquad.isEmpty()) {
            sb.append("Known ").append(teamBName).append(" players: ");
            sb.append(squadNames(teamBSquad)).append("\n");
        }

        sb.append("\nUse the exact player names as shown on the scorecard. Extract EVERY row. Output only the JSON.");
        return sb.toString();
    }

    private String squadNames(List<PlayerDTO> squad) {
        List<String> names = new ArrayList<>();
        for (PlayerDTO p : squad) {
            names.add(p.getName() + " " + p.getSurname());
        }
        return String.join(", ", names);
    }

    private ScorecardData parseJson(String raw) {
        String json = raw.trim();
        if (json.startsWith("```")) {
            json = json.replaceFirst("(?s)```[a-z]*\\s*", "").replaceFirst("(?s)```\\s*$", "").trim();
        }
        try {
            return MAPPER.readValue(json, ScorecardData.class);
        } catch (Exception e) {
            log.error("Failed to parse AI scorecard JSON: {}", json, e);
            throw new IllegalStateException("AI returned an unreadable scorecard format: " + e.getMessage(), e);
        }
    }

    // ── Player matching ───────────────────────────────────────────────────────

    private List<PlayerMatchResult> matchPlayers(ScorecardData scorecard,
                                                  List<PlayerDTO> teamASquad,
                                                  List<PlayerDTO> teamBSquad) {
        // In a cricket scorecard:
        //   teamA.batting  = teamA's batters   → teamA players
        //   teamA.bowling  = teamB's bowlers   → teamB players  (opposition bowls at teamA)
        //   teamB.batting  = teamB's batters   → teamB players
        //   teamB.bowling  = teamA's bowlers   → teamA players  (opposition bowls at teamB)
        Map<String, String> namesToTeam = new LinkedHashMap<>();

        TeamScorecard a = scorecard.getTeamA();
        TeamScorecard b = scorecard.getTeamB();

        if (a != null && a.getBatting() != null) {
            for (BattingEntry e : a.getBatting()) addName(e.getPlayerName(), "teamA", namesToTeam);
        }
        if (b != null && b.getBowling() != null) {
            for (BowlingEntry e : b.getBowling()) addName(e.getPlayerName(), "teamA", namesToTeam);
        }
        if (b != null && b.getBatting() != null) {
            for (BattingEntry e : b.getBatting()) addName(e.getPlayerName(), "teamB", namesToTeam);
        }
        if (a != null && a.getBowling() != null) {
            for (BowlingEntry e : a.getBowling()) addName(e.getPlayerName(), "teamB", namesToTeam);
        }

        List<PlayerMatchResult> results = new ArrayList<>();
        for (Map.Entry<String, String> entry : namesToTeam.entrySet()) {
            String name = entry.getKey();
            String team = entry.getValue();
            List<PlayerDTO> squad = "teamA".equals(team) ? teamASquad : teamBSquad;
            results.add(resolvePlayer(name, team, squad));
        }
        return results;
    }

    private void addName(String name, String team, Map<String, String> out) {
        if (name != null && !name.isBlank()) out.putIfAbsent(name.trim(), team);
    }

    private static String normalize(String s) {
        if (s == null || s.isBlank()) return "";
        return s.toLowerCase(java.util.Locale.ROOT).trim().replaceAll("\\s+", " ");
    }

    private PlayerMatchResult resolvePlayer(String name, String team, List<PlayerDTO> squad) {
        String nameLower = normalize(name);

        // 1. Exact match (case-insensitive, whitespace-normalized)
        for (PlayerDTO p : squad) {
            String full = normalize(p.getName() + " " + p.getSurname());
            if (full.equals(nameLower)) {
                return PlayerMatchResult.builder()
                        .name(name).team(team)
                        .status(MatchStatus.MATCHED)
                        .matchedPlayerId(p.getPlayerId())
                        .confidence(1.0)
                        .build();
            }
        }

        // 2. Initials + surname or surname-only
        String bestName = null;
        Long bestId = null;
        double bestConf = 0.0;

        for (PlayerDTO p : squad) {
            String fullName  = p.getName() + " " + p.getSurname();
            String surname   = normalize(p.getSurname());
            String firstName = normalize(p.getName());

            // Surname-only match
            if (nameLower.equals(surname)) {
                if (0.75 > bestConf) { bestConf = 0.75; bestName = fullName; bestId = p.getPlayerId(); }
                continue;
            }

            // "X Surname" where X is first initial
            if (!surname.isEmpty() && nameLower.matches("[a-z]\\.?\\s+" + escapeRegex(surname))) {
                if (0.85 > bestConf) { bestConf = 0.85; bestName = fullName; bestId = p.getPlayerId(); }
                continue;
            }

            // "Firstname S" where S is surname initial
            if (!surname.isEmpty()) {
                String surnameInitial = surname.substring(0, 1);
                if (nameLower.equals(firstName + " " + surnameInitial) ||
                        nameLower.equals(firstName + " " + surnameInitial + ".")) {
                    if (0.8 > bestConf) { bestConf = 0.8; bestName = fullName; bestId = p.getPlayerId(); }
                    continue;
                }
            }

            // Jaro-Winkler similarity
            double sim = jaroWinkler(nameLower, normalize(fullName));
            if (sim > 0.88 && sim > bestConf) {
                bestConf = sim;
                bestName = fullName;
                bestId   = p.getPlayerId();
            }
        }

        if (bestName != null) {
            return PlayerMatchResult.builder()
                    .name(name).team(team)
                    .status(MatchStatus.SUGGESTED)
                    .suggestedName(bestName)
                    .suggestedPlayerId(bestId)
                    .confidence(bestConf)
                    .build();
        }

        return PlayerMatchResult.builder()
                .name(name).team(team)
                .status(MatchStatus.UNMATCHED)
                .confidence(0.0)
                .build();
    }

    private void applyMatchedIds(ScorecardData scorecard, List<PlayerMatchResult> matches) {
        Map<String, Long> nameToId = new LinkedHashMap<>();
        for (PlayerMatchResult m : matches) {
            if (m.getStatus() == MatchStatus.MATCHED && m.getMatchedPlayerId() != null) {
                nameToId.put(m.getName(), m.getMatchedPlayerId());
            }
        }
        if (nameToId.isEmpty()) return;

        applyIdsToCard(scorecard.getTeamA(), nameToId);
        applyIdsToCard(scorecard.getTeamB(), nameToId);
    }

    private void applyIdsToCard(TeamScorecard card, Map<String, Long> nameToId) {
        if (card == null) return;
        if (card.getBatting() != null) {
            for (BattingEntry b : card.getBatting()) {
                if (b.getPlayerName() != null) {
                    Long id = nameToId.get(b.getPlayerName().trim());
                    if (id != null) b.setPlayerId(id);
                }
            }
        }
        if (card.getBowling() != null) {
            for (BowlingEntry b : card.getBowling()) {
                if (b.getPlayerName() != null) {
                    Long id = nameToId.get(b.getPlayerName().trim());
                    if (id != null) b.setPlayerId(id);
                }
            }
        }
    }

    // ── String distance ───────────────────────────────────────────────────────

    private static String escapeRegex(String s) {
        return s.replaceAll("[.+*?^${}()|\\[\\]\\\\]", "\\\\$0");
    }

    private static double jaroWinkler(String s1, String s2) {
        double jaro = jaro(s1, s2);
        int prefix = 0;
        int maxPrefix = Math.min(4, Math.min(s1.length(), s2.length()));
        for (int i = 0; i < maxPrefix; i++) {
            if (s1.charAt(i) == s2.charAt(i)) prefix++;
            else break;
        }
        return jaro + prefix * 0.1 * (1 - jaro);
    }

    private static double jaro(String s1, String s2) {
        if (s1.isEmpty() && s2.isEmpty()) return 1.0;
        if (s1.isEmpty() || s2.isEmpty()) return 0.0;

        int matchDist = Math.max(s1.length(), s2.length()) / 2 - 1;
        if (matchDist < 0) matchDist = 0;

        boolean[] s1Matched = new boolean[s1.length()];
        boolean[] s2Matched = new boolean[s2.length()];
        int matches = 0;

        for (int i = 0; i < s1.length(); i++) {
            int lo = Math.max(0, i - matchDist);
            int hi = Math.min(i + matchDist + 1, s2.length());
            for (int j = lo; j < hi; j++) {
                if (!s2Matched[j] && s1.charAt(i) == s2.charAt(j)) {
                    s1Matched[i] = true;
                    s2Matched[j] = true;
                    matches++;
                    break;
                }
            }
        }

        if (matches == 0) return 0.0;

        int transpositions = 0;
        int k = 0;
        for (int i = 0; i < s1.length(); i++) {
            if (s1Matched[i]) {
                while (!s2Matched[k]) k++;
                if (s1.charAt(i) != s2.charAt(k)) transpositions++;
                k++;
            }
        }

        return (matches / (double) s1.length()
                + matches / (double) s2.length()
                + (matches - transpositions / 2.0) / matches) / 3.0;
    }
}
