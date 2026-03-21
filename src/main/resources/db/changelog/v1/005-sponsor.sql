--liquibase formatted sql

--changeset cricketlegend:021-create-sponsor
CREATE TABLE sponsor (
    sponsor_id   BIGSERIAL    PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    brand_logo_url  VARCHAR(500),
    brand_website   VARCHAR(500),
    contact_number  VARCHAR(50),
    contact_email   VARCHAR(255)
);

--changeset cricketlegend:022-tournament-sponsor
CREATE TABLE tournament_sponsor (
    tournament_id BIGINT NOT NULL REFERENCES tournament(tournament_id) ON DELETE CASCADE,
    sponsor_id    BIGINT NOT NULL REFERENCES sponsor(sponsor_id)       ON DELETE CASCADE,
    PRIMARY KEY (tournament_id, sponsor_id)
);
