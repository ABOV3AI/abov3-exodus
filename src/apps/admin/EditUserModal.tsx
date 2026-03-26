/**
 * Edit User Modal
 *
 * Admin UI for editing user details: name, email, password, and role.
 */

import * as React from 'react';

import {
  Box,
  Button,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalClose,
  ModalDialog,
  Option,
  Select,
  Stack,
  Typography,
} from '@mui/joy';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';

import { apiQueryCloud } from '~/common/util/trpc.client';


type UserRole = 'USER' | 'DEVELOPER' | 'ADMIN' | 'MASTER';

const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'User',
  DEVELOPER: 'Developer',
  ADMIN: 'Admin',
  MASTER: 'Master Developer',
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  USER: 'Regular user with limited feature access',
  DEVELOPER: 'Developer with specific feature access',
  ADMIN: 'Full admin access to all features',
  MASTER: 'Master developer - highest privileges',
};


interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    isMasterDev: boolean;
  } | null;
  currentUserIsMasterDev: boolean;
}


export function EditUserModal(props: EditUserModalProps) {
  const { open, onClose, onUpdated, user, currentUserIsMasterDev } = props;

  // Form state
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [role, setRole] = React.useState<UserRole>('USER');
  const [error, setError] = React.useState<string | null>(null);
  const [showPasswordReset, setShowPasswordReset] = React.useState(false);

  // Sync form state with user prop
  React.useEffect(() => {
    if (user) {
      setEmail(user.email);
      setName(user.name || '');
      setRole(user.role as UserRole);
      setNewPassword('');
      setShowPasswordReset(false);
      setError(null);
    }
  }, [user]);

  // Mutations
  const updateUserMutation = apiQueryCloud.admin.updateUser.useMutation({
    onSuccess: () => {
      onUpdated();
    },
    onError: (err) => {
      setError(err.message || 'Failed to update user');
    },
  });

  const updateRoleMutation = apiQueryCloud.admin.updateUserRole.useMutation({
    onSuccess: () => {
      onUpdated();
    },
    onError: (err) => {
      setError(err.message || 'Failed to update role');
    },
  });

  // Handlers
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      setError(null);

      const hasChanges =
        email !== user.email ||
        name !== (user.name || '') ||
        newPassword.length > 0 ||
        role !== user.role;

      if (!hasChanges) {
        onClose();
        return;
      }

      try {
        // Update user details if changed
        if (email !== user.email || name !== (user.name || '') || newPassword.length > 0) {
          await updateUserMutation.mutateAsync({
            userId: user.id,
            email: email !== user.email ? email : undefined,
            name: name !== (user.name || '') ? name : undefined,
            newPassword: newPassword.length >= 8 ? newPassword : undefined,
          });
        }

        // Update role if changed
        if (role !== user.role) {
          await updateRoleMutation.mutateAsync({
            userId: user.id,
            role,
          });
        }

        onUpdated();
      } catch {
        // Errors handled by mutation callbacks
      }
    },
    [user, email, name, newPassword, role, updateUserMutation, updateRoleMutation, onUpdated, onClose]
  );

  const handleClose = React.useCallback(() => {
    if (!updateUserMutation.isPending && !updateRoleMutation.isPending) {
      setError(null);
      setShowPasswordReset(false);
      onClose();
    }
  }, [updateUserMutation.isPending, updateRoleMutation.isPending, onClose]);

  const isLoading = updateUserMutation.isPending || updateRoleMutation.isPending;
  const isMasterTarget = user?.isMasterDev;
  const canModify = !isMasterTarget || currentUserIsMasterDev;

  if (!user) return null;

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalDialog
        variant="outlined"
        sx={{ minWidth: 420, maxWidth: 500 }}
      >
        <ModalClose disabled={isLoading} />
        <DialogTitle>
          <EditIcon sx={{ mr: 1 }} />
          Edit User
        </DialogTitle>

        <DialogContent>
          <Typography level="body-sm" color="neutral" sx={{ mb: 2 }}>
            {isMasterTarget && !currentUserIsMasterDev
              ? 'You cannot modify Master Developer accounts.'
              : 'Update user details, role, or reset their password.'}
          </Typography>

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {/* Email */}
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || !canModify}
                />
              </FormControl>

              {/* Name */}
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  placeholder="Display name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading || !canModify}
                />
              </FormControl>

              {/* Role */}
              <FormControl>
                <FormLabel>Role</FormLabel>
                <Select
                  value={role}
                  onChange={(_, value) => value && setRole(value)}
                  disabled={isLoading || !canModify || isMasterTarget}
                >
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                    <Option
                      key={r}
                      value={r}
                      disabled={r === 'MASTER' && !currentUserIsMasterDev}
                    >
                      {ROLE_LABELS[r]}
                    </Option>
                  ))}
                </Select>
                <FormHelperText>{ROLE_DESCRIPTIONS[role]}</FormHelperText>
              </FormControl>

              <Divider />

              {/* Password Reset */}
              {!showPasswordReset ? (
                <Button
                  variant="outlined"
                  color="neutral"
                  startDecorator={<LockResetIcon />}
                  onClick={() => setShowPasswordReset(true)}
                  disabled={isLoading || !canModify}
                >
                  Reset Password
                </Button>
              ) : (
                <FormControl>
                  <FormLabel>New Password</FormLabel>
                  <Input
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                  />
                  <FormHelperText>
                    Leave empty to keep current password. Minimum 8 characters.
                  </FormHelperText>
                </FormControl>
              )}

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
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="solid"
                  color="primary"
                  loading={isLoading}
                  disabled={!canModify}
                  startDecorator={<EditIcon />}
                >
                  Save Changes
                </Button>
              </Box>
            </Stack>
          </form>
        </DialogContent>
      </ModalDialog>
    </Modal>
  );
}
