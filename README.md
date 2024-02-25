![Replicache logo](https://uploads-ssl.webflow.com/623a2f46e064937599256c2d/6269e72c61073c3d561a5015_Lockup%20v2.svg)

# todo-row-versioning

This is a demonstration of the [Row Version Strategy](https://doc.replicache.dev/strategies/row-version).

It implements the classic TodoMVC app, with one difference:

<img src="share.png" width="400">

It supports sharing. You can create multiple lists, and share different lists with different users.

Try it out at: https://todo-row-versioning.onrender.com/.

The sharing is completely dynamic: when somebody shares something with you, it syncs to you automatically. When they unshare it, it disappears.

What's more the sharing is "real". You only sync the data you actually have access to. The subset of data you sync changes dynamically based on what is shared with you.

This is a simple demonstration of a more general concept: With Row Versioning the data that is synced can be any arbitrary query of the database. The data that is synced is call the sync _extent_. Each user, or even each device can have its own extent, and it can change at any time.

The server will correctly send to the requesting client the difference from its last pull, even if the only thing that changed was the extent and the underlying data is the same.

## Notes

- In this demo, the _Client View Records_ -- the caches of responses previously sent to clients -- are stored in server process memory. This works fine for a single-node server like this demo, but for a distributed server (or serverless) you'll need to store these in something like Redis. It's OK if they time out, the worst that will happen is the client will do a full sync.
- The extent is stored in this demo per-user (across the user's tabs). This is accomplished by storing the extent in a Replicache entry that is also synced. The extent is changed with a mutator, just like any other Replicache data.

## 1. Setup

#### Install Postgres

You will need a local Postgres database to use this sample.
On MacOS, we recommend [Postgres.app](https://postgresapp.com/).

#### Get your Replicache License Key

```bash
$ npx replicache get-license
```

#### Set your `VITE_REPLICACHE_LICENSE_KEY` environment variable

```bash
$ export VITE_REPLICACHE_LICENSE_KEY="<your license key>"
```

#### Install and Build

```bash
$ npm install; npm run build;
```

## 2. Develop

#### Create a new, empty database

```bash
psql -c 'create database todo'
```

### Start frontend and backend watcher

```bash
$ DATABASE_URL='postgresql://localhost/todo' npm run watch --ws
```

Provides an example integrating replicache with react in a simple todo application.

## Deploying to Render

A render blueprint example is provided to deploy the application.

Open the `render.yaml` file and add your license key

```
- key: VITE_REPLICACHE_LICENSE_KEY
    value: <license_key>
```

Commit the changes and follow the direction on [Deploying to Render](https://doc.replicache.dev/deploy-render)
/client
/shared
/server
package.json
