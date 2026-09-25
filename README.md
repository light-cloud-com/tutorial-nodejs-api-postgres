# tutorial-nodejs-api-postgres

An Express API with a PostgreSQL database, used in the Light Cloud tutorial
[Add a PostgreSQL database to a Node.js app on Light Cloud](https://blog.light-cloud.com/tutorials/add-postgres-to-nodejs-app).

```mermaid
flowchart LR
  client[Client] -->|HTTPS| api[Express API on Light Cloud]
  api -->|pg Pool, TLS| db[(PostgreSQL on Light Cloud)]
```

`DATABASE_URL` must end with `?sslmode=require&uselibpqcompat=true` for node-postgres.

## Run it

```sh
npm install
DATABASE_URL='postgresql://user:password@host:5432/db?sslmode=require&uselibpqcompat=true' npm start
```
