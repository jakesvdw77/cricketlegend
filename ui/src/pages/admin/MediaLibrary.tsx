import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Paper, TextField, MenuItem, Chip, Autocomplete,
  CircularProgress, Alert, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip, Divider, LinearProgress, useMediaQuery, useTheme,
} from '@mui/material';
import {
  CloudUpload, Delete, FilterList, FilterListOff, PlayCircle,
  Image as ImageIcon, Close, Add, Download,
} from '@mui/icons-material';
import { mediaApi, MediaSearchParams } from '../../api/mediaApi';
import { playerApi } from '../../api/playerApi';
import { teamApi } from '../../api/teamApi';
import { matchApi } from '../../api/matchApi';
import { tournamentApi } from '../../api/tournamentApi';
import { fieldApi } from '../../api/fieldApi';
import { clubApi } from '../../api/clubApi';
import { MediaContent, Player, Team, Match, Tournament, Field, Club, MediaFileType } from '../../types';

const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;
const VIDEO_EXTS = /\.(mp4|mov|avi|webm|mkv|m4v)$/i;

const detectType = (url: string): MediaFileType =>
  VIDEO_EXTS.test(url) ? 'VIDEO' : 'IMAGE';

const emptyUpload = (): Partial<MediaContent> => ({
  caption: '',
  mediaType: undefined,
  playerId: undefined,
  teamId: undefined,
  matchId: undefined,
  tournamentId: undefined,
  fieldId: undefined,
  clubId: undefined,
});

export interface MediaPlayerContext {
  player: Player;
  players: Player[];
  teams: Team[];
  matches: Match[];
  tournaments: Tournament[];
}

interface MediaLibraryProps {
  tournamentId?: number;
  playerContext?: MediaPlayerContext;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({ tournamentId: fixedTournamentId, playerContext }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  // Reference data
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);

