# Keycloak JWT Example 🔐

Ejemplo de API en **Express** que valida access tokens emitidos por **Keycloak** y aplica autorización por roles de cliente usando `express-oauth2-jwt-bearer`.

El proyecto modela un escenario multi-tenant simple: cada partner obtiene tokens machine-to-machine, el `aud` del token identifica el tenant, y los permisos se expresan en `resource_access` por API.

## Qué incluye 🚀

- API HTTP con endpoints protegidos por JWT.
- Validación de issuer, firma y expiración del token contra Keycloak.
- Autorización por roles en `resource_access`.
- Docker Compose para levantar Keycloak local.
- Scripts para crear APIs, partners, grupos de tenants y probar token exchange.
- Tests de integración usando `node:test`.

## Arquitectura de la solución 🧩

```text
Partner / Developer
        |
        | 1. Solicita access_token a Keycloak
        v
Keycloak Realm
        |
        | 2. Emite JWT con aud + resource_access
        v
Express API
        |
        | 3. Valida token y roles requeridos
        v
Endpoints protegidos
```

### Flujo de autenticación

1. Un cliente obtiene un `access_token` desde Keycloak.
2. La API recibe el token en el header `Authorization: Bearer <TOKEN>`.
3. `express-oauth2-jwt-bearer` valida el token usando el `issuer` configurado.
4. La API extrae el tenant desde el claim `aud`.
5. Cada endpoint verifica que el token tenga el rol requerido dentro de `resource_access`.

Ejemplo de claims relevantes:

```json
{
  "aud": "direct-tv",
  "azp": "direct-tv",
  "resource_access": {
    "affiliates-api": {
      "roles": ["affiliates:read"]
    },
    "cloudpay-api": {
      "roles": ["payments:get"]
    }
  }
}
```

## Requisitos 📦

- Node.js 18 o superior.
- `npm`.
- Docker y Docker Compose, si querés levantar Keycloak local.

## Instalación ⚙️

```bash
npm install
```

## Levantar Keycloak local 🐳

```bash
docker compose up -d
```

Keycloak queda disponible en:

- Admin Console: `http://localhost:8080`
- Usuario admin: `admin`
- Password admin: `admin`

> El contenedor usa `start-dev`, pensado para desarrollo local.

## Configuración 🔧

Creá un archivo `.env` en la raíz del proyecto. Podés tomar como base `.env.example`:

```bash
cp .env.example .env
```

Variables esperadas:

- `PORT`: puerto HTTP de la API. Default sugerido: `3000`.
- `KEYCLOAK_ISSUER_BASE_URL`: issuer del realm, por ejemplo `http://localhost:8080/realms/<realm>`.
- `KEYCLOAK_ADMIN_URL`: URL base de Keycloak, por ejemplo `http://localhost:8080`.
- `KEYCLOAK_ADMIN_CLIENT_ID`: client usado por los scripts administrativos.
- `KEYCLOAK_ADMIN_CLIENT_SECRET`: secret del client administrativo.
- `KEYCLOAK_REALM`: realm donde se crean clients, roles y grupos.
- `DEVELOPER_PORTAL_SECRET`: secret del client `developer-portal`, usado para token exchange.
- `TEST_PARTNER_CLIENT_ID`: client id de un partner de prueba.
- `TEST_PARTNER_CLIENT_SECRET`: secret del partner de prueba.

## Preparar datos en Keycloak 🛠️

Crear los clients que representan las APIs y sus roles:

```bash
node scripts/setup-api-clients.js
```

Esto configura:

- `affiliates-api`: `affiliates:read`, `affiliates:create`, `affiliates:commission`.
- `cloudpay-api`: `payments:get`, `payments:create`, `payments:refund`.

Crear un partner con roles específicos:

```bash
node scripts/create-partner.js direct-tv "affiliates:read,affiliates:create" "payments:get"
```

Crear partners en lote desde CSV:

```bash
node scripts/bulk-create-partners.js partners-sample.csv
```

El proceso genera `bulk-credentials.csv` con las credenciales creadas y `bulk-errors.json` si hubo errores.

## Ejecutar la API ▶️

Modo normal:

```bash
npm start
```

Modo desarrollo con reinicio automático:

```bash
npm run dev
```

La API levanta por defecto en `http://localhost:3000`.

## Endpoints 📡

### `GET /token-info`

Requiere un bearer token válido. Devuelve información útil del token:

- `tenant`: tenant extraído desde `aud`.
- `azp`: authorized party del token.
- `email`: email del usuario, si está presente.
- `expires_at`: fecha y hora de expiración en formato ISO UTC.
- `resource_access`: roles disponibles por client/API.
- `scope`: scopes del token, si están presentes.

### `GET /affiliates`

Requiere rol `affiliates:read` en `affiliates-api`.

### `POST /affiliates`

Requiere rol `affiliates:create` en `affiliates-api`.

### `GET /payments`

Requiere rol `payments:get` en `cloudpay-api`.

### `POST /payments`

Requiere rol `payments:create` en `cloudpay-api`.

## Ejemplos de uso 🧪

Consultar información del token:

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3000/token-info
```

Consultar affiliates:

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3000/affiliates
```

Crear affiliate:

```bash
curl -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  http://localhost:3000/affiliates
```

Consultar payments:

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3000/payments
```

## Cliente machine-to-machine 🤖

El script `scripts/m2m-client-example.js` muestra cómo pedir tokens con `client_credentials`, cachearlos hasta su expiración y llamar a la API:

```bash
node scripts/m2m-client-example.js
```

Usa las variables:

- `TEST_PARTNER_CLIENT_ID`
- `TEST_PARTNER_CLIENT_SECRET`

## Token exchange para Developer Portal 🔁

El proyecto también incluye una prueba de token exchange para un client `developer-portal`.

Configurar el client:

```bash
node scripts/setup-developer-portal.js
```

Ejecutar token exchange:

```bash
node scripts/token-exchange.js <subjectToken> <targetAudience>
```

Ejemplo:

```bash
node scripts/token-exchange.js eyJhbGciOi... direct-tv
```

La idea es intercambiar un token de usuario por un token dirigido a un tenant específico, validando acceso por pertenencia a grupos `tenant:<audience>`.

## Gestión de grupos 👥

Crear grupo de tenant:

```bash
node scripts/setup-groups.js create-group direct-tv
```

Agregar developer a un tenant:

```bash
node scripts/setup-groups.js add-dev developer@example.com direct-tv
```

Listar tenants de un developer:

```bash
node scripts/setup-groups.js list-dev developer@example.com
```

Remover developer de un tenant:

```bash
node scripts/setup-groups.js remove-dev developer@example.com direct-tv
```

## Tests ✅

Los tests son de integración: requieren Keycloak configurado, la API corriendo y credenciales válidas en `.env`.

En una terminal:

```bash
npm run dev
```

En otra terminal:

```bash
npm test
```

## Respuestas de error ⚠️

- `401 Unauthorized`: token ausente, malformado, expirado o inválido.
- `403 Forbidden`: token válido, pero sin el rol requerido para el endpoint.

Ejemplo de respuesta `403`:

```json
{
  "error": "forbidden",
  "message": "Requiere rol \"affiliates:create\" en \"affiliates-api\"",
  "required_role": "affiliates:create",
  "api": "affiliates-api"
}
```

## Notas de seguridad 🔒

- No commitear `.env`, secrets ni archivos de credenciales reales.
- Usar `start-dev` de Keycloak solo en entornos locales.
- Rotar los `client_secret` si fueron compartidos o expuestos.
- En producción, configurar HTTPS, realms separados por ambiente y políticas de autorización revisadas.
