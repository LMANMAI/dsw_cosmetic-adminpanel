// Crea (o reusa) cuentas admin en Firebase Auth y sus docs en /usuarios.
// Uso:
//   node scripts/seed-admins.mjs
//
// Lee la config desde .env.local (NEXT_PUBLIC_FB_*). No necesita service account:
// usa el SDK cliente, igual que el panel y el app móvil.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

// --- carga manual de .env.local (sin depender de dotenv) ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FB_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FB_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMINS = [
  {
    email: "admin@beautyapp.local",
    password: "admin123",
    nombre: "Admin",
    telefono: "",
  },
  {
    email: "lcasmanmaidana@gmail.com",
    password: "YellowRadio1",
    nombre: "Lucas Casman Maidana",
    telefono: "",
  },
];

async function ensureUser(a) {
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, a.email, a.password);
    console.log(`✓ Cuenta CREADA: ${a.email}`);
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      cred = await signInWithEmailAndPassword(auth, a.email, a.password);
      console.log(`· Cuenta ya existía, login OK: ${a.email}`);
    } else {
      throw err;
    }
  }
  const uid = cred.user.uid;
  if (cred.user.displayName !== a.nombre) {
    await updateProfile(cred.user, { displayName: a.nombre });
  }
  await setDoc(
    doc(db, "usuarios", uid),
    {
      id: uid,
      nombre: a.nombre,
      email: a.email,
      telefono: a.telefono,
      rol: "admin",
      perfil: {},
      creadoEn: serverTimestamp(),
    },
    { merge: true },
  );
  console.log(`  ↳ usuarios/${uid} actualizado (rol=admin)`);
}

console.log(`→ Proyecto: ${firebaseConfig.projectId}`);
for (const a of ADMINS) {
  try {
    await ensureUser(a);
  } catch (err) {
    console.error(`✗ ${a.email}:`, err.code ?? err.message);
  }
}
console.log("\nListo. Probá login en http://localhost:3000");
process.exit(0);
