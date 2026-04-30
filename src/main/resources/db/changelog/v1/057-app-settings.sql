--liquibase formatted sql

--changeset cricketlegend:057-app-settings
CREATE TABLE app_settings (
    id                        BIGINT  PRIMARY KEY DEFAULT 1,
    show_upcoming_section     BOOLEAN NOT NULL DEFAULT TRUE,
    show_live_matches_section BOOLEAN NOT NULL DEFAULT TRUE,
    show_log_standings_section BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO app_settings (id, show_upcoming_section, show_live_matches_section, show_log_standings_section)
VALUES (1, TRUE, TRUE, TRUE);
