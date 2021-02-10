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
  ContentHeader,
  SupportButton,
  useApi,
  WarningPanel,
  configApiRef,
} from '@backstage/core';
import {
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Button,
} from '@material-ui/core';
import React from 'react';
import { useAsync } from 'react-use';
import { bridgeApiRef } from '../../api';
import { Course } from '../../api/types';
import { Entity } from '@backstage/catalog-model';
import noImage from '../../assets/no-image.png';

const LongText = ({ text, max }: { text: string; max: number }) => {
  if (text.length < max) {
    return <span>{text}</span>;
  }
  return (
    <Tooltip title={text}>
      <span>{text.slice(0, max)}...</span>
    </Tooltip>
  );
};

const PageContents = ({ entity }: { entity?: Entity }) => {
  const api = useApi(bridgeApiRef);
  const tag =
    entity?.metadata?.annotations?.['bridge.com/course-tag'] || 'No tag found';

  const configApi = useApi(configApiRef);
  const bridgeConfig = configApi.getOptionalConfig('bridge');
  const url = bridgeConfig?.getString('url') ?? 'https://company.bridgeapp.com';

  const { loading, error, value } = useAsync(() => api.listCourses(tag));

  if (loading) {
    return <LinearProgress />;
  } else if (error) {
    return (
      <WarningPanel title="Failed to load courses">
        {error.toString()}
      </WarningPanel>
    );
  }

  if (typeof value === 'string') {
    return <WarningPanel title="Failed to load courses">{value}</WarningPanel>;
  }

  return (
    <Table component={Paper}>
      <Table aria-label="Bridge Courses">
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell align="left">Title</TableCell>
            <TableCell align="left">Description</TableCell>
            <TableCell align="left" />
          </TableRow>
        </TableHead>
        <TableBody>
          {value?.library_items.map((course: Course) => (
            <TableRow key={course.id}>
              <TableCell align="left">
                <img
                  src={course.cover_slide_data.background_image_url ?? noImage}
                  width="100px"
                  height="100px"
                  alt=""
                  style={{ borderRadius: '30%' }}
                />
              </TableCell>
              <TableCell align="left">
                <Typography>
                  <LongText
                    text={course.title ?? 'No title available'}
                    max={30}
                  />
                </Typography>
              </TableCell>
              <TableCell align="left">
                <Typography>
                  <LongText
                    text={course.description ?? 'No description available'}
                    max={150}
                  />
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Button
                  variant="contained"
                  size="small"
                  color="primary"
                  href={`${url}/learner/courses/${course.data.uuid}/enroll`}
                >
                  Enroll
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Table>
  );
};

export const CourseListPage = ({ entity }: { entity?: Entity }) => (
  <>
    <ContentHeader title="Brige App courses">
      <SupportButton>All your courses list</SupportButton>
    </ContentHeader>
    <PageContents entity={entity} />
  </>
);
