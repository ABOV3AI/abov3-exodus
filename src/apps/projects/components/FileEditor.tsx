import * as React from 'react';
import { Box, Button, Typography, CircularProgress, Snackbar } from '@mui/joy';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { xml } from '@codemirror/lang-xml';
import { writeFile } from '~/modules/fileops/fileops.ui-operations';
import type { FileEntry } from './ProjectFileTree';

export interface FileEditorProps {
  file: FileEntry;
  onClose: () => void;
}

/**
 * Get CodeMirror language extension based on file extension
 */
function getLanguageExtension(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return javascript({ jsx: true, typescript: ext === 'ts' || ext === 'tsx' });
    case 'html':
    case 'htm':
      return html();
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return css();
    case 'json':
      return json();
    case 'md':
    case 'markdown':
      return markdown();
    case 'py':
      return python();
    case 'xml':
    case 'svg':
      return xml();
    default:
      return undefined;
  }
}

/**
 * File editor component with CodeMirror
 * Supports syntax highlighting, save/cancel, and dirty state tracking
 */
export function FileEditor({ file, onClose }: FileEditorProps) {
  const [content, setContent] = React.useState<string>('');
  const [originalContent, setOriginalContent] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notification, setNotification] = React.useState<{ message: string; color: 'success' | 'danger' } | null>(null);
  const [isDirty, setIsDirty] = React.useState(false);

  const languageExtension = React.useMemo(() => getLanguageExtension(file.name), [file.name]);

  // Load file content
  React.useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      setError(null);

      try {
        const fileHandle = file.handle as FileSystemFileHandle;
        const fileObj = await fileHandle.getFile();

        // Check file size (10MB limit for editor)
        if (fileObj.size > 10 * 1024 * 1024) {
          setError('File too large for editor (max 10MB)');
          setLoading(false);
          return;
        }

        const text = await fileObj.text();
        setContent(text);
        setOriginalContent(text);
        setIsDirty(false);
      } catch (err) {
        console.error('Failed to load file:', err);
        setError('Failed to load file content');
      } finally {
        setLoading(false);
      }
    };

    void loadContent();
  }, [file]);

  // Track dirty state
  React.useEffect(() => {
    setIsDirty(content !== originalContent);
  }, [content, originalContent]);

  // Warn on close with unsaved changes
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const fileHandle = file.handle as FileSystemFileHandle;
      const result = await writeFile(fileHandle, content);

      if (result.success) {
        setOriginalContent(content);
        setIsDirty(false);
        setNotification({ message: 'File saved successfully', color: 'success' });
      } else {
        setError(result.error || 'Failed to save file');
        setNotification({ message: result.error || 'Failed to save file', color: 'danger' });
      }
    } catch (err) {
      console.error('Failed to save file:', err);
      setError('Failed to save file');
      setNotification({ message: 'Failed to save file', color: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+S / Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content]); // Re-attach when content changes

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.surface',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography level="title-sm">
            {file.name}
            {isDirty && ' *'}
          </Typography>
          {isDirty && (
            <Typography level="body-xs" sx={{ color: 'warning.500' }}>
              (unsaved changes)
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="sm"
            variant="solid"
            color="primary"
            startDecorator={saving ? <CircularProgress size="sm" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={!isDirty || saving || loading}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="outlined"
            color="neutral"
            startDecorator={<CloseIcon />}
            onClick={handleClose}
          >
            Close
          </Button>
        </Box>
      </Box>

      {/* Editor or loading/error state */}
      <Box sx={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 3,
            }}
          >
            <Typography color="danger">{error}</Typography>
          </Box>
        ) : (
          <CodeMirror
            value={content}
            onChange={(value) => setContent(value)}
            extensions={languageExtension ? [languageExtension] : []}
            height="100%"
            style={{ height: '100%', fontSize: '14px' }}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              highlightSpecialChars: true,
              foldGutter: true,
              drawSelection: true,
              dropCursor: true,
              allowMultipleSelections: true,
              indentOnInput: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              rectangularSelection: true,
              crosshairCursor: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
              closeBracketsKeymap: true,
              searchKeymap: true,
              foldKeymap: true,
              completionKeymap: true,
              lintKeymap: true,
            }}
          />
        )}
      </Box>

      {/* Notification */}
      {notification && (
        <Snackbar
          open={Boolean(notification)}
          autoHideDuration={3000}
          onClose={() => setNotification(null)}
          color={notification.color}
          variant="solid"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          {notification.message}
        </Snackbar>
      )}
    </Box>
  );
}
