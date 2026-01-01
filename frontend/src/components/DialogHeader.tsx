import { Box, DialogTitle, IconButton, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { ReactNode } from 'react';

interface DialogHeaderProps {
  title: string | ReactNode;
  onClose: () => void;
}

export default function DialogHeader({ title, onClose }: DialogHeaderProps) {
  return (
    <DialogTitle
      sx={{
        bgcolor: 'grey.100',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 2,
      }}
    >
      {typeof title === 'string' ? (
        <Typography variant="h6">{title}</Typography>
      ) : (
        title
      )}
      <IconButton onClick={onClose} size="small" sx={{ ml: 2 }}>
        <Close />
      </IconButton>
    </DialogTitle>
  );
}
