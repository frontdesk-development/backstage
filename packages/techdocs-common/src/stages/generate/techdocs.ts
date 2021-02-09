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

import path from 'path';
import { Logger } from 'winston';
import { PassThrough } from 'stream';
import { Config } from '@backstage/config';

import { GeneratorBase, GeneratorRunOptions } from './types';
import {
  runDockerContainer,
  runCommand,
  patchMkdocsYmlPreBuild,
} from './helpers';

type TechdocsGeneratorOptions = {
  // This option enables users to configure if they want to use TechDocs container
  // or generate without the container.
  // This is used to avoid running into Docker in Docker environment.
  runGeneratorIn: string;
};

const createStream = (): [string[], PassThrough] => {
  const log = [] as Array<string>;

  const stream = new PassThrough();
  stream.on('data', chunk => {
    const textValue = chunk.toString().trim();
    if (textValue?.length > 1) log.push(textValue);
  });

  return [log, stream];
};

export class TechdocsGenerator implements GeneratorBase {
  private readonly logger: Logger;
  private readonly options: TechdocsGeneratorOptions;

  constructor(logger: Logger, config: Config) {
    this.logger = logger;
    this.options = {
      runGeneratorIn:
        config.getOptionalString('techdocs.generators.techdocs') ?? 'docker',
    };
  }

  public async run({
    inputDir,
    outputDir,
    dockerClient,
    parsedLocationAnnotation,
  }: GeneratorRunOptions): Promise<void> {
    const [log, logStream] = createStream();

    // TODO: In future mkdocs.yml can be mkdocs.yaml. So, use a config variable here to find out
    // the correct file name.
    // Do some updates to mkdocs.yml before generating docs e.g. adding repo_url
    if (parsedLocationAnnotation) {
      await patchMkdocsYmlPreBuild(
        path.join(inputDir, 'mkdocs.yml'),
        this.logger,
        parsedLocationAnnotation,
      );
    }

    try {
      switch (this.options.runGeneratorIn) {
        case 'local':
          await runCommand({
            command: 'mkdocs',
            args: ['build', '-d', outputDir, '-v'],
            options: {
              cwd: inputDir,
            },
            logStream,
          });
          this.logger.info(
            `Successfully generated docs from ${inputDir} into ${outputDir} using local mkdocs`,
          );
          await runCommand({
            command: 'rm',
            args: ['-rf', `${outputDir}/backstage-repo`],
            options: {
              cwd: outputDir,
            },
            logStream,
          });
          this.logger.info(
            `Removed ${outputDir}/backstage-repo from result folder`,
          );
          break;
        case 'docker':
          await runDockerContainer({
            imageName: 'spotify/techdocs',
            args: ['build', '-d', '/result'],
            logStream,
            docsDir: inputDir,
            outputDir,
            dockerClient,
          });
          this.logger.info(
            `Successfully generated docs from ${inputDir} into ${outputDir} using techdocs-container`,
          );
          break;
        default:
          throw new Error(
            `Invalid config value "${this.options.runGeneratorIn}" provided in 'techdocs.generators.techdocs'.`,
          );
      }
    } catch (error) {
      this.logger.debug(
        `Failed to generate docs from ${inputDir} into ${outputDir}`,
      );
      this.logger.warn(`[TechDocs]: Build failed with error: ${log}`);
      throw new Error(
        `Failed to generate docs from ${inputDir} into ${outputDir} with error ${error.message}`,
      );
    }
  }
}
