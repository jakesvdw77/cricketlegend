--liquibase formatted sql

--changeset cricketlegend:060-tournament-show-on-front-page
ALTER TABLE tournament ADD COLUMN show_on_front_page BOOLEAN NOT NULL DEFAULT TRUE;
