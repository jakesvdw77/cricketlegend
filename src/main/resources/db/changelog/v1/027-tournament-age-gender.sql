--liquibase formatted sql

--changeset cricketlegend:027-tournament-age-gender
ALTER TABLE tournament ADD COLUMN age_group VARCHAR(20);
ALTER TABLE tournament ADD COLUMN tournament_gender VARCHAR(10);
