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
import React, { FC } from 'react';
import { Link, Typography, Box, IconButton, Tooltip } from '@material-ui/core';
import RetryIcon from '@material-ui/icons/Replay';
import GoogleIcon from '@material-ui/icons/CloudCircle';
import { Link as RouterLink, generatePath } from 'react-router-dom';
import { Table, TableColumn } from '@backstage/core';
import { useWorkflowRuns } from '../useWorkflowRuns';
import { WorkflowRunStatus } from '../WorkflowRunStatus';
import SyncIcon from '@material-ui/icons/Sync';
import { useProjectName } from '../useProjectName';
import { useTriggerId } from '../useTriggerId';
import { Entity } from '@backstage/catalog-model';
import { Substitutions, BuildTrigger } from '../../api/types';
import { buildRouteRef } from '../../plugin';
import moment from 'moment';

export type WorkflowRun = {
  id: string;
  message: string;
  url?: string;
  googleUrl?: string;
  status: string;
  substitutions: Substitutions;
  createTime: string;
  rerun: () => void;
  buildTriggerInfo: BuildTrigger;
};

const generatedColumns: TableColumn[] = [
  {
    title: 'Status',
    width: '150px',

    render: (row: Partial<WorkflowRun>) => (
      <Box display="flex" alignItems="center">
        <WorkflowRunStatus status={row.status} />
      </Box>
    ),
  },
  {
    title: 'Build',
    field: 'id',
    type: 'numeric',
    width: '150px',
    render: (row: Partial<WorkflowRun>) => (
      <Typography variant="body2" noWrap>
        <p>{row.id?.substring(0, 8)}</p>
      </Typography>
    ),
  },
  {
    title: 'Trigger Name',
    field: 'source',
    highlight: true,
    width: '200px',
    render: (row: Partial<WorkflowRun>) => (
      <Link
        component={RouterLink}
        to={generatePath(buildRouteRef.path, { id: row.id! })}
      >
        {row.buildTriggerInfo?.name}
      </Link>
    ),
  },

  {
    title: 'Created',
    render: (row: Partial<WorkflowRun>) => (
      <Typography variant="body2" noWrap>
        <p>{moment(row.createTime).format('DD-MM-YYYY hh:mm:ss')}</p>
      </Typography>
    ),
  },
  {
    title: 'Actions',
    render: (row: Partial<WorkflowRun>) => (
      <Tooltip title="Rerun workflow">
        <IconButton onClick={row.rerun}>
          <RetryIcon />
        </IconButton>
      </Tooltip>
    ),
    width: '10%',
  },
];

type Props = {
  loading: boolean;
  retry: () => void;
  runs?: WorkflowRun[];
  projectName: string;
  page: number;
  onChangePage: (page: number) => void;
  total: number;
  pageSize: number;
  onChangePageSize: (pageSize: number) => void;
};

export const WorkflowRunsTableView: FC<Props> = ({
  projectName,
  loading,
  pageSize,
  page,
  retry,
  runs,
  onChangePage,
  onChangePageSize,
  total,
}) => {
  return (
    <Table
      isLoading={loading}
      options={{ paging: true, pageSize, padding: 'dense' }}
      totalCount={total}
      page={page}
      actions={[
        {
          icon: () => <SyncIcon />,
          tooltip: 'Reload workflow runs',
          isFreeAction: true,
          onClick: () => retry(),
        },
      ]}
      data={runs ?? []}
      onChangePage={onChangePage}
      onChangeRowsPerPage={onChangePageSize}
      style={{ width: '100%' }}
      title={
        <Box display="flex" alignItems="center">
          <GoogleIcon />
          <Box mr={1} />
          <Typography variant="h6">{projectName}</Typography>
        </Box>
      }
      columns={generatedColumns}
    />
  );
};

export const WorkflowRunsTable = ({ entity }: { entity: Entity }) => {
  const { value: projectName, loading } = useProjectName(entity);
  let { value: triggerName } = useTriggerId(entity);
  const [projectId] = (projectName ?? '/').split('/');

  if (triggerName === undefined) {
    triggerName = '';
  }

  const [tableProps, { retry, setPage, setPageSize }] = useWorkflowRuns({
    projectId,
    triggerName,
  });

  return (
    <WorkflowRunsTableView
      {...tableProps}
      loading={loading || tableProps.loading}
      retry={retry}
      onChangePageSize={setPageSize}
      onChangePage={setPage}
    />
  );
};
