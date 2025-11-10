import * as React from 'react';
import { Box, Button, IconButton, List, ListItem, ListItemButton, Typography, Sheet, ButtonGroup } from '@mui/joy';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CodeIcon from '@mui/icons-material/Code';
import ChatIcon from '@mui/icons-material/Chat';
import MenuBookIcon from '@mui/icons-material/MenuBook';

import { useProjectsStore } from './store-projects';
import { ProjectFileTree, type FileEntry } from './components/ProjectFileTree';
import { FilePreviewPanel } from './components/FilePreviewPanel';


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
    setActiveProject,
    getProjectHandle,
    setProjectHandle,
    setMode,
    getActiveProject,
  } = useProjectsStore();

  const [selectedFile, setSelectedFile] = React.useState<FileEntry | null>(null);
  const [fileTreeWidth, setFileTreeWidth] = React.useState(70); // percentage
  const [isResizing, setIsResizing] = React.useState(false);
  const [editingFile, setEditingFile] = React.useState<FileEntry | null>(null);

  const activeProject = getActiveProject();
  const isReadOnly = mode === 'research'; // Research mode is read-only

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

  const handleAddProject = async () => {
    try {
      // Request directory access using File System Access API
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });

      await addProject(dirHandle);
    } catch (error: any) {
      // User cancelled or browser doesn't support File System Access API
      if (error.name !== 'AbortError') {
        console.error('Failed to add project:', error);
        alert(`Failed to add project: ${error.message}`);
      }
    }
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

      {/* Projects List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            <List sx={{ flexShrink: 0 }}>
              {projects.map((project) => {
                const isActive = project.id === activeProjectId;
                const hasHandle = !!getProjectHandle(project.id);

                return (
                  <ListItem
                    key={project.id}
                    endAction={
                      <IconButton
                        size="sm"
                        color="danger"
                        onClick={() => handleRemoveProject(project.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
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
                        <Typography level="body-xs" sx={{ pl: 3 }}>
                          {project.path}
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
              <Box
                id="projects-file-container"
                sx={{
                  flexGrow: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  gap: 0,
                  position: 'relative',
                }}
              >
                {/* File Tree */}
                <Box
                  sx={{
                    width: selectedFile ? `${fileTreeWidth}%` : '100%',
                    overflow: 'auto',
                    borderRight: selectedFile ? '1px solid' : 'none',
                    borderColor: 'divider',
                    transition: isResizing ? 'none' : 'width 0.2s ease',
                  }}
                >
                  <ProjectFileTree
                    projectHandle={activeProject.handle}
                    onFileClick={(file) => setSelectedFile(file)}
                    onFileEdit={!isReadOnly ? handleEditFile : undefined}
                    readOnly={isReadOnly}
                  />
                </Box>

                {/* Resize Handle */}
                {selectedFile && (
                  <Box
                    onMouseDown={handleMouseDown}
                    sx={{
                      width: '4px',
                      cursor: 'col-resize',
                      bgcolor: isResizing ? 'primary.500' : 'transparent',
                      '&:hover': {
                        bgcolor: 'primary.300',
                      },
                      transition: 'background-color 0.2s',
                      zIndex: 10,
                      position: 'relative',
                    }}
                  />
                )}

                {/* File Preview Panel */}
                {selectedFile && (
                  <Box
                    sx={{
                      flex: 1,
                      overflow: 'hidden',
                      minWidth: 0, // Allow flex shrinking
                    }}
                  >
                    <FilePreviewPanel
                      file={selectedFile}
                      onClose={() => {
                        setSelectedFile(null);
                        setEditingFile(null);
                      }}
                      readOnly={isReadOnly}
                    />
                  </Box>
                )}
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
    </Box>
  );
}
