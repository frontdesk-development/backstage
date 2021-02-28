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
// import { BigQuery } from '@google-cloud/bigquery';
import { GcpConfig } from '../types';
import { Label } from '../types/Label';

const { BigQuery } = require('@google-cloud/bigquery');

const MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours
export class BigQueryClass {
  client: any;
  memoizedQuery: any;
  memoizedLabelQuery: any;
  memoizedProjectsQuery: any;
  billingTable: string;

  constructor(gcpConfig: GcpConfig) {
    this.billingTable = gcpConfig.billingTable.trim();
    const projectId = gcpConfig.projectId.trim();
    const keyFilename = gcpConfig.keyFilename.trim();

    const connectOptions = {
      keyFilename: keyFilename,
      projectId: projectId,
    };

    this.client = new BigQuery(connectOptions);

    this.memoizedQuery = moize(
      async (query: string) => await this.runQuery(query),
      { maxAge: MAX_AGE, updateExpire: true },
    );
    this.memoizedProjectsQuery = moize(
      async (query: string) => await this.runProjectsQuery(query),
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

    let endDate = splitInterval[2];
    const endDateSplit = endDate.split('-');

    let newYear = +endDateSplit[0];

    let month = +endDateSplit[1];
    const day = +endDateSplit[2];
    if (splitInterval[0] === 'R2') {
      if (splitInterval[1] === 'P90D') {
        month = month - 6;
        if (month <= 0) {
          month = 12 + month;
          newYear = newYear - 1;
        }
      }
      if (splitInterval[1] === 'P30D') {
        month = month - 2;
        if (month <= 0) {
          month = 12 + month;
          newYear = newYear - 1;
        }
      }
    }

    let startDate = '';
    let startDay = `${day}`;
    let startMonth = `${month}`;

    if (month < 10) {
      startMonth = `0${month}`;
    }

    if (day < 10) {
      startDay = `0${day}`;
    }

    endDate = `${endDateSplit[0]}-${endDateSplit[1]}-${day}`;
    startDate = `${newYear}-${startMonth}-${startDay}`;

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
      day as date
      ,SUM(total) as amount
      FROM \`${this.billingTable}\`
      WHERE TIMESTAMP(day) > TIMESTAMP(DATE "${startDate}") 
        AND TIMESTAMP(day) < TIMESTAMP(DATE "${endDate}")
        AND project_name = \"${projectName}\"  
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
      day as date
      ,SUM(total) as amount
      FROM \`${this.billingTable}\` 
      WHERE TIMESTAMP(day) > TIMESTAMP(DATE "${startDate}") 
        AND TIMESTAMP(day) < TIMESTAMP(DATE "${endDate}")
        ${whereClouse}
      GROUP BY date`;

    return this.memoizedQuery(query);
  }

  async getLabels(label: string, projectName?: string): Promise<Label[]> {
    let query = `SELECT 
      DISTINCT(${label}) as value FROM \`${this.billingTable}\` where ${label} IS NOT null`;
    if (projectName) {
      query = `SELECT 
      DISTINCT(${label}) as value FROM \`${this.billingTable}\`
      WHERE (project_name = \"${projectName}\" AND ${label} IS NOT null)`;
    }

    return await this.memoizedLabelQuery(query);
  }

  public async getProjectsCost(
    intervals: string,
    whereClouse?: string,
  ): Promise<{ amount: number; date: string; projectName: string }[]> {
    const { endDate, startDate } = this.parseIntervals(intervals);

    const query = `SELECT
      day as date
      ,SUM(total) as amount
      ,project_name as projectName
      FROM \`${this.billingTable}\` 
      WHERE TIMESTAMP(day) > TIMESTAMP(DATE "${startDate}") 
        AND TIMESTAMP(day) < TIMESTAMP(DATE "${endDate}")
        ${whereClouse}
      GROUP BY projectName, date
      ORDER BY projectName, date`;

    return await this.memoizedProjectsQuery(query);
  }
  public async getComponent(
    intervals: string,
    projectName?: string,
    whereClouse?: string,
  ): Promise<{ amount: number; date: string; description: string }[]> {
    const { endDate, startDate } = this.parseIntervals(intervals);

    let query = `SELECT
      day as date
      ,SUM(total) as amount
      ,description
      FROM \`${this.billingTable}\` 
      WHERE TIMESTAMP(day) > TIMESTAMP(DATE "${startDate}") 
        AND TIMESTAMP(day) < TIMESTAMP(DATE "${endDate}")
        ${whereClouse}
        GROUP BY date, description
        ORDER BY date, description`;

    console.log('######### query:', query);
    if (projectName) {
      query = `SELECT
        day as date
        ,SUM(total) as amount
        ,description
        FROM \`${this.billingTable}\` 
        WHERE TIMESTAMP(day) > TIMESTAMP(DATE "${startDate}") 
          AND TIMESTAMP(day) < TIMESTAMP(DATE "${endDate}")
          AND project_name = \"${projectName}\" 
          ${whereClouse}
        GROUP BY description, date
        ORDER BY description, date`;
    }

    return await this.memoizedQuery(query);
  }

  public async runProjectsQuery(
    query: string,
  ): Promise<{ amount: number; date: string; projectName: string }[]> {
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
      projectName: string;
    }[] = rows.map((entry: { date: any; amount: any; projectName: any }) => ({
      date: entry.date,
      amount: entry.amount,
      projectName: entry.projectName,
    }));

    return aggregation;
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
    }[] = rows.map((entry: { date: any; amount: any; description: any }) => ({
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
