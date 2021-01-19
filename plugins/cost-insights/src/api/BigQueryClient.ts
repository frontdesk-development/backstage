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

// import { Memoize } from 'typescript-memoize/src/memoize-decorator';
import { BigQuery } from '@google-cloud/bigquery';

export class BigQueryClass {
  client: BigQuery;
  hashTable: Map<string, { amount: number; date: string }[]>;
  constructor() {
    const credentials = {
      type: 'service_account',
      project_id: 'trv-shared-admin',
      private_key_id: '73923439d3bb6b69f12610a37feab9b03323a67e',
      private_key:
        '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDpXsz4q9sDlAT/\nu62SE6ZxIAhcFSUmQNhbKze0Earzm/IhyLrSnGUmolTUYRFvJkiiUdya2v7lqWjN\nGggNar3l+aASzzyk+l/vSQxOP09GzrTCitBhQ5zkrBCd0VwUoTABW7B/r/XKDupt\nJ6bXycE4IWjANfVg2zdOd8kmnjceucnxifkqE+PDyn0SSRivBdmKOJr39fkpB4Zo\nV+wPOdU5E55p/+RQr02msajQOT5HYimxZZPf3Kbyr6KrJ1jefGyzELmWsbkzWf6P\nX5jt9CBO2rFWATxMcMoYi5INkw/VbIFjd0tEM22bj3ChXURPPdwgkFUFsSIkJAmQ\n6kTvYTu7AgMBAAECggEAROHGfl+7dYLrNtCems9SAXIDBar4HCJnugE3n97XJrCQ\n94fYHPIsqQqhH07HZpdWORMQmmSpeABY/rEAT3WCN69GoEarD8cXKfnVuALX036P\nvBxdBVh/pr9i6DIzi6NIGB6IKig11D4y06UwieDzNy4lTRagJsaNvIt+w/dPLbH4\nnb0g5Dn1NJBXNmbEZK87vujeLQ0HwoE3d8j1RNUj/HtdmPX+S+eLILznwJe4joxh\n2/+z0wEKUWzZWco449rWkRqeMS38AGmGn/aG1DCUEfxXLL8UWR03KcndWkuGSiWS\nAfvyxR0679u/T/THdSwCW+SAWcnroH9ioD7CP3oyAQKBgQD7/POfopOACX71I68z\npBYzFnCoAx/+ghfGtkeYk7ODNeDLcO6/REKF9PLq4fHkQcelLYFt5l7IOq0zsAE6\n8yVVINPFNP2QjIm1+MC/Udbgo9jaL943aALGwHWSfqh2kiJxMCo7emu1j3viOF05\nx1Px+C/DN37io32D3+GM+0As0QKBgQDtFfePFTotVCkSiTOwzUUwiOT/KMbhrByB\nvy+0EU10t50y1hTcLtyzQdZYU3/6cRrUcakS4bY6y5th+gr6Xx2SObaBdaiM1A3O\n68eggi7tDazPMbM0AMhss1WjmxSEOZqTzlNZ4o3pbB7KLd58vdzmB617mEbta1SJ\nFZg/tKcSywKBgQDLXk7Qm0knoIJSHcaciuVPveCV+E+t/BhsS1hlD29lieouxqoo\nu1JlAle6sTej3GLgMGWw6Ke+OXznpjiX9vw+RAwlsKqkKohJ0MTeo5IkIpg1H0Tc\nupjjBxjcblRPvYkGiLTM4/Rhx7dXz92NcA2Tz5Xcm8FP8FqwP9OtEGmuwQKBgBX/\noM3c+V31Xi5DHtG76jybpyvp27Ja5vY/CC0cIeS/mM17wcnAa2gSptHhRZG2Zvfp\nZ/fBi8ge1lcb/WLH6pWD12Rhx3bxwio+BHLnQXVrfGppQSiFHhO//CVHIXs3YRlv\n3poLhIFxL9YwtWE7uMB7W+SI96PV/q0NnOfkWlBLAoGBAM4uvRaIojYu1o3OKmJM\nKM3nsBEZf39tldGT0yAWU/yvP6CnTEWp3oznFSgeGtUDV7ZKocEIivdVjp65ryav\nYK9Jxyxpg5zueIx+lhpUv+mxQ+HbwtGQEdjQEDQIVgazgIj8LnMgkAjhm2VUbOvw\nfgvwZtC9wInECNIGq3T/R1NZ\n-----END PRIVATE KEY-----\n',
      client_email:
        'frontdesk-billing@trv-shared-admin.iam.gserviceaccount.com',
      client_id: '107953899698245323544',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url:
        'https://www.googleapis.com/robot/v1/metadata/x509/frontdesk-billing%40trv-shared-admin.iam.gserviceaccount.com',
    };

    const projectId = 'trv-shared-admin';
    const login = {
      projectId,
      credentials,
    };
    this.client = new BigQuery(login);
    this.hashTable = new Map();
  }

  public async queryBigQuery(
    intervals: string,
    projectName?: string,
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
      const hash = `${projectName};${newDate};${endDate}`;
      // hash projectName,newDate,endDate into struct with value result of query and check if it exists before running it
      const cacheResult = this.hashTable.get(hash);
      if (cacheResult !== undefined) {
        return cacheResult;
      }
      const result = this.runQueryForProject(projectName, newDate, endDate);
      this.hashTable.set(hash, await result);
      return result;
    }
    const hash = `${newDate};${endDate}`;
    const cacheResult = this.hashTable.get(hash);
    if (cacheResult !== undefined) {
      return cacheResult;
    }
    const result = this.runQueryForAll(newDate, endDate);
    this.hashTable.set(hash, await result);
    return result;
  }

  async runQueryForProject(
    projectName: string,
    newDate: string,
    endDate: string,
  ): Promise<{ amount: number; date: string }[]> {
    const query = `SELECT
    CONCAT(EXTRACT(YEAR FROM usage_start_time AT TIME ZONE "UTC"),'-', 
         EXTRACT(MONTH FROM usage_start_time AT TIME ZONE "UTC"),'-', 
         EXTRACT(DAY FROM usage_start_time AT TIME ZONE "UTC")) as date
    ,SUM(cost) as amount
    FROM \`billing.gcp_billing_export_v1_01241D_E5B8D7_0F597A\` 
    WHERE usage_start_time > TIMESTAMP(DATE "${newDate}") AND project.id = \"${projectName}\" AND usage_start_time < TIMESTAMP(DATE "${endDate}")
    GROUP BY date`;

    const result = this.runQuery(query);
    return result;
  }

  async runQueryForAll(
    newDate: string,
    endDate: string,
  ): Promise<{ amount: number; date: string }[]> {
    const query = `SELECT
    CONCAT(EXTRACT(YEAR FROM usage_start_time AT TIME ZONE "UTC"),'-', 
         EXTRACT(MONTH FROM usage_start_time AT TIME ZONE "UTC"),'-', 
         EXTRACT(DAY FROM usage_start_time AT TIME ZONE "UTC")) as date
    ,SUM(cost) as amount
    FROM \`billing.gcp_billing_export_v1_01241D_E5B8D7_0F597A\` 
    WHERE usage_start_time > TIMESTAMP(DATE "${newDate}") AND usage_start_time < TIMESTAMP(DATE "${endDate}")
    GROUP BY date`;

    const result = this.runQuery(query);
    return result;
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
}
