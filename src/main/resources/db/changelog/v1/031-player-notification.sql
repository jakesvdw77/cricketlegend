--liquibase formatted sql

--changeset cricketlegend:031-player-notification
CREATE TABLE player_notification (
    notification_id BIGSERIAL PRIMARY KEY,
    player_id       BIGINT NOT NULL REFERENCES player(player_id) ON DELETE CASCADE,
    type            VARCHAR(30) NOT NULL,
    match_id        BIGINT,
    team_id         BIGINT,
    read            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP
);

CREATE INDEX idx_notification_player ON player_notification(player_id);
CREATE INDEX idx_notification_unread ON player_notification(player_id, read) WHERE read = FALSE;
