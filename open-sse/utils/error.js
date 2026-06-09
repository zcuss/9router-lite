import { ERROR_TYPES, DEFAULT_ERROR_MESSAGES } from "../config/errorConfig.js";

export function buildErrorBody(statusCode, message, upstreamDetails) {
  const errorInfo = ERROR_TYPES[statusCode] || 
    (statusCode >= 500 
      ? { type: "server_error", code: "internal_server_error" }
      : { type: "invalid_request_error", code: "" });

  return {
    error: {
      message: message || DEFAULT_ERROR_MESSAGES[statusCode] || "An error occurred",
      type: errorInfo.type,
      code: errorInfo.code,
      ...(upstreamDetails && { upstream: upstreamDetails })
    }
  };
}

export function sanitizeErrorMessage(message) {
  if (message instanceof Error) return message.message;
  if (typeof message === "string") return message;
  return String(message || "");
}

export function errorResponse(statusCode, message) {
  return new Response(JSON.stringify(buildErrorBody(statusCode, message)), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

export async function writeStreamError(writer, statusCode, message) {
  const errorBody = buildErrorBody(statusCode, message);
  const encoder = new TextEncoder();
  await writer.write(encoder.encode(`data: ${JSON.stringify(errorBody)}\n\n`));
}

export async function parseUpstreamError(response, executor = null) {
  let bodyText = "";
  try {
    bodyText = await response.text();
  } catch {
    bodyText = "";
  }

  if (executor && typeof executor.parseError === "function") {
    try {
      const parsed = executor.parseError(response, bodyText);
      if (parsed && typeof parsed === "object") {
        const msg = parsed.message || DEFAULT_ERROR_MESSAGES[response.status] || `Upstream error: ${response.status}`;
        return { statusCode: parsed.status || response.status, message: msg, resetsAtMs: parsed.resetsAtMs };
      }
    } catch { }
  }

  let message = "";
  try {
    const json = JSON.parse(bodyText);
    message = json.error?.message || json.message || json.error || bodyText;
  } catch {
    message = bodyText;
  }

  const messageStr = typeof message === "string" ? message : JSON.stringify(message);
  const finalMessage = messageStr || DEFAULT_ERROR_MESSAGES[response.status] || `Upstream error: ${response.status}`;

  return { statusCode: response.status, message: finalMessage };
}

export function createErrorResult(statusCode, message, resetsAtMs) {
  return {
    success: false,
    status: statusCode,
    error: message,
    response: errorResponse(statusCode, message),
    resetsAtMs,
  };
}

export function unavailableResponse(statusCode, message, retryAfterMs, retryHuman) {
  return new Response(
    JSON.stringify(buildErrorBody(statusCode, message)), 
    {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Retry-After": retryAfterMs ? Math.ceil(retryAfterMs / 1000).toString() : "60"
      }
    }
  );
}

export function formatProviderError(error, provider, model, statusCode) {
  let msg = typeof error === "string" ? error : (error?.message || "Unknown error");
  if (msg.includes("fetch failed") || msg.includes("network timeout") || msg.includes("ECONNREFUSED")) {
    return `Connection to ${provider} failed. Please check network.`;
  }
  return msg;
}
