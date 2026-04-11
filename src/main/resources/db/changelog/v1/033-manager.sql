--liquibase formatted sql

--changeset cricketlegend:033-manager
CREATE TABLE manager (
    manager_id BIGSERIAL PRIMARY KEY,
    player_id  BIGINT REFERENCES player(player_id) ON DELETE SET NULL,
    name       VARCHAR(255),
    surname    VARCHAR(255),
    email      VARCHAR(255) NOT NULL,
    phone      VARCHAR(50),
    CONSTRAINT uq_manager_email UNIQUE (email)
);
