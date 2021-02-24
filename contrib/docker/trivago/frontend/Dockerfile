# This dockerfile builds an image for the backend package.
# It should be executed with the root of the repo as docker context.

FROM node:14-buster-slim AS build

RUN mkdir /app
COPY . /app
WORKDIR /app

RUN yarn install
RUN echo "Building Frontend..." 
RUN yarn workspace example-app build

# Contruct frontdesk-frontend image
FROM nginx:mainline

RUN apt-get update && apt-get -y install jq && rm -rf /var/lib/apt/lists/*

# Copy from build stage
COPY --from=build /app/packages/app/dist /usr/share/nginx/html

COPY docker/default.conf.template /etc/nginx/conf.d/default.conf.template
COPY docker/run.sh /usr/local/bin/run.sh

CMD run.sh

ENV PORT 80