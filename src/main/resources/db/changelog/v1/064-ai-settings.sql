--liquibase formatted sql

--changeset cricketlegend:064-ai-settings
CREATE TABLE ai_settings (
    id            BIGINT       PRIMARY KEY DEFAULT 1,
    api_key       VARCHAR(500),
    default_model VARCHAR(100) NOT NULL DEFAULT 'claude-opus-4-8'
);

INSERT INTO ai_settings (id, api_key, default_model)
VALUES (1, NULL, 'claude-opus-4-8');
