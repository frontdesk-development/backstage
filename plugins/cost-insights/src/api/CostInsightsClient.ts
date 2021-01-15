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
  ProjectGrowthData,
  UnlabeledDataflowData,
} from '../types';
import {
  ProjectGrowthAlert,
  UnlabeledDataflowAlert,
} from '../utils/alerts';
import {
  changeOf,
  entityOf,
  getGroupedProducts,
  aggregationFor,
} from '../utils/mockData';
import { OAuthApi } from '@backstage/core';
import { BigQuery } from '@google-cloud/bigquery';
import regression, { DataPoint } from 'regression';
import {
  Trendline,
} from '../types';

const BASE_URL =
  'https://content-cloudresourcemanager.googleapis.com/v1/projects';

function trendlineOf(aggregation: DateAggregation[]): Trendline {
  const data: ReadonlyArray<DataPoint> = aggregation.map(a => [
    Date.parse(a.date) / 1000,
    a.amount,
  ]);
  const result = regression.linear(data, { precision: 5 });
  console.log("result trendline: ",result);
  return {
    slope: result.equation[0],
    intercept: result.equation[1],
  };
}


export class CostInsightsClient implements CostInsightsApi {
  constructor(
    private readonly googleAuthApi: OAuthApi,
  ) {}
  private request(_: any, res: any): Promise<any> {
    return new Promise(resolve => setTimeout(resolve, 0, res));
  }

  getLastCompleteBillingDate(): Promise<string> {
    return Promise.resolve(
      dayjs().subtract(1, 'day').format(DEFAULT_DATE_FORMAT),
    );
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    const groups: Group[] = await this.request({ userId }, [
      { id: 'trivago' },
    ]);

    return groups;
  }

