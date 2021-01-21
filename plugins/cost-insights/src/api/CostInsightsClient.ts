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

import dayjs from 'dayjs';
import { CostInsightsApi, ProductInsightsOptions } from './CostInsightsApi';
import { BigQueryClass } from './BigQueryClient';
import {
  Alert,
  Cost,
  DateAggregation,
  DEFAULT_DATE_FORMAT,
  Entity,
  Group,
  MetricData,
  Project,
  Trendline,
  ChangeStatistic,
  GcpConfig,
  Label,
} from '../types';
import { entityOf, getGroupedProducts } from '../utils/mockData';
import { OAuthApi } from '@backstage/core';
import regression, { DataPoint } from 'regression';
import moize from 'moize';

const BASE_URL =
  'https://content-cloudresourcemanager.googleapis.com/v1/projects';

const MAX_AGE = 1000 * 60 * 10; // 10 min

export function trendlineOf(aggregation: DateAggregation[]): Trendline {
  const data: ReadonlyArray<DataPoint> = aggregation.map(a => [
    Date.parse(a.date) / 1000,
    a.amount,
  ]);
  const result = regression.linear(data, { precision: 5 });
  return {
    slope: result.equation[0],
    intercept: result.equation[1],
  };
}

export function changeOf(aggregation: DateAggregation[]): ChangeStatistic {
  const half = Math.ceil(aggregation.length / 2);
  const before = aggregation
    .slice(0, half)
    .reduce((sum, a) => sum + a.amount, 0);
  const after = aggregation
    .slice(half, aggregation.length)
    .reduce((sum, a) => sum + a.amount, 0);
  return {
    ratio: (after - before) / before,
    amount: after - before,
  };
}

export class CostInsightsClient implements CostInsightsApi {
  bigQuery: BigQueryClass;
  memoizedProjects: any;
  constructor(private readonly googleAuthApi: OAuthApi) {
    this.bigQuery = new BigQueryClass();
    this.memoizedProjects = moize(
      async (token: string) => await this.getProjects(token),
      { maxAge: MAX_AGE, updateExpire: true },
    );
  }

  setConfig(gcpConfig: GcpConfig) {
    this.bigQuery.setConfig(gcpConfig);
  }

  private request(_: any, res: any): Promise<any> {
    return new Promise(resolve => setTimeout(resolve, 0, res));
  }

  getLastCompleteBillingDate(): Promise<string> {
    return Promise.resolve(
      dayjs().subtract(1, 'day').format(DEFAULT_DATE_FORMAT),
    );
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    const groups: Group[] = await this.request({ userId }, [{ id: 'trivago' }]);

    return groups;
  }

  async getProjects(token: string): Promise<any> {
    const response = await fetch(BASE_URL, {
      headers: {
        Accept: '*/*',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `List request failed to ${BASE_URL} with ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  async getGroupProjects(group: string): Promise<Project[]> {
    const { projects } = await this.memoizedProjects(await this.getToken());

    const projectArray: Project[] = [];

    Object.keys(projects).forEach(function (key) {
      const y: number = +key;
      const project: Project = { id: projects[key].projectId };
      projectArray[y] = project;
    });

    return projectArray;
  }

  async getTierLabels(group: string): Promise<Project[]> {
    // const { labels } = await this.memoizedProjects(await this.getToken());

    const labelArray: Label[] = [];

    // Object.keys(labels).forEach(function (key) {
    //   const y: number = +key;
    //   const label: Label = { id: labels[key].projectId };
    //   labelArray[y] = label;
    // });

    labelArray.push({ id: 'tier-label' });

    return labelArray;
  }

  async getPilarLabels(group: string): Promise<Project[]> {
    // const { labels } = await this.memoizedProjects(await this.getToken());

    const labelArray: Label[] = [];

    // Object.keys(labels).forEach(function (key) {
    //   const y: number = +key;
    //   const label: Label = { id: labels[key].projectId };
    //   labelArray[y] = label;
    // });

    labelArray.push({ id: 'pilar-label' });

    return labelArray;
  }

  async getToken(): Promise<string> {
    return this.googleAuthApi.getAccessToken(
      'https://www.googleapis.com/auth/cloud-platform',
    );
  }

  async getDailyMetricData(
    metric: string,
    intervals: string,
  ): Promise<MetricData> {
    const aggregation: { amount: number; date: string }[] = [];
    const cost: MetricData = await this.request(
      { metric, intervals },
      {
        format: 'number',
        aggregation: aggregation,
        change: changeOf(aggregation),
        trendline: trendlineOf(aggregation),
      },
    );

    return cost;
  }

  async getGroupDailyCost(group: string, intervals: string): Promise<Cost> {
    const aggregation: {
      amount: number;
      date: string;
    }[] = await this.bigQuery.queryBigQuery(intervals);

    // const aggregation: {amount: number, date: string}[] = []
    const groupDailyCost: Cost = await this.request(
      { group, intervals },
      {
        aggregation: aggregation,
        change: changeOf(aggregation),
        trendline: trendlineOf(aggregation),
        // Optional field on Cost which needs to be supplied in order to see
        // the product breakdown view in the top panel.
        groupedCosts: getGroupedProducts(intervals),
      },
    );

    return groupDailyCost;
  }

  async getProjectDailyCost(project: string, intervals: string): Promise<Cost> {
    const aggregation: {
      amount: number;
      date: string;
    }[] = await this.bigQuery.queryBigQuery(intervals, project);

    const projectDailyCost: Cost = await this.request(
      { project, intervals },
      {
        id: project,
        aggregation: aggregation,
        change: changeOf(aggregation),
        trendline: trendlineOf(aggregation),
        // Optional field on Cost which needs to be supplied in order to see
        // the product breakdown view in the top panel.
        groupedCosts: getGroupedProducts(intervals),
      },
    );

    return projectDailyCost;
  }

  async getProductInsights(options2: ProductInsightsOptions): Promise<Entity> {
    const productInsights: Entity = await this.request(
      options2,
      entityOf(options2.product),
    );

    return productInsights;
  }

  async getAlerts(group: string): Promise<Alert[]> {
    // const projectGrowthData: ProjectGrowthData = {
    //   project: 'example-project',
    //   periodStart: '2020-Q2',
    //   periodEnd: '2020-Q3',
    //   aggregation: [60_000, 120_000],
    //   change: {
    //     ratio: 1,
    //     amount: 60_000,
    //   },
    //   products: [
    //     { id: 'Compute Engine', aggregation: [58_000, 118_000] },
    //     { id: 'Cloud Dataflow', aggregation: [1200, 1500] },
    //     { id: 'Cloud Storage', aggregation: [800, 500] },
    //   ],
    // };

    // const unlabeledDataflowData: UnlabeledDataflowData = {
    //   periodStart: '2020-09-01',
    //   periodEnd: '2020-09-30',
    //   labeledCost: 6_200,
    //   unlabeledCost: 7_000,
    //   projects: [
    //     {
    //       id: 'example-project-1',
    //       unlabeledCost: 5_000,
    //       labeledCost: 3_000,
    //     },
    //     {
    //       id: 'example-project-2',
    //       unlabeledCost: 2_000,
    //       labeledCost: 3_200,
    //     },
    //   ],
    // };

    const alerts: Alert[] = await this.request({ group }, [
      // new ProjectGrowthAlert(projectGrowthData),
      // new UnlabeledDataflowAlert(unlabeledDataflowData),
    ]);

    return alerts;
  }
}
