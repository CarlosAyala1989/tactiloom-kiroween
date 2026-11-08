# Despliegue público

**Estado:** no desplegado. Publicar una URL requiere un servidor, un dominio y cuentas del equipo; no se
realizó en esta sesión. Esta guía es el procedimiento recomendado (no verificado en un servidor público).

## Por qué no serverless

Tactiloom necesita un **worker de larga duración** (cola con leases), un servicio Python con OpenCV y
PostgreSQL. Una plataforma solo serverless no ejecuta el runner continuo. Lo más simple es una VM con Docker.

## Pasos (VM Ubuntu con Docker y un dominio)

1. VM con ≥ 2 vCPU, 4 GB RAM, 20 GB de disco. Abrir solo los puertos 22, 80 y 443.
2. `git clone <repo> && cd <repo> && cp .env.example .env` y fijar:
   - `POSTGRES_PASSWORD`, `SESSION_SECRET` (`openssl rand -hex 32`), `VISION_INTERNAL_TOKEN` (`openssl rand -hex 24`),
     y la misma contraseña en `DATABASE_URL`.
   - `PUBLIC_ORIGIN=https://demo.example.org` (activa la cookie `__Host-…; Secure`).
   - `TRUST_PROXY_HOPS=1` (Caddy añade la IP del cliente a `X-Forwarded-For`).
   - Opcional: `DEMO_MAX_ACTIVE_WORKSPACES`, `DEMO_SESSION_TTL_HOURS`, cuotas.
3. `docker compose up --build -d`. La web queda en `127.0.0.1:3210` (no expuesta directamente).
4. Proxy con HTTPS automático (Caddy en el host):

   ```caddyfile
   demo.example.org {
     encode gzip
     request_body {
       max_size 13MB
     }
     reverse_proxy 127.0.0.1:3210
   }
   ```

5. Verificar: `curl https://demo.example.org/api/health` y `node scripts/smoke.mjs https://demo.example.org`,
   luego `node scripts/abuse-check.mjs https://demo.example.org` (usa HTTP sin TLS: ejecutarlo en la VM contra
   `http://localhost:3210`).
6. Copias de seguridad: el volumen `pgdata` solo contiene datos de demostración con TTL; no hace falta respaldarlo.

## Operación

- Reinicio limpio de la demo (verificado en el stack local de Docker el 2026-11-08: 84 usuarios demo borrados
  en cascada y 19 directorios huérfanos eliminados al reiniciar el runner):

  ```bash
  docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DELETE FROM \"User\" WHERE role = '"'"'DEMO'"'"';"'
  docker compose restart runner   # la limpieza al arrancar borra los directorios del sandbox sin workspace
  ```

  Desde una copia del repositorio con Node también sirve `DATABASE_URL=… pnpm db:reset-demo --yes`.
- Logs estructurados: `docker compose logs -f web runner vision`.
- La limpieza TTL corre en el runner al arrancar y cada `RUNNER_CLEANUP_INTERVAL_MS` (5 min por defecto).
