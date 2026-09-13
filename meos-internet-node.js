/**
 * MEOS Internet Node v0.3.0
 * Commission: MEOS-INTERNET-NODE-005 — Persistent Discovery Frontier
 *
 * Purpose:
 * - Give Maddy a provider-independent web perception/search substrate.
 * - Crawl explicitly seeded public HTTP(S) sites without Google/Bing/DDG search.
 * - Build a small MEOS-owned local index with provenance.
 * - Search that index locally without a paid model or search provider.
 *
 * Governance:
 * - Public-web evidence only; this node is NOT institutional truth authority.
 * - No semantic/executive conclusion authority.
 * - This core module exposes no HTTP routes and performs no authentication.
 * - Server/API authority will be mounted in a separate commission.
 * - robots.txt is honored when available.
 * - Private/loopback/link-local destinations are blocked.
 */

import dns from "dns/promises";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import net from "net";

export const MEOS_INTERNET_NODE_VERSION = "0.3.0";
export const MEOS_INTERNET_NODE_BUILD_ID = "MIN005-PERSISTENT-DISCOVERY-FRONTIER-20260912-A";

const DEFAULTS = Object.freeze({
  maxPagesPerCrawl: 40,
  maxDepth: 2,
  maxBytesPerPage: 2 * 1024 * 1024,
  timeoutMs: 12000,
  delayMs: 150,
  maxIndexBytes: 256 * 1024 * 1024,
  discoverySeedLimit: 12,
  maxFrontierEntries: 5000,
  userAgent: "MEOS-Internet-Node/0.1 (+provider-independent-public-web-perception)"
});

function cleanText(value = "") {
  return String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html = "") {
  const match = String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return cleanText(match?.[1] || "").slice(0, 300);
}

function extractLinks(html = "", baseUrl) {
  const links = new Set();
  const re = /<a\b[^>]*?href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  let match;
  while ((match = re.exec(String(html)))) {
    const raw = match[1] || match[2] || match[3] || "";
    try {
      const url = new URL(raw, baseUrl);
      url.hash = "";
      if (!["http:", "https:"].includes(url.protocol)) continue;
      links.add(url.toString());
    } catch (_) {}
  }
  return [...links];
}

function tokenize(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(token => token.length > 1)
    .slice(0, 100000);
}

function isPrivateIp(address) {
  if (!net.isIP(address)) return true;
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const value = address.toLowerCase();
  return value === "::1" || value === "::" || value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd");
}

async function assertPublicUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) URLs are allowed.");
  if (!url.hostname) throw new Error("URL hostname is required.");
  const records = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!records.length) throw new Error("Hostname did not resolve.");
  if (records.some(record => isPrivateIp(record.address))) throw new Error("Private/reserved destinations are blocked.");
  return url;
}

async function fetchBounded(url, { timeoutMs, maxBytes, userAgent }) {
  await assertPublicUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": userAgent, Accept: "text/html,text/plain;q=0.9,*/*;q=0.1" }
    });

    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      const next = new URL(response.headers.get("location"), url).toString();
      await assertPublicUrl(next);
      return fetchBounded(next, { timeoutMs, maxBytes, userAgent });
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    if (!/(text\/html|text\/plain|application\/xhtml\+xml)/i.test(contentType)) {
      throw new Error(`Unsupported content type: ${contentType || "unknown"}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return { finalUrl: response.url || url, contentType, body: "" };
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error("Page exceeded MEOS byte limit.");
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks.map(v => Buffer.from(v)));
    return { finalUrl: response.url || url, contentType, body: bytes.toString("utf8") };
  } finally {
    clearTimeout(timer);
  }
}

async function robotsAllows(targetUrl, options) {
  try {
    const target = new URL(targetUrl);
    const robotsUrl = `${target.protocol}//${target.host}/robots.txt`;
    const result = await fetchBounded(robotsUrl, { ...options, maxBytes: Math.min(options.maxBytes, 512 * 1024) });
    const lines = result.body.split(/\r?\n/);
    let relevant = false;
    const disallow = [];
    for (const line of lines) {
      const clean = line.replace(/#.*/, "").trim();
      if (!clean) continue;
      const [rawKey, ...rest] = clean.split(":");
      const key = rawKey.trim().toLowerCase();
      const value = rest.join(":").trim();
      if (key === "user-agent") relevant = value === "*" || /meos/i.test(value);
      else if (relevant && key === "disallow" && value) disallow.push(value);
    }
    return !disallow.some(prefix => target.pathname.startsWith(prefix));
  } catch (_) {
    return true;
  }
}

