import { describe, it, expect } from "vitest";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { createSignedJwt } from "../../scripts/lib/google-jwt.mjs";

/**
 * google-jwt.mjs was lifted out of .github/scripts/google-indexing.mjs so that
 * the sitemap-submit job and any future Google caller share one implementation
 * instead of copying the signing block.
 *
 * "It worked before" is NOT evidence for this code. The script it came from died
 * on the malformed credential at line 15 on every run it ever had, so the
 * signing block below it never executed in CI even once. The signature is
 * therefore verified cryptographically here against a real generated keypair,
 * rather than being eyeballed for shape.
 *
 * The token exchange is deliberately not covered: it needs the network and a
 * live credential, and is verified against the real endpoint in the workflow run.
 */

const SCOPE = "https://www.googleapis.com/auth/webmasters";

function keypair() {
  return generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
}

describe("createSignedJwt", () => {
  it("produces a JWT whose RS256 signature verifies", () => {
    const { publicKey, privateKey } = keypair();
    const jwt = createSignedJwt(
      { client_email: "bot@waypoint.iam.gserviceaccount.com", private_key: privateKey },
      SCOPE,
      { nowSeconds: 1_750_000_000 },
    );

    const [header, payload, signature] = jwt.split(".");
    expect(jwt.split(".")).toHaveLength(3);

    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${header}.${payload}`);
    expect(
      verifier.verify(publicKey, Buffer.from(signature, "base64url")),
      "signature did not verify against the matching public key",
    ).toBe(true);

    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    expect(claims.iss).toBe("bot@waypoint.iam.gserviceaccount.com");
    expect(claims.scope).toBe(SCOPE);
    expect(claims.aud).toBe("https://oauth2.googleapis.com/token");
    expect(claims.exp - claims.iat).toBe(3600);
  });

  it("does not validate a tampered payload", () => {
    const { publicKey, privateKey } = keypair();
    const jwt = createSignedJwt({ client_email: "bot@x.com", private_key: privateKey }, SCOPE, {
      nowSeconds: 1_750_000_000,
    });

    const [header, , signature] = jwt.split(".");
    const forged = Buffer.from(JSON.stringify({ iss: "attacker@x.com", scope: SCOPE })).toString(
      "base64url",
    );

    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${header}.${forged}`);
    expect(verifier.verify(publicKey, Buffer.from(signature, "base64url"))).toBe(false);
  });

  it("emits base64url segments, never padded base64", () => {
    // Google rejects a JWT carrying '+', '/' or '=' in its segments.
    const { privateKey } = keypair();
    const jwt = createSignedJwt({ client_email: "bot@x.com", private_key: privateKey }, SCOPE);
    for (const segment of jwt.split(".")) {
      expect(segment).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("fails a corrupt private key without echoing key material", () => {
    // node:crypto's own error text can quote the key, so it is discarded.
    expect(() =>
      createSignedJwt(
        {
          client_email: "bot@x.com",
          private_key: "-----BEGIN PRIVATE KEY-----\nSENTINEL9XQ\n-----END PRIVATE KEY-----",
        },
        SCOPE,
      ),
    ).toThrowError(/Regenerate it in Google Cloud/);

    try {
      createSignedJwt(
        {
          client_email: "bot@x.com",
          private_key: "-----BEGIN PRIVATE KEY-----\nSENTINEL9XQ\n-----END PRIVATE KEY-----",
        },
        SCOPE,
      );
      throw new Error("expected a throw");
    } catch (err) {
      expect((err as Error).message).not.toContain("SENTINEL9XQ");
    }
  });
});
