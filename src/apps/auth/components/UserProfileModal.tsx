/**
 * User Profile Modal
 *
 * Modal for user account settings - change password, email, profile info, avatar.
 */

import * as React from 'react';
import { useSession } from 'next-auth/react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Typography,
} from '@mui/joy';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';

import { GoodModal } from '~/common/components/modals/GoodModal';
import { AvatarCropModal } from './AvatarCropModal';
import { useUserFeatures } from '~/common/stores/store-user-features';

export function UserProfileModal(props: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: session, update: updateSession } = useSession();
  const setAvatar = useUserFeatures((state) => state.setAvatar);

  // Form state
  const [name, setName] = React.useState(session?.user?.name || '');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  // Avatar state
  const [avatarUrl, setAvatarUrl] = React.useState(session?.user?.image || '');
  const [cropModalOpen, setCropModalOpen] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = React.useState(false);
  const [avatarSuccess, setAvatarSuccess] = React.useState(false);
  const [avatarError, setAvatarError] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // UI state
  const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);
  const [profileSuccess, setProfileSuccess] = React.useState(false);
  const [passwordSuccess, setPasswordSuccess] = React.useState(false);
  const [profileError, setProfileError] = React.useState('');
  const [passwordError, setPasswordError] = React.useState('');

  // Reset form when modal opens
  React.useEffect(() => {
    if (props.open) {
      setName(session?.user?.name || '');
      setAvatarUrl(session?.user?.image || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setProfileError('');
      setPasswordError('');
      setAvatarError('');
      setProfileSuccess(false);
      setPasswordSuccess(false);
      setAvatarSuccess(false);
      setSelectedImage(null);
    }
  }, [props.open, session?.user?.name, session?.user?.image]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be less than 5MB');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedImage(result);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Handle cropped avatar save
  const handleAvatarSave = async (croppedImageBase64: string) => {
    setAvatarError('');
    setAvatarSuccess(false);
    setIsUpdatingAvatar(true);

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: croppedImageBase64 }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAvatarError(data.error || 'Failed to update avatar');
      } else {
        setAvatarUrl(croppedImageBase64);
        setAvatar(croppedImageBase64); // Update store for UserMenu display
        setAvatarSuccess(true);
        setCropModalOpen(false);
        // Don't update session with image - it's too large for cookies
        // The image will be fetched from DB when needed
        setTimeout(() => setAvatarSuccess(false), 3000);
      }
    } catch (err) {
      setAvatarError('An error occurred');
    } finally {
      setIsUpdatingAvatar(false);
      setSelectedImage(null);
    }
  };

  // Handle avatar removal
  const handleRemoveAvatar = async () => {
    setAvatarError('');
    setIsUpdatingAvatar(true);

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: null }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAvatarError(data.error || 'Failed to remove avatar');
      } else {
        setAvatarUrl('');
        setAvatar(null); // Update store for UserMenu display
        setAvatarSuccess(true);
        // Don't update session - just update local state
        setTimeout(() => setAvatarSuccess(false), 3000);
      }
    } catch (err) {
      setAvatarError('An error occurred');
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);
    setIsUpdatingProfile(true);

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setProfileError(data.error || 'Failed to update profile');
      } else {
        setProfileSuccess(true);
        await updateSession({ name });
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (err) {
      setProfileError('An error occurred');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || 'Failed to change password');
      } else {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(false), 3000);
      }
    } catch (err) {
      setPasswordError('An error occurred');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <GoodModal
      open={props.open}
      onClose={props.onClose}
      title='Account Settings'
      sx={{
        maxWidth: 500,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Avatar Section */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={avatarUrl || undefined}
              sx={{
                width: 100,
                height: 100,
                fontSize: '2.5rem',
                bgcolor: 'primary.500',
              }}
            >
              {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || '?'}
            </Avatar>

            {/* Camera button overlay */}
            <IconButton
              size="sm"
              variant="solid"
              color="primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUpdatingAvatar}
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                borderRadius: '50%',
                minWidth: 32,
                minHeight: 32,
              }}
            >
              {isUpdatingAvatar ? <CircularProgress size="sm" /> : <CameraAltIcon fontSize="small" />}
            </IconButton>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </Box>

          {avatarError && (
            <Alert color="danger" variant="soft" size="sm">
              {avatarError}
            </Alert>
          )}

          {avatarSuccess && (
            <Alert color="success" variant="soft" size="sm" startDecorator={<CheckIcon />}>
              Avatar updated
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="sm"
              variant="outlined"
              color="neutral"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUpdatingAvatar}
              startDecorator={<CameraAltIcon />}
            >
              Change Avatar
            </Button>
            {avatarUrl && (
              <Button
                size="sm"
                variant="outlined"
                color="danger"
                onClick={handleRemoveAvatar}
                disabled={isUpdatingAvatar}
                startDecorator={<DeleteIcon />}
              >
                Remove
              </Button>
            )}
          </Box>
        </Box>

        <Divider />

        {/* Email (read-only) */}
        <Box>
          <Typography level='title-sm' startDecorator={<EmailIcon />} sx={{ mb: 1 }}>
            Email Address
          </Typography>
          <Input
            value={session?.user?.email || ''}
            disabled
            fullWidth
            sx={{ bgcolor: 'background.level1' }}
          />
          <Typography level='body-xs' sx={{ mt: 0.5, color: 'text.tertiary' }}>
            Contact admin to change email address
          </Typography>
        </Box>

        <Divider />

        {/* Profile Name */}
        <Box component='form' onSubmit={handleUpdateProfile}>
          <Typography level='title-sm' startDecorator={<PersonIcon />} sx={{ mb: 1 }}>
            Display Name
          </Typography>

          {profileError && (
            <Alert color='danger' variant='soft' sx={{ mb: 2 }}>
              {profileError}
            </Alert>
          )}

          {profileSuccess && (
            <Alert color='success' variant='soft' startDecorator={<CheckIcon />} sx={{ mb: 2 }}>
              Profile updated successfully
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Your display name'
              fullWidth
              disabled={isUpdatingProfile}
            />
            <Button
              type='submit'
              variant='solid'
              disabled={isUpdatingProfile || name === session?.user?.name}
              startDecorator={isUpdatingProfile && <CircularProgress size='sm' />}
            >
              Save
            </Button>
          </Box>
        </Box>

        <Divider />

        {/* Change Password */}
        <Box component='form' onSubmit={handleChangePassword}>
          <Typography level='title-sm' startDecorator={<LockIcon />} sx={{ mb: 2 }}>
            Change Password
          </Typography>

          {passwordError && (
            <Alert color='danger' variant='soft' sx={{ mb: 2 }}>
              {passwordError}
            </Alert>
          )}

          {passwordSuccess && (
            <Alert color='success' variant='soft' startDecorator={<CheckIcon />} sx={{ mb: 2 }}>
              Password changed successfully
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl>
              <FormLabel>Current Password</FormLabel>
              <Input
                type='password'
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder='Enter current password'
                disabled={isUpdatingPassword}
                autoComplete='current-password'
              />
            </FormControl>

            <FormControl>
              <FormLabel>New Password</FormLabel>
              <Input
                type='password'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder='Enter new password (min 8 chars)'
                disabled={isUpdatingPassword}
                autoComplete='new-password'
              />
            </FormControl>

            <FormControl>
              <FormLabel>Confirm New Password</FormLabel>
              <Input
                type='password'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder='Confirm new password'
                disabled={isUpdatingPassword}
                autoComplete='new-password'
              />
            </FormControl>

            <Button
              type='submit'
              variant='solid'
              color='primary'
              disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
              startDecorator={isUpdatingPassword && <CircularProgress size='sm' />}
              sx={{ alignSelf: 'flex-end' }}
            >
              Change Password
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Avatar Crop Modal */}
      {selectedImage && (
        <AvatarCropModal
          open={cropModalOpen}
          imageSrc={selectedImage}
          onClose={() => {
            setCropModalOpen(false);
            setSelectedImage(null);
          }}
          onSave={handleAvatarSave}
          isSaving={isUpdatingAvatar}
        />
      )}
    </GoodModal>
  );
}
