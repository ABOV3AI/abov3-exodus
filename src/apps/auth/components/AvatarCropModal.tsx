/**
 * Avatar Crop Modal
 *
 * Allows users to upload, crop, zoom, and position their avatar image.
 * Uses react-easy-crop for circular cropping functionality.
 */

import * as React from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import {
  Box,
  Button,
  CircularProgress,
  Modal,
  ModalClose,
  ModalDialog,
  Slider,
  Typography,
} from '@mui/joy';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

interface AvatarCropModalProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onSave: (croppedImageBase64: string) => void;
  isSaving?: boolean;
}

// Helper function to create a cropped image from canvas
// Output size 64px and quality 0.6 to keep base64 very small (~5-10KB)
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputSize: number = 64
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Set canvas size to desired output size (square for circular avatar)
  canvas.width = outputSize;
  canvas.height = outputSize;

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  // Return as base64 JPEG, low quality for smallest size (~5-10KB)
  return canvas.toDataURL('image/jpeg', 0.6);
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });
}

export function AvatarCropModal(props: AvatarCropModalProps) {
  const { open, imageSrc, onClose, onSave, isSaving } = props;

  // Cropper state
  const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null);

  // Reset state when modal opens with new image
  React.useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open, imageSrc]);

  const onCropComplete = React.useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = React.useCallback(async () => {
    if (!croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, 256);
      onSave(croppedImage);
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  }, [croppedAreaPixels, imageSrc, onSave]);

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          width: '90vw',
          maxWidth: 500,
          p: 0,
          overflow: 'hidden',
        }}
      >
        <ModalClose disabled={isSaving} />

        <Box sx={{ p: 2, pb: 1 }}>
          <Typography level="title-lg">Crop Avatar</Typography>
          <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
            Drag to position, use slider to zoom
          </Typography>
        </Box>

        {/* Cropper container */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: 300,
            bgcolor: 'background.level2',
          }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </Box>

        {/* Zoom controls */}
        <Box sx={{ px: 3, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ZoomOutIcon sx={{ color: 'text.tertiary' }} />
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(_, value) => setZoom(value as number)}
              disabled={isSaving}
              sx={{ flex: 1 }}
            />
            <ZoomInIcon sx={{ color: 'text.tertiary' }} />
          </Box>
        </Box>

        {/* Action buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
            p: 2,
            pt: 0,
          }}
        >
          <Button
            variant="plain"
            color="neutral"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="solid"
            onClick={handleSave}
            disabled={isSaving || !croppedAreaPixels}
            startDecorator={isSaving && <CircularProgress size="sm" />}
          >
            {isSaving ? 'Saving...' : 'Save Avatar'}
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  );
}
