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
import { CostInsightsApi, ProductInsightsOptions } from '../src/api';
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
  AllResultsProjects,
} from '../src/types';
import { OAuthApi, ConfigApi } from '@backstage/core';
import regression, { DataPoint } from 'regression';
import moize from 'moize';
import _ from 'lodash';

const BASE_URL =
  'https://content-cloudresourcemanager.googleapis.com/v1/projects';

const MAX_AGE = 1000 * 60 * 10; // 10 min
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
  trendlineOf(aggregation: DateAggregation[]): Trendline {
    if (aggregation.length === 0) {
      return {
        slope: 0,
        intercept: 0,
      };
    }
    const sortedAggregation = aggregation.sort((a, b) =>
      a.date > b.date ? 1 : -1,
    );
    const data: ReadonlyArray<DataPoint> = sortedAggregation.map(a => [
      Date.parse(a.date) / 1000,
      a.amount,
    ]);
    const result = regression.linear(data, { precision: 5 });
    return {
      slope: result.equation[0],
      intercept: result.equation[1],
    };
  }

  changeOf(aggregation: DateAggregation[]): ChangeStatistic {
    const firstAmount = aggregation.length ? aggregation[0].amount : 0;
    const lastAmount = aggregation.length
      ? aggregation[aggregation.length - 1].amount
      : 0;
    const ratio =
      firstAmount !== 0 ? (lastAmount - firstAmount) / firstAmount : 0;
    return {
      ratio: ratio,
      amount: lastAmount - firstAmount,
    };
  }

  getSqlWhereStatement(pageFilters: PageFilters): string {
    let whereClouse = ' ';
    if (pageFilters.pillarLabel) {
      if (whereClouse.length === 1) {
        whereClouse = 'AND ';
      }
      whereClouse = `${whereClouse}trv_pillar=\"${pageFilters.pillarLabel}\"`;
    }

    if (pageFilters.productLabel) {
      if (whereClouse.length > 0) {
        whereClouse = `${whereClouse}AND `;
      }
      whereClouse = `${whereClouse}trv_product=\"${pageFilters.productLabel}\"`;
    }

    if (pageFilters.domainLabel) {
      if (whereClouse.length > 0) {
        whereClouse = `${whereClouse}AND `;
      }
      whereClouse = `${whereClouse}trv_domain=\"${pageFilters.domainLabel}\"`;
    }

    if (pageFilters.teamLabel) {
      if (whereClouse.length > 0) {
        whereClouse = `${whereClouse}AND `;
      }
      whereClouse = `${whereClouse}trv_team=\"${pageFilters.teamLabel}\"`;
    }

    if (pageFilters.tierLabel) {
      if (whereClouse.length > 0) {
        whereClouse = `${whereClouse}AND `;
      }
      whereClouse = `${whereClouse}trv_tier=\"${pageFilters.tierLabel}\"`;
    }
    return whereClouse;
  }

  getLastCompleteBillingDate(): Promise<string> {
    return Promise.resolve(
      dayjs().subtract(1, 'day').format(DEFAULT_DATE_FORMAT),
    );
  }

  async getUserGroups(_userId: string): Promise<Group[]> {
    const groups: Group[] = [{ id: 'trivago' }];

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
    return this.getLabel('trv_tier', projectId);
  }

  async getPillarLabels(projectId: string): Promise<Project[]> {
    return this.getLabel('trv_pillar', projectId);
  }

  async getDomainLabels(projectId: string): Promise<Project[]> {
    return this.getLabel('trv_domain', projectId);
  }

  async getProductLabels(projectId: string): Promise<Project[]> {
    return this.getLabel('trv_product', projectId);
  }

  async getTeamLabels(projectId: string): Promise<Project[]> {
    return this.getLabel('trv_team', projectId);
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

    const groupDailyCost: Cost = {
      id: 'trivago',
      aggregation: aggregation,
      change: this.changeOf(aggregation),
      trendline: this.trendlineOf(aggregation),
      // Optional field on Cost which needs to be supplied in order to see
      // the product breakdown view in the top panel.
      groupedCosts: {
        product: await this.getGroupedProducts(
          intervals,
          undefined,
          whereStatement,
        ),
        project: await this.getGroupedProjects(intervals, whereStatement),
      },
    };

    return groupDailyCost;
  }

  getEmptyAmountComponentArray = function (start: Date, end: Date) {
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

  getEmptyAmountProjectArray = function (start: Date, end: Date) {
    let arr = [];
    let dt: Date;
    for (arr = [], dt = start; dt <= end; dt.setDate(dt.getDate() + 1)) {
      const item = {
        date: dt.toISOString().slice(0, 10),
        amount: 0,
        projectName: '',
      };
      arr.push(item);
    }
    return arr;
  };

  getEmptyAmountAllArray = function (start: Date, end: Date) {
    let arr = [];
    let dt: Date;
    for (arr = [], dt = start; dt <= end; dt.setDate(dt.getDate() + 1)) {
      const item = {
        date: dt.toISOString().slice(0, 10),
        amount: 0,
        description: 'empty',
      };
      arr.push(item);
    }
    return arr;
  };

  parseIntervals(intervals: string): { startDate: string; endDate: string } {
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

  async getProjectsCosts(
    intervals: string,
    whereStatement: string | undefined,
  ): Promise<{ amount: number; date: string; projectName: string }[]> {
    const { endDate, startDate } = this.parseIntervals(intervals);

    const arr = this.getEmptyAmountProjectArray(
      new Date(startDate),
      new Date(endDate),
    );

    const response = await fetch(`${this.backendUrl}/getProjectsCosts`, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        intervals: intervals,
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
      projectName: string;
    }[];

    groupedCosts.push(...arr);

    groupedCosts.forEach(function (costs) {
      if (costs.projectName === null) {
        costs.projectName = 'base-costs';
      }
    });

    return groupedCosts;
  }

  async getComponent(
    intervals: string,
    projectName: string | undefined,
    whereStatement: string | undefined,
  ): Promise<{ amount: number; date: string; description: string }[]> {
    const { endDate, startDate } = this.parseIntervals(intervals);

    const arr = this.getEmptyAmountAllArray(
      new Date(startDate),
      new Date(endDate),
    );

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

    groupedCosts.push(...arr);

    return groupedCosts;
  }

  async getGroupedProjects(
    intervals: string,
    whereClouse?: string,
  ): Promise<AllResultsProjects[]> {
    const { endDate, startDate } = this.parseIntervals(intervals);

    const arr = this.getEmptyAmountProjectArray(
      new Date(startDate),
      new Date(endDate),
    );

    const groupedCostsByProject = await this.getProjectsCosts(
      intervals,
      whereClouse,
    );

    const allGroupedProjects = new Array<AllResultsProjects>();

    allGroupedProjects.push({ id: '', aggregation: arr });

    const groupByProject = _.groupBy(groupedCostsByProject, 'projectName');

    for (const projectName in groupByProject) {
      if (groupByProject.hasOwnProperty(projectName)) {
        const item: AllResultsProjects = {
          id: projectName,
          aggregation: groupByProject[projectName],
        };
        allGroupedProjects.push(item);
      }
    }

    return allGroupedProjects;
  }

  async getGroupedProducts(
    intervals: string,
    projectName?: string,
    whereClouse?: string,
  ): Promise<AllResultsComponents[]> {
    const { endDate, startDate } = this.parseIntervals(intervals);

    const arr = this.getEmptyAmountComponentArray(
      new Date(startDate),
      new Date(endDate),
    );

    const groupedCosts = await this.getComponent(
      intervals,
      projectName,
      whereClouse,
    );

    const allGroupedProducts = new Array<AllResultsComponents>();

    allGroupedProducts.push({ id: 'empty', aggregation: arr });

    const groupByDescription = _.groupBy(groupedCosts, 'description');

    for (const description in groupByDescription) {
      if (groupByDescription.hasOwnProperty(description)) {
        const item: AllResultsComponents = {
          id: description,
          aggregation: groupByDescription[description],
        };
        allGroupedProducts.push(item);
      }
    }

    return allGroupedProducts;
  }

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

      const projectDailyCost: Cost = {
        id: project,
        aggregation: aggregation,
        change: this.changeOf(aggregation),
        trendline: this.trendlineOf(aggregation),
        // Optional field on Cost which needs to be supplied in order to see
        // the product breakdown view in the top panel.
        groupedCosts: {
          product: await this.getGroupedProducts(
            intervals,
            undefined,
            whereStatement,
          ),
        },
      };

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
    const cost: MetricData = {
      id: `${metric}-${intervals}`,
      format: 'number',
      aggregation: aggregation,
      change: this.changeOf(aggregation),
    };

    return cost;
  }

  async getAlerts(_group: string): Promise<Alert[]> {
    const alerts: Alert[] = [];

    return alerts;
  }

  async getProductInsights(_options2: ProductInsightsOptions): Promise<Entity> {
    const aggregation: { amount: number; date: string }[] = [];
    const entity: Entity = {
      aggregation: [0, 0],
      change: this.changeOf(aggregation),
      entities: {},
      id: '',
    };

    return entity;
  }
}
