import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { createAccount, retrieveAccount } from "@convex-dev/auth/server";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Firebase Authentication as a Convex Auth provider.
//
// The browser signs in with the Firebase JS SDK and hands the resulting ID
// token to `signIn("firebase", { idToken })`. We verify that token against
// Firebase's published keys and map its stable UID to a Convex Auth account,
// so the rest of the app keeps using a normal Convex Auth session.
//
// The project ID is read from the Convex deployment's environment. It has to
// match the project the browser config points at, because it is both the
// token issuer suffix and the expected audience.

const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const firebaseJwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

function firebaseProjectId(): string {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "FIREBASE_PROJECT_ID is not set on this Convex deployment, so Firebase sign-in cannot verify tokens.",
    );
  }
  return projectId;
}

export const firebase = ConvexCredentials({
  id: "firebase",
  authorize: async (credentials, ctx) => {
    const idToken = credentials.idToken;
    if (typeof idToken !== "string" || idToken.length === 0) {
      throw new Error("Missing Firebase ID token.");
    }

    const projectId = firebaseProjectId();
    const { payload } = await jwtVerify(idToken, firebaseJwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    });

    const uid = typeof payload.sub === "string" ? payload.sub : undefined;
    if (!uid) {
      throw new Error("Firebase token is missing a subject.");
    }

    const email = typeof payload.email === "string" ? payload.email : undefined;
    const name = typeof payload.name === "string" ? payload.name : undefined;
    const picture =
      typeof payload.picture === "string" ? payload.picture : undefined;

    const existing = await retrieveAccount(ctx, {
      provider: "firebase",
      account: { id: uid },
    }).catch(() => null);
    if (existing) {
      return { userId: existing.user._id };
    }

    const { user } = await createAccount(ctx, {
      provider: "firebase",
      account: { id: uid },
      profile: {
        ...(email ? { email, emailVerificationTime: Date.now() } : {}),
        ...(name ? { name } : {}),
        ...(picture ? { image: picture } : {}),
      },
      // Only join an existing account by email when Firebase says the address
      // is verified; otherwise a spoofed address could take over a user.
      shouldLinkViaEmail: payload.email_verified === true && Boolean(email),
    });
    return { userId: user._id };
  },
});
