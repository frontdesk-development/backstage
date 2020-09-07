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
import { Router as ApiDocsRouter } from '@backstage/plugin-api-docs';
import { Router as GitHubActionsRouter } from '@backstage/plugin-github-actions';
import { Router as GitHubPullRequestRouter } from '@backstage/plugin-github-prs';
import { Router as ArgocdRequestRouter } from '@backstage/plugin-argocd';
import { Router as GrafanaRouter } from '@backstage/plugin-grafana';

import { Router as SentryRouter } from '@backstage/plugin-sentry';
import React from 'react';
import {
  AboutCard,
  EntityPageLayout,
  useEntity,
} from '@backstage/plugin-catalog';
import { Entity } from '@backstage/catalog-model';
import { Grid } from '@material-ui/core';

const OverviewContent = ({ entity }: { entity: Entity }) => (
  <Grid container spacing={3}>
    <Grid item>
      <AboutCard entity={entity} />
    </Grid>
  </Grid>
);

const ServiceEntityPage = ({ entity }: { entity: Entity }) => (
  <EntityPageLayout>
    <EntityPageLayout.Content
      path="/"
      title="Overview"
      element={<OverviewContent entity={entity} />}
    />
    <EntityPageLayout.Content
      path="/ci-cd/*"
      title="CI/CD"
      element={<GitHubActionsRouter entity={entity} />}
    />
    <EntityPageLayout.Content
      path="/pr/*"
      title="Pull Requests"
      element={<GitHubPullRequestRouter entity={entity} />}
    />
    {entity.metadata?.annotations?.['argocd/endpoint'] && (
      <EntityPageLayout.Content
        path="/argo/*"
        title="ArgoCD"
        element={<ArgocdRequestRouter entity={entity} />}
      />
    )}
    <EntityPageLayout.Content
      path="/grafana/*"
      title="Grafana"
      element={<GrafanaRouter entity={entity} />}
    />
    {entity.metadata?.annotations?.['sentry.io/project-slug'] && (
      <EntityPageLayout.Content
        path="/sentry"
        title="Sentry"
        element={<SentryRouter entity={entity} />}
      />
    )}
    <EntityPageLayout.Content
      path="/api/*"
      title="API"
      element={<ApiDocsRouter entity={entity} />}
    />
  </EntityPageLayout>
);

const WebsiteEntityPage = ({ entity }: { entity: Entity }) => (
  <EntityPageLayout>
    <EntityPageLayout.Content
      path="/"
      title="Overview"
      element={<OverviewContent entity={entity} />}
    />
    <EntityPageLayout.Content
      path="/ci-cd/*"
      title="CI/CD"
      element={<GitHubActionsRouter entity={entity} />}
    />
    <EntityPageLayout.Content
      path="/sentry"
      title="Sentry"
      element={<SentryRouter entity={entity} />}
    />
  </EntityPageLayout>
);

const DefaultEntityPage = ({ entity }: { entity: Entity }) => (
  <EntityPageLayout>
    <EntityPageLayout.Content
      path="/*"
      title="Overview"
      element={<OverviewContent entity={entity} />}
    />
  </EntityPageLayout>
);

export const EntityPage = () => {
  const { entity } = useEntity();
  switch (entity?.spec?.type) {
    case 'service':
      return <ServiceEntityPage entity={entity} />;
    case 'website':
      return <WebsiteEntityPage entity={entity} />;
    default:
      return <DefaultEntityPage entity={entity} />;
  }
};
