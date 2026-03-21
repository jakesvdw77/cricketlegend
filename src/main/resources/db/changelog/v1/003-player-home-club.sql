--liquibase formatted sql

--changeset cricketlegend:019-player-home-club
ALTER TABLE player
    ADD COLUMN IF NOT EXISTS home_club_id BIGINT REFERENCES club(club_id);
