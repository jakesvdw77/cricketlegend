import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, Paper, TextField, MenuItem, Chip,
  CircularProgress, Alert, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip, Divider, LinearProgress,
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

export const MediaLibrary: React.FC = () => {
  // Reference data
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);

  // Gallery state
  const [items, setItems] = useState<MediaContent[]>([]);
  const [filters, setFilters] = useState<MediaSearchParams>({});
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadMeta, setUploadMeta] = useState<Partial<MediaContent>>(emptyUpload());
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Preview lightbox
  const [lightbox, setLightbox] = useState<MediaContent | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<MediaContent | null>(null);

  useEffect(() => {
    Promise.all([
      playerApi.findAll(),
      teamApi.findAll(),
      matchApi.findAll(),
      tournamentApi.findAll(),
      fieldApi.findAll(),
      clubApi.findAll(),
    ]).then(([p, t, m, to, f, c]) => {
      setPlayers(p);
      setTeams(t);
      setMatches(m);
      setTournaments(to);
      setFields(f);
      setClubs(c);
    });
    loadGallery({});
  }, []);

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
    setFilters({});
    loadGallery({});
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
    setUploadMeta(emptyUpload());
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
      <TextField select label="Player" size="small" value={meta.playerId ?? ''} onChange={e => onChange({ playerId: e.target.value ? +e.target.value : undefined })}>
        <MenuItem value=""><em>— None —</em></MenuItem>
        {players.map(p => <MenuItem key={p.playerId} value={p.playerId}>{p.name} {p.surname}</MenuItem>)}
      </TextField>
      <TextField select label="Team" size="small" value={meta.teamId ?? ''} onChange={e => onChange({ teamId: e.target.value ? +e.target.value : undefined })}>
        <MenuItem value=""><em>— None —</em></MenuItem>
        {teams.map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>)}
      </TextField>
      <TextField select label="Match" size="small" value={meta.matchId ?? ''} onChange={e => onChange({ matchId: e.target.value ? +e.target.value : undefined })}>
        <MenuItem value=""><em>— None —</em></MenuItem>
        {matches.map(m => <MenuItem key={m.matchId} value={m.matchId}>{matchLabel(m)}</MenuItem>)}
      </TextField>
      <TextField select label="Tournament" size="small" value={meta.tournamentId ?? ''} onChange={e => onChange({ tournamentId: e.target.value ? +e.target.value : undefined })}>
        <MenuItem value=""><em>— None —</em></MenuItem>
        {tournaments.map(t => <MenuItem key={t.tournamentId} value={t.tournamentId}>{t.name}</MenuItem>)}
      </TextField>
      <TextField select label="Ground / Field" size="small" value={meta.fieldId ?? ''} onChange={e => onChange({ fieldId: e.target.value ? +e.target.value : undefined })}>
        <MenuItem value=""><em>— None —</em></MenuItem>
        {fields.map(f => <MenuItem key={f.fieldId} value={f.fieldId}>{f.name}</MenuItem>)}
      </TextField>
      <TextField select label="Club" size="small" value={meta.clubId ?? ''} onChange={e => onChange({ clubId: e.target.value ? +e.target.value : undefined })}>
        <MenuItem value=""><em>— None —</em></MenuItem>
        {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
      </TextField>
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
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <TextField select size="small" label="Type" sx={{ minWidth: 120 }} value={filters.mediaType ?? ''}
                onChange={e => setFilter({ mediaType: e.target.value as MediaFileType || undefined })}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="IMAGE">Images</MenuItem>
                <MenuItem value="VIDEO">Videos</MenuItem>
              </TextField>
              <TextField select size="small" label="Player" sx={{ minWidth: 180 }} value={filters.playerId ?? ''}
                onChange={e => setFilter({ playerId: e.target.value ? +e.target.value : undefined })}>
                <MenuItem value="">All players</MenuItem>
                {players.map(p => <MenuItem key={p.playerId} value={p.playerId}>{p.name} {p.surname}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Team" sx={{ minWidth: 180 }} value={filters.teamId ?? ''}
                onChange={e => setFilter({ teamId: e.target.value ? +e.target.value : undefined })}>
                <MenuItem value="">All teams</MenuItem>
                {teams.map(t => <MenuItem key={t.teamId} value={t.teamId}>{t.teamName}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Match" sx={{ minWidth: 220 }} value={filters.matchId ?? ''}
                onChange={e => setFilter({ matchId: e.target.value ? +e.target.value : undefined })}>
                <MenuItem value="">All matches</MenuItem>
                {matches.map(m => <MenuItem key={m.matchId} value={m.matchId}>{matchLabel(m)}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Tournament" sx={{ minWidth: 180 }} value={filters.tournamentId ?? ''}
                onChange={e => setFilter({ tournamentId: e.target.value ? +e.target.value : undefined })}>
                <MenuItem value="">All tournaments</MenuItem>
                {tournaments.map(t => <MenuItem key={t.tournamentId} value={t.tournamentId}>{t.name}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Ground" sx={{ minWidth: 160 }} value={filters.fieldId ?? ''}
                onChange={e => setFilter({ fieldId: e.target.value ? +e.target.value : undefined })}>
                <MenuItem value="">All grounds</MenuItem>
                {fields.map(f => <MenuItem key={f.fieldId} value={f.fieldId}>{f.name}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Club" sx={{ minWidth: 160 }} value={filters.clubId ?? ''}
                onChange={e => setFilter({ clubId: e.target.value ? +e.target.value : undefined })}>
                <MenuItem value="">All clubs</MenuItem>
                {clubs.map(c => <MenuItem key={c.clubId} value={c.clubId}>{c.name}</MenuItem>)}
              </TextField>
            </Box>
            <Button variant="contained" size="small" onClick={applyFilters}>Apply Filters</Button>
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
              {item.uploadedAt && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {new Date(item.uploadedAt).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          </Paper>
        ))}
      </Box>

      {/* ── Upload dialog ── */}
      <Dialog open={uploadOpen} onClose={() => { setUploadOpen(false); resetUploadDialog(); }} maxWidth="md" fullWidth>
        <DialogTitle>Upload Media</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {uploadError && <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>}

          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
            {/* Left: drop zone + preview */}
            <Box sx={{ flex: 1 }}>
              {/* Drop zone */}
              <Box
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
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
                  minHeight: 140,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                <input
                  ref={fileInput}
                  type="file"
                  hidden
                  accept="image/*,video/*"
                  onChange={onFileInput}
                />
                {!selectedFile ? (
                  <>
                    <CloudUpload sx={{ fontSize: 40, color: 'text.secondary' }} />
                    <Typography color="text.secondary">
                      Drag & drop a file here, or <Typography component="span" color="primary" fontWeight={600}>browse</Typography>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Supported: JPG, PNG, GIF, WebP, MP4, MOV, WebM, AVI
                    </Typography>
                  </>
                ) : (
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                      <IconButton size="small" onClick={e => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null); }}>
                        <Close fontSize="small" />
                      </IconButton>
                    </Box>
                    {previewUrl ? (
                      <Box component="img" src={previewUrl} alt="preview"
                        sx={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', display: 'block', mx: 'auto', borderRadius: 1 }} />
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <PlayCircle sx={{ fontSize: 48, color: 'primary.main' }} />
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 240 }}>
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
    </Box>
  );
};
