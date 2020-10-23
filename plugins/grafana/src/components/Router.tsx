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
import React from 'react';
import { Entity } from '@backstage/catalog-model';
import { Routes, Route } from 'react-router';
import { rootRouteRef } from '../plugin';
import { GrafanaIframe } from './GrafanaPage';
import { GRAFANA_ANNOTATION, GRAFANA_ANNOTATION2 } from './useProjectName';
import { WarningPanel } from '@backstage/core';

const isPluginApplicableToEntity = (entity: Entity) =>
  Boolean(entity.metadata.annotations?.[GRAFANA_ANNOTATION]) ||
  Boolean(entity.metadata.annotations?.[GRAFANA_ANNOTATION2]);

export const Router = ({ entity }: { entity: Entity }) =>
  // TODO(shmidt-i): move warning to a separate standardized component
  !isPluginApplicableToEntity(entity) ? (
    <WarningPanel title=" Grafana plugin:">
      `entity.metadata.annotations['
      {GRAFANA_ANNOTATION}']` key is missing on the entity.{' '}
    </WarningPanel>
  ) : (
    <Routes>
      <Route
        path={`/${rootRouteRef.path}`}
        element={<GrafanaIframe entity={entity} />}
      />
      )
    </Routes>
  );