import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB7ETu682g9HSvDXpamngrW-jHIJZ86khQ",
  authDomain: "epp-gp-calculator.firebaseapp.com",
  projectId: "epp-gp-calculator",
  storageBucket: "epp-gp-calculator.firebasestorage.app",
  messagingSenderId: "634798765217",
  appId: "1:634798765217:web:b235f34e2d7bc00bdcace0",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DOCS = {
  jobHistory: doc(db, "data", "job_history"),
  teamLeads: doc(db, "data", "team_leads"),
  crewCapacity: doc(db, "data", "crew_capacity"),
  customPaints: doc(db, "data", "custom_paints"),
};

// Reads a field from a Firestore doc.
// Returns the value if present, or `undefined` if the document/field genuinely
// does not exist. THROWS on a read error so callers can tell "empty" apart from
// "failed" and never overwrite the cloud with a stale local copy on a hiccup.
async function loadDocStrict(ref, field) {
  const snap = await getDoc(ref); // propagates errors
  if (snap.exists() && snap.data()[field] != null) {
    return snap.data()[field];
  }
  return undefined;
}

async function readLocalAsync(key, fallback) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch {
    return fallback;
  }
}

async function saveDoc(ref, field, value) {
  try {
    await setDoc(ref, { [field]: value }, { merge: true });
  } catch (e) {
    console.warn("Firestore write failed:", e);
  }
}

// Generic loader: cloud value wins; first-run (doc absent) migrates local up;
// read error returns local for DISPLAY ONLY and never writes back to the cloud.
async function loadWithFallback(ref, field, localKey, empty, isEmpty) {
  try {
    const fb = await loadDocStrict(ref, field);
    if (fb !== undefined) return fb;            // cloud has data
    const local = await readLocalAsync(localKey, empty); // doc absent: first-run migrate
    if (!isEmpty(local)) await saveDoc(ref, field, local);
    return local;
  } catch (e) {
    console.warn(`Firestore read failed for ${field}; using local cache (display only, not writing back):`, e);
    return await readLocalAsync(localKey, empty);
  }
}

export async function loadHistory() {
  return loadWithFallback(DOCS.jobHistory, "jobs", "epp_job_history", [], (v) => !v || v.length === 0);
}

export async function saveHistory(history) {
  await saveDoc(DOCS.jobHistory, "jobs", history);
  try {
    await window.storage.set("epp_job_history", JSON.stringify(history));
  } catch { /* local cache fallback */ }
}

export async function loadTeamLeads(defaults) {
  try {
    const fb = await loadDocStrict(DOCS.teamLeads, "leads");
    if (fb !== undefined) return fb;
    const local = await readLocalAsync("epp_team_leads", defaults);
    if (local && local.length > 0) await saveDoc(DOCS.teamLeads, "leads", local);
    return local;
  } catch (e) {
    console.warn("Firestore read failed for leads; using local cache (display only):", e);
    return await readLocalAsync("epp_team_leads", defaults);
  }
}

export async function saveTeamLeads(leads) {
  await saveDoc(DOCS.teamLeads, "leads", leads);
  try {
    await window.storage.set("epp_team_leads", JSON.stringify(leads));
  } catch { /* local cache fallback */ }
}

export async function loadCrewCapacity() {
  try {
    const fb = await loadDocStrict(DOCS.crewCapacity, "entries");
    if (fb !== undefined) return fb;
    const local = await readLocalAsync("epp_crew_capacity", {});
    if (local && Object.keys(local).length > 0) await saveDoc(DOCS.crewCapacity, "entries", local);
    return local;
  } catch (e) {
    console.warn("Firestore read failed for crew capacity; using local cache (display only):", e);
    return await readLocalAsync("epp_crew_capacity", {});
  }
}

export async function saveCrewCapacity(data) {
  await saveDoc(DOCS.crewCapacity, "entries", data);
  try {
    await window.storage.set("epp_crew_capacity", JSON.stringify(data));
  } catch { /* local cache fallback */ }
}

export async function loadCustomPaints() {
  return loadWithFallback(DOCS.customPaints, "paints", "epp_custom_paints", [], (v) => !v || v.length === 0);
}

export async function saveCustomPaints(paints) {
  await saveDoc(DOCS.customPaints, "paints", paints);
  try {
    await window.storage.set("epp_custom_paints", JSON.stringify(paints));
  } catch { /* local cache fallback */ }
}

export function onHistoryChange(callback) {
  return onSnapshot(DOCS.jobHistory, (snap) => {
    if (snap.exists() && snap.data().jobs) {
      callback(snap.data().jobs);
    }
  });
}

export function onTeamLeadsChange(callback) {
  return onSnapshot(DOCS.teamLeads, (snap) => {
    if (snap.exists() && snap.data().leads) {
      callback(snap.data().leads);
    }
  });
}

export function onCrewCapacityChange(callback) {
  return onSnapshot(DOCS.crewCapacity, (snap) => {
    if (snap.exists() && snap.data().entries) {
      callback(snap.data().entries);
    }
  });
}

export function onCustomPaintsChange(callback) {
  return onSnapshot(DOCS.customPaints, (snap) => {
    if (snap.exists() && snap.data().paints) {
      callback(snap.data().paints);
    }
  });
}
