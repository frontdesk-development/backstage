/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
} from '@material-ui/core';
import React, { useCallback, useState } from 'react';

type Props = {
  prLink: string | undefined;
};

export const CreationStatus = ({ prLink }: Props) => {
  const [isOpen, setOpen] = useState(true);

  const renderTitle = () => {
    switch (prLink) {
      case undefined:
        return 'Creating PR...';
      default:
        return 'Successfully created PR';
    }
  };

  const onClose = useCallback(() => {
    if (!prLink) {
      return;
    }
    if (prLink !== '') {
      setOpen(false);
    }
  }, [prLink]);

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth>
      <DialogTitle id="responsive-dialog-title">{renderTitle()}</DialogTitle>
      <DialogContent>
        {prLink === undefined && <LinearProgress />}
      </DialogContent>
      {prLink && (
        <DialogActions>
          <Button variant="contained" color="primary" href={prLink}>
            View on GitHub
          </Button>
        </DialogActions>
      )}
      {prLink === undefined && (
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      )}
    </Dialog>
  );
};
