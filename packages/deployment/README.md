### General

This package provides a suite of Dockerfiles and compose files to start protokit
in a variety of settings and modes.

Everything is controlled via `Environments`. 
These are basically bundles of Appchains that are configured for different roles.
Every environment has a name and consists of multiple `Configurations`.

The base image built from `base/Dockerfile` executes any js file and passes in the environment and configuration name as arguments.

Configuration happens via a `.env` file that specifies a few things:
Among those are the profiles that should executed, the DB connection string, and the entrypoints for the different images


##### Currently available services:

- Persistance with 
  - Postgres (profile: `db`)
  - Redis (profiles: `db, worker`)
- Sequencer: `SEQUENCER_CONFIG` (profile: `simple-sequencer`)
- Worker: `WORKER_CONFIG` (profile: `worker`)


- Development-base: Usage for locally built starter-kit, see starter-kit documentation

### Usage

A example of how to use it with a local framework repo can be found under the package `stack`
The configuration of that setup can be found under .env

Executing it works via `docker-compose up --build` run in the `stack` package.

### Extentending deployment compose files

Option 1: Using include and specifying a exported `Environments` configuration

Option 2: Using extend and override the `cmd`

Be aware that including docker-compose files preserves their relationship in terms of relational paths, while extend does not (it behaves like copying the text into the parent file)
