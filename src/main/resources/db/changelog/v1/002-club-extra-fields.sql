--liquibase formatted sql

--changeset cricketlegend:018-club-extra-fields
ALTER TABLE club
    ADD COLUMN IF NOT EXISTS logo_url        VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS google_maps_url VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS website_url     VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS contact_person  VARCHAR(255),
    ADD COLUMN IF NOT EXISTS email           VARCHAR(255),
    ADD COLUMN IF NOT EXISTS contact_number  VARCHAR(50);
