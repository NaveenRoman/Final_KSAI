/**
 * Server-side configuration for Free Course Test Mode.
 *
 * Strict Security Guardrail:
 * - Defaults to `false` when process.env.FREE_COURSE_TEST_MODE is absent or not "true".
 * - Enabled strictly when process.env.FREE_COURSE_TEST_MODE === "true".
 * - Never controlled by client requests or query parameters.
 */
export const FREE_COURSE_TEST_MODE: boolean =
  process.env.FREE_COURSE_TEST_MODE === "true";
