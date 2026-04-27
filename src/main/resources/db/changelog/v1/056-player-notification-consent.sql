--liquibase formatted sql

--changeset cricketlegend:056-player-notification-consent
ALTER TABLE player ADD COLUMN consent_email BOOLEAN NOT NULL DEFAULT FALSE;
