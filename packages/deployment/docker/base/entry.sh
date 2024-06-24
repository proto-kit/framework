#!/bin/bash

if [[ ${DATABASE_URL} ]]; then
  echo "Migrating on ${DATABASE_URL}"
  npm run migrate;
fi
#LOGGING-LEVEL=${LOGGING_LEVEL}
node --experimental-vm-modules --experimental-wasm-modules --experimental-wasm-threads --es-module-specifier-resolution=node $@