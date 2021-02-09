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
import { PreparerBase } from './types';
import { Entity } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import path from 'path';
import { parseReferenceAnnotation, checkoutGitRepository } from '../../helpers';
import { UrlReader, InputError } from '@backstage/backend-common';
import parseGitUrl from 'git-url-parse';
import { Logger } from 'winston';

export class DirectoryPreparer implements PreparerBase {
  constructor(
    private readonly config: Config,
    private readonly logger: Logger,
    private readonly reader: UrlReader,
  ) {
    this.config = config;
    this.logger = logger;
    this.reader = reader;
  }

  private async resolveManagedByLocationToDir(entity: Entity, token?: string) {
    const { type, target } = parseReferenceAnnotation(
      'backstage.io/managed-by-location',
      entity,
    );

    this.logger.debug(
      `Building docs for entity with type 'dir' and managed-by-location '${type}'`,
    );
    switch (type) {
      case 'url': {
        const response = await this.reader.readTree(target);
        return await response.dir();
      }
      case 'github':
      case 'gitlab':
      case 'azure/api': {
        const parsedGitLocation = parseGitUrl(target);
        const branch =
          entity.metadata.annotations?.['github.com/project-slug-branch'] ||
          'master';
        const repoLocation = await checkoutGitRepository(
          target,
          this.config,
          this.logger,
          branch,
          token,
        );

        return path.dirname(
          path.join(repoLocation, parsedGitLocation.filepath),
        );
      }
      case 'file':
        return path.dirname(target);
      default:
        throw new InputError(`Unable to resolve location type ${type}`);
    }
  }

  async prepare(entity: Entity, token?: string): Promise<string> {
    const { target } = parseReferenceAnnotation(
      'backstage.io/techdocs-ref',
      entity,
    );

    const managedByLocationDirectory = await this.resolveManagedByLocationToDir(
      entity,
      token,
    );

    return new Promise(resolve => {
      resolve(path.resolve(managedByLocationDirectory, target));
    });
  }
}
