#!/usr/bin/env node
/**
 * Creates (or resets) a system-admin account in the admin_users Firestore
 * collection used by /api/admin/session. Run this once with real Firebase
 * Admin SDK credentials - it writes directly to Firestore, bypassing the
 * app's HTTP API entirely (there is no "create admin" endpoint on purpose -
 * this is privileged account creation and should never be reachable over
 * HTTP).
 *
 * Usage:
 *   FIREBASE_PROJECT_ID=... \
 *   FIREBASE_CLIENT_EMAIL=... \
 *   FIREBASE_PRIVATE_KEY=... \
 *   node scripts/seed-admin-user.mjs [username]
 *
 * If [username] is omitted, a random one is generated. The password is
 * always generated here (cryptographically random, 24 chars) and printed
 * ONCE - it is never stored anywhere except the bcrypt hash written to
 * Firestore. Save it somewhere safe immediately; there is no way to
 * retrieve it again, only to reset it by re-running this script.
 *
 * To add a second admin, or rotate an existing one's password, just run
 * this again with a different (or the same) username - it overwrites
 * whatever document already exists at that username.
 *
 * To remove an admin, delete their doc directly from the admin_users
 * collection in the Firebase console, or set { verified: false } on it to
 * disable it without deleting the record.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY before running.');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

function randomToken(bytes) {
  return randomBytes(bytes).toString('base64url');
}

async function main() {
  const username = (process.argv[2] || `admin-${randomToken(4)}`).toLowerCase();
  const password = randomToken(18); // ~24 url-safe chars

  const hashed = await bcrypt.hash(password, 12);

  await db.collection('admin_users').doc(username).set({
    password: hashed,
    verified: true,
    createdAt: new Date().toISOString(),
    createdBy: 'seed-admin-user-script',
  }, { merge: false });

  console.log('Admin account created/reset.');
  console.log('');
  console.log(`  Username: ${username}`);
  console.log(`  Password: ${password}`);
  console.log('');
  console.log('This password is shown once and is not recoverable - store it now.');
  console.log('Log in at <your-site>/admin with these credentials.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
