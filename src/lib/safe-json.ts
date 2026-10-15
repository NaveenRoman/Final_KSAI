/**
 * Helper to safely parse JSON responses from API calls.
 * Ensures response.ok and Content-Type: application/json before parsing.
 * Prevents "Unexpected token '<', '<!DOCTYPE '... is not valid JSON" crashes.
 */

export interface SafeJsonResult<T = any> {
  ok: boolean;
  data: T | null;
  error: string | null;
  status: number;
}

export async function safeParseResponse<T = any>(
  res: Response,
  contextName: string = "Data"
): Promise<SafeJsonResult<T>> {
  const status = res.status;
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.toLowerCase().includes("application/json");

  if (!isJson) {
    return {
      ok: false,
      data: null,
      error: `${contextName} could not be loaded. API returned HTTP ${status} (${contentType.split(";")[0].trim() || "non-JSON"}).`,
      status,
    };
  }

  try {
    const data = (await res.json()) as T;
    if (!res.ok) {
      const serverMsg =
        (data as any)?.error ||
        (data as any)?.message ||
        `${contextName} request failed with HTTP ${status}.`;
      return {
        ok: false,
        data,
        error: serverMsg,
        status,
      };
    }
    return {
      ok: true,
      data,
      error: null,
      status,
    };
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      error: `${contextName} response could not be parsed: ${err?.message || "Invalid JSON"}.`,
      status,
    };
  }
}