  // Gallery state
  const [items, setItems] = useState<MediaContent[]>([]);
  const defaultFilters: MediaSearchParams = playerContext
    ? { playerId: playerContext.player.playerId }
    : fixedTournamentId ? { tournamentId: fixedTournamentId } : {};
  const [filters, setFilters] = useState<MediaSearchParams>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(!isMobile);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadMeta, setUploadMeta] = useState<Partial<MediaContent>>({
    ...emptyUpload(),
    tournamentId: fixedTournamentId,
    playerId: playerContext?.player.playerId,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Preview lightbox
  const [lightbox, setLightbox] = useState<MediaContent | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<MediaContent | null>(null);

  useEffect(() => {
    if (playerContext) {
      // Player-scoped: use pre-fetched restricted data
      setPlayers(playerContext.players);
      setTeams(playerContext.teams);
      setMatches(playerContext.matches);
      setTournaments(playerContext.tournaments);
      fieldApi.findAll().then(setFields).catch(() => {});
      loadGallery(defaultFilters);
      return;
    }
    const matchLoad = fixedTournamentId
      ? matchApi.findByTournament(fixedTournamentId)
      : matchApi.findAll();
    const refLoads: Promise<any>[] = [
      playerApi.findAll(),
      teamApi.findAll(),
      matchLoad,
      fieldApi.findAll(),
    ];
    if (!fixedTournamentId) refLoads.push(tournamentApi.findAll(), clubApi.findAll());
    Promise.all(refLoads).then(([p, t, m, f, to, c]) => {
      setPlayers(p);
      setTeams(t);
      setMatches(m);
      setFields(f);
      if (to) setTournaments(to);
      if (c) setClubs(c);
    });
    loadGallery(fixedTournamentId ? { tournamentId: fixedTournamentId } : {});
  }, [fixedTournamentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadGallery = (params: MediaSearchParams) => {
    setLoadingGallery(true);
    setGalleryError(null);
    mediaApi.search(params)
      .then(setItems)
      .catch(() => setGalleryError('Failed to load media.'))
      .finally(() => setLoadingGallery(false));
  };

  const applyFilters = () => loadGallery(filters);

  const clearFilters = () => {
    setFilters(defaultFilters);
    loadGallery(defaultFilters);
  };

  const hasFilters = Object.values(filters).some(v => v != null && v !== '');

  // ── File selection ───────────────────────────────────────────────────────

  const handleFile = (file: File) => {
    setSelectedFile(file);
    setUploadError(null);
    const isVideo = VIDEO_EXTS.test(file.name);
    const isImage = IMAGE_EXTS.test(file.name);
    if (!isVideo && !isImage) {
      setUploadError('Unsupported file type. Please select an image or video file.');
      setSelectedFile(null);
      return;
    }
    setUploadMeta(m => ({ ...m, mediaType: isVideo ? 'VIDEO' : 'IMAGE' }));
    if (isImage) {
      const reader = new FileReader();
      reader.onload = e => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ── Upload ───────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await mediaApi.upload(selectedFile);
      const dto: MediaContent = { ...uploadMeta, url, mediaType: uploadMeta.mediaType ?? detectType(url) } as MediaContent;
      await mediaApi.save(dto);
      setUploadOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadMeta(emptyUpload());
      loadGallery(filters);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const resetUploadDialog = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadMeta({
      ...emptyUpload(),
      tournamentId: fixedTournamentId,
      playerId: playerContext?.player.playerId,
    });
    setUploadError(null);
    setUploading(false);
  };

  // ── Delete ───────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    await mediaApi.delete(deleteTarget.id);
    setDeleteTarget(null);
    loadGallery(filters);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  const setMeta = (patch: Partial<MediaContent>) => setUploadMeta(m => ({ ...m, ...patch }));
  const setFilter = (patch: MediaSearchParams) => setFilters(f => ({ ...f, ...patch }));

  const matchLabel = (m: Match) =>
    `${m.homeTeamName ?? '?'} vs ${m.oppositionTeamName ?? '?'}${m.matchDate ? ' (' + m.matchDate + ')' : ''}`;

  const tagChips = (item: MediaContent) =>
    [
      item.playerName && { label: item.playerName, color: 'primary' as const },
      item.teamName && { label: item.teamName, color: 'secondary' as const },
      item.tournamentName && { label: item.tournamentName, color: 'default' as const },
      item.matchLabel && { label: item.matchLabel, color: 'default' as const },
      item.fieldName && { label: item.fieldName, color: 'default' as const },
      item.clubName && { label: item.clubName, color: 'default' as const },
    ].filter(Boolean) as { label: string; color: 'primary' | 'secondary' | 'default' }[];

  // ── Dropdowns ────────────────────────────────────────────────────────────

  const TagSelectors: React.FC<{
    meta: Partial<MediaContent>;
    onChange: (patch: Partial<MediaContent>) => void;
  }> = ({ meta, onChange }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Autocomplete
        size="small"
        options={players}
        getOptionLabel={p => `${p.name} ${p.surname}`}
        value={players.find(p => p.playerId === meta.playerId) ?? null}
        onChange={(_, p) => onChange({ playerId: p?.playerId ?? undefined })}
        renderInput={params => <TextField {...params} label="Player" />}
      />
      <Autocomplete
        size="small"
        options={teams}
        getOptionLabel={t => t.teamName}
        value={teams.find(t => t.teamId === meta.teamId) ?? null}
        onChange={(_, t) => onChange({ teamId: t?.teamId ?? undefined })}
        renderInput={params => <TextField {...params} label="Team" />}
      />
      <Autocomplete
        size="small"
        options={matches}
        getOptionLabel={matchLabel}
        value={matches.find(m => m.matchId === meta.matchId) ?? null}
        onChange={(_, m) => onChange({ matchId: m?.matchId ?? undefined })}
        renderInput={params => <TextField {...params} label="Match" />}
      />
      {!fixedTournamentId && (
        <Autocomplete
          size="small"
          options={tournaments}
          getOptionLabel={t => t.name}
          value={tournaments.find(t => t.tournamentId === meta.tournamentId) ?? null}
          onChange={(_, t) => onChange({ tournamentId: t?.tournamentId ?? undefined })}
          renderInput={params => <TextField {...params} label="Tournament" />}
        />
      )}
      <Autocomplete
        size="small"
        options={fields}
        getOptionLabel={f => f.name}
        value={fields.find(f => f.fieldId === meta.fieldId) ?? null}
        onChange={(_, f) => onChange({ fieldId: f?.fieldId ?? undefined })}
        renderInput={params => <TextField {...params} label="Ground / Field" />}
      />
      {!fixedTournamentId && !playerContext && (
        <Autocomplete
          size="small"
          options={clubs}
          getOptionLabel={c => c.name}
          value={clubs.find(c => c.clubId === meta.clubId) ?? null}
          onChange={(_, c) => onChange({ clubId: c?.clubId ?? undefined })}
          renderInput={params => <TextField {...params} label="Club" />}
        />
      )}
    </Box>
  );

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ mr: 'auto' }}>Media Library</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { resetUploadDialog(); setUploadOpen(true); }}>
          Upload Media
        </Button>
      </Box>

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: filtersOpen ? 2 : 0, gap: 1 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mr: 'auto' }}>Filters</Typography>
          {hasFilters && (
            <Tooltip title="Clear filters">
              <IconButton size="small" onClick={clearFilters}><FilterListOff fontSize="small" /></IconButton>
            </Tooltip>
          )}
          <Tooltip title={filtersOpen ? 'Collapse' : 'Expand'}>
            <IconButton size="small" onClick={() => setFiltersOpen(o => !o)}>
              <FilterList fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {filtersOpen && (
          <>
            {/* Row 1: Type · Player · Team · Apply */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
              <TextField select size="small" label="Type" sx={{ flex: '1 1 100px', minWidth: 90 }} value={filters.mediaType ?? ''}
                onChange={e => setFilter({ mediaType: e.target.value as MediaFileType || undefined })}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="IMAGE">Images</MenuItem>
                <MenuItem value="VIDEO">Videos</MenuItem>
              </TextField>
              <Autocomplete
                size="small" sx={{ flex: '2 1 180px' }}
                options={players}
                getOptionLabel={p => `${p.name} ${p.surname}`}
                value={players.find(p => p.playerId === filters.playerId) ?? null}
                onChange={(_, p) => setFilter({ playerId: p?.playerId ?? undefined })}
                renderInput={params => <TextField {...params} label="Player" />}
              />
              <Autocomplete
                size="small" sx={{ flex: '2 1 160px' }}
                options={teams}
                getOptionLabel={t => t.teamName}
                value={teams.find(t => t.teamId === filters.teamId) ?? null}
                onChange={(_, t) => setFilter({ teamId: t?.teamId ?? undefined })}
                renderInput={params => <TextField {...params} label="Team" />}
              />
              <Button variant="contained" size="small" onClick={applyFilters} sx={{ flexShrink: 0 }}>
                Apply
              </Button>
            </Box>

            {/* Row 2: Tournament · Match · Ground (· Club for admins) */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 0 }}>
              {!fixedTournamentId && (
                <Autocomplete
                  size="small" sx={{ flex: '2 1 160px' }}
                  options={tournaments}
                  getOptionLabel={t => t.name}
                  value={tournaments.find(t => t.tournamentId === filters.tournamentId) ?? null}
                  onChange={(_, t) => setFilter({ tournamentId: t?.tournamentId ?? undefined })}
                  renderInput={params => <TextField {...params} label="Tournament" />}
                />
              )}
              <Autocomplete
                size="small" sx={{ flex: '3 1 200px' }}
                options={matches}
                getOptionLabel={matchLabel}
                value={matches.find(m => m.matchId === filters.matchId) ?? null}
                onChange={(_, m) => setFilter({ matchId: m?.matchId ?? undefined })}
                renderInput={params => <TextField {...params} label="Match" />}
              />
              <Autocomplete
                size="small" sx={{ flex: '2 1 140px' }}
                options={fields}
                getOptionLabel={f => f.name}
                value={fields.find(f => f.fieldId === filters.fieldId) ?? null}
                onChange={(_, f) => setFilter({ fieldId: f?.fieldId ?? undefined })}
                renderInput={params => <TextField {...params} label="Ground" />}
              />
              {!fixedTournamentId && !playerContext && (
                <Autocomplete
                  size="small" sx={{ flex: '2 1 140px' }}
                  options={clubs}
                  getOptionLabel={c => c.name}
                  value={clubs.find(c => c.clubId === filters.clubId) ?? null}
                  onChange={(_, c) => setFilter({ clubId: c?.clubId ?? undefined })}
                  renderInput={params => <TextField {...params} label="Club" />}
                />
              )}
            </Box>
          </>
        )}
      </Paper>

      {/* Gallery */}
      {loadingGallery && <LinearProgress sx={{ mb: 2 }} />}
      {galleryError && <Alert severity="error" sx={{ mb: 2 }}>{galleryError}</Alert>}

      {!loadingGallery && items.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <ImageIcon sx={{ fontSize: 56, mb: 1, opacity: 0.3 }} />
          <Typography>No media found. Upload some to get started.</Typography>
        </Box>
      )}

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 2,
      }}>
        {items.map(item => (
          <Paper
            key={item.id}
            variant="outlined"
            sx={{ overflow: 'hidden', cursor: 'pointer', '&:hover .media-actions': { opacity: 1 } }}
          >
            {/* Thumbnail */}
            <Box sx={{ position: 'relative', aspectRatio: '16/9', bgcolor: 'grey.100' }}
              onClick={() => setLightbox(item)}>
              {item.mediaType === 'IMAGE' ? (
                <Box
                  component="img"
                  src={item.url}
                  alt={item.caption ?? ''}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
                  <PlayCircle sx={{ fontSize: 48, color: 'primary.main', opacity: 0.8 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ px: 1, textAlign: 'center', wordBreak: 'break-all' }}>
                    {item.url.split('/').pop()}
                  </Typography>
                </Box>
              )}

              {/* Action overlay */}
              {!playerContext && (
                <Box className="media-actions" sx={{
                  position: 'absolute', inset: 0,
                  bgcolor: 'rgba(0,0,0,0.4)',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                  p: 0.5, opacity: 0, transition: 'opacity 0.15s',
                }}>
                  <Tooltip title="Delete">
                    <IconButton size="small" sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.4)' }}
                      onClick={e => { e.stopPropagation(); setDeleteTarget(item); }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>

            {/* Card body */}
            <Box sx={{ p: 1 }}>
              {item.caption && (
                <Typography variant="body2" fontWeight={500} noWrap sx={{ mb: 0.5 }}>{item.caption}</Typography>
              )}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {tagChips(item).map((c, i) => (
                  <Chip key={i} label={c.label} color={c.color} size="small" sx={{ maxWidth: 160, fontSize: '0.65rem' }} />
                ))}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                {item.uploadedAt && (
                  <Typography variant="caption" color="text.secondary">
                    {new Date(item.uploadedAt).toLocaleDateString()}
                  </Typography>
                )}
                {!playerContext && (
                  <Tooltip title="Delete" sx={{ ml: 'auto' }}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={e => { e.stopPropagation(); setDeleteTarget(item); }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* ── Upload dialog ── */}
      <Dialog open={uploadOpen} onClose={() => { setUploadOpen(false); resetUploadDialog(); }} maxWidth="lg" fullWidth fullScreen={isMobile}>
        <DialogTitle>Upload Media</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {uploadError && <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>}

          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
            {/* Left: drop zone + preview */}
            <Box sx={{ flex: 1 }}>
              {/* Drop zone / browse area */}
              <input
                ref={fileInput}
                type="file"
                hidden
                accept="image/*,video/*"
                onChange={onFileInput}
              />
              <Box
                onDragOver={e => { e.preventDefault(); if (!isMobile) setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={!isMobile ? onDrop : undefined}
                onClick={() => !selectedFile && fileInput.current?.click()}
                sx={{
                  border: '2px dashed',
                  borderColor: dragOver ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: selectedFile ? 'default' : 'pointer',
                  bgcolor: dragOver ? 'action.hover' : 'background.default',
                  transition: 'all 0.15s',
                  mb: 2,
                  minHeight: { xs: 180, md: 320 },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1.5,
                }}
              >
                {!selectedFile ? (
                  isMobile ? (
                    <>
                      <CloudUpload sx={{ fontSize: 52, color: 'text.secondary' }} />
                      <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
                        Tap to select a photo or video
                      </Typography>
                      <Button variant="contained" size="large" startIcon={<CloudUpload />}
                        onClick={e => { e.stopPropagation(); fileInput.current?.click(); }}>
                        Browse Gallery
                      </Button>
                      <Typography variant="caption" color="text.secondary">
                        JPG, PNG, GIF, WebP, MP4, MOV, WebM, AVI
                      </Typography>
                    </>
                  ) : (
                    <>
                      <CloudUpload sx={{ fontSize: 52, color: 'text.secondary' }} />
                      <Typography color="text.secondary">
                        Drag & drop a file here, or{' '}
                        <Typography component="span" color="primary" fontWeight={600}>browse</Typography>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Supported: JPG, PNG, GIF, WebP, MP4, MOV, WebM, AVI
                      </Typography>
                    </>
                  )
                ) : (
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                      <IconButton size="small" onClick={e => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null); }}>
                        <Close fontSize="small" />
                      </IconButton>
                    </Box>
                    {previewUrl ? (
                      <Box component="img" src={previewUrl} alt="preview"
                        sx={{ maxWidth: '100%', maxHeight: { xs: 240, md: 400 }, objectFit: 'contain', display: 'block', mx: 'auto', borderRadius: 1 }} />
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <PlayCircle sx={{ fontSize: 56, color: 'primary.main' }} />
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 280 }}>
                          {selectedFile.name}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>

              {/* Caption */}
              <TextField
                label="Caption"
                fullWidth
                size="small"
                value={uploadMeta.caption ?? ''}
                onChange={e => setMeta({ caption: e.target.value })}
                placeholder="Optional description"
              />
            </Box>

            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

            {/* Right: tag selectors */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>Tags</Typography>
              <TagSelectors meta={uploadMeta} onChange={setMeta} />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => { setUploadOpen(false); resetUploadDialog(); }}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CloudUpload />}
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Lightbox ── */}
      <Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {lightbox?.caption || 'Media Preview'}
          <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
            {lightbox && (
              <Tooltip title="Download">
                <IconButton
                  component="a"
                  href={lightbox.url}
                  download={lightbox.caption || lightbox.url.split('/').pop() || 'media'}
                >
                  <Download />
                </IconButton>
              </Tooltip>
            )}
            <IconButton onClick={() => setLightbox(null)}><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', bgcolor: '#000', p: 0 }}>
          {lightbox?.mediaType === 'IMAGE' ? (
            <Box component="img" src={lightbox.url} alt={lightbox.caption}
              sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block', mx: 'auto' }} />
          ) : lightbox?.mediaType === 'VIDEO' ? (
            <Box component="video" src={lightbox.url} controls autoPlay
              sx={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', mx: 'auto' }} />
          ) : null}
        </DialogContent>
        {lightbox && tagChips(lightbox).length > 0 && (
          <DialogContent sx={{ pt: 1, pb: 1 }}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {tagChips(lightbox).map((c, i) => (
                <Chip key={i} label={c.label} color={c.color} size="small" />
              ))}
            </Box>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Media</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <strong>{deleteTarget?.caption ?? 'this item'}</strong>? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
