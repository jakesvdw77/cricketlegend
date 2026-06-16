--liquibase formatted sql

--changeset cricketlegend:068-match-side-player-roles
CREATE TABLE match_side_player_roles (
    match_side_id BIGINT      NOT NULL REFERENCES match_side(match_side_id) ON DELETE CASCADE,
    player_id     BIGINT      NOT NULL,
    role          VARCHAR(20) NOT NULL,
    PRIMARY KEY (match_side_id, player_id)
);

CREATE INDEX idx_match_side_player_roles_side ON match_side_player_roles(match_side_id);

-- Backfill roles for all existing teamsheet entries based on player profile
INSERT INTO match_side_player_roles (match_side_id, player_id, role)
SELECT
    msp.match_side_id,
    msp.player_id,
    CASE
        WHEN p.bowling_type IS NOT NULL
             AND p.bowling_type != 'NONE'
             AND (p.part_time_bowler IS NULL OR p.part_time_bowler = FALSE)
             AND p.batting_position IN ('OPENER', 'TOP_ORDER', 'MIDDLE_ORDER')
            THEN 'ALL_ROUNDER'
        WHEN p.bowling_type IS NOT NULL
             AND p.bowling_type != 'NONE'
             AND (p.part_time_bowler IS NULL OR p.part_time_bowler = FALSE)
            THEN 'BOWLER'
        ELSE 'BATSMAN'
    END
FROM match_side_players msp
JOIN player p ON p.player_id = msp.player_id;
