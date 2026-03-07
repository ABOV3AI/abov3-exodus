import * as React from 'react';
import { Box, Button, IconButton, List, ListItem, ListItemButton, Typography, Sheet, ButtonGroup, Modal, ModalDialog, ModalClose, Input, FormControl, FormLabel, FormHelperText } from '@mui/joy';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CodeIcon from '@mui/icons-material/Code';
import ChatIcon from '@mui/icons-material/Chat';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';

import { useProjectsStore, type Project } from './store-projects';
import { ProjectFileTree, type FileEntry } from './components/ProjectFileTree';
import { FileEditor } from './components/FileEditor';


/**
 * Projects Sidebar Component
 * Allows users to add/remove local project directories and select active project
 */
export function ProjectsSidebar() {
  const {
    projects,
    activeProjectId,
    mode,
    addProject,
    removeProject,
    updateProject,
    setActiveProject,
    getProjectHandle,
    setProjectHandle,
    setMode,
    getActiveProject,
    triggerFileTreeRefresh,
  } = useProjectsStore();

  const [selectedFile, setSelectedFile] = React.useState<FileEntry | null>(null);
  const [fileTreeWidth, setFileTreeWidth] = React.useState(70); // percentage
  const [isResizing, setIsResizing] = React.useState(false);
  const [editingFile, setEditingFile] = React.useState<FileEntry | null>(null);

  // Path configuration modal state
  const [configProject, setConfigProject] = React.useState<Project | null>(null);
  const [configFullPath, setConfigFullPath] = React.useState('');

  const activeProject = getActiveProject();
  const isReadOnly = mode === 'research'; // Research mode is read-only

  // Refresh file tree when window regains focus (to catch external changes)
  React.useEffect(() => {
    const handleFocus = () => {
      if (activeProject?.handle) {
        triggerFileTreeRefresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeProject?.handle, triggerFileTreeRefresh]);

  // Handle edit file - opens file in preview panel and triggers edit mode
  const handleEditFile = React.useCallback((file: FileEntry) => {
    setSelectedFile(file);
    setEditingFile(file);
  }, []);

  // Handle mouse resize
  const handleMouseDown = React.useCallback(() => {
    setIsResizing(true);
  }, []);

  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const sidebar = document.getElementById('projects-file-container');
      if (!sidebar) return;

      const rect = sidebar.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;

      // Constrain between 30% and 85%
      if (newWidth >= 30 && newWidth <= 85) {
        setFileTreeWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // State for new project path prompt
  const [newProjectHandle, setNewProjectHandle] = React.useState<FileSystemDirectoryHandle | null>(null);
  const [newProjectPath, setNewProjectPath] = React.useState('');

  const handleAddProject = async () => {
    try {
      // Request directory access using File System Access API
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });

      // Store the handle
      setNewProjectHandle(dirHandle);

      // Try to auto-detect the full path via Eden MCP server
      // Eden runs on port 3100 by default (see abov3-eden/config.json)
      try {
        const response = await fetch('http://localhost:3100/api/find-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderName: dirHandle.name }),
        });
        const data = await response.json();
        if (data.success && data.path) {
          setNewProjectPath(data.path);
        } else {
          setNewProjectPath(''); // Let user enter manually
        }
      } catch {
        // Eden not available, let user enter manually
        setNewProjectPath('');
      }
    } catch (error: any) {
      // User cancelled or browser doesn't support File System Access API
      if (error.name !== 'AbortError') {
        console.error('Failed to add project:', error);
        alert(`Failed to add project: ${error.message}`);
      }
    }
  };

  // Complete adding the project with the full path
  const handleConfirmNewProject = async () => {
    if (!newProjectHandle) return;

    await addProject(newProjectHandle);

    // If user provided a path, save it
    if (newProjectPath.trim()) {
      // Get the newly added project (it's the last one)
      const projects = useProjectsStore.getState().projects;
      const newProject = projects[projects.length - 1];
      if (newProject) {
        updateProject(newProject.id, { fullPath: newProjectPath.trim() });
      }
    }

    setNewProjectHandle(null);
    setNewProjectPath('');
  };

  const handleRequestPermission = async (projectId: string, projectName: string) => {
    try {
      // Request directory access to remap the project folder
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });

      // Verify the selected folder matches the project name
      if (dirHandle.name !== projectName) {
        alert(`Wrong folder selected. Please select the folder named "${projectName}"`);
        return;
      }

      // Store the new handle
      setProjectHandle(projectId, dirHandle);

      // If in coding mode, activate this project
      if (mode === 'coding') {
        setActiveProject(projectId);
      }
    } catch (error: any) {
      // User cancelled
      if (error.name !== 'AbortError') {
        console.error('Failed to request permissions:', error);
        alert(`Failed to access folder: ${error.message}`);
      }
    }
  };

  const handleRemoveProject = (id: string) => {
    if (confirm('Remove this project from the list?')) {
      removeProject(id);
    }
  };

  const handleSelectProject = (id: string) => {
    setActiveProject(id);
  };

  // Open path configuration modal with auto-detection
  const handleConfigureProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger project selection
    setConfigProject(project);

    // If already has a full path, use it
    if (project.fullPath) {
      setConfigFullPath(project.fullPath);
      return;
    }

    // Try to auto-detect via Eden
    try {
      const response = await fetch('http://localhost:3100/api/find-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName: project.name }),
      });
      const data = await response.json();
      if (data.success && data.path) {
        setConfigFullPath(data.path);
      } else {
        setConfigFullPath('');
      }
    } catch {
      setConfigFullPath('');
    }
  };

  // Save the configured full path
  const handleSaveFullPath = () => {
    if (configProject) {
      updateProject(configProject.id, { fullPath: configFullPath.trim() || undefined });
      setConfigProject(null);
      setConfigFullPath('');
    }
  };

  // Check if File System Access API is supported
  const isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  if (!isSupported) {
    return (
      <Sheet sx={{ p: 2, height: '100%' }}>
        <Typography level="body-sm" color="warning">
          File System Access API is not supported in this browser.
          Please use a modern browser like Chrome, Edge, or Opera.
        </Typography>
      </Sheet>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2, gap: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography level="h4" startDecorator={<FolderOpenIcon />}>
          Projects
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Mode Toggle */}
          <ButtonGroup size="sm" variant="outlined">
            <IconButton
              variant={mode === 'chat' ? 'solid' : 'outlined'}
              color={mode === 'chat' ? 'success' : 'neutral'}
              onClick={() => setMode('chat')}
              title="Chat Mode - No file access"
            >
              <ChatIcon />
            </IconButton>
            <IconButton
              variant={mode === 'research' ? 'solid' : 'outlined'}
              color={mode === 'research' ? 'warning' : 'neutral'}
              onClick={() => setMode('research')}
              title="Research Mode - Read-only project access"
            >
              <MenuBookIcon />
            </IconButton>
            <IconButton
              variant={mode === 'coding' ? 'solid' : 'outlined'}
              color={mode === 'coding' ? 'primary' : 'neutral'}
              onClick={() => setMode('coding')}
              title="Coding Mode - Full file operations enabled"
            >
              <CodeIcon />
            </IconButton>
          </ButtonGroup>

          {/* Add Project Button */}
          <Button
            size="sm"
            startDecorator={<AddIcon />}
            onClick={handleAddProject}
          >
            Add
          </Button>
        </Box>
      </Box>

      {/* Projects List and File Tree */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {projects.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography level="body-sm" color="neutral">
              No projects added yet.
              <br />
              Click &quot;Add&quot; to select a local folder.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Projects List */}
            <List>
              {projects.map((project) => {
                const isActive = project.id === activeProjectId;
                const hasHandle = !!getProjectHandle(project.id);

                return (
                  <ListItem
                    key={project.id}
                    endAction={
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="sm"
                          color="neutral"
                          onClick={(e) => handleConfigureProject(project, e)}
                          title="Configure project path for AI tools"
                        >
                          <SettingsIcon />
                        </IconButton>
                        <IconButton
                          size="sm"
                          color="danger"
                          onClick={() => handleRemoveProject(project.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemButton
                      selected={isActive}
                      onClick={() => {
                        // If no handle, request permission first
                        if (!hasHandle) {
                          handleRequestPermission(project.id, project.name);
                        }
                        // If has handle and in coding/research mode, select it
                        else if (mode === 'coding' || mode === 'research') {
                          handleSelectProject(project.id);
                        }
                        // If in chat mode, inform user
                        else {
                          alert('Switch to Coding or Research mode to activate projects');
                        }
                      }}
                      sx={{
                        borderRadius: 'sm',
                        alignItems: 'flex-start',
                        ...(isActive && {
                          bgcolor: 'primary.softBg',
                          '&:hover': { bgcolor: 'primary.softHoverBg' },
                        }),
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FolderOpenIcon fontSize="small" />
                          <Typography level="title-sm">{project.name}</Typography>
                          {isActive && <CheckCircleIcon fontSize="small" color="success" />}
                        </Box>
                        <Typography level="body-xs" sx={{ pl: 3, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {project.fullPath || project.path}
                        </Typography>
                        {!hasHandle && (
                          <Typography level="body-xs" color="warning" sx={{ pl: 3 }}>
                            ⚠️ Permission needed - click to select folder again
                          </Typography>
                        )}
                      </Box>
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>

            {/* File Tree for Active Project */}
            {activeProject && activeProject.handle && (
              <Box id="projects-file-container" sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                {/* File Tree Header with Refresh Button */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, px: 0.5 }}>
                  <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                    Files
                  </Typography>
                  <IconButton
                    size="sm"
                    variant="plain"
                    color="neutral"
                    onClick={() => triggerFileTreeRefresh()}
                    title="Refresh file tree"
                    sx={{ minWidth: 24, minHeight: 24 }}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Box>
                <ProjectFileTree
                  projectHandle={activeProject.handle}
                  onFileClick={undefined}
                  onFileEdit={!isReadOnly ? handleEditFile : undefined}
                  readOnly={isReadOnly}
                />
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Info */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography level="body-xs" color="neutral">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </Typography>
        <Typography
          level="body-xs"
          color={mode === 'chat' ? 'success' : mode === 'research' ? 'warning' : 'primary'}
          sx={{ fontWeight: 'md' }}
        >
          {mode === 'chat' ? (
            <>💬 Chat Mode - No file access</>
          ) : mode === 'research' ? (
            activeProjectId ? (
              <>📖 Research Mode - {projects.find(p => p.id === activeProjectId)?.name || 'Project'} (read-only)</>
            ) : (
              <>📖 Research Mode - No project selected</>
            )
          ) : (
            activeProjectId ? (
              <>💻 Coding Mode - {projects.find(p => p.id === activeProjectId)?.name || 'Project'} active</>
            ) : (
              <>💻 Coding Mode - No project selected</>
            )
          )}
        </Typography>
      </Box>

      {/* File Editor Modal */}
      <Modal
        open={!!selectedFile}
        onClose={() => {
          setSelectedFile(null);
          setEditingFile(null);
        }}
      >
        <ModalDialog
          sx={{
            width: '90vw',
            maxWidth: '1200px',
            height: '80vh',
            p: 0,
            overflow: 'hidden',
          }}
        >
          {selectedFile && (
            <FileEditor
              file={selectedFile}
              onClose={() => {
                setSelectedFile(null);
                setEditingFile(null);
              }}
            />
          )}
        </ModalDialog>
      </Modal>

      {/* Project Path Configuration Modal */}
      <Modal
        open={!!configProject}
        onClose={() => {
          setConfigProject(null);
          setConfigFullPath('');
        }}
      >
        <ModalDialog sx={{ maxWidth: 500 }}>
          <ModalClose />
          <Typography level="h4" startDecorator={<SettingsIcon />}>
            Configure Project Path
          </Typography>
          <Typography level="body-sm" sx={{ mt: 1, mb: 2 }}>
            Set the full filesystem path for <strong>{configProject?.name}</strong>.
            This is needed for AI tools to work correctly with your files.
          </Typography>

          <FormControl>
            <FormLabel>Full Path</FormLabel>
            <Input
              value={configFullPath}
              onChange={(e) => setConfigFullPath(e.target.value)}
              placeholder="C:\Users\me\projects\my-app or /home/me/projects/my-app"
              sx={{ fontFamily: 'monospace' }}
            />
            <FormHelperText>
              Enter the absolute path to this project folder on your computer.
              <br />
              Windows example: <code>C:\Users\YourName\Projects\{configProject?.name}</code>
              <br />
              Mac/Linux example: <code>/Users/yourname/projects/{configProject?.name}</code>
            </FormHelperText>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="plain"
              color="neutral"
              onClick={() => {
                setConfigProject(null);
                setConfigFullPath('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveFullPath}>
              Save
            </Button>
          </Box>
        </ModalDialog>
      </Modal>

      {/* New Project Path Prompt Modal */}
      <Modal
        open={!!newProjectHandle}
        onClose={() => {
          setNewProjectHandle(null);
          setNewProjectPath('');
        }}
      >
        <ModalDialog sx={{ maxWidth: 550 }}>
          <ModalClose />
          <Typography level="h4" startDecorator={<FolderOpenIcon />}>
            Add Project: {newProjectHandle?.name}
          </Typography>
          <Typography level="body-sm" sx={{ mt: 1, mb: 2 }}>
            You selected the folder <strong>{newProjectHandle?.name}</strong>.
            <br /><br />
            Please enter the <strong>full path</strong> to this folder so AI tools can execute commands in the correct location.
          </Typography>

          <FormControl>
            <FormLabel>Full Path to Folder</FormLabel>
            <Input
              value={newProjectPath}
              onChange={(e) => setNewProjectPath(e.target.value)}
              placeholder={`C:\\Users\\YourName\\...\\${newProjectHandle?.name}`}
              sx={{ fontFamily: 'monospace' }}
              autoFocus
            />
            <FormHelperText>
              Copy the path from your file explorer&apos;s address bar.
              <br />
              <strong>Tip:</strong> In Windows Explorer, click the address bar to see the full path.
            </FormHelperText>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="plain"
              color="neutral"
              onClick={() => {
                setNewProjectHandle(null);
                setNewProjectPath('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmNewProject}
              disabled={!newProjectPath.trim()}
            >
              Add Project
            </Button>
          </Box>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
