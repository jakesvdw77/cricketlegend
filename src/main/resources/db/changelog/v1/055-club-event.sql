--liquibase formatted sql

--changeset cricketlegend:055-club-event
CREATE TABLE club_event (
    event_id              BIGSERIAL     PRIMARY KEY,
    club_id               BIGINT        NOT NULL,
    team_id               BIGINT,
    category              VARCHAR(50)   NOT NULL,
    title                 VARCHAR(255),
    notes                 TEXT,
    event_date            DATE          NOT NULL,
    start_time            TIME,
    end_time              TIME,
    location_name         VARCHAR(255),
    google_maps_url       VARCHAR(1000),
    meeting_url           VARCHAR(1000),
    recurrence            VARCHAR(20)   NOT NULL DEFAULT 'NONE',
    recurrence_end_date   DATE,
    series_id             BIGINT,
    created_at            TIMESTAMP,
    created_by_player_id  BIGINT,
    CONSTRAINT fk_club_event_club   FOREIGN KEY (club_id)              REFERENCES club(club_id),
    CONSTRAINT fk_club_event_team   FOREIGN KEY (team_id)              REFERENCES team(team_id),
    CONSTRAINT fk_club_event_player FOREIGN KEY (created_by_player_id) REFERENCES player(player_id)
);

--changeset cricketlegend:055-player-notification-event-id
ALTER TABLE player_notification ADD COLUMN event_id BIGINT;
