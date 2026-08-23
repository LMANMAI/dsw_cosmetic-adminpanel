/**
 * Otorga rol de admin a una o más cuentas.
 *
 * Usa el Admin SDK, que ignora las reglas de Firestore. Es la única forma
 * de crear el PRIMER admin: las reglas impiden que un usuario se asigne
 * rol 'admin' a sí mismo, justamente para que nadie pueda autopromoverse.
 *
 * ── Requisitos ────────────────────────────────────────────────────────────
 *   npm i -D firebase-admin
 *
 *   Una service account key del proyecto:
 *     Firebase Console → ⚙ Configuración del proyecto → Cuentas de servicio
 *     → Generar nueva clave privada
 *
 * ── Uso ───────────────────────────────────────────────────────────────────
 *   # emails desde NEXT_PUBLIC_ADMIN_EMAILS de .env.local
 *   node scripts/seed-admins.mjs --key ./claves/yofi-prod-sa.json
 *
 *   # o explícitos
 *   node scripts/seed-admins.mjs --key ./claves/yofi-prod-sa.json ana@x.com
 *
 *   # sin confirmación interactiva (CI)
 *   node scripts/seed-admins.mjs --key ./claves/sa.json --yes
 *
 * También acepta la key por GOOGLE_APPLICATION_CREDENTIALS en vez de --key.
 *
 * NO hay contraseñas en este archivo. Si una cuenta todavía no existe en
 * Authentication, se crea con una contraseña aleatoria que se imprime UNA
 * vez por consola — cambiala apenas entres. Si la persona va a entrar con
 * Google, ni siquiera necesita contraseña: que se loguee una vez primero y
 * después corré este script.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);

const flag = (nombre) => {
  const i = argv.indexOf(nombre);
  return i === -1 ? null : argv[i + 1];
};
const tiene = (nombre) => argv.includes(nombre);

// ─── Service account ──────────────────────────────────────────────────────

const keyPath = flag('--key') ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error('\n✗ Falta la service account key.');
  console.error('  Pasala con --key ./ruta/sa.json o en GOOGLE_APPLICATION_CREDENTIALS.\n');
  process.exit(1);
}

let credencial;
try {
  credencial = JSON.parse(readFileSync(resolve(keyPath), 'utf8'));
} catch {
  console.error(`\n✗ No pude leer la key en "${keyPath}".\n`);
  process.exit(1);
}

// ─── Emails ───────────────────────────────────────────────────────────────

let emails = argv.filter((a) => a.includes('@'));

if (emails.length === 0) {
  try {
    const envPath = resolve(__dirname, '..', '.env.local');
    const m = readFileSync(envPath, 'utf8').match(/^\s*NEXT_PUBLIC_ADMIN_EMAILS\s*=\s*(.*)$/m);
    emails = (m?.[1] ?? '')
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.includes('@'));
  } catch {
    /* sin .env.local */
  }
}

if (emails.length === 0) {
  console.error('\n✗ No hay emails. Pasalos como argumentos o definí');
  console.error('  NEXT_PUBLIC_ADMIN_EMAILS en .env.local.\n');
  process.exit(1);
}

// ─── Confirmación ─────────────────────────────────────────────────────────

console.log('');
console.log(`  Proyecto : ${credencial.project_id}`);
console.log(`  Admins   : ${emails.join(', ')}`);
console.log('');

if (!tiene('--yes')) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const rta = await rl.question('  ¿Dar rol admin en ESTE proyecto? (escribí "si"): ');
  rl.close();
  if (rta.trim().toLowerCase() !== 'si') {
    console.log('\n  Cancelado.\n');
    process.exit(0);
  }
  console.log('');
}

// ─── Ejecución ────────────────────────────────────────────────────────────

const app = initializeApp({ credential: cert(credencial) });
const auth = getAuth(app);
const db = getFirestore(app);

let ok = 0;

for (const email of emails) {
  try {
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log(`· ${email} — cuenta existente (${user.uid})`);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
      const password = randomBytes(12).toString('base64url');
      user = await auth.createUser({ email, password, emailVerified: false });
      console.log(`✓ ${email} — cuenta CREADA (${user.uid})`);
      console.log(`  contraseña temporal: ${password}`);
      console.log('  ↳ cambiala apenas entres; no queda guardada en ningún lado.');
    }

    await db.collection('usuarios').doc(user.uid).set(
      {
        id: user.uid,
        email,
        nombre: user.displayName ?? email.split('@')[0],
        rol: 'admin',
        actualizadoEn: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    console.log(`  ↳ usuarios/${user.uid} → rol: admin`);
    ok++;
  } catch (err) {
    console.error(`✗ ${email}: ${err.code ?? err.message}`);
  }
}

console.log(`\n  ${ok}/${emails.length} admin(s) listos.\n`);
process.exit(ok === emails.length ? 0 : 1);
