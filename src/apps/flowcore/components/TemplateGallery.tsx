import * as React from 'react';
import {
  Modal,
  ModalDialog,
  ModalClose,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  Tabs,
  TabList,
  Tab,
  TabPanel,
} from '@mui/joy';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import AddIcon from '@mui/icons-material/Add';

import { WORKFLOW_TEMPLATES, getAllCategories, getTemplatesByCategory } from '../templates/templates';
import { useFlowCoreStoreEnhanced } from '../store-flowcore-enhanced';
import type { WorkflowTemplate } from '../flowcore.types';

interface TemplateGalleryProps {
  open: boolean;
  onClose: () => void;
}

export function TemplateGallery({ open, onClose }: TemplateGalleryProps) {
  const { importWorkflow, selectWorkflow } = useFlowCoreStoreEnhanced();
  const [selectedTab, setSelectedTab] = React.useState(0);

  const categories = React.useMemo(() => {
    const cats = getAllCategories();
    return ['All', ...cats];
  }, []);

  const displayedTemplates = React.useMemo(() => {
    if (selectedTab === 0) return WORKFLOW_TEMPLATES;
    const category = categories[selectedTab];
    return getTemplatesByCategory(category);
  }, [selectedTab, categories]);

  const handleUseTemplate = (template: WorkflowTemplate) => {
    const workflowJson = JSON.stringify(template.workflow);
    const success = importWorkflow(workflowJson);

    if (success) {
      // Find the newly imported workflow and select it
      // Since importWorkflow generates a new ID, we need to get the latest workflow
      const workflows = useFlowCoreStoreEnhanced.getState().workflows;
      const newWorkflow = workflows[workflows.length - 1];
      if (newWorkflow) {
        selectWorkflow(newWorkflow.id);
      }
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          maxWidth: 900,
          width: '90vw',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ModalClose />
        <Typography level="h4" startDecorator={<AccountTreeRoundedIcon />}>
          Workflow Templates
        </Typography>
        <Typography level="body-sm" sx={{ mb: 2 }}>
          Choose a template to get started quickly
        </Typography>

        <Tabs
          value={selectedTab}
          onChange={(_, value) => setSelectedTab(value as number)}
          sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <TabList>
            {categories.map((category) => (
              <Tab key={category}>{category}</Tab>
            ))}
          </TabList>

          <Box sx={{ flex: 1, overflow: 'auto', mt: 2 }}>
            <TabPanel value={selectedTab} sx={{ p: 0 }}>
              <Grid container spacing={2}>
                {displayedTemplates.map((template) => (
                  <Grid key={template.id} xs={12} sm={6} md={4}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        '&:hover': {
                          borderColor: 'primary.outlinedBorder',
                          boxShadow: 'sm',
                        },
                      }}
                    >
                      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                          <Typography level="title-md">{template.name}</Typography>
                          <Chip size="sm" variant="soft" color="primary">
                            {template.category}
                          </Chip>
                        </Box>

                        <Typography level="body-sm" sx={{ color: 'text.secondary', flex: 1 }}>
                          {template.description}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {template.workflow.tags.map((tag) => (
                            <Chip key={tag} size="sm" variant="outlined">
                              {tag}
                            </Chip>
                          ))}
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                            {template.workflow.nodes.length} nodes
                          </Typography>
                          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                            •
                          </Typography>
                          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                            {template.workflow.trigger.type === 'schedule' ? 'Scheduled' : 'Manual'}
                          </Typography>
                        </Box>

                        <Button
                          size="sm"
                          startDecorator={<AddIcon />}
                          onClick={() => handleUseTemplate(template)}
                          sx={{ mt: 1 }}
                        >
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </TabPanel>
          </Box>
        </Tabs>
      </ModalDialog>
    </Modal>
  );
}
