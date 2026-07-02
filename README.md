# Beautyapp Admin

Panel administrativo de Beautyapp (yopi-demo). Lee los mismos datos que el app móvil/web desde Firestore.

## Setup

```bash
cd C:\dev\beautyapp-admin
npm install
cp .env.local.example .env.local  # ya viene uno listo con tu email
npm run dev
```

Abre http://localhost:3000.

### Variables de entorno

`.env.local` (ya creado):
- `NEXT_PUBLIC_ADMIN_EMAILS` — emails autorizados separados por coma. Solo esos cuentas pueden entrar al panel.
- `NEXT_PUBLIC_FB_*` — config del proyecto Firebase `yopi-demo` (mismo que usa el app).

Para sumar admins, edita la coma-list y reinicia `npm run dev`.

## Estructura

```
app/
  page.tsx              ← Resumen
  mapa/page.tsx         ← Mapa de calor de actividad
  profesionales/        ← Listado + inhabilitar/habilitar
  proveedores/
  clientes/
components/
  AuthGate.tsx          ← Bloquea acceso por email
  LoginForm.tsx         ← Google + email/password
  Sidebar.tsx
  UsuariosTable.tsx     ← Tabla genérica reutilizable
  MapaCalor.tsx         ← react-leaflet + leaflet.heat
  HeatLayer.tsx
lib/
  firebase.ts
  auth-context.tsx
  admin-emails.ts
  types.ts              ← COPIA de src/types/models.ts del app
  services/
    usuarios.ts         ← list + setHabilitado
    turnos.ts
    pedidos.ts
```

## Cómo se inhabilita un perfil

| Rol | Acción |
| --- | --- |
| profesional | `perfil.perfilVisible = false` → desaparece de búsquedas |
| proveedor | `perfil.aceptaPedidos = false` → no recibe pedidos |
| cliente | `bloqueado = true` (campo nuevo) |

**Importante para clientes:** este campo `bloqueado` es nuevo. En el app, agregar un check en login/checkout que rechace si `bloqueado === true`. Sugerido en `src/services/auth.service.ts` y `src/services/pedidos.service.ts`.

## Reglas de Firestore — TODO

`firestore.rules` actualmente está vacío en el repo del app. Para que este panel funcione en producción, agregar reglas que:
- Permitan leer cualquier `usuarios/*`, `turnos/*`, `pedidos/*` si `request.auth.token.email` está en una allowlist (o si tiene custom claim `admin`).
- Permitan escribir solo a admins en los campos `perfil.perfilVisible`, `perfil.aceptaPedidos`, `bloqueado`.

Ejemplo mínimo:

```
match /usuarios/{uid} {
  allow read: if isOwner(uid) || isAdmin();
  allow update: if isAdmin();
}

function isAdmin() {
  return request.auth != null
    && request.auth.token.email in [
      "lcasmanmaidana@gmail.com"
    ];
}
```

(Si te interesa, lo dejo armado en una próxima iteración.)

## Roadmap — fases siguientes

La v1 cubre **mapa de calor + gestión de perfiles**. Las próximas tres fases siguen este orden de impacto:

### Fase 2 — Calidad y riesgo (la próxima recomendada)

Vista `/calidad` con:
- **Profesionales en riesgo:** rating < 3, o ≥ 3 cancelaciones en 30d, o ratio `no_asistio / completado` > 0.2.
- **Clientes problemáticos:** ≥ 2 `no_asistio` en 60d.
- **Proveedores con pedidos estancados:** pedidos `pendiente` o `confirmado` con más de 7 días sin pasar a `enviado` / `entregado`.
- **Tendencia de ratings semana a semana** (chart).
- Acción rápida: inhabilitar desde la misma fila.

Servicios nuevos:
- `lib/services/valoraciones.ts` — `listRecent(dias)`, `avgPorProfesional()`.
- En `turnos.ts` agregar `countPorEstadoPorProfesional()`.

### Fase 3 — Salud financiera

Vista `/finanzas`:
- **GMV mensual** (suma de `turnos.completado.monto` + `pedidos.entregado.total`).
- **Comisiones**: cobradas vs pendientes vs vencidas (de la colección `comisiones`).
- **Top 20 profesionales por facturación.**
- **Conversión seña → turno completado** (de los que pagaron `montoSena`, cuántos terminaron `completado`).
- Chart de evolución últimos 6 meses (Recharts).

Servicios:
- `lib/services/comisiones.ts`
- `lib/finanzas.ts` con las agregaciones.

### Fase 4 — Funnel de conversión

Vista `/funnel`:
- **Usuario:** registros → perfil completo → primer turno/pedido → recurrencia (2do en 60d).
- **Turno:** `pendiente_pago` → `pendiente` → `confirmado` → `completado` (con % drop en cada paso).
- **Profesional:** alta → primer servicio cargado → primer turno recibido.

Por ahora todo se hace client-side con los datos en Firestore. Cuando el volumen crezca, mover a Cloud Functions que escriban una colección `metrics_daily` y consumirla desde el panel (mucho más barato y rápido).

## Deploy

Recomendado: Vercel (auto-detect Next.js). Variables de entorno: copiar las de `.env.local` al panel de Vercel.

Alternativa: Firebase Hosting con `firebase-tools` + adapter de Next.js.

## Sincronización de tipos con el app

`lib/types.ts` es una COPIA de `beautyapp/src/types/models.ts`. Cuando cambies modelos en el app, actualiza también este archivo. Si más adelante quieres compartir tipos de verdad, mover a un paquete `@beautyapp/types` (workspaces o pnpm).
