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
import { initRepoAndPush } from './helpers';
import fs from 'fs-extra';
import { GitHubIntegrationConfig } from '@backstage/integration';
import parseGitUrl from 'git-url-parse';
import { Octokit } from '@octokit/rest';
import path from 'path';

export type RepoVisibilityOptions = 'private' | 'internal' | 'public';

export class GithubPublisher implements PublisherBase {
  static async fromConfig(
    config: GitHubIntegrationConfig,
    { repoVisibility }: { repoVisibility: RepoVisibilityOptions },
  ) {
    if (!config.token) {
      return undefined;
    }

    const githubClient = new Octokit({
      auth: config.token,
      baseUrl: config.apiBaseUrl,
    });

    return new GithubPublisher({
      token: config.token,
      client: githubClient,
      repoVisibility,
    });
  }

  constructor(
    private readonly config: {
      token: string;
      client: Octokit;
      repoVisibility: RepoVisibilityOptions;
    },
  ) {}

  async publish({
    values,
    workspacePath,
    logger,
    token,
  }: PublisherOptions): Promise<PublisherResult> {
    const { owner, name } = parseGitUrl(values.storePath);

    const description = values.description as string;
    const access = values.access as string;
    const remoteUrl = await this.createRemote({
      description,
      access,
      name,
      owner,
      token,
    });

    await initRepoAndPush({
      dir: path.join(workspacePath, 'result'),
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

      const description = values.description as string;
      const nameGitops = `${name}-gitops`;

      const remoteUrlManifest = await this.createRemote({
        description,
        access,
        name: nameGitops,
        owner,
        token,
      });
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

  private async createRemote(opts: {
    access: string;
    name: string;
    owner: string;
    description: string;
    token: string;
  }) {
    const { access, description, owner, name, token } = opts;

    const githubClientPublish = new Octokit({ auth: token });

    const user = await githubClientPublish.users.getByUsername({
      username: owner,
    });

    const repoCreationPromise =
      user.data.type === 'Organization'
        ? this.config.client.repos.createInOrg({
            name,
            org: owner,
            private: this.config.repoVisibility !== 'public',
            visibility: this.config.repoVisibility,
            description,
          })
        : this.config.client.repos.createForAuthenticatedUser({
            name,
            private: this.config.repoVisibility === 'private',
            description,
          });

    const { data } = await repoCreationPromise;

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

    
    topics = [...topics];
    

    if (name.endsWith('-gitops')) {
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
