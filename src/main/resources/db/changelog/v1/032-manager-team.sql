--liquibase formatted sql

--changeset cricketlegend:032-manager-team
CREATE TABLE manager_team (
    id            BIGSERIAL PRIMARY KEY,
    manager_email VARCHAR(255) NOT NULL,
    team_id       BIGINT NOT NULL REFERENCES team(team_id) ON DELETE CASCADE,
    CONSTRAINT uq_manager_team UNIQUE (manager_email, team_id)
);

CREATE INDEX idx_manager_team_email ON manager_team(manager_email);
