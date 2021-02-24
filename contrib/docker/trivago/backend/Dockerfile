# This dockerfile builds an image for the backend package.
FROM gcr.io/trv-io-frontdesk-stage/yarn-install-base:latest as build

WORKDIR /app

RUN mkdir -p /etc/github-admin && touch /etc/github-admin/key.yaml && mkdir -p /etc/trv-shared-admin && touch /etc/trv-shared-admin/key.json
RUN yarn tsc
RUN yarn workspace example-backend build --build-dependencies

FROM gcr.io/trv-io-frontdesk-stage/frontdesk-backend-base:latest

WORKDIR /app
RUN mkdir -p /etc/github-admin && touch /etc/github-admin/key.yaml && mkdir -p /etc/trv-shared-admin && touch /etc/trv-shared-admin/key.json

# Copy the install dependencies from the build stage and context
COPY --from=build /app/yarn.lock /app/package.json /app/packages/backend/dist/skeleton.tar.gz /app/app-config.yaml ./
RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz

# Copy the built packages from the build stage
COPY --from=build /app/packages/backend/dist/bundle.tar.gz .
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

RUN yarn install --frozen-lockfile --production --network-timeout 300000 && rm -rf "$(yarn cache dir)"

CMD ["node", "packages/backend", "--config", "app-config.yaml"]