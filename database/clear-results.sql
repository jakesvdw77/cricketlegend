-- Clear all scorecards and game results
-- Matches and their schedules are preserved; only result data is removed.

BEGIN;

-- Individual player stats (batting, bowling, fielding per match)
DELETE FROM player_result;

-- Match outcomes, scorecards (score_card JSONB), scores, winners, man of match
DELETE FROM match_result;

-- AI analysis cache is derived from results — clear it too so stale data is not served
DELETE FROM ai_analysis_cache;

COMMIT;
