FROM node:18

COPY . /framework/

WORKDIR /framework

RUN npm i
# extra step required here, the prisma client is required for the indexer to build
# TODO: move this to indexer's pre:build
RUN cd packages/indexer && npm run prisma:generate
RUN npm run build