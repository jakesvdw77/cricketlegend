--liquibase formatted sql

--changeset cricketlegend:036-match-toss-result
ALTER TABLE match ADD COLUMN toss_won_by VARCHAR(20);
ALTER TABLE match ADD COLUMN toss_decision VARCHAR(10);
