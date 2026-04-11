--liquibase formatted sql

--changeset cricketlegend:037-media-content-tags
ALTER TABLE media_content ADD COLUMN caption TEXT;
ALTER TABLE media_content ADD COLUMN media_type VARCHAR(10);
ALTER TABLE media_content ADD COLUMN player_id BIGINT REFERENCES player(player_id) ON DELETE SET NULL;
ALTER TABLE media_content ADD COLUMN team_id BIGINT REFERENCES team(team_id) ON DELETE SET NULL;
ALTER TABLE media_content ADD COLUMN match_id BIGINT REFERENCES match(match_id) ON DELETE SET NULL;
ALTER TABLE media_content ADD COLUMN tournament_id BIGINT REFERENCES tournament(tournament_id) ON DELETE SET NULL;
ALTER TABLE media_content ADD COLUMN field_id BIGINT REFERENCES field(field_id) ON DELETE SET NULL;
ALTER TABLE media_content ADD COLUMN club_id BIGINT REFERENCES club(club_id) ON DELETE SET NULL;
ALTER TABLE media_content ADD COLUMN uploaded_at TIMESTAMP DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_media_player ON media_content(player_id);
CREATE INDEX IF NOT EXISTS idx_media_team ON media_content(team_id);
CREATE INDEX IF NOT EXISTS idx_media_match ON media_content(match_id);
CREATE INDEX IF NOT EXISTS idx_media_tournament ON media_content(tournament_id);
