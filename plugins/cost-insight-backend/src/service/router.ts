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

import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { Config } from '@backstage/config';
import { loadBackendConfig } from '@backstage/backend-common';
import { BigQueryClass } from './BigCqueryClient';
import { GcpConfig } from '../types';

export interface RouterOptions {
  logger: Logger;
  config: Config;
}

export const makeRouter = (
  logger: Logger,
  router: express.Router,
  gcpConfig: GcpConfig,
): express.Router => {
  router.use(express.json());

  const BigQueryClient = new BigQueryClass(gcpConfig);

  router.post('/labels', async (req, res) => {
    const label = req.body.label;
    const projectName = req.body.projectName;
    try {
      const response = await BigQueryClient.getLabels(label, projectName);
      res.status(200).send(response);
    } catch (e) {
      logger.error(`action=getLabels for label="${label}", error=${e}`);
      res.status(500).send({ error: e.message });
    }
  });

  router.post('/queryBigQuery', async (req, res) => {
    const intervals = req.body.intervals;
    const projectName = req.body.projectName;
    const whereStatement = req.body.whereStatement;
    try {
      const response = await BigQueryClient.queryBigQuery(
        intervals,
        projectName,
        whereStatement,
      );
      res.status(200).send(response);
    } catch (e) {
      logger.error(
        `action=queryBigQuery for intervals="${intervals}", error=${e}`,
      );
      res.status(500).send({ error: e.message });
    }
  });

  router.post('/getComponent', async (req, res) => {
    const intervals = req.body.intervals;
    const projectName = req.body.projectName;
    const whereStatement = req.body.whereStatement;
    try {
      const response = await BigQueryClient.getComponent(
        intervals,
        projectName,
        whereStatement,
      );
      res.status(200).send(response);
    } catch (e) {
      logger.error(
        `action=getComponent for intervals="${intervals}", error=${e}`,
      );
      res.status(500).send({ error: e.message });
    }
  });

  return router;
};

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const router = Router();
  const logger = options.logger;

  logger.info('Initializing cost-insights backend');

  const config = await loadBackendConfig({ logger, argv: process.argv });

  const costConfig = config.getConfig('costInsights.gcpConfig');
  const gcpConfig = {
    projectId: costConfig.getString('projectId'),
    billingTable: costConfig.getString('billingTable'),
    keyFilename: costConfig.getString('keyFilename'),
  };

  return makeRouter(logger, router, gcpConfig);
}
