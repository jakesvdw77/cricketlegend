--liquibase formatted sql

--changeset cricketlegend:038-team-sponsor
CREATE TABLE team_sponsor (
    team_id    BIGINT NOT NULL REFERENCES team(team_id)       ON DELETE CASCADE,
    sponsor_id BIGINT NOT NULL REFERENCES sponsor(sponsor_id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, sponsor_id)
);