function scoreDocument(doc, terms) {
  const titleTokens = tokenize(doc.title || "");
  const bodyTokens = tokenize(doc.text || "");
  const titleSet = new Set(titleTokens);
  const bodyFreq = new Map();
  for (const token of bodyTokens) bodyFreq.set(token, (bodyFreq.get(token) || 0) + 1);
  let score = 0;
  for (const term of terms) {
    if (titleSet.has(term)) score += 7;
    const freq = bodyFreq.get(term) || 0;
    if (freq) score += 1 + Math.log2(1 + freq);
    if ((doc.url || "").toLowerCase().includes(term)) score += 2;
  }
  return score;
}

export class MEOSInternetNode {
  constructor(options = {}) {
    this.options = { ...DEFAULTS, ...options };
    const dataDirectory =
      options.dataDirectory ||
      process.env.MEOS_DATA_DIR ||
      path.resolve("./data");

    this.indexPath =
      options.indexPath ||
      process.env.MEOS_INTERNET_INDEX_PATH ||
      path.join(dataDirectory, "meos-internet-index.json");

    this.documents = new Map();
    this.frontier = new Map();
    this.loaded = false;
    this.lastCrawl = null;
  }

  async load() {
    if (this.loaded) return;
    try {
      const parsed = JSON.parse(await fs.readFile(this.indexPath, "utf8"));
      for (const doc of parsed.documents || []) this.documents.set(doc.url, doc);
      for (const entry of parsed.frontier || []) {
        if (entry?.url) this.frontier.set(entry.url, entry);
      }
      this.lastCrawl = parsed.lastCrawl || null;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    this.loaded = true;
  }

  async save() {
    await fs.mkdir(path.dirname(this.indexPath), { recursive: true });
    const payload = {
      schema: "meos.internet-index.v1",
      version: MEOS_INTERNET_NODE_VERSION,
      buildId: MEOS_INTERNET_NODE_BUILD_ID,
      savedAt: new Date().toISOString(),
      lastCrawl: this.lastCrawl,
      frontier: [...this.frontier.values()],
      documents: [...this.documents.values()]
    };
    const tmp = `${this.indexPath}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(payload), "utf8");
    await fs.rename(tmp, this.indexPath);
  }

  indexBytes() {
    let total = 0;
    for (const doc of this.documents.values()) total += Buffer.byteLength(JSON.stringify(doc), "utf8");
    return total;
  }

  configuredMaxIndexBytes() {
    const configured = Number(process.env.MEOS_INTERNET_MAX_INDEX_BYTES || this.options.maxIndexBytes);
    return Math.max(8 * 1024 * 1024, Number.isFinite(configured) ? configured : DEFAULTS.maxIndexBytes);
  }

  duplicateUrlForHash(sha256, exceptUrl = null) {
    for (const doc of this.documents.values()) {
      if (doc?.sha256 === sha256 && doc?.url !== exceptUrl) return doc.url;
    }
    return null;
  }

  frontierLimit() {
    return Math.max(100, Math.min(50000, Number(this.options.maxFrontierEntries) || DEFAULTS.maxFrontierEntries));
  }

  frontierPriority(rawUrl, sourceUrl = null) {
    try {
      const url = new URL(rawUrl);
      let score = 10;
      if (url.protocol === "https:") score += 3;
      if (/\.(gov|edu)$/i.test(url.hostname)) score += 5;
      if (sourceUrl && new URL(sourceUrl).origin === url.origin) score += 2;
      if (/[?&](utm_|fbclid|gclid|ref=)/i.test(url.toString())) score -= 4;
      return score;
    } catch (_) { return 0; }
  }

  rememberFrontier(rawUrl, { discoveredFrom = null, depth = 0 } = {}) {
    let url;
    try {
      url = new URL(rawUrl);
      url.hash = "";
      if (!["http:", "https:"].includes(url.protocol)) return false;
    } catch (_) { return false; }
    const normalized = url.toString();
    if (this.documents.has(normalized)) return false;
    const existing = this.frontier.get(normalized);
    if (existing) {
      if (discoveredFrom && !existing.discoveredFrom?.includes(discoveredFrom)) {
        existing.discoveredFrom = [...(existing.discoveredFrom || []), discoveredFrom].slice(-8);
      }
      existing.priority = Math.max(existing.priority || 0, this.frontierPriority(normalized, discoveredFrom));
      return false;
    }
    if (this.frontier.size >= this.frontierLimit()) return false;
    this.frontier.set(normalized, {
      schema: "meos.internet-frontier-entry.v1", url: normalized,
      discoveredAt: new Date().toISOString(),
      discoveredFrom: discoveredFrom ? [discoveredFrom] : [],
      depth: Math.max(0, Number(depth) || 0),
      priority: this.frontierPriority(normalized, discoveredFrom),
      attempts: 0, lastAttemptAt: null, lastResult: "pending"
    });
    return true;
  }

  discoverySeeds(limit = this.options.discoverySeedLimit) {
    const count = Math.max(1, Math.min(50, Number(limit) || this.options.discoverySeedLimit));
    const pending = [...this.frontier.values()]
      .filter(entry => entry?.lastResult !== "indexed")
      .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || Number(a.attempts || 0) - Number(b.attempts || 0) || String(a.discoveredAt || "").localeCompare(String(b.discoveredAt || "")))
      .slice(0, count).map(entry => entry.url);
    if (pending.length) return pending;
    return [...this.documents.values()]
      .sort((a, b) => String(a.observedAt || "").localeCompare(String(b.observedAt || "")))
      .slice(0, count).map(doc => doc.url);
  }

  async discover({ maxPages = 20, maxDepth = 1, seedLimit } = {}) {
    await this.load();
    const seeds = this.discoverySeeds(seedLimit);
    if (!seeds.length) throw new Error("MEOS-owned discovery requires at least one previously indexed page or persistent frontier entry. Seed the index once with /crawl first.");
    return this.crawl({ seeds, maxPages, maxDepth, sameOriginOnly: false });
  }

  status() {
    const indexBytes = this.indexBytes();
    const maxIndexBytes = this.configuredMaxIndexBytes();
    return {
      schema: "meos.internet-node.status.v1",
      version: MEOS_INTERNET_NODE_VERSION,
      buildId: MEOS_INTERNET_NODE_BUILD_ID,
      coreReady: true,
      indexedPages: this.documents.size,
      indexBytes,
      maxIndexBytes,
      storageUtilization: Number((indexBytes / maxIndexBytes).toFixed(6)),
      storageBudgetRemainingBytes: Math.max(0, maxIndexBytes - indexBytes),
      discoveryReady: this.documents.size > 0 || this.frontier.size > 0,
      frontierEntries: this.frontier.size,
      frontierPending: [...this.frontier.values()].filter(entry => entry?.lastResult !== "indexed").length,
      frontierLimit: this.frontierLimit(),
      lastCrawl: this.lastCrawl,
      providerIndependentSearch: true,
      paidSearchProviderRequired: false,
      institutionalTruthAuthority: false,
      semanticConclusionAuthority: false
    };
  }

  search(query, limit = 10) {
    const terms = [...new Set(tokenize(query))].slice(0, 24);
    if (!terms.length) return [];
    return [...this.documents.values()]
      .map(doc => ({ doc, score: scoreDocument(doc, terms) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || String(b.doc.observedAt).localeCompare(String(a.doc.observedAt)))
      .slice(0, Math.max(1, Math.min(50, Number(limit) || 10)))
      .map(({ doc, score }) => ({
        url: doc.url,
        title: doc.title,
        excerpt: doc.text.slice(0, 800),
        observedAt: doc.observedAt,
        sha256: doc.sha256,
        score: Number(score.toFixed(3)),
        source: "meos-owned-index"
      }));
  }

  async crawl({ seeds, maxPages, maxDepth, sameOriginOnly = true }) {
    await this.load();
    const normalizedSeeds = [...new Set((seeds || []).map(value => new URL(value).toString()))];
    if (!normalizedSeeds.length) throw new Error("At least one seed URL is required.");
    const pageLimit = Math.max(1, Math.min(250, Number(maxPages) || this.options.maxPagesPerCrawl));
    const depthLimit = Math.max(0, Math.min(5, Number(maxDepth) || this.options.maxDepth));
    const seedOrigins = new Set(normalizedSeeds.map(value => new URL(value).origin));
    const queue = normalizedSeeds.map(url => ({ url, depth: 0 }));
    const seen = new Set();
    const results = [];

    while (queue.length && results.length < pageLimit) {
      const item = queue.shift();
      if (!item || seen.has(item.url)) continue;
      seen.add(item.url);
      const frontierEntry = this.frontier.get(item.url);
      if (frontierEntry) {
        frontierEntry.attempts = Number(frontierEntry.attempts || 0) + 1;
        frontierEntry.lastAttemptAt = new Date().toISOString();
        frontierEntry.lastResult = "attempting";
      }
      let current;
      try { current = new URL(item.url); } catch (_) { continue; }
      if (sameOriginOnly && !seedOrigins.has(current.origin)) continue;

      const allowed = await robotsAllows(item.url, {
        timeoutMs: this.options.timeoutMs,
        maxBytes: this.options.maxBytesPerPage,
        userAgent: this.options.userAgent
      });
      if (!allowed) {
        results.push({ url: item.url, indexed: false, reason: "robots-disallowed" });
        continue;
      }

      try {
        const fetched = await fetchBounded(item.url, {
          timeoutMs: this.options.timeoutMs,
          maxBytes: this.options.maxBytesPerPage,
          userAgent: this.options.userAgent
        });
        const title = extractTitle(fetched.body);
        const text = cleanText(fetched.body).slice(0, 200000);
        const finalUrl = new URL(fetched.finalUrl || item.url).toString();
        const sha256 = crypto.createHash("sha256").update(text).digest("hex");
        const observedAt = new Date().toISOString();
        const document = {
          schema: "meos.internet-document.v1",
          url: finalUrl,
          title,
          text,
          observedAt,
          sha256,
          contentType: fetched.contentType,
          provenance: { acquisition: "direct-public-web-crawl", seedOrigins: [...seedOrigins] },
          institutionalTruthAuthority: false
        };
        const duplicateUrl = this.duplicateUrlForHash(sha256, finalUrl);
        const previous = this.documents.get(finalUrl);
        const currentBytes = this.indexBytes();
        const previousBytes = previous ? Buffer.byteLength(JSON.stringify(previous), "utf8") : 0;
        const documentBytes = Buffer.byteLength(JSON.stringify(document), "utf8");
        const projectedBytes = currentBytes - previousBytes + documentBytes;
        const maxIndexBytes = this.configuredMaxIndexBytes();

        if (duplicateUrl) {
          results.push({ url: finalUrl, indexed: false, reason: "duplicate-content", duplicateOf: duplicateUrl, sha256 });
          if (frontierEntry) frontierEntry.lastResult = "duplicate-content";
        } else if (projectedBytes > maxIndexBytes) {
          results.push({ url: finalUrl, indexed: false, reason: "storage-budget-reached", projectedBytes, maxIndexBytes, sha256 });
          if (frontierEntry) frontierEntry.lastResult = "storage-budget-reached";
        } else {
          this.documents.set(finalUrl, document);
          this.frontier.delete(finalUrl);
          if (item.url !== finalUrl) this.frontier.delete(item.url);
          results.push({ url: finalUrl, indexed: true, title, bytesOfText: Buffer.byteLength(text), storedBytes: documentBytes, sha256 });
        }

        for (const link of extractLinks(fetched.body, finalUrl)) {
          try {
            const linkUrl = new URL(link);
            if (sameOriginOnly && !seedOrigins.has(linkUrl.origin)) continue;
            this.rememberFrontier(linkUrl.toString(), { discoveredFrom: finalUrl, depth: item.depth + 1 });
            if (item.depth < depthLimit && !seen.has(linkUrl.toString())) queue.push({ url: linkUrl.toString(), depth: item.depth + 1 });
          } catch (_) {}
        }
      } catch (error) {
        const reason = error?.message || String(error);
        results.push({ url: item.url, indexed: false, reason });
        if (frontierEntry) frontierEntry.lastResult = reason;
      }

      if (this.options.delayMs > 0) await new Promise(resolve => setTimeout(resolve, this.options.delayMs));
    }

    this.lastCrawl = {
      startedFrom: normalizedSeeds,
      completedAt: new Date().toISOString(),
      attempted: results.length,
      indexed: results.filter(item => item.indexed).length,
      maxPages: pageLimit,
      maxDepth: depthLimit,
      sameOriginOnly,
      indexBytes: this.indexBytes(),
      maxIndexBytes: this.configuredMaxIndexBytes(),
      duplicateContentSkipped: results.filter(item => item.reason === "duplicate-content").length,
      storageBudgetSkipped: results.filter(item => item.reason === "storage-budget-reached").length,
      frontierEntries: this.frontier.size,
      frontierPending: [...this.frontier.values()].filter(entry => entry?.lastResult !== "indexed").length
    };
    await this.save();
    return { ...this.lastCrawl, results };
  }
}

export function createMeosInternetRouter({ express, node }) {
  if (!express || typeof express.Router !== "function") throw new Error("MEOS Internet Node router requires Express.");
  if (!node) throw new Error("MEOS Internet Node router requires a node instance.");

  const router = express.Router();

  router.get("/status", (_req, res) => {
    res.json({
      ok: true,
      capability: "meos-internet-node",
      version: MEOS_INTERNET_NODE_VERSION,
      build: MEOS_INTERNET_NODE_BUILD_ID,
      sourceAuthority: "public-web-observation",
      institutionalTruthAuthority: false,
      index: node.status()
    });
  });

  router.get("/search", (req, res) => {
    const query = String(req.query?.q || "").trim();
    const limit = Math.max(1, Math.min(50, Number(req.query?.limit) || 10));
    if (!query) return res.status(400).json({ ok: false, error: "query_required", message: "Provide ?q=<search terms>." });
    return res.json({ ok: true, query, source: "meos-owned-index", results: node.search(query, { limit }) });
  });

  router.post("/discover", express.json({ limit: "64kb" }), async (req, res) => {
    try {
      const result = await node.discover({
        maxPages: req.body?.maxPages,
        maxDepth: req.body?.maxDepth,
        seedLimit: req.body?.seedLimit
      });
      return res.json({ ok: true, source: "meos-owned-frontier", externalSearchProviderUsed: false, ...result });
    } catch (error) {
      return res.status(400).json({ ok: false, error: "discovery_failed", message: error?.message || "MEOS Internet Node discovery failed." });
    }
  });

  router.post("/crawl", express.json({ limit: "64kb" }), async (req, res) => {
    try {
      const seeds = Array.isArray(req.body?.seeds) ? req.body.seeds : [];
      if (!seeds.length) return res.status(400).json({ ok: false, error: "seeds_required", message: "Provide a non-empty seeds array of public http(s) URLs." });
      const result = await node.crawl({
        seeds,
        maxPages: req.body?.maxPages,
        maxDepth: req.body?.maxDepth,
        sameOriginOnly: req.body?.sameOriginOnly
      });
      return res.json({ ok: true, ...result });
    } catch (error) {
      return res.status(400).json({ ok: false, error: "crawl_failed", message: error?.message || "MEOS Internet Node crawl failed." });
    }
  });

  return router;
}
