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

import { useApi, githubAuthApiRef } from '@backstage/core';
import { useAsync } from 'react-use';
import { githubActionsApiRef } from '../../api';

export const useDownloadWorkflowRunLogs = (
  repo: string,
  owner: string,
  id: string,
) => {
  const api = useApi(githubActionsApiRef);
  const auth = useApi(githubAuthApiRef);
  const details = useAsync(async () => {
    const token = await auth.getAccessToken();
    return repo && owner
      ? api.downloadJobLogsForWorkflowRun({
          token,
          owner,
          repo,
          runId: parseInt(id, 10),
        })
      : Promise.reject('No repo/owner provided');
  }, [repo, owner, id]);
  return details;
};