--liquibase formatted sql

--changeset cricketlegend:012-team-squad
CREATE TABLE team_squad (
    team_id   BIGINT NOT NULL REFERENCES team(team_id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES player(player_id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, player_id)
);
