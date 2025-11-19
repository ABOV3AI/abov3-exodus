import * as React from 'react';
import {
  Modal,
  ModalDialog,
  ModalClose,
  Typography,
  Box,
  Button,
  Textarea,
  Alert,
} from '@mui/joy';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

import { useFlowCoreStoreEnhanced } from '../store-flowcore-enhanced';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  workflowId: string;
}

export function ExportDialog({ open, onClose, workflowId }: ExportDialogProps) {
  const exportWorkflow = useFlowCoreStoreEnhanced((state) => state.exportWorkflow);
  const workflows = useFlowCoreStoreEnhanced((state) => state.workflows);
  const [copied, setCopied] = React.useState(false);

  const workflowJson = React.useMemo(() => {
    return exportWorkflow(workflowId);
  }, [workflowId, exportWorkflow]);

  const workflow = workflows.find((w) => w.id === workflowId);

  const handleCopy = async () => {
    if (workflowJson) {
      await navigator.clipboard.writeText(workflowJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!workflowJson || !workflow) return;

    const blob = new Blob([workflowJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name.replace(/\s+/g, '-').toLowerCase()}.flowcore.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ maxWidth: 600, width: '90vw' }}>
        <ModalClose />
        <Typography level="h4" startDecorator={<DownloadIcon />}>
          Export Workflow
        </Typography>
        <Typography level="body-sm" sx={{ mb: 2 }}>
          Copy or download the workflow JSON
        </Typography>

        {workflowJson ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Textarea
              value={workflowJson}
              readOnly
              minRows={12}
              maxRows={20}
              sx={{ fontFamily: 'monospace', fontSize: 'xs' }}
            />

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startDecorator={copied ? <CheckIcon /> : <ContentCopyIcon />}
                onClick={handleCopy}
                color={copied ? 'success' : 'primary'}
                sx={{ flex: 1 }}
              >
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </Button>
              <Button
                startDecorator={<DownloadIcon />}
                onClick={handleDownload}
                variant="soft"
                sx={{ flex: 1 }}
              >
                Download JSON
              </Button>
            </Box>
          </Box>
        ) : (
          <Alert color="warning">Workflow not found</Alert>
        )}
      </ModalDialog>
    </Modal>
  );
}

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ImportDialog({ open, onClose }: ImportDialogProps) {
  const importWorkflow = useFlowCoreStoreEnhanced((state) => state.importWorkflow);
  const [jsonInput, setJsonInput] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleImport = () => {
    setError(null);
    setSuccess(false);

    if (!jsonInput.trim()) {
      setError('Please paste workflow JSON');
      return;
    }

    try {
      // Validate JSON
      JSON.parse(jsonInput);

      const imported = importWorkflow(jsonInput);
      if (imported) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setJsonInput('');
          setSuccess(false);
        }, 1500);
      } else {
        setError('Failed to import workflow. Please check the format.');
      }
    } catch (err: any) {
      setError(`Invalid JSON: ${err.message}`);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonInput(content);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ maxWidth: 600, width: '90vw' }}>
        <ModalClose />
        <Typography level="h4" startDecorator={<UploadIcon />}>
          Import Workflow
        </Typography>
        <Typography level="body-sm" sx={{ mb: 2 }}>
          Paste workflow JSON or upload a file
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* File Upload */}
          <Button
            component="label"
            variant="outlined"
            startDecorator={<UploadIcon />}
          >
            Upload JSON File
            <input
              type="file"
              accept=".json"
              hidden
              onChange={handleFileUpload}
            />
          </Button>

          <Typography level="body-sm" sx={{ textAlign: 'center' }}>
            or
          </Typography>

          {/* Text Input */}
          <Textarea
            placeholder="Paste workflow JSON here..."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            minRows={12}
            maxRows={20}
            sx={{ fontFamily: 'monospace', fontSize: 'xs' }}
          />

          {/* Error/Success Messages */}
          {error && (
            <Alert color="danger">{error}</Alert>
          )}
          {success && (
            <Alert color="success" startDecorator={<CheckIcon />}>
              Workflow imported successfully!
            </Alert>
          )}

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!jsonInput.trim() || success}
            startDecorator={<UploadIcon />}
          >
            Import Workflow
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  );
}
