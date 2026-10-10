import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut as signOutOfFirebase,
  type Auth,
} from "firebase/auth";

// Browser-side Firebase Auth.
//
// These values are public client config (they ship in the bundle), so they are
// read from Vite env vars: the `VITE_` prefix is what exposes them to the
// browser. The matching project ID also has to be set on the Convex deployment
// as `FIREBASE_PROJECT_ID` so Firebase sign-in can be verified server-side.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** True once every required Firebase key is present. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId,
);

let firebaseApp: FirebaseApp | null = null;

/** The Firebase auth instance, or null when Firebase is not configured. */
export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null;
  if (!firebaseApp) {
    firebaseApp = initializeApp({
      apiKey: firebaseConfig.apiKey!,
      authDomain: firebaseConfig.authDomain!,
      projectId: firebaseConfig.projectId!,
      appId: firebaseConfig.appId!,
    });
  }
  return getAuth(firebaseApp);
}

/**
 * Opens the Google popup through Firebase and returns the signed-in user's ID
 * token, which the app exchanges for a Convex Auth session.
 */
export async function signInWithGoogle(): Promise<string> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase is not configured.");
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
}

/** Signs out of Firebase too, so a later popup cannot silently reuse a user. */
export async function signOutFirebase(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) {
    await signOutOfFirebase(auth);
  }
}
