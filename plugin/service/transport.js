"use strict";
const P = require("./protocol");
// Relays use the Foundation HTTPS broker; jobs never receive this transport.
class Transport {
  constructor({ privacyMode = () => "local-only", fetchImpl } = {}) {
    this.privacyMode = privacyMode; this.fetch = fetchImpl; this.active = new Set();
  }
  stop() { for (const controller of this.active) controller.abort(); }
  async request(endpoint, route, signed) {
    if (this.privacyMode() === "local-only") P.fail("PERMISSION_REQUIRED", "Local-Only is enabled. Network services cannot connect.");
    if (typeof this.fetch !== "function") P.fail("TRANSPORT_UNAVAILABLE", "Foundation network service is unavailable");
    if (typeof route !== "string" || !/^\/agent-network\/v1\/(config|agents|publish|retire|messages|inbox|ack)(?:\?[^#]*)?$/.test(route)) P.fail("INVALID_ENDPOINT", "Unknown service route.");
    const base = new URL(endpoint);
    if (base.username || base.password || base.search || base.hash || base.pathname !== "/" || base.protocol !== "https:") P.fail("INVALID_ENDPOINT", "Use an HTTPS origin without credentials or a path.");
    const raw = signed ? P.canonical(signed) : null;
    if (raw && Buffer.byteLength(raw) > P.MAX_BYTES) P.fail("SIZE_LIMIT", "Request is too large.");
    const controller = new AbortController(); this.active.add(controller);
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);
    const timer = setInterval(() => { if (this.privacyMode() === "local-only") controller.abort(); }, 100); timer.unref?.();
    try {
      const response = await this.fetch(new URL(route, base).href, {
        signal, method: raw ? "POST" : "GET",
        headers: { accept: "application/json", ...(raw ? { "content-type": "application/json" } : {}) },
        ...(raw ? { body: raw } : {})
      });
      const chunks = []; let size = 0;
      for await (const chunk of response.body || []) {
        signal.throwIfAborted(); size += chunk.length;
        if (size > P.MAX_BYTES) { controller.abort(); P.fail("SIZE_LIMIT", "Response is too large."); }
        chunks.push(chunk);
      }
      signal.throwIfAborted();
      const data = P.parse(Buffer.concat(chunks).toString());
      if (response.status !== 200) throw new P.AgentError(data.code || "SERVICE_ERROR", data.message || "Service request failed.");
      return data;
    } finally { clearInterval(timer); this.active.delete(controller); }
  }
  async auth(endpoint, route, body, identity, domain = P.PRIVATE) {
    const request = await P.sign("http", { method: "POST", path: route, nonce: P.random(), expires_at: String(Date.now() + 60000), body }, identity, domain);
    return this.request(endpoint, route, request);
  }
}
module.exports = { Transport };
