--liquibase formatted sql

--changeset cricketlegend:066-ai-analysis-cache
CREATE TABLE ai_analysis_cache (
    id            BIGSERIAL    PRIMARY KEY,
    analysis_type VARCHAR(50)  NOT NULL,
    primary_id    BIGINT       NOT NULL,
    secondary_id  BIGINT,
    result_json   TEXT         NOT NULL,
    generated_at  TIMESTAMP    NOT NULL,
    CONSTRAINT uq_ai_analysis_cache UNIQUE (analysis_type, primary_id, secondary_id)
);

CREATE INDEX idx_ai_analysis_cache_lookup ON ai_analysis_cache (analysis_type, primary_id, secondary_id);
