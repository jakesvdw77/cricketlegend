--liquibase formatted sql

--changeset cricketlegend:027-tournament-winning-team
ALTER TABLE tournament ADD COLUMN winning_team_id BIGINT REFERENCES team(team_id);
