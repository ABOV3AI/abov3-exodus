/**
 * Create User Modal
 *
 * Admin UI for creating new users when public signups are disabled.
 * Allows setting initial feature permissions.
 */

import * as React from 'react';

import {
  Box,
  Button,
  Checkbox,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalClose,
  ModalDialog,
  Stack,
  Typography,
} from '@mui/joy';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

import { apiQueryCloud } from '~/common/util/trpc.client';

import type { FeatureFlag } from '~/common/stores/store-user-features';
import { ALL_FEATURE_FLAGS, FEATURE_LABELS, FEATURE_DESCRIPTIONS } from '~/common/stores/store-user-features';


interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}


export function CreateUserModal(props: CreateUserModalProps) {
  const { open, onClose, onCreated } = props;

  // Form state
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [features, setFeatures] = React.useState<FeatureFlag[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  // Mutation
  const createUserMutation = apiQueryCloud.admin.createUser.useMutation({
    onSuccess: () => {
      // Reset form
      setEmail('');
      setPassword('');
      setName('');
      setFeatures([]);
      setError(null);
      onCreated();
    },
    onError: (err) => {
      setError(err.message || 'Failed to create user');
    },
  });

  // Handlers
  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!email || !password) {
        setError('Email and password are required');
        return;
      }

      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }

      createUserMutation.mutate({
        email,
        password,
        name: name || undefined,
        features: features.length > 0 ? features : undefined,
      });
    },
    [email, password, name, features, createUserMutation]
  );

  const handleToggleFeature = React.useCallback((feature: FeatureFlag) => {
    setFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  }, []);

  const handleClose = React.useCallback(() => {
    if (!createUserMutation.isPending) {
      setEmail('');
      setPassword('');
      setName('');
      setFeatures([]);
      setError(null);
      onClose();
    }
  }, [createUserMutation.isPending, onClose]);

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalDialog
        variant="outlined"
        sx={{ minWidth: 400, maxWidth: 500 }}
      >
        <ModalClose disabled={createUserMutation.isPending} />
        <DialogTitle>
          <PersonAddIcon sx={{ mr: 1 }} />
          Create New User
        </DialogTitle>

        <DialogContent>
          <Typography level="body-sm" color="neutral" sx={{ mb: 2 }}>
            Create a new user account. Since public signups are disabled, use this form to add beta
            testers.
          </Typography>

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {/* Email */}
              <FormControl required>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={createUserMutation.isPending}
                />
              </FormControl>

              {/* Password */}
              <FormControl required>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={createUserMutation.isPending}
                />
                <FormHelperText>User can change this after signing in</FormHelperText>
              </FormControl>

              {/* Name */}
              <FormControl>
                <FormLabel>Name (optional)</FormLabel>
                <Input
                  placeholder="Display name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={createUserMutation.isPending}
                />
              </FormControl>

              {/* Feature Access */}
              <FormControl>
                <FormLabel>Initial Feature Access</FormLabel>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                  {ALL_FEATURE_FLAGS.filter((f) => f !== 'ADMIN_PANEL').map((feature) => (
                    <Box
                      key={feature}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                      }}
                    >
                      <Checkbox
                        checked={features.includes(feature)}
                        onChange={() => handleToggleFeature(feature)}
                        disabled={createUserMutation.isPending}
                        sx={{ mt: 0.5 }}
                      />
                      <Box>
                        <Typography level="body-sm" fontWeight="lg">
                          {FEATURE_LABELS[feature]}
                        </Typography>
                        <Typography level="body-xs" color="neutral">
                          {FEATURE_DESCRIPTIONS[feature]}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </FormControl>

              {/* Error */}
              {error && (
                <Typography level="body-sm" color="danger">
                  {error}
                </Typography>
              )}

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="plain"
                  color="neutral"
                  onClick={handleClose}
                  disabled={createUserMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="solid"
                  color="primary"
                  loading={createUserMutation.isPending}
                  startDecorator={<PersonAddIcon />}
                >
                  Create User
                </Button>
              </Box>
            </Stack>
          </form>
        </DialogContent>
      </ModalDialog>
    </Modal>
  );
}
