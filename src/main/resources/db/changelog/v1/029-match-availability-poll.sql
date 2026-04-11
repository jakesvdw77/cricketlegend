--liquibase formatted sql

--changeset cricketlegend:029-match-availability-poll
CREATE TABLE match_availability_poll (
    poll_id         BIGSERIAL PRIMARY KEY,
    match_id        BIGINT NOT NULL REFERENCES match(match_id) ON DELETE CASCADE,
    team_id         BIGINT NOT NULL REFERENCES team(team_id) ON DELETE CASCADE,
    open            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    CONSTRAINT uq_poll_match_team UNIQUE (match_id, team_id)
);

CREATE INDEX idx_poll_match ON match_availability_poll(match_id);
CREATE INDEX idx_poll_team ON match_availability_poll(team_id);
