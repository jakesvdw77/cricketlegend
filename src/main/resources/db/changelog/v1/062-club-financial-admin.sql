--liquibase formatted sql

--changeset cricketlegend:062-club-financial-admin
CREATE TABLE club_financial_admin (
    id          BIGSERIAL PRIMARY KEY,
    manager_id  BIGINT NOT NULL REFERENCES manager(manager_id) ON DELETE CASCADE,
    club_id     BIGINT NOT NULL REFERENCES club(club_id) ON DELETE CASCADE,
    CONSTRAINT uq_club_financial_admin UNIQUE (manager_id, club_id)
);

CREATE INDEX idx_club_financial_admin_manager ON club_financial_admin(manager_id);
CREATE INDEX idx_club_financial_admin_club    ON club_financial_admin(club_id);