  async getGroupProjects(group: string): Promise<Project[]> {
    console.log("getGroupProjects");
    console.log(group)
    const response = await fetch(BASE_URL, {
      headers: {
        Accept: '*/*',
        Authorization: `Bearer ${await this.getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `List request failed to ${BASE_URL} with ${response.status} ${response.statusText}`,
      );
    }

    const { projects } = await response.json();
    
    let projectArray: Project[] = [];

    Object.keys(projects).forEach(function(key) {
        var y: number = +key;
        const project: Project = {id: projects[key].projectId};
        projectArray[y] = project;

    })
    return projectArray;
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
    console.log("getDailyMetricData");
//     //ESTE HERE DAILY COSTS
//     const credentials = {
//       type: 'authorized_user',
//       // client_id: process.env.AUTH_GOOGLE_CLIENT_ID,
//       // client_secret: config.getString('costInsights.clientId'),
//       client_secret: "7YKNbSy2DB-911wvCztoc2WE",
//       client_id: "629320124986-6un2qdolksrcptv0jsm22g4rpq4nj9bt.apps.googleusercontent.com",
//       // client_id: config.getString('costInsights.clientSecret'),
//       // client_secret: process.env.AUTH_GOOGLE_CLIENT_SECRET,
//       access_token: await this.googleAuthApi.getAccessToken(),
//       client_email: "esteban.barrios@trivago.com",
//       refresh_token: await this.googleAuthApi.getAccessToken(),
//     };

//     const projectId = "trv-shared-admin";
//     const login = {
//       projectId,
//       credentials,
//     }

//     const bigquery = new BigQuery(login);

//    const query = `SELECT
//    CONCAT(EXTRACT(YEAR FROM usage_start_time AT TIME ZONE "UTC"),'-', 
//           EXTRACT(MONTH FROM usage_start_time AT TIME ZONE "UTC"),'-', 
//           EXTRACT(DAY FROM usage_start_time AT TIME ZONE "UTC")) as date
//    ,SUM(cost) + IFNULL(SUM((SELECT SUM(amount) FROM UNNEST(credits))),0) as amount
//  FROM \`billing.gcp_billing_export_v1_01241D_E5B8D7_0F597A\` 
//  WHERE _PARTITIONTIME > TIMESTAMP(DATE_ADD(CURRENT_DATE(), INTERVAL -90 DAY))
//  GROUP BY date`;

//     const options = {
//       query: query,
//       // Location must match that of the dataset(s) referenced in the query.
//       location: 'EU',
//     };

//     const [job] = await bigquery.createQueryJob(options)

//     let [rows] = await job.getQueryResults()

//     rows.forEach(row => {
//       let newDate = row.date.split('-');
//       if (newDate[1] < 10) {
//         newDate[1] = '0'+newDate[1];
//       }
//       if (newDate[2] < 10) {
//         newDate[2] = '0'+newDate[2];
//       }
//       row.date = newDate.join('-');
//     });

//     const aggregation: {amount: number, date: string}[] = rows.map(entry => (
//       {
//         date: entry.date,
//         amount: Math.round(entry.amount),
//     }));

//     console.log("Rows:",rows);

//     // const aggregation = aggregationFor(intervals, 100_000).map(entry => ({
//     //   ...entry,
//     //   amount: Math.round(entry.amount),
//     // }));
//     console.log("change:",changeOf(aggregation));
//     console.log("trendline:",trendlineOf(aggregation));

//     console.log("metric:",metric);
//     console.log("interval:",intervals);
    const aggregation: {amount: number, date: string}[] = []
    const cost: MetricData = await this.request(
      { metric, intervals },
      {
        format: 'number',
        aggregation: aggregation,
        change: changeOf(aggregation),
        trendline: trendlineOf(aggregation),
      },
    );

    console.log("Cost:",cost);

    return cost;
  }


  async getGroupDailyCost(group: string, intervals: string): Promise<Cost> {
    console.log("getGroupDailyCost");
    const credentials = {
      type: 'authorized_user',
      client_secret: "7YKNbSy2DB-911wvCztoc2WE",
      client_id: "629320124986-6un2qdolksrcptv0jsm22g4rpq4nj9bt.apps.googleusercontent.com",
      access_token: await this.googleAuthApi.getAccessToken(),
      client_email: "esteban.barrios@trivago.com",
      refresh_token: await this.googleAuthApi.getAccessToken(),
    };

    const projectId = "trv-shared-admin";
    const login = {
      projectId,
      credentials,
    }

    const bigquery = new BigQuery(login);

   const query = `SELECT
   CONCAT(EXTRACT(YEAR FROM usage_start_time AT TIME ZONE "UTC"),'-', 
          EXTRACT(MONTH FROM usage_start_time AT TIME ZONE "UTC"),'-', 
          EXTRACT(DAY FROM usage_start_time AT TIME ZONE "UTC")) as date
   ,SUM(cost) + IFNULL(SUM((SELECT SUM(amount) FROM UNNEST(credits))),0) as amount
 FROM \`billing.gcp_billing_export_v1_01241D_E5B8D7_0F597A\` 
 WHERE _PARTITIONTIME > TIMESTAMP(DATE_ADD(CURRENT_DATE(), INTERVAL -180 DAY))
 GROUP BY date`;

    const options = {
      query: query,
      // Location must match that of the dataset(s) referenced in the query.
      location: 'EU',
    };

    const [job] = await bigquery.createQueryJob(options)

    let [rows] = await job.getQueryResults()

    rows.forEach(row => {
      let newDate = row.date.split('-');
      if (newDate[1] < 10) {
        newDate[1] = '0'+newDate[1];
      }
      if (newDate[2] < 10) {
        newDate[2] = '0'+newDate[2];
      }
      row.date = newDate.join('-');
    });

    const aggregation: {amount: number, date: string}[] = rows.map(entry => (
      {
        date: entry.date,
        amount: Math.round(entry.amount),
    }));

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
    console.log("getProjectDailyCost");
    const aggregation: {amount: number, date: string}[] = []
    // const aggregation = aggregationFor(intervals, 1_500);
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
    console.log("getProductInsights");

  //   const credentials = {
  //     type: 'authorized_user',
  //     // client_id: process.env.AUTH_GOOGLE_CLIENT_ID,
  //     // client_secret: config.getString('costInsights.clientId'),
  //     client_secret: "7YKNbSy2DB-911wvCztoc2WE",
  //     client_id: "629320124986-6un2qdolksrcptv0jsm22g4rpq4nj9bt.apps.googleusercontent.com",
  //     // client_id: config.getString('costInsights.clientSecret'),
  //     // client_secret: process.env.AUTH_GOOGLE_CLIENT_SECRET,
  //     access_token: await this.googleAuthApi.getAccessToken(),
  //     client_email: "esteban.barrios@trivago.com",
  //     refresh_token: await this.googleAuthApi.getAccessToken(),
  //   };

  //   const projectId = "trv-shared-admin";
  //   const login = {
  //     projectId,
  //     credentials,
  //   }

  //   const bigquery = new BigQuery(login);

  //  const query = `SELECT * FROM \`billing.gcp_billing_export_v1_01241D_E5B8D7_0F597A\`, UNNEST(project.labels) as l
  // WHERE (project.id = "trv-dco-playground" AND l.key="trv-tier" AND l.value="playground") LIMIT 10`;

  //   const options = {
  //     query: query,
  //     // Location must match that of the dataset(s) referenced in the query.
  //     location: 'EU',
  //   };

  //   const [job] = await bigquery.createQueryJob(options)

  //   const [rows] = await job.getQueryResults()

  //   rows.forEach(row => console.log(row));

    const productInsights: Entity = await this.request(
      options2,
      entityOf(options2.product),
    );

    return productInsights;
  }

  //entityOf should be replace by the real reading of the config ESTE ESTE

  async getAlerts(group: string): Promise<Alert[]> {
    console.log("getAlerts");
    const projectGrowthData: ProjectGrowthData = {
      project: 'example-project',
      periodStart: '2020-Q2',
      periodEnd: '2020-Q3',
      aggregation: [60_000, 120_000],
      change: {
        ratio: 1,
        amount: 60_000,
      },
      products: [
        { id: 'Compute Engine', aggregation: [58_000, 118_000] },
        { id: 'Cloud Dataflow', aggregation: [1200, 1500] },
        { id: 'Cloud Storage', aggregation: [800, 500] },
      ],
    };

    const unlabeledDataflowData: UnlabeledDataflowData = {
      periodStart: '2020-09-01',
      periodEnd: '2020-09-30',
      labeledCost: 6_200,
      unlabeledCost: 7_000,
      projects: [
        {
          id: 'example-project-1',
          unlabeledCost: 5_000,
          labeledCost: 3_000,
        },
        {
          id: 'example-project-2',
          unlabeledCost: 2_000,
          labeledCost: 3_200,
        },
      ],
    };

    const alerts: Alert[] = await this.request({ group }, [
      new ProjectGrowthAlert(projectGrowthData),
      new UnlabeledDataflowAlert(unlabeledDataflowData),
    ]);

    return alerts;
  }
}
