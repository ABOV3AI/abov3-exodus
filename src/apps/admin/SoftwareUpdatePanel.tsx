/**
 * Software Update Panel
 *
 * Admin UI for uploading and managing software updates.
 * Only visible to Master Developers.
 */

import * as React from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Sheet,
  Table,
  Tooltip,
  Typography,
} from '@mui/joy';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import InfoIcon from '@mui/icons-material/Info';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestoreIcon from '@mui/icons-material/Restore';
import WarningIcon from '@mui/icons-material/Warning';

import { apiQueryCloud } from '~/common/util/trpc.client';


interface UpdateRecord {
  id: string;
  version: string;
  filename: string;
  checksum: string;
  size: number;
  status: string;
  uploadedBy: string;
  appliedAt: Date | null;
  rollbackAt: Date | null;
  error: string | null;
  backupPath: string | null;
  createdAt: Date;
}

interface BackupRecord {
  name: string;
  path: string;
  version: string;
  timestamp: string;
}


export function SoftwareUpdatePanel() {
  // State
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Queries
  const statusQuery = apiQueryCloud.admin.getUpdateStatus.useQuery(undefined, {
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const rollbackMutation = apiQueryCloud.admin.rollbackUpdate.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
      setUploadSuccess('Rollback initiated. Application will restart.');
    },
    onError: (error) => {
      setUploadError(error.message);
    },
  });

  const deleteBackupMutation = apiQueryCloud.admin.deleteUpdateBackup.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
    },
    onError: (error) => {
      setUploadError(error.message);
    },
  });

  // Handlers
  const handleFileSelect = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.zip')) {
      setUploadError('Please select a .zip file');
      return;
    }

    // Start upload
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/update/apply', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadSuccess(`Update to v${result.newVersion} applied successfully. Application will restart.`);
      statusQuery.refetch();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [statusQuery]);

  const handleRollback = React.useCallback((backupPath: string) => {
    if (!confirm('Are you sure you want to rollback to this version? The application will restart.')) {
      return;
    }
    rollbackMutation.mutate({ backupPath });
  }, [rollbackMutation]);

  const handleDeleteBackup = React.useCallback((backupPath: string) => {
    if (!confirm('Are you sure you want to delete this backup? This cannot be undone.')) {
      return;
    }
    deleteBackupMutation.mutate({ backupPath });
  }, [deleteBackupMutation]);

  // Format file size
  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  // Format date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  // Status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'danger';
      case 'ROLLED_BACK':
        return 'warning';
      case 'PENDING':
        return 'neutral';
      default:
        return 'primary';
    }
  };

  // Data
  const systemInfo = statusQuery.data;
  const updates = (systemInfo?.updates ?? []) as UpdateRecord[];
  const backups = (systemInfo?.backups ?? []) as BackupRecord[];
  const isLoading = statusQuery.isLoading || uploading || rollbackMutation.isPending || deleteBackupMutation.isPending;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography level="title-lg">Software Updates</Typography>
        <Box sx={{ flex: 1 }} />
        <IconButton variant="outlined" onClick={() => statusQuery.refetch()} disabled={isLoading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Alerts */}
      {uploadError && (
        <Alert
          color="danger"
          startDecorator={<WarningIcon />}
          endDecorator={
            <IconButton size="sm" variant="plain" color="danger" onClick={() => setUploadError(null)}>
              <CloseIcon />
            </IconButton>
          }
        >
          {uploadError}
        </Alert>
      )}
      {uploadSuccess && (
        <Alert
          color="success"
          endDecorator={
            <IconButton size="sm" variant="plain" color="success" onClick={() => setUploadSuccess(null)}>
              <CloseIcon />
            </IconButton>
          }
        >
          {uploadSuccess}
        </Alert>
      )}

      {/* System Info */}
      {systemInfo && (
        <Card variant="soft" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography level="body-xs" color="neutral">Current Version</Typography>
              <Typography level="title-md">{systemInfo.currentVersion}</Typography>
            </Box>
            <Box>
              <Typography level="body-xs" color="neutral">Node.js</Typography>
              <Typography level="body-sm">{systemInfo.nodeVersion}</Typography>
            </Box>
            <Box>
              <Typography level="body-xs" color="neutral">Platform</Typography>
              <Typography level="body-sm">{systemInfo.platform}</Typography>
            </Box>
          </Box>
        </Card>
      )}

      {/* Upload Section */}
      <Card variant="outlined" sx={{ p: 3 }}>
        <Typography level="title-md" sx={{ mb: 2 }}>Upload Update Package</Typography>

        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="update-file-input"
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            component="label"
            htmlFor="update-file-input"
            variant="solid"
            color="primary"
            startDecorator={<CloudUploadIcon />}
            disabled={isLoading}
            loading={uploading}
          >
            Select Update Zip
          </Button>
          <Typography level="body-sm" color="neutral">
            Upload a .zip file containing the new version
          </Typography>
        </Box>

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography level="body-xs" color="neutral" sx={{ mt: 1 }}>
              Uploading and applying update...
            </Typography>
          </Box>
        )}

        <Alert variant="soft" color="warning" sx={{ mt: 2 }} startDecorator={<InfoIcon />}>
          <Typography level="body-sm">
            Warning: Applying an update will restart the application. A backup will be created automatically.
          </Typography>
        </Alert>
      </Card>

      {/* Update History */}
      <Box>
        <Typography level="title-md" startDecorator={<HistoryIcon />} sx={{ mb: 2 }}>
          Update History
        </Typography>

        {updates.length > 0 ? (
          <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto' }}>
            <Table stickyHeader hoverRow>
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Filename</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {updates.map((update) => (
                  <tr key={update.id}>
                    <td>
                      <Typography level="body-sm" fontWeight="lg">
                        {update.version}
                      </Typography>
                    </td>
                    <td>
                      <Typography level="body-xs" color="neutral">
                        {update.filename}
                      </Typography>
                    </td>
                    <td>{formatSize(update.size)}</td>
                    <td>
                      <Chip size="sm" color={getStatusColor(update.status) as any}>
                        {update.status}
                      </Chip>
                    </td>
                    <td>
                      <Typography level="body-xs">
                        {update.appliedAt ? formatDate(update.appliedAt) : '-'}
                      </Typography>
                    </td>
                    <td>
                      {update.backupPath && update.status === 'COMPLETED' && (
                        <Tooltip title="Rollback to this version">
                          <IconButton
                            size="sm"
                            variant="plain"
                            color="warning"
                            onClick={() => handleRollback(update.backupPath!)}
                            disabled={isLoading}
                          >
                            <RestoreIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Sheet>
        ) : (
          <Typography level="body-sm" color="neutral">
            No update history available.
          </Typography>
        )}
      </Box>

      {/* Backups */}
      <Box>
        <Typography level="title-md" startDecorator={<RestoreIcon />} sx={{ mb: 2 }}>
          Available Backups
        </Typography>

        {backups.length > 0 ? (
          <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto' }}>
            <Table stickyHeader hoverRow>
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.path}>
                    <td>
                      <Typography level="body-sm" fontWeight="lg">
                        {backup.version}
                      </Typography>
                    </td>
                    <td>
                      <Typography level="body-xs">
                        {formatDate(backup.timestamp)}
                      </Typography>
                    </td>
                    <td>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Restore this backup">
                          <IconButton
                            size="sm"
                            variant="plain"
                            color="warning"
                            onClick={() => handleRollback(backup.path)}
                            disabled={isLoading}
                          >
                            <RestoreIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete this backup">
                          <IconButton
                            size="sm"
                            variant="plain"
                            color="danger"
                            onClick={() => handleDeleteBackup(backup.path)}
                            disabled={isLoading}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Sheet>
        ) : (
          <Typography level="body-sm" color="neutral">
            No backups available.
          </Typography>
        )}
      </Box>

      {/* Loading indicator */}
      {statusQuery.isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
}
