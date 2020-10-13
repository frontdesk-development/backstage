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
import { useState } from 'react';
import { useAsyncRetry } from 'react-use';
import { WorkflowRun } from './WorkflowRunsTable/WorkflowRunsTable';
import { githubActionsApiRef } from '../api/GithubActionsApi';
import { useApi, githubAuthApiRef, errorApiRef } from '@backstage/core';
import { ActionsListWorkflowRunsForRepoResponseData } from '@octokit/types';

export function useWorkflowRuns({
  owner,
  repo,
  branch,
  initialPageSize = 5,
}: {
  owner: string;
  repo: string;
  branch?: string;
  initialPageSize?: number;
}) {
  const api = useApi(githubActionsApiRef);
  const auth = useApi(githubAuthApiRef);

  const errorApi = useApi(errorApiRef);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const { loading, value: runs, retry, error } = useAsyncRetry<
    WorkflowRun[]
  >(async () => {
    const token = await auth.getAccessToken();
    return (
      api
        // GitHub API pagination count starts from 1
        .listWorkflowRuns({
          token,
          owner,
          repo,
          pageSize,
          page: page + 1,
          branch,
        })
        .then(
          (
            workflowRunsData: ActionsListWorkflowRunsForRepoResponseData,
          ): WorkflowRun[] => {
            setTotal(workflowRunsData.total_count);
            // Transformation here
            return workflowRunsData.workflow_runs.map(run => ({
              message: run.head_commit.message,
              id: `${run.id}`,
              onReRunClick: async () => {
                try {
                  await api.reRunWorkflow({
                    token,
                    owner,
                    repo,
                    runId: run.id,
                  });
                } catch (e) {
                  errorApi.post(e);
                }
              },
              source: {
                branchName: run.head_branch,
                commit: {
                  hash: run.head_commit.id,
                  url: run.head_repository.branches_url.replace(
                    '{/branch}',
                    run.head_branch,
                  ),
                },
              },
              status: run.status,
              conclusion: run.conclusion,
              url: run.url,
              githubUrl: run.html_url,
            }));
          },
        )
    );
  }, [page, pageSize, repo, owner]);

  return [
    {
      page,
      pageSize,
      loading,
      runs,
      projectName: `${owner}/${repo}`,
      total,
      error,
    },
    {
      runs,
      setPage,
      setPageSize,
      retry,
    },
  ] as const;
}
