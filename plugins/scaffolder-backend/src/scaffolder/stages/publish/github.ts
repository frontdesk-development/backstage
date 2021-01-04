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

import { PublisherBase, PublisherOptions, PublisherResult } from './types';
import { Octokit } from '@octokit/rest';
import { initRepoAndPush } from './helpers';
import { JsonValue } from '@backstage/config';
import { RequiredTemplateValues } from '../templater';
import fs from 'fs-extra';

export type RepoVisibilityOptions = 'private' | 'internal' | 'public';

interface GithubPublisherParams {
  client: Octokit;
  token: string;
  repoVisibility: RepoVisibilityOptions;
}

export class GithubPublisher implements PublisherBase {
  private client: Octokit;
  private repoVisibility: RepoVisibilityOptions;

  constructor({ client, repoVisibility = 'internal' }: GithubPublisherParams) {
    this.client = client;
    this.repoVisibility = repoVisibility;
  }

  async publish({
    values,
    directory,
    logger,
    token,
    github,
  }: PublisherOptions): Promise<PublisherResult> {
    const remoteUrl = await this.createRemote(values, token, github);

    await initRepoAndPush({
      dir: directory,
      remoteUrl,
      auth: {
        username: token,
        password: 'x-oauth-basic',
      },
      logger,
    });

    const catalogInfoUrl = remoteUrl.replace(
      /\.git$/,
      '/blob/master/catalog-info.yaml',
    );

    if (values?.kubernetes_deploy === 'yes') {
      const templateId = `${values.storePath}-gitops`;
      const tempDir = `/tmp/${templateId}`;
      await fs.promises.mkdir(tempDir, { recursive: true });
      await fs.promises.writeFile(
        `${tempDir}/README.md`,
        'Gitops empty readme file to avoid having a bare repo.',
      );

      const manifestValues = values;
      manifestValues.storePath = `${values.storePath}-gitops`;

      const remoteUrlManifest = await this.createRemote(
        manifestValues,
        token,
        github,
      );
      await initRepoAndPush({
        dir: tempDir,
        remoteUrl: remoteUrlManifest,
        auth: {
          username: token,
          password: 'x-oauth-basic',
        },
        logger,
      });
    }

    return { remoteUrl, catalogInfoUrl };
  }

  private async createRemote(
    values: RequiredTemplateValues & Record<string, JsonValue>,
    token: string,
    github?: string[],
  ) {
    const githubClientPublish = new Octokit({ auth: token });
    const [owner, name] = values.storePath.split('/');
    const description = values.description as string;
    const user = await githubClientPublish.users.getByUsername({
      username: owner,
    });
    const repoCreationPromise =
      user.data.type === 'Organization'
        ? githubClientPublish.repos.createInOrg({
            // this.client.repos.createInOrg({
            name,
            org: owner,
            headers: {
              Accept: `application/vnd.github.nebula-preview+json`,
              authorization: `token ${token}`,
            },
            visibility: this.repoVisibility,
            description: description,
          })
        : this.client.repos.createForAuthenticatedUser({ name });

    const { data } = await repoCreationPromise;

    const access = values.access as string;
    if (access?.startsWith(`${owner}/`)) {
      const [, team] = access.split('/');
      await githubClientPublish.teams.addOrUpdateRepoPermissionsInOrg({
        org: owner,
        team_slug: team,
        owner,
        repo: name,
        permission: 'admin',
      });
      // no need to add access if it's the person who own's the personal account
    } else if (access && access !== owner) {
      await githubClientPublish.repos.addCollaborator({
        owner,
        repo: name,
        username: access,
        permission: 'admin',
      });
    }

    let topics = ['frontdesk'];

    if (github) {
      topics = [...topics, ...github];
    }

    if (values?.storePath.endsWith('-gitops')) {
      topics = [...topics, 'gitops'];
    }

    await githubClientPublish.repos.replaceAllTopics({
      owner: owner,
      repo: name,
      names: topics,
    });

    return data?.clone_url;
  }
}
