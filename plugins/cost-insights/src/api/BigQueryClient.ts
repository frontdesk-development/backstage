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
/* eslint-disable no-restricted-imports */

import moize from 'moize';
import { BigQuery } from '@google-cloud/bigquery';
import { GcpConfig, Label } from '../types';

const MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours
export class BigQueryClass {
  client: BigQuery;
  memoizedQuery: any;
  memoizedLabelQuery: any;

  constructor() {
    this.client = new BigQuery();
    this.memoizedQuery = moize(
      async (query: string) => await this.runQuery(query),
      { maxAge: MAX_AGE, updateExpire: true },
    );
    this.memoizedLabelQuery = moize(
      async (query: string) => await this.runLabelQuery(query),
      { maxAge: MAX_AGE, updateExpire: true },
    );
  }

  setConfig(gcpConfig: GcpConfig) {
    const credentials = {
      type: gcpConfig.type,
      project_id: gcpConfig.projectId,
      private_key_id: gcpConfig.privateKeyId,
      private_key: gcpConfig.privateKey,
      client_email: gcpConfig.clientEmail,
      client_id: gcpConfig.clientId,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: gcpConfig.clientX509CertUrl,
    };

    const projectId = gcpConfig.projectId;
    const login = {
      projectId,
      credentials,
    };
    this.client = new BigQuery(login);
  }

  public async queryBigQuery(
    intervals: string,
    projectName?: string,
    whereClouse?: string,
  ): Promise<{ amount: number; date: string }[]> {
    const splitInterval = intervals.split('/');

    const endDate = splitInterval[2];
    const endDateSplit = endDate.split('-');
    let newYear = +endDateSplit[0];

    let month = +endDateSplit[1];
    if (splitInterval[0] === 'R2') {
      if (splitInterval[1] === 'P90D') {
        month = month - 6;
        if (month < 0) {
          month = 12 + month;
          newYear = newYear - 1;
        }
      }
      if (splitInterval[1] === 'P30D') {
        month = month - 2;
        if (month < 0) {
          month = 12 + month;
          newYear = newYear - 1;
        }
      }
    }

    let newDate = '';
    if (month < 10) {
      newDate = `${newYear}-0${month}-01`;
    } else {
      newDate = `${newYear}-${month}-01`;
    }

    if (projectName) {
      if (whereClouse) {
        return this.runQueryForProject(
          projectName,
          newDate,
          endDate,
          whereClouse,
        );
      }
      return this.runQueryForProject(projectName, newDate, endDate);
    }

    if (whereClouse) {
      return this.runQueryForAll(newDate, endDate, whereClouse);
    }

    return this.runQueryForAll(newDate, endDate);
  }

  async runQueryForProject(
    projectName: string,
    newDate: string,
    endDate: string,
    whereClouse?: string,
  ): Promise<{ amount: number; date: string }[]> {
    const query = `SELECT
      CONCAT(EXTRACT(YEAR FROM usage_start_time AT TIME ZONE "UTC"),'-', 
         EXTRACT(MONTH FROM usage_start_time AT TIME ZONE "UTC"),'-', 
         EXTRACT(DAY FROM usage_start_time AT TIME ZONE "UTC")) as date
      ,SUM(cost) as amount
      FROM \`billing.gcp_billing_export_v1_01241D_E5B8D7_0F597A\`
      WHERE usage_start_time > TIMESTAMP(DATE "${newDate}") 
        AND project.id = \"${projectName}\" 
        AND usage_start_time < TIMESTAMP(DATE "${endDate}") 
        ${whereClouse}
      GROUP BY date`;

    return this.memoizedQuery(query);
  }

  async runQueryForAll(
    newDate: string,
    endDate: string,
    whereClouse?: string,
  ): Promise<{ amount: number; date: string }[]> {
    const query = `SELECT
      CONCAT(EXTRACT(YEAR FROM usage_start_time AT TIME ZONE "UTC"),'-', 
         EXTRACT(MONTH FROM usage_start_time AT TIME ZONE "UTC"),'-', 
         EXTRACT(DAY FROM usage_start_time AT TIME ZONE "UTC")) as date
      ,SUM(cost) as amount
      FROM \`billing.gcp_billing_export_v1_01241D_E5B8D7_0F597A\` 
      WHERE usage_start_time > TIMESTAMP(DATE "${newDate}") 
        AND usage_start_time < TIMESTAMP(DATE "${endDate}")
        ${whereClouse}
      GROUP BY date`;

    return this.memoizedQuery(query);
  }

  async getLabels(label: string, projectName?: string) {
    let query = `SELECT 
      DISTINCT(l.value) FROM \`billing.gcp_billing_export_v1_01241D_E5B8D7_0F597A\`, UNNEST(project.labels) as l
      WHERE (l.key="${label}")`;
    if (projectName) {
      query = `SELECT 
      DISTINCT(l.value) FROM \`billing.gcp_billing_export_v1_01241D_E5B8D7_0F597A\`, UNNEST(project.labels) as l
      WHERE (l.key="trv-tier" AND project.id = \"${projectName}\")`;
    }

    return await this.memoizedLabelQuery(query);
  }

  public async runQuery(
    query: string,
  ): Promise<{ amount: number; date: string }[]> {
    const client = this.client;
    const options = {
      query: query,
      // Location must match that of the dataset(s) referenced in the query.
      location: 'EU',
      useQueryCache: true,
    };

    const [job] = await client.createQueryJob(options);

    const [rows] = await job.getQueryResults();

    rows.forEach(row => {
      const newDate = row.date.split('-');
      if (newDate[1] < 10) {
        newDate[1] = `0${newDate[1]}`;
      }
      if (newDate[2] < 10) {
        newDate[2] = `0${newDate[2]}`;
      }
      row.date = newDate.join('-');
    });

    const aggregation: { amount: number; date: string }[] = rows.map(entry => ({
      date: entry.date,
      amount: Math.round(entry.amount),
    }));

    return aggregation;
  }

  public async runLabelQuery(query: string): Promise<Label[]> {
    const client = this.client;
    const options = {
      query: query,
      // Location must match that of the dataset(s) referenced in the query.
      location: 'EU',
      useQueryCache: true,
    };

    const [job] = await client.createQueryJob(options);

    const [rows] = await job.getQueryResults();

    const labels: Label[] = rows.map((label: { value: string }) => ({
      id: label.value,
    }));

    return labels;
  }
}
