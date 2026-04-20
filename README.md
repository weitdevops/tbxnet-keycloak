# keycloak-jwt-example

Ejemplo minimo de API en Express que valida JWT emitidos por Keycloak usando `express-oauth2-jwt-bearer`.

## Requisitos

- Node.js 18 o superior
- `npm`

## Instalacion

```bash
npm install
```

## Configuracion

Crear un archivo `.env` en la raiz del proyecto. Podés tomar como base `.env.example`. La app lo carga automaticamente usando `dotenv`.

Variables esperadas:

- `PORT`: puerto HTTP. Default sugerido: `3000`
- `KEYCLOAK_ISSUER_BASE_URL`: issuer del realm de Keycloak
- `KEYCLOAK_AUDIENCE`: audiencia esperada del token

## Ejecutar el proyecto

Modo normal:

```bash
npm start
```

Modo desarrollo con reinicio automatico:

```bash
npm run dev
```

La API levanta por defecto en `http://localhost:3000`.

## Endpoints

### `GET /token-info`

Requiere un bearer token valido. Devuelve informacion util del payload:

- `audience`
- `scope`
- `tenant_id`
- `client_id`
- `expires_at`: fecha y hora de expiracion en formato ISO UTC
- `expires_at_unix`: expiracion original del claim `exp`

### `GET /affiliates`

Requiere el scope `affiliates:read`.

### `POST /affiliates`

Requiere el scope `affiliates:create`.

## Ejemplos de uso

```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/token-info
```

```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/affiliates
```

```bash
curl -X POST -H "Authorization: Bearer <TOKEN>" http://localhost:3000/affiliates
```

## Respuestas de error

- `401`: token ausente o invalido
- `403`: token valido pero sin el scope requerido
