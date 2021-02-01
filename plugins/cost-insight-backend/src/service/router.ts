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

export interface RouterOptions {
  logger: Logger;
  config: Config;
}

export type GcpConfig = {
  type: string;
  projectId: string;
  privateKeyId: string;
  privateKey: string;
  clientEmail: string;
  clientId: string;
  clientX509CertUrl: string;
  billingTable: string;
};

export const makeRouter = (
  logger: Logger,
  router: express.Router,
  gcpConfig: GcpConfig,
): express.Router => {
  router.use(express.json());

  logger.info('Inside cost-insight-backend router...');

  router.get('/config', async (_, res) => {
    try {
      const response: GcpConfig = gcpConfig;
      res.send(response);
    } catch (e) {
      logger.error(`action=retrieveBigQueryConfig, error=${e}`);
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
    type: costConfig.getString('type'),
    projectId: costConfig.getString('projectId'),
    privateKeyId: costConfig.getString('privateKeyId'),
    privateKey: costConfig.getString('privateKey'),
    clientEmail: costConfig.getString('clientEmail'),
    clientId: costConfig.getString('clientId'),
    clientX509CertUrl: costConfig.getString('clientX509CertUrl'),
    billingTable: costConfig.getString('billingTable'),
  };

  return makeRouter(logger, router, gcpConfig);
}
