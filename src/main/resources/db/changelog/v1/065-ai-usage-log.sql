--liquibase formatted sql

--changeset cricketlegend:065-ai-usage-log
CREATE TABLE ai_usage_log (
    id                BIGSERIAL    PRIMARY KEY,
    feature           VARCHAR(100) NOT NULL,
    model             VARCHAR(100) NOT NULL,
    prompt_tokens     BIGINT       NOT NULL DEFAULT 0,
    completion_tokens BIGINT       NOT NULL DEFAULT 0,
    total_tokens      BIGINT       NOT NULL DEFAULT 0,
    logged_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);
