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
  PageFilters,
  AllResultsComponents,
  Agregation,
} from '../types';
import { OAuthApi, ConfigApi } from '@backstage/core';
import regression, { DataPoint } from 'regression';
import moize from 'moize';
import _ from 'lodash';

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
  memoizedProjects: any;
  backendUrl: string;

  constructor(private readonly googleAuthApi: OAuthApi, configApi: ConfigApi) {
    const url = configApi.getString('backend.baseUrl');
    this.backendUrl = `${url}/api/cost-insights-backend`;

    this.memoizedProjects = moize(
      async (token: string) => await this.getProjects(token),
      { maxAge: MAX_AGE, updateExpire: true },
    );
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

    console.log(response);

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

  async getLabel(label: string, projectId?: string): Promise<Project[]> {
    const response = await fetch(`${this.backendUrl}/labels`, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        label: label,
        projectName: projectId,
      }),
    }).catch(e => {
      throw new Error(`Failed to generate entity definitions, ${e.message}`);
    });
    if (!response.ok) {
      throw new Error(
        `Failed to generate entity definitions. Received http response ${response.status}: ${response.statusText}`,
      );
    }

    const labels = (await response.json()) as Project[];
    return labels;
  }

  async getTierLabels(projectId: string): Promise<Project[]> {
    return this.getLabel('trv-tier', projectId);
  }

  async getPillarLabels(projectId: string): Promise<Project[]> {
    return this.getLabel('trv-pillar', projectId);
  }

  async getDomainLabels(projectId: string): Promise<Project[]> {
    return this.getLabel('trv-domain', projectId);
  }

  async getProductLabels(projectId: string): Promise<Project[]> {
    return this.getLabel('trv-product', projectId);
  }

  async getTeamLabels(projectId: string): Promise<Project[]> {
    return this.getLabel('trv-team', projectId);
  }

  async queryBigQuery(
    intervals: string,
    projectName: string | undefined,
    whereStatement: string | undefined,
  ): Promise<Agregation[]> {
    const response = await fetch(`${this.backendUrl}/queryBigQuery`, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        intervals: intervals,
        projectName: projectName,
        whereStatement: whereStatement,
      }),
    }).catch(e => {
      throw new Error(`Failed to generate entity definitions, ${e.message}`);
    });
    if (!response.ok) {
      throw new Error(
        `Failed to generate entity definitions. Received http response ${response.status}: ${response.statusText}`,
      );
    }

    const aggregation = (await response.json()) as Agregation[];
    return aggregation;
  }
  async getGroupDailyCost(
    pageFilters: PageFilters,
    intervals: string,
  ): Promise<Cost> {
    const whereStatement = this.getSqlWhereStatement(pageFilters);

    const aggregation: Agregation[] = await this.queryBigQuery(
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

  getEmptyAmountArray = function (start: Date, end: Date) {
    let arr = [];
    let dt: Date;
    for (arr = [], dt = start; dt <= end; dt.setDate(dt.getDate() + 1)) {
      const item = {
        date: dt.toISOString().slice(0, 10),
        amount: 0,
        description: '',
      };
      arr.push(item);
    }
    return arr;
  };

  parseIntervals(intervals: string): { startDate: string; endDate: string } {
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

  async getComponent(
    intervals: string,
    projectName: string | undefined,
    whereStatement: string | undefined,
  ): Promise<{ amount: number; date: string; description: string }[]> {
    const response = await fetch(`${this.backendUrl}/getComponent`, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        intervals: intervals,
        projectName: projectName,
        whereStatement: whereStatement,
      }),
    }).catch(e => {
      throw new Error(`Failed to generate entity definitions, ${e.message}`);
    });
    if (!response.ok) {
      throw new Error(
        `Failed to generate entity definitions. Received http response ${response.status}: ${response.statusText}`,
      );
    }

    const groupedCosts = (await response.json()) as {
      amount: number;
      date: string;
      description: string;
    }[];
    return groupedCosts;
  }

  async getData(
    intervals: string,
    projectName?: string,
    whereClouse?: string,
  ): Promise<AllResultsComponents[]> {
    const { endDate, startDate } = this.parseIntervals(intervals);

    const arr = this.getEmptyAmountArray(
      new Date(startDate),
      new Date(endDate),
    );

    const groupedCosts = await this.getComponent(
      intervals,
      projectName,
      whereClouse,
    );

    const allResults = new Array<AllResultsComponents>();

    allResults.push({ id: 'empty', aggregation: arr });

    const groupByDescription = _.groupBy(groupedCosts, 'description');

    for (const description in groupByDescription) {
      if (groupByDescription.hasOwnProperty(description)) {
        const item: AllResultsComponents = {
          id: description,
          aggregation: groupByDescription[description],
        };
        allResults.push(item);
      }
    }

    return allResults;
  }

  getGroupedProducts = async (
    intervals: string,
    projectName?: string,
    whereClouse?: string,
  ) => await this.getData(intervals, projectName, whereClouse);

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
      }[] = await this.queryBigQuery(intervals, project, whereStatement);

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
