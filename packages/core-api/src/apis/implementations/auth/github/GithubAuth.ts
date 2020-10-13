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

import GithubIcon from '@material-ui/icons/AcUnit';
import { DefaultAuthConnector } from '../../../../lib/AuthConnector';
import { RefreshingAuthSessionManager } from '../../../../lib/AuthSessionManager';
import { GithubSession } from './types';
import {
  OAuthApi,
  SessionApi,
  SessionState,
  ProfileInfo,
  BackstageIdentity,
  AuthRequestOptions,
} from '../../../definitions/auth';
import {
  OAuthRequestApi,
  AuthProvider,
  DiscoveryApi,
} from '../../../definitions';
import { SessionManager } from '../../../../lib/AuthSessionManager/types';
import { Observable } from '../../../../types';

type Options = {
  sessionManager: SessionManager<GithubSession>;
  scopeTransform: (scopes: string[]) => string[];
};

type CreateOptions = {
  discoveryApi: DiscoveryApi;
  oauthRequestApi: OAuthRequestApi;

  environment?: string;
  provider?: AuthProvider & { id: string };
  defaultScopes?: string[];
  scopeTransform?: (scopes: string[]) => string[];
};

export type GithubAuthResponse = {
  providerInfo: {
    accessToken: string;
    scope: string;
    expiresInSeconds: number;
  };
  profile: ProfileInfo;
  backstageIdentity: BackstageIdentity;
};

const DEFAULT_PROVIDER = {
  id: 'github',
  title: 'Github',
  icon: GithubIcon,
};

class GithubAuth implements OAuthApi, SessionApi {
  static create({
    discoveryApi,
    environment = 'development',
    provider = DEFAULT_PROVIDER,
    oauthRequestApi,
    defaultScopes = ['read:user'],
    scopeTransform = x => x,
  }: CreateOptions) {
    const connector = new DefaultAuthConnector({
      discoveryApi,
      environment,
      provider,
      oauthRequestApi: oauthRequestApi,
      sessionTransform(res: GithubAuthResponse): GithubSession {
        return {
          ...res,
          providerInfo: {
            accessToken: res.providerInfo.accessToken,
            scopes: GithubAuth.normalizeScopes(
              scopeTransform,
              res.providerInfo.scope,
            ),
            expiresAt: new Date(
              Date.now() + res.providerInfo.expiresInSeconds * 1000,
            ),
          },
        };
      },
    });

    const sessionManager = new RefreshingAuthSessionManager({
      connector,
      defaultScopes: new Set(defaultScopes),
      sessionScopes: (session: GithubSession) => session.providerInfo.scopes,
      sessionShouldRefresh: (session: GithubSession) => {
        const expiresInSec =
          (session.providerInfo.expiresAt.getTime() - Date.now()) / 1000;
        return expiresInSec < 60 * 5;
      },
    });

    return new GithubAuth({ sessionManager, scopeTransform });
  }

  private readonly sessionManager: SessionManager<GithubSession>;
  private readonly scopeTransform: (scopes: string[]) => string[];

  constructor(options: Options) {
    this.sessionManager = options.sessionManager;
    this.scopeTransform = options.scopeTransform;
  }

  async signIn() {
    await this.getAccessToken();
  }

  async signOut() {
    await this.sessionManager.removeSession();
  }

  sessionState$(): Observable<SessionState> {
    return this.sessionManager.sessionState$();
  }

  async getAccessToken(scope?: string, options?: AuthRequestOptions) {
    const normalizedScopes = GithubAuth.normalizeScopes(
      this.scopeTransform,
      scope,
    );
    const session = await this.sessionManager.getSession({
      ...options,
      scopes: normalizedScopes,
    });
    return session?.providerInfo.accessToken ?? '';
  }

  async getBackstageIdentity(
    options: AuthRequestOptions = {},
  ): Promise<BackstageIdentity | undefined> {
    const session = await this.sessionManager.getSession(options);
    return session?.backstageIdentity;
  }

  async getProfile(options: AuthRequestOptions = {}) {
    const session = await this.sessionManager.getSession(options);
    return session?.profile;
  }

  private static normalizeScopes(
    scopeTransform: (scopes: string[]) => string[],
    scopes?: string | string[],
  ): Set<string> {
    if (!scopes) {
      return new Set();
    }

    const scopeList = Array.isArray(scopes)
      ? scopes
      : scopes.split(/[\s|,]/).filter(Boolean);

    return new Set(scopeTransform(scopeList));
  }
}
export default GithubAuth;
