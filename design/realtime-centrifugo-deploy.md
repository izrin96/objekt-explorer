# Centrifugo deploy note

Not applied. Written for the `realtime-centrifugo` change (design §1, §9); apply it in Dokploy as migration step 1, before anything connects.

## Service

`centrifugo` in `docker-compose.yml`: image `centrifugo/centrifugo:v6`, config `centrifugo/config.json` mounted read-only, **container port 8000**, healthcheck `GET /health`. The port is only `expose`d: no host port is published. Local dev gets `127.0.0.1:8000` from `docker-compose.override.yml`, which `docker compose` merges on its own; the Dokploy deploy must name `docker-compose.yml` alone so it is not applied.

## Route

Add one domain to the `centrifugo` service in Dokploy (it writes the Traefik labels):

| Field          | Value                                 |
| -------------- | ------------------------------------- |
| Host           | the site host (the host in `SITE_URL`) |
| Path           | `/connection`                         |
| Container port | `8000`                                |
| Strip path     | off                                   |
| HTTPS          | on, same certificate resolver as web  |

As labels, the same route is:

```
traefik.http.routers.centrifugo.rule=Host(`<site host>`) && PathPrefix(`/connection`)
traefik.http.routers.centrifugo.entrypoints=websecure
traefik.http.routers.centrifugo.tls.certresolver=<resolver web uses>
traefik.http.services.centrifugo.loadbalancer.server.port=8000
```

Traefik picks the longer rule, so `/connection` wins over web's catch-all on the same host. Nothing else is routed: `/api`, `/health`, `/metrics` and the admin UI stay reachable only on the Docker network, where web and the worker call `http://centrifugo:8000`.

Browsers connect to `wss://<site host>/connection/websocket`, so `VITE_CENTRIFUGO_URL` stays unset. If the route needs an idle timeout, Centrifugo pings every 25 seconds.

## Environment

On the `centrifugo` service:

| Variable                          | Value                                                              |
| --------------------------------- | ------------------------------------------------------------------ |
| `SITE_URL`                        | the public origin; becomes `client.allowed_origins`                |
| `CENTRIFUGO_TOKEN_SECRET`         | long random string, not `BETTER_AUTH_SECRET`; the HS256 key        |
| `CENTRIFUGO_API_KEY`              | long random string                                                 |
| `CENTRIFUGO_ENGINE_TYPE`          | `redis`                                                            |
| `CENTRIFUGO_ENGINE_REDIS_ADDRESS` | this stack's own Valkey, e.g. `redis://valkey:6379`, never another stack's |

Without the last two the config runs the memory engine, which drops all history on a restart. Two stacks on one Valkey and prefix deliver each other's publications, so staging and production each get their own address, and neither is taken from `REDIS_URL`.

On `web` and `worker`: `CENTRIFUGO_URL=http://centrifugo:8000` and the same `CENTRIFUGO_API_KEY`; `web` also takes the same `CENTRIFUGO_TOKEN_SECRET`.
