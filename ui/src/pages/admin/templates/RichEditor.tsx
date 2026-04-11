import React from 'react';
import { Box, Divider, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import {
  FormatBold, FormatItalic, FormatListBulleted, FormatListNumbered,
  InsertPhoto, Undo, Redo,
} from '@mui/icons-material';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';

interface Props {
  initialHtml: string;
  onChange: (html: string) => void;
}

const RichEditor: React.FC<Props> = ({ initialHtml, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage.configure({ inline: false, allowBase64: true }),
    ],
    content: initialHtml,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const addImage = () => {
    const url = window.prompt('Image URL:');
    if (url && editor) editor.chain().focus().setImage({ src: url }).run();
  };

  if (!editor) return null;

  const tb = (active: boolean, fn: () => void, icon: React.ReactNode, title: string) => (
    <Tooltip title={title} key={title}>
      <IconButton
        size="small"
        onClick={fn}
        sx={{
          borderRadius: 1, p: 0.5,
          bgcolor: active ? 'primary.main' : 'transparent',
          color: active ? 'white' : 'inherit',
          '&:hover': { bgcolor: active ? 'primary.dark' : 'action.hover' },
        }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 0.75, mb: 1, display: 'flex', gap: 0.25, flexWrap: 'wrap', alignItems: 'center' }}>
        {tb(editor.isActive('bold'),   () => editor.chain().focus().toggleBold().run(),   <FormatBold fontSize="small" />,   'Bold')}
        {tb(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <FormatItalic fontSize="small" />, 'Italic')}

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {tb(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
          <Typography variant="caption" fontWeight="bold" lineHeight={1}>H1</Typography>, 'Heading 1')}
        {tb(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          <Typography variant="caption" fontWeight="bold" lineHeight={1}>H2</Typography>, 'Heading 2')}
        {tb(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          <Typography variant="caption" fontWeight="bold" lineHeight={1}>H3</Typography>, 'Heading 3')}

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {tb(editor.isActive('bulletList'),  () => editor.chain().focus().toggleBulletList().run(),  <FormatListBulleted fontSize="small" />,  'Bullet List')}
        {tb(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <FormatListNumbered fontSize="small" />, 'Ordered List')}

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Tooltip title="Insert Image">
          <IconButton size="small" onClick={addImage} sx={{ borderRadius: 1, p: 0.5 }}>
            <InsertPhoto fontSize="small" />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Tooltip title="Undo">
          <span>
            <IconButton size="small" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} sx={{ borderRadius: 1, p: 0.5 }}>
              <Undo fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Redo">
          <span>
            <IconButton size="small" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} sx={{ borderRadius: 1, p: 0.5 }}>
              <Redo fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Paper>

      <Box
        onClick={() => editor.commands.focus()}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: 2,
          minHeight: 450,
          bgcolor: 'background.paper',
          cursor: 'text',
          '& .ProseMirror': {
            outline: 'none',
            minHeight: 400,
            fontSize: '0.9rem',
            lineHeight: 1.75,
            '& p':        { my: 0.5 },
            '& h1':       { fontSize: '1.4rem',  fontWeight: 700, mt: 2,   mb: 0.5 },
            '& h2':       { fontSize: '1.15rem', fontWeight: 600, mt: 1.5, mb: 0.5 },
            '& h3':       { fontSize: '1rem',    fontWeight: 600, mt: 1,   mb: 0.5 },
            '& ul, & ol': { pl: 3, my: 0.5 },
            '& img':      { maxWidth: '100%', borderRadius: 1, display: 'block', my: 1 },
            '& strong':   { fontWeight: 700 },
            '& em':       { fontStyle: 'italic' },
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
};

export default RichEditor;
