# This dockerfile builds an image for the backend package.
# It should be executed with the root of the repo as docker context.

FROM node:12-buster AS build

RUN mkdir /app
COPY . /app
WORKDIR /app
RUN mkdir -p /etc/github-admin && touch /etc/github-admin/key.yaml && mkdir -p /etc/trv-shared-admin && touch /etc/trv-shared-admin/key.json

RUN yarn install
RUN yarn tsc
RUN yarn workspace example-backend build --build-dependencies

# Stage 2 - Build the actual backend image and install production dependencies
FROM gcr.io/trv-io-frontdesk-stage/frontdesk-backend-base:latest

WORKDIR /app
RUN mkdir -p /etc/github-admin && touch /etc/github-admin/key.yaml && mkdir -p /etc/trv-shared-admin && touch /etc/trv-shared-admin/key.json
# RUN mkdir /app/test-cred

# Copy the install dependencies from the build stage and context
COPY --from=build /app/yarn.lock /app/package.json /app/packages/backend/dist/skeleton.tar.gz /app/app-config.yaml ./
# COPY --from=build /app/test-cred ./test-cred/ -> DEV credentials
RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz

# Copy the built packages from the build stage
COPY --from=build /app/packages/backend/dist/bundle.tar.gz .
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

RUN yarn install --frozen-lockfile --production --network-timeout 300000 && rm -rf "$(yarn cache dir)"

CMD ["node", "packages/backend", "--config", "app-config.yaml"]
