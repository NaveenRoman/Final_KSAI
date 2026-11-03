import crypto from "crypto";

export interface SignedExecutionPayload {
  studentId: string;
  language: string;
  code: string;
  stdin: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

/**
 * Computes SHA-256 hash of the normalized code and stdin parameters,
 * matching Python backend/broker/signer.py:compute_body_hash exactly.
 */
export function computeBodyHash(code: string, stdin: string = ""): string {
  const normalized = `code=${code}&stdin=${stdin || ""}`;
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex").toLowerCase();
}

/**
 * Constructs the canonical string for HMAC-SHA256 signing,
 * matching Python backend/broker/signer.py:compute_canonical_string exactly.
 */
export function computeCanonicalString(
  method: string,
  endpoint: string,
  language: string,
  bodyHash: string,
  studentId: string,
  timestamp: number,
  nonce: string
): string {
  const normMethod = method.toUpperCase().trim();
  let normEndpoint = endpoint.trim();
  if (!normEndpoint.startsWith("/")) {
    normEndpoint = "/" + normEndpoint;
  }
  const normLang = language.toLowerCase().trim();
  return `${normMethod}|${normEndpoint}|${normLang}|${bodyHash}|${studentId}|${Math.floor(timestamp)}|${nonce}`;
}

/**
 * Generates a 64-character hex HMAC-SHA256 signature for a student execution request.
 */
export function signStudentExecutionRequest(
  signingSecret: string,
  studentId: string,
  language: string,
  code: string,
  stdin: string = "",
  timestamp?: number,
  nonce?: string,
  method: string = "POST",
  endpoint: string = "/api/run/"
): { signature: string; timestamp: number; nonce: string } {
  if (!signingSecret) {
    throw new Error("STUDENT_SIGNING_SECRET is required to sign execution requests.");
  }

  const ts = timestamp !== undefined ? Math.floor(timestamp) : Math.floor(Date.now() / 1000);
  const n = nonce || crypto.randomUUID().replace(/-/g, "");
  const bodyHash = computeBodyHash(code, stdin);
  const canonical = computeCanonicalString(method, endpoint, language, bodyHash, studentId, ts, n);

  const signature = crypto
    .createHmac("sha256", signingSecret)
    .update(canonical, "utf8")
    .digest("hex")
    .toLowerCase();

  return { signature, timestamp: ts, nonce: n };
}

/**
 * Builds a complete signed payload ready for transmission to Django / Broker.
 */
export function buildSignedExecutionEnvelope(
  signingSecret: string,
  studentId: string,
  language: string,
  code: string,
  stdin: string = ""
): SignedExecutionPayload {
  const { signature, timestamp, nonce } = signStudentExecutionRequest(
    signingSecret,
    studentId,
    language,
    code,
    stdin
  );

  return {
    studentId: studentId.trim(),
    language: language.toLowerCase().trim(),
    code,
    stdin: stdin || "",
    timestamp,
    nonce,
    signature,
  };
}
