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
  PageFilters,
} from '../types';
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

  getSqlWhereStatement(pageFilters: PageFilters): string {
    let whereClouse = ' ';
    if (pageFilters.pillarLabel) {
      if (whereClouse.length === 1) {
        whereClouse = 'AND ';
      }
      whereClouse = `${whereClouse}(SELECT value FROM UNNEST(project.labels) WHERE key = \"trv-pillar\")=\"${pageFilters.pillarLabel}\"`;
    }

    if (pageFilters.productLabel) {
      if (whereClouse.length > 0) {
        whereClouse = `${whereClouse}AND `;
      }
      whereClouse = `${whereClouse}(SELECT value FROM UNNEST(project.labels) WHERE key = \"trv-product\")=\"${pageFilters.productLabel}\"`;
    }

    if (pageFilters.domainLabel) {
      if (whereClouse.length > 0) {
        whereClouse = `${whereClouse}AND `;
      }
      whereClouse = `${whereClouse}(SELECT value FROM UNNEST(project.labels) WHERE key = \"trv-domain\")=\"${pageFilters.domainLabel}\"`;
    }

    if (pageFilters.teamLabel) {
      if (whereClouse.length > 0) {
        whereClouse = `${whereClouse}AND `;
      }
      whereClouse = `${whereClouse}(SELECT value FROM UNNEST(project.labels) WHERE key = \"trv-team\")=\"${pageFilters.teamLabel}\"`;
    }

    if (pageFilters.tierLabel) {
      if (whereClouse.length > 0) {
        whereClouse = `${whereClouse}AND `;
      }
      whereClouse = `${whereClouse}(SELECT value FROM UNNEST(project.labels) WHERE key = \"trv-tier\")=\"${pageFilters.tierLabel}\"`;
    }
    return whereClouse;
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

  async getGroupProjects(_group: string): Promise<Project[]> {
    const { projects } = await this.memoizedProjects(await this.getToken());

    const projectArray: Project[] = [];

    Object.keys(projects).forEach(function (key) {
      const y: number = +key;
      const project: Project = { id: projects[key].projectId };
      projectArray[y] = project;
    });

    return projectArray;
  }

  async getTierLabels(projectId: string): Promise<Project[]> {
    const labels = await this.bigQuery.getLabels('trv-tier', projectId);
    return labels;
  }

  async getPillarLabels(projectId: string): Promise<Project[]> {
    const labels = await this.bigQuery.getLabels('trv-pillar', projectId);
    return labels;
  }

  async getDomainLabels(projectId: string): Promise<Project[]> {
    const labels = await this.bigQuery.getLabels('trv-domain', projectId);
    return labels;
  }

  async getProductLabels(projectId: string): Promise<Project[]> {
    const labels = await this.bigQuery.getLabels('trv-product', projectId);
    return labels;
  }

  async getTeamLabels(projectId: string): Promise<Project[]> {
    const labels = await this.bigQuery.getLabels('trv-team', projectId);
    return labels;
  }

  async getGroupDailyCost(
    pageFilters: PageFilters,
    intervals: string,
  ): Promise<Cost> {
    const whereStatement = this.getSqlWhereStatement(pageFilters);

    const aggregation: {
      amount: number;
      date: string;
    }[] = await this.bigQuery.queryBigQuery(
      intervals,
      undefined,
      whereStatement,
    );

    const groupDailyCost: Cost = await this.request(
      { group: 'trivago', intervals },
      {
        aggregation: aggregation,
        change: changeOf(aggregation),
        trendline: trendlineOf(aggregation),
        // Optional field on Cost which needs to be supplied in order to see
        // the product breakdown view in the top panel.
        groupedCosts: await this.getGroupedProducts(
          intervals,
          undefined,
          whereStatement,
        ),
      },
    );

    return groupDailyCost;
  }

  async getData(
    id: string,
    intervals: string,
    projectName?: string,
    whereClouse?: string,
  ): Promise<DateAggregation[]> {
    const groupedCosts = await this.bigQuery.getComponent(
      id,
      intervals,
      projectName,
      whereClouse,
    );

    return groupedCosts;
  }

  getGroupedProducts = async (
    intervals: string,
    projectName?: string,
    whereClouse?: string,
  ) => [
    {
      id: 'Cloud Dataflow',
      aggregation: await this.getData(
        'Cloud Dataflow',
        intervals,
        projectName,
        whereClouse,
      ),
    },
    {
      id: 'Compute Engine',
      aggregation: await this.getData(
        'Compute Engine',
        intervals,
        projectName,
        whereClouse,
      ),
    },
    {
      id: 'Cloud Storage',
      aggregation: await this.getData(
        'Cloud Storage',
        intervals,
        projectName,
        whereClouse,
      ),
    },
    {
      id: 'BigQuery',
      aggregation: await this.getData(
        'BigQuery',
        intervals,
        projectName,
        whereClouse,
      ),
    },
    {
      id: 'Cloud SQL',
      aggregation: await this.getData(
        'Cloud SQL',
        intervals,
        projectName,
        whereClouse,
      ),
    },
    {
      id: 'Cloud Spanner',
      aggregation: await this.getData(
        'Cloud Spanner',
        intervals,
        projectName,
        whereClouse,
      ),
    },
    {
      id: 'Cloud Pub/Sub',
      aggregation: await this.getData(
        'Cloud Spanner',
        intervals,
        projectName,
        whereClouse,
      ),
    },
    {
      id: 'Cloud Bigtable',
      aggregation: await this.getData(
        'Cloud Bigtable',
        intervals,
        projectName,
        whereClouse,
      ),
    },
    {
      id: 'Stackdriver Logging',
      aggregation: await this.getData(
        'Stackdriver Logging',
        intervals,
        projectName,
        whereClouse,
      ),
    },
  ];
  // Stackdriver Logging
  async getProjectDailyCost(
    pageFilters: PageFilters,
    intervals: string,
  ): Promise<Cost> {
    const whereStatement = this.getSqlWhereStatement(pageFilters);

    if (pageFilters.project) {
      const project = pageFilters.project;
      const aggregation: {
        amount: number;
        date: string;
      }[] = await this.bigQuery.queryBigQuery(
        intervals,
        project,
        whereStatement,
      );

      const projectDailyCost: Cost = await this.request(
        { project, intervals },
        {
          id: project,
          aggregation: aggregation,
          change: changeOf(aggregation),
          trendline: trendlineOf(aggregation),
          // Optional field on Cost which needs to be supplied in order to see
          // the product breakdown view in the top panel.
          groupedCosts: await this.getGroupedProducts(
            intervals,
            project,
            whereStatement,
          ),
        },
      );

      return projectDailyCost;
    }

    const cost: Cost = { id: '', aggregation: [{ amount: 0, date: '' }] };
    return cost;
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

  async getProductInsights(options2: ProductInsightsOptions): Promise<Entity> {
    const productInsights: Entity = await this.request(
      options2,
      this.entityOf(options2.product),
    );

    return productInsights;
  }

  entityOf(product: string): Entity {
    switch (product) {
      case 'computeEngine':
        return this.SampleComputeEngineInsights;
      // case 'cloudDataflow':
      //   return SampleCloudDataflowInsights;
      // case 'cloudStorage':
      //   return SampleCloudStorageInsights;
      // case 'bigQuery':
      //   return SampleBigQueryInsights;
      // case 'events':
      //   return SampleEventsInsights;
      default:
        throw new Error(
          `Cannot get insights for ${product}. Make sure product matches product property in app-info.yaml`,
        );
    }
  }

  SampleComputeEngineInsights: Entity = {
    id: 'computeEngine',
    aggregation: [80_000, 90_000],
    change: {
      ratio: 0.125,
      amount: 10_000,
    },
    entities: {
      service: [
        {
          id: 'entity-a',
          aggregation: [20_000, 10_000],
          change: {
            ratio: -0.5,
            amount: -10_000,
          },
          entities: {
            SKU: [
              {
                id: 'Sample SKU A',
                aggregation: [4_000, 2_000],
                change: {
                  ratio: -0.5,
                  amount: -2_000,
                },
                entities: {},
              },
              {
                id: 'Sample SKU B',
                aggregation: [7_000, 6_000],
                change: {
                  ratio: -0.14285714285714285,
                  amount: -1_000,
                },
                entities: {},
              },
              {
                id: 'Sample SKU C',
                aggregation: [9_000, 2_000],
                change: {
                  ratio: -0.7777777777777778,
                  amount: -7000,
                },
                entities: {},
              },
            ],
            deployment: [
              {
                id: 'Compute Engine',
                aggregation: [7_000, 6_000],
                change: {
                  ratio: -0.5,
                  amount: -2_000,
                },
                entities: {},
              },
              {
                id: 'Kubernetes',
                aggregation: [4_000, 2_000],
                change: {
                  ratio: -0.14285714285714285,
                  amount: -1_000,
                },
                entities: {},
              },
            ],
          },
        },
        {
          id: 'entity-b',
          aggregation: [10_000, 20_000],
          change: {
            ratio: 1,
            amount: 10_000,
          },
          entities: {
            SKU: [
              {
                id: 'Sample SKU A',
                aggregation: [1_000, 2_000],
                change: {
                  ratio: 1,
                  amount: 1_000,
                },
                entities: {},
              },
              {
                id: 'Sample SKU B',
                aggregation: [4_000, 8_000],
                change: {
                  ratio: 1,
                  amount: 4_000,
                },
                entities: {},
              },
              {
                id: 'Sample SKU C',
                aggregation: [5_000, 10_000],
                change: {
                  ratio: 1,
                  amount: 5_000,
                },
                entities: {},
              },
            ],
            deployment: [
              {
                id: 'Compute Engine',
                aggregation: [7_000, 6_000],
                change: {
                  ratio: -0.5,
                  amount: -2_000,
                },
                entities: {},
              },
              {
                id: 'Kubernetes',
                aggregation: [4_000, 2_000],
                change: {
                  ratio: -0.14285714285714285,
                  amount: -1_000,
                },
                entities: {},
              },
            ],
          },
        },
        {
          id: 'entity-c',
          aggregation: [0, 10_000],
          change: {
            ratio: 10_000,
            amount: 10_000,
          },
          entities: {},
        },
      ],
    },
  };

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

  // entityOf(product: string): Entity {
  //   switch (product) {
  //     case 'computeEngine':
  //       return SampleComputeEngineInsights;
  //     case 'cloudDataflow':
  //       return SampleCloudDataflowInsights;
  //     case 'cloudStorage':
  //       return SampleCloudStorageInsights;
  //     case 'bigQuery':
  //       return SampleBigQueryInsights;
  //     case 'events':
  //       return SampleEventsInsights;
  //     default:
  //       throw new Error(
  //         `Cannot get insights for ${product}. Make sure product matches product property in app-info.yaml`,
  //       );
  //   }
  // }
}
