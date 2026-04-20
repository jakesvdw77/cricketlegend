--liquibase formatted sql

--changeset cricketlegend:048-social-media-urls
ALTER TABLE team ADD COLUMN instagram_url TEXT;
ALTER TABLE team ADD COLUMN youtube_url TEXT;

ALTER TABLE tournament ADD COLUMN instagram_link TEXT;
ALTER TABLE tournament ADD COLUMN youtube_link TEXT;

ALTER TABLE sponsor ADD COLUMN facebook_url TEXT;
ALTER TABLE sponsor ADD COLUMN instagram_url TEXT;
ALTER TABLE sponsor ADD COLUMN youtube_url TEXT;

ALTER TABLE match ADD COLUMN youtube_url TEXT;
