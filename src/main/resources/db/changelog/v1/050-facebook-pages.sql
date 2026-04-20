--liquibase formatted sql

--changeset cricketlegend:050-facebook-pages
CREATE TABLE facebook_page (
    id BIGSERIAL PRIMARY KEY,
    url VARCHAR(500) NOT NULL,
    label VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT TRUE
);
