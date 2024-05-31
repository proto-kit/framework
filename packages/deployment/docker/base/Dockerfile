FROM node:18
LABEL authors="protokit.dev"

WORKDIR /src

COPY package*.json .
# This sucks
COPY ./packages/api/package.json ./packages/api/package.json
COPY ./packages/cli/package.json ./packages/cli/package.json
COPY ./packages/common/package.json ./packages/common/package.json
COPY ./packages/deployment/package.json ./packages/deployment/package.json
COPY ./packages/library/package.json ./packages/library/package.json
COPY ./packages/module/package.json ./packages/module/package.json
COPY ./packages/persistance/package.json ./packages/persistance/package.json
COPY ./packages/protocol/package.json ./packages/protocol/package.json
COPY ./packages/sdk/package.json ./packages/sdk/package.json
COPY ./packages/sequencer/package.json ./packages/sequencer/package.json
COPY ./packages/stack/package.json ./packages/stack/package.json

RUN npm i

COPY ./packages/ ./packages
# Copy all files on the top level
COPY ./lerna.json .
COPY ./tsconfig.json .

RUN npm run build

EXPOSE 8080

COPY ./packages/deployment/docker/base/entry.sh ./entry.sh

# Migrate + execute
#ENTRYPOINT ["npm", "run", "migrate", "&&", "node", "--experimental-vm-modules", "--experimental-wasm-modules", "--experimental-wasm-threads", "--es-module-specifier-resolution=node"]
ENTRYPOINT ["./entry.sh"]