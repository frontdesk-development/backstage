# This dockerfile builds an image for the backend package.
FROM gcr.io/trv-io-frontdesk-stage/yarn-install-base:latest as build

RUN yarn tsc
RUN yarn workspace example-backend build --build-dependencies

FROM gcr.io/trv-io-frontdesk-stage/frontdesk-backend-base:latest

WORKDIR /app

# Copy the install dependencies from the build stage and context
COPY --from=build /yarn.lock /package.json /packages/backend/dist/skeleton.tar.gz /app-config.yaml ./
RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz

# Copy the built packages from the build stage
COPY --from=build /packages/backend/dist/bundle.tar.gz .
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

RUN yarn install --frozen-lockfile --production --network-timeout 300000 && rm -rf "$(yarn cache dir)"

CMD ["node", "packages/backend", "--config", "app-config.yaml"]
