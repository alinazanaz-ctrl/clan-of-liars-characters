import fs from "node:fs";
import admin from "firebase-admin";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT secret is missing");

const serviceAccount = JSON.parse(raw);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const characters = JSON.parse(
  fs.readFileSync(new URL("../data/characters.json", import.meta.url), "utf8")
);

let batch = db.batch();
let pending = 0;
let imported = 0;

for (const c of characters) {
  const ref = db.collection("characters").doc(c.id);
  batch.set(ref, {
    ...c,
    division: c.division || c.tags?.[0] || "LIAR",
    status: c.status || "active",
    archived: Boolean(c.archived),
    migratedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  pending++;
  imported++;

  if (pending === 400) {
    await batch.commit();
    batch = db.batch();
    pending = 0;
  }
}

if (pending > 0) await batch.commit();

console.log(`Imported ${imported} characters into Firestore`);
