var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var CNE_LOGIN = "https://api.cne.cl/api/login";
var CNE_ESTACIONES = "https://api.cne.cl/api/v4/estaciones";
var TOKEN_TTL_MS = 50 * 60 * 1e3;
var cachedToken = null;
var tokenExpiresAt = 0;
function isCachedTokenValid() {
  return cachedToken !== null && Date.now() < tokenExpiresAt;
}
__name(isCachedTokenValid, "isCachedTokenValid");
function setCachedToken(token) {
  cachedToken = token;
  tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
}
__name(setCachedToken, "setCachedToken");
function clearCachedToken() {
  cachedToken = null;
  tokenExpiresAt = 0;
}
__name(clearCachedToken, "clearCachedToken");
function hasLoginCredentials(env) {
  return Boolean(env.CNE_EMAIL?.trim() && env.CNE_PASSWORD?.trim());
}
__name(hasLoginCredentials, "hasLoginCredentials");
function shouldRetryWithLogin(status, body) {
  if (status === 401 || status === 403) return true;
  const b = body.trim().toLowerCase();
  if (!b) return false;
  if (b.includes("token is invalid")) return true;
  if (b.includes("authorization token not found")) return true;
  try {
    const j = JSON.parse(body);
    const st = typeof j.status === "string" ? j.status.toLowerCase() : "";
    if (st && st !== "ok" && st !== "success" && st !== "200") {
      if (/token|authorization|invalid|inválido|no autorizado|denegad|expir/i.test(st)) {
        return true;
      }
    }
    const err = typeof j.error === "string" ? j.error.toLowerCase() : "";
    if (err && /token|authorization|invalid|inválido/i.test(err)) return true;
  } catch {
  }
  return b.includes("invalid") && b.includes("token");
}
__name(shouldRetryWithLogin, "shouldRetryWithLogin");
async function loginCNE(env) {
  const email = env.CNE_EMAIL.trim();
  const password = env.CNE_PASSWORD.trim();
  const res = await fetch(CNE_LOGIN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json"
    },
    body: new URLSearchParams({ email, password }).toString()
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`CNE login ${res.status}: ${text.slice(0, 300)}`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Respuesta de login no es JSON");
  }
  const token = data.token?.trim();
  if (!token) {
    throw new Error("Login CNE sin campo token en JSON");
  }
  return token;
}
__name(loginCNE, "loginCNE");
async function getBearerToken(env, forceRefresh) {
  const staticTok = env.CNE_TOKEN?.trim();
  if (hasLoginCredentials(env)) {
    if (!forceRefresh && isCachedTokenValid() && cachedToken) {
      return cachedToken;
    }
    const t = await loginCNE(env);
    setCachedToken(t);
    return t;
  }
  if (staticTok) {
    return staticTok;
  }
  throw new Error(
    "Falta CNE_EMAIL + CNE_PASSWORD (secretos) o CNE_TOKEN (.dev.vars)"
  );
}
__name(getBearerToken, "getBearerToken");
async function fetchEstaciones(bearer) {
  return fetch(CNE_ESTACIONES, {
    headers: {
      Authorization: `Bearer ${bearer}`,
      Accept: "application/json"
    }
  });
}
__name(fetchEstaciones, "fetchEstaciones");
function jsonError(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
__name(jsonError, "jsonError");
var index_default = {
  async fetch(request, env) {
    if (request.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    let token;
    try {
      token = await getBearerToken(env, false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return jsonError(msg);
    }
    let upstream = await fetchEstaciones(token);
    let body = await upstream.text();
    const canAutoRenew = hasLoginCredentials(env) && shouldRetryWithLogin(upstream.status, body);
    if (canAutoRenew) {
      clearCachedToken();
      try {
        token = await getBearerToken(env, true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return jsonError(`Tras token inv\xE1lido: ${msg}`, 502);
      }
      upstream = await fetchEstaciones(token);
      body = await upstream.text();
    }
    return new Response(body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
        "cache-control": "public, max-age=300"
      }
    });
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
