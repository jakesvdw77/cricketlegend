--liquibase formatted sql

--changeset cricketlegend:030-player-availability
CREATE TABLE player_availability (
    availability_id BIGSERIAL PRIMARY KEY,
    poll_id         BIGINT NOT NULL REFERENCES match_availability_poll(poll_id) ON DELETE CASCADE,
    player_id       BIGINT NOT NULL REFERENCES player(player_id) ON DELETE CASCADE,
    status          VARCHAR(10) CHECK (status IN ('YES','NO','UNSURE')),
    updated_at      TIMESTAMP,
    CONSTRAINT uq_availability_poll_player UNIQUE (poll_id, player_id)
);

CREATE INDEX idx_availability_poll ON player_availability(poll_id);
CREATE INDEX idx_availability_player ON player_availability(player_id);
