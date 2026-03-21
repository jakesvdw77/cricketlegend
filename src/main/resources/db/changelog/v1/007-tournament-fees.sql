--liquibase formatted sql

--changeset cricketlegend:024-tournament-fees
ALTER TABLE tournament ADD COLUMN entry_fee NUMERIC(12, 2);
ALTER TABLE tournament ADD COLUMN registration_fee NUMERIC(12, 2);
ALTER TABLE tournament ADD COLUMN match_fee NUMERIC(12, 2);
ALTER TABLE tournament ADD COLUMN registration_page_url VARCHAR(500);
