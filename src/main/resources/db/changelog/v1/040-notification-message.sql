--liquibase formatted sql
--changeset cricketlegend:040-notification-message

ALTER TABLE player_notification
    ADD COLUMN subject VARCHAR(255),
    ADD COLUMN message TEXT;
