--liquibase formatted sql

--changeset cricketlegend:028-field-icon-url
ALTER TABLE field ADD COLUMN icon_url VARCHAR(500);
