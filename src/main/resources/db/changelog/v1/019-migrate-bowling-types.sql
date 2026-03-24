--liquibase formatted sql

--changeset cricketlegend:019-migrate-bowling-types
UPDATE player SET bowling_type = 'FAST'         WHERE bowling_type = 'FAST_PACE';
UPDATE player SET bowling_type = 'MEDIUM_FAST'  WHERE bowling_type = 'MEDIUM_FAST_PACE';
UPDATE player SET bowling_type = 'MEDIUM'       WHERE bowling_type = 'MEDIUM_PACE';
UPDATE player SET bowling_type = 'MEDIUM_SLOW'  WHERE bowling_type = 'SLOW_BOWLER';
