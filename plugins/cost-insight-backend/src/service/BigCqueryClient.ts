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
import { GcpConfig } from '../types';
import { Label } from '../types/Label';

const MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours
export class BigQueryClass {
  client: BigQuery;
  memoizedQuery: any;
  memoizedLabelQuery: any;
  billingTable: string;

  constructor(gcpConfig: GcpConfig) {
    this.billingTable = gcpConfig.billingTable;
    const projectId = gcpConfig.projectId;
    const keyFilename = gcpConfig.keyFilename;

    const connectOptions = {
      keyFilename: keyFilename,
      projectId: projectId,
    };

    this.client = new BigQuery(connectOptions);

    this.memoizedQuery = moize(
      async (query: string) => await this.runQuery(query),
      { maxAge: MAX_AGE, updateExpire: true },
    );
    this.memoizedLabelQuery = moize(
      async (query: string) => await this.runLabelQuery(query),
      { maxAge: MAX_AGE, updateExpire: true },
    );
  }

  public parseIntervals(
    intervals: string,
  ): { startDate: string; endDate: string } {
    const splitInterval = intervals.split('/');

    const endDate = splitInterval[2];
    const endDateSplit = endDate.split('-');
    let newYear = +endDateSplit[0];

    let month = +endDateSplit[1];
    const day = +endDateSplit[2];
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

    let startDate = '';
    if (month < 10) {
      startDate = `${newYear}-0${month}-${day}`;
    } else {
      startDate = `${newYear}-${month}-${day}`;
    }

    return { startDate, endDate };
  }

  public async queryBigQuery(
    intervals: string,
    projectName?: string,
    whereClouse?: string,
  ): Promise<{ amount: number; date: string }[]> {
    const { endDate, startDate } = this.parseIntervals(intervals);

    if (projectName) {
      if (whereClouse) {
        return this.runQueryForProject(
          projectName,
          startDate,
          endDate,
          whereClouse,
        );
      }
      return this.runQueryForProject(projectName, startDate, endDate);
    }

    if (whereClouse) {
      return this.runQueryForAll(startDate, endDate, whereClouse);
    }

    return this.runQueryForAll(startDate, endDate);
  }

  async runQueryForProject(
    projectName: string,
    startDate: string,
    endDate: string,
    whereClouse?: string,
  ): Promise<{ amount: number; date: string }[]> {
    const query = `SELECT
    CONCAT(EXTRACT(DATE FROM usage_start_time AT TIME ZONE "UTC"),'') as date
      ,SUM(cost) as amount
      FROM \`${this.billingTable}\`
      WHERE usage_start_time > TIMESTAMP(DATE "${startDate}") 
        AND project.id = \"${projectName}\" 
        AND usage_start_time < TIMESTAMP(DATE "${endDate}") 
        ${whereClouse}
      GROUP BY date`;

    return this.memoizedQuery(query);
  }

  async runQueryForAll(
    startDate: string,
    endDate: string,
    whereClouse?: string,
  ): Promise<{ amount: number; date: string }[]> {
    const query = `SELECT
    CONCAT(EXTRACT(DATE FROM usage_start_time AT TIME ZONE "UTC"),'') as date
      ,SUM(cost) as amount
      FROM \`${this.billingTable}\` 
      WHERE usage_start_time > TIMESTAMP(DATE "${startDate}") 
        AND usage_start_time < TIMESTAMP(DATE "${endDate}")
        ${whereClouse}
      GROUP BY date`;

    return this.memoizedQuery(query);
  }

  async getLabels(label: string, projectName?: string): Promise<Label[]> {
    let query = `SELECT 
      DISTINCT(l.value) FROM \`${this.billingTable}\`, UNNEST(project.labels) as l 
      WHERE (l.key="${label}")`;
    if (projectName) {
      query = `SELECT 
      DISTINCT(l.value) FROM \`${this.billingTable}\`, UNNEST(project.labels) as l
      WHERE (l.key="${label}" AND project.id = \"${projectName}\")`;
    }

    return await this.memoizedLabelQuery(query);
  }

  public async getComponent(
    intervals: string,
    projectName?: string,
    whereClouse?: string,
  ): Promise<{ amount: number; date: string; description: string }[]> {
    const { endDate, startDate } = this.parseIntervals(intervals);

    let query = `SELECT
      CONCAT(EXTRACT(DATE FROM usage_start_time AT TIME ZONE "UTC"),'') as date
      ,SUM(cost) as amount
      ,service.description
      FROM \`${this.billingTable}\` 
      WHERE usage_start_time > TIMESTAMP(DATE "${startDate}") 
        AND usage_start_time < TIMESTAMP(DATE "${endDate}")
        ${whereClouse}
      GROUP BY service.description, date
      ORDER BY service.description, date`;

    if (projectName) {
      query = `SELECT
        CONCAT(EXTRACT(DATE FROM usage_start_time AT TIME ZONE "UTC"),'') as date
        ,SUM(cost) as amount
        ,service.description
        FROM \`${this.billingTable}\` 
        WHERE usage_start_time > TIMESTAMP(DATE "${startDate}") 
          AND usage_start_time < TIMESTAMP(DATE "${endDate}")
          AND project.id = \"${projectName}\" 
          ${whereClouse}
        GROUP BY service.description, date
        ORDER BY service.description, date`;
    }

    return await this.memoizedQuery(query);
  }

  public async runQuery(
    query: string,
  ): Promise<{ amount: number; date: string; description: string }[]> {
    const client = this.client;
    const options = {
      query: query,
      // Location must match that of the dataset(s) referenced in the query.
      location: 'EU',
      useQueryCache: true,
    };

    const [job] = await client.createQueryJob(options);

    const [rows] = await job.getQueryResults();

    const aggregation: {
      amount: number;
      date: string;
      description: string;
    }[] = rows.map(entry => ({
      date: entry.date,
      amount: entry.amount,
      description: entry.description,
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
