--liquibase formatted sql

--changeset cricketlegend:015-match-side-captain
ALTER TABLE match_side ADD COLUMN captain_player_id BIGINT;
