# It should be executed with the root of the repo as docker context.

FROM node:12-buster AS build

RUN mkdir /app
COPY . /app
WORKDIR /app

RUN yarn install