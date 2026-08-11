#!/usr/bin/env python3
"""
MEOS Maddy Local Perception Substrate
Version: 1.4.0
Commission: 006.017D7N7
Build: MLP140-EXECUTIVE-BRAIN-HANDOFF-CONSUMER-20260811-A

Purpose:
- Give Maddy a provider-neutral, local-first public-web perception substrate.
- Retrieve public HTTP(S) resources without a paid search/model provider.
- Store bounded working/cache metadata in SQLite rather than browser storage.
- Recognize unchanged reality before expensive cognition or cloud persistence.
- Emit small structured perception events that existing MEOS cognition may
  later consume through an authenticated local bridge.

This file is metabolism, not a second brain.
It does not make executive decisions, authorize paid cognition, grant external
action, bypass access controls, or silently promote observations to
institutional truth.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import re
import json
import sqlite3
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional

VERSION = "1.4.0"
BUILD_ID = "MLP140-EXECUTIVE-BRAIN-HANDOFF-CONSUMER-20260811-A"
DEFAULT_DB = Path.home() / ".meos" / "maddy-perception.sqlite3"
DEFAULT_TIMEOUT_SECONDS = 15
DEFAULT_MAX_BYTES = 8 * 1024 * 1024
USER_AGENT = "MEOS-Maddy-Local-Perception/1.0 (+provider-neutral-public-web)"
BRIDGE_USER_AGENT = "MEOS-Maddy-Local-Perception-Bridge/1.1"
DEFAULT_BRIDGE_TIMEOUT_SECONDS = 8



@dataclass(frozen=True)
class PerceptionResult:
    url: str
    final_url: str
    status: int
    content_type: str
    bytes_read: int
    content_sha256: str
    changed: bool
    previous_sha256: Optional[str]
    observed_at: int
    paid_provider_used: bool = False
    paid_cognition_authorized: bool = False
    external_action_authorized: bool = False


def open_db(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS resource_state (
            url TEXT PRIMARY KEY,
            final_url TEXT NOT NULL,
            status INTEGER NOT NULL,
            content_type TEXT NOT NULL,
            content_sha256 TEXT NOT NULL,
            bytes_read INTEGER NOT NULL,
            first_seen_at INTEGER NOT NULL,
            last_seen_at INTEGER NOT NULL,
            changed_at INTEGER NOT NULL
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS discovery_state (
            query TEXT NOT NULL,
            url TEXT NOT NULL,
            title TEXT NOT NULL,
            first_seen_at INTEGER NOT NULL,
            last_seen_at INTEGER NOT NULL,
            PRIMARY KEY(query, url)
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS investigation_state (
            intent_id TEXT PRIMARY KEY,
            query TEXT NOT NULL,
            started_at INTEGER NOT NULL,
            completed_at INTEGER,
            sources_discovered INTEGER NOT NULL DEFAULT 0,
            sources_observed INTEGER NOT NULL DEFAULT 0,
            changed_sources INTEGER NOT NULL DEFAULT 0,
            unchanged_sources INTEGER NOT NULL DEFAULT 0,
            bytes_observed INTEGER NOT NULL DEFAULT 0,
            stop_reason TEXT
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS perception_counters (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            observations INTEGER NOT NULL DEFAULT 0,
            changed INTEGER NOT NULL DEFAULT 0,
            unchanged INTEGER NOT NULL DEFAULT 0,
            bytes_downloaded INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    db.execute(
        "INSERT OR IGNORE INTO perception_counters(id) VALUES (1)"
    )
    db.commit()
    return db


def validate_public_url(raw: str) -> str:
    parsed = urllib.parse.urlparse(raw)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Public perception requires an HTTP(S) URL.")
    if parsed.username or parsed.password:
        raise ValueError("Credential-bearing URLs are not accepted.")
    return urllib.parse.urlunparse(parsed)


def retrieve(url: str, timeout: int, max_bytes: int) -> tuple:
    request = urllib.request.Request(
        validate_public_url(url),
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,text/plain,application/json,application/pdf;q=0.9,*/*;q=0.2",
        },
        method="GET",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        declared = response.headers.get("Content-Length")
        if declared and int(declared) > max_bytes:
            raise ValueError("Public resource exceeds local perception byte limit.")

        digest = hashlib.sha256()
        total = 0
        while True:
            chunk = response.read(min(65536, max_bytes - total + 1))
            if not chunk:
                break
            total += len(chunk)
            if total > max_bytes:
                raise ValueError("Public resource exceeds local perception byte limit.")
            digest.update(chunk)

        return (
            int(getattr(response, "status", 200)),
            response.geturl(),
            response.headers.get_content_type() or "application/octet-stream",
            total,
            digest.hexdigest(),
        )


def discover_public_web(db: sqlite3.Connection, query: str, timeout: int, max_results: int) -> dict:
    """Cheap public discovery only; no semantic judgment or truth promotion."""
    query = " ".join(str(query or "").split()).strip()
    if not query:
        raise ValueError("Discovery query is required.")
    endpoint = "https://html.duckduckgo.com/html/?" + urllib.parse.urlencode({"q": query})
    request = urllib.request.Request(endpoint, headers={"User-Agent": USER_AGENT, "Accept": "text/html"}, method="GET")
    with urllib.request.urlopen(request, timeout=max(1, timeout)) as response:
        body = response.read(1024 * 1024 + 1)
        if len(body) > 1024 * 1024:
            raise ValueError("Discovery response exceeded 1 MB local limit.")
    text = body.decode("utf-8", errors="replace")
    pattern = re.compile(r'<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', re.I | re.S)
    strip_tags = re.compile(r"<[^>]+>")
    now=int(time.time()); results=[]; seen=set()
    for href, raw_title in pattern.findall(text):
        href=html.unescape(href)
        p=urllib.parse.urlparse(href)
        if p.netloc.endswith("duckduckgo.com") and p.path.startswith("/l/"):
            target=urllib.parse.parse_qs(p.query).get("uddg",[""])[0]
            if target: href=urllib.parse.unquote(target)
        p=urllib.parse.urlparse(href)
        if p.scheme not in {"http","https"} or not p.hostname or p.hostname.endswith("duckduckgo.com"):
            continue
        canonical=urllib.parse.urlunparse((p.scheme,p.netloc,p.path or "/","",p.query,""))
        if canonical in seen: continue
        seen.add(canonical)
        title=" ".join(html.unescape(strip_tags.sub("",raw_title)).split())[:300]
        prior=db.execute("SELECT first_seen_at FROM discovery_state WHERE query=? AND url=?",(query,canonical)).fetchone()
        first_seen=prior[0] if prior else now
        db.execute("""INSERT INTO discovery_state(query,url,title,first_seen_at,last_seen_at)
                      VALUES(?,?,?,?,?)
                      ON CONFLICT(query,url) DO UPDATE SET title=excluded.title,last_seen_at=excluded.last_seen_at""",
                   (query,canonical,title,first_seen,now))
        results.append({"url":canonical,"title":title,"newForQuery":prior is None})
        if len(results)>=max(1,min(max_results,50)): break
    db.commit()
    return {"query":query,"results":results,"resultCount":len(results),
            "newResultCount":sum(1 for x in results if x["newForQuery"]),
            "paidSearchProviderUsed":False,"paidCognitionAuthorized":False,
            "externalActionAuthorized":False,"institutionalTruthAuthority":False}

def observe(db: sqlite3.Connection, url: str, timeout: int, max_bytes: int) -> PerceptionResult:
    now = int(time.time())
    status, final_url, content_type, size, digest = retrieve(url, timeout, max_bytes)
    prior = db.execute(
        "SELECT content_sha256, first_seen_at, changed_at FROM resource_state WHERE url = ?",
        (url,),
    ).fetchone()
    previous_sha = prior[0] if prior else None
    changed = previous_sha != digest
    first_seen = prior[1] if prior else now
    changed_at = now if changed else (prior[2] if prior else now)

    db.execute(
        """
        INSERT INTO resource_state(
            url, final_url, status, content_type, content_sha256, bytes_read,
            first_seen_at, last_seen_at, changed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(url) DO UPDATE SET
            final_url=excluded.final_url,
            status=excluded.status,
            content_type=excluded.content_type,
            content_sha256=excluded.content_sha256,
            bytes_read=excluded.bytes_read,
            last_seen_at=excluded.last_seen_at,
            changed_at=excluded.changed_at
        """,
        (url, final_url, status, content_type, digest, size, first_seen, now, changed_at),
    )
    db.execute(
        """
        UPDATE perception_counters SET
            observations = observations + 1,
            changed = changed + ?,
            unchanged = unchanged + ?,
            bytes_downloaded = bytes_downloaded + ?
        WHERE id = 1
        """,
        (1 if changed else 0, 0 if changed else 1, size),
    )
    db.commit()

    return PerceptionResult(
        url=url,
        final_url=final_url,
        status=status,
        content_type=content_type,
        bytes_read=size,
        content_sha256=digest,
        changed=changed,
        previous_sha256=previous_sha,
        observed_at=now,
    )




def validate_executive_brain_handoff(handoff: dict) -> dict:
    """
    Validate the exact Executive Brain v1 local-perception handoff contract.
    Local perception may consume the Brain's intent and budget, but it may not
    widen that intent, increase the budget, or inherit cognitive/action authority.
    """
    if not isinstance(handoff, dict):
        raise ValueError("Executive Brain handoff must be a JSON object.")
    if handoff.get("schema") != "meos.maddy.local-perception-handoff.v1":
        raise ValueError("Unsupported local-perception handoff schema.")

    intent_id = " ".join(str(handoff.get("intentId") or "").split()).strip()[:160]
    query = " ".join(str(handoff.get("query") or "").split()).strip()
    if not intent_id or not query:
        raise ValueError("Executive Brain handoff requires intentId and query.")

    authority = handoff.get("authority") or {}
    epistemic = handoff.get("epistemicContract") or {}
    budget = handoff.get("perceptionBudget") or {}

    if authority.get("investigationOnly") is not True:
        raise ValueError("Handoff must be investigation-only.")
    if authority.get("paidCognitionAuthorized") is not False:
        raise ValueError("Local perception cannot receive paid-cognition authority.")
    if authority.get("externalActionAuthorized") is not False:
        raise ValueError("Local perception cannot receive external-action authority.")
    if authority.get("consequentialActionAuthorized") is not False:
        raise ValueError("Local perception cannot receive consequential-action authority.")

    if epistemic.get("perceptionIsNotBelief") is not True:
        raise ValueError("Handoff must preserve perception-is-not-belief.")
    if epistemic.get("semanticConclusionAuthorized") is not False:
        raise ValueError("Local perception cannot receive semantic-conclusion authority.")
    if epistemic.get("sufficiencyJudgmentAuthorized") is not False:
        raise ValueError("Local perception cannot receive sufficiency-judgment authority.")
    if epistemic.get("institutionalTruthPromotionAuthorized") is not False:
        raise ValueError("Local perception cannot receive truth-promotion authority.")

    max_results = max(1, min(50, int(budget.get("maxResults") or 10)))
    max_observations = max(
        1,
        min(20, max_results, int(budget.get("maxObservations") or 5)),
    )
    max_total_bytes = max(
        1024,
        min(64 * 1024 * 1024, int(budget.get("maxTotalBytes") or 16 * 1024 * 1024)),
    )

    return {
        "schema": handoff["schema"],
        "intentId": intent_id,
        "query": query,
        "origin": handoff.get("origin"),
        "subject": handoff.get("subject"),
        "objective": handoff.get("objective"),
        "perceptionBudget": {
            "maxResults": max_results,
            "maxObservations": max_observations,
            "maxTotalBytes": max_total_bytes,
        },
        "authority": {
            "investigationOnly": True,
            "paidCognitionAuthorized": False,
            "externalActionAuthorized": False,
            "consequentialActionAuthorized": False,
        },
        "epistemicContract": {
            "perceptionIsNotBelief": True,
            "semanticConclusionAuthorized": False,
            "sufficiencyJudgmentAuthorized": False,
            "institutionalTruthPromotionAuthorized": False,
        },
    }


def execute_executive_brain_handoff(
    db: sqlite3.Connection,
    handoff: dict,
    timeout: int,
) -> dict:
    accepted = validate_executive_brain_handoff(handoff)
    budget = accepted["perceptionBudget"]

    result = investigate_intent(
        db=db,
        intent_id=accepted["intentId"],
        query=accepted["query"],
        timeout=max(1, timeout),
        max_results=budget["maxResults"],
        max_observations=budget["maxObservations"],
        max_total_bytes=budget["maxTotalBytes"],
    )

    # Preserve exact cognitive lineage and return only perception evidence.
    result["handoffSchema"] = accepted["schema"]
    result["handoffAccepted"] = True
    result["origin"] = accepted.get("origin")
    result["subject"] = accepted.get("subject")
    result["objective"] = accepted.get("objective")
    result["perceptionBudget"] = budget
    result["epistemicContract"] = accepted["epistemicContract"]
    result["authority"] = accepted["authority"]
    result["semanticConclusion"] = None
    result["sufficiencyJudgment"] = None
    result["institutionalTruthAuthority"] = False
    result["paidCognitionAuthorized"] = False
    result["externalActionAuthorized"] = False
    return result


def load_handoff_json(path: str) -> dict:
    if path == "-":
        raw = sys.stdin.read()
    else:
        raw = Path(path).read_text(encoding="utf-8")
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid Executive Brain handoff JSON: {exc}") from exc
    if not isinstance(parsed, dict):
        raise ValueError("Executive Brain handoff JSON must contain one object.")
    return parsed


def investigate_intent(
    db: sqlite3.Connection,
    intent_id: str,
    query: str,
    timeout: int,
    max_results: int,
    max_observations: int,
    max_total_bytes: int,
) -> dict:
    """
    Execute one bounded perception investigation for an already-existing
    cognitive intent. This substrate cannot invent the intent or decide that
    the answer is sufficient; it only gathers bounded change evidence.
    """
    intent_id = " ".join(str(intent_id or "").split()).strip()[:160]
    query = " ".join(str(query or "").split()).strip()
    if not intent_id or not query:
        raise ValueError("Investigation requires an intent id and query.")

    max_results = max(1, min(int(max_results), 50))
    max_observations = max(1, min(int(max_observations), max_results, 20))
    max_total_bytes = max(1024, min(int(max_total_bytes), 64 * 1024 * 1024))
    started = int(time.time())

    db.execute(
        """INSERT INTO investigation_state(intent_id,query,started_at)
           VALUES(?,?,?)
           ON CONFLICT(intent_id) DO UPDATE SET query=excluded.query,started_at=excluded.started_at,
             completed_at=NULL,sources_discovered=0,sources_observed=0,changed_sources=0,
             unchanged_sources=0,bytes_observed=0,stop_reason=NULL""",
        (intent_id, query, started),
    )
    db.commit()

    discovery = discover_public_web(db, query, timeout, max_results)
    observations = []
    bytes_observed = 0
    stop_reason = "candidate-sources-exhausted"

    for candidate in discovery["results"]:
        if len(observations) >= max_observations:
            stop_reason = "observation-budget-reached"
            break
        remaining = max_total_bytes - bytes_observed
        if remaining < 1024:
            stop_reason = "byte-budget-reached"
            break
        try:
            result = observe(
                db,
                candidate["url"],
                timeout,
                min(DEFAULT_MAX_BYTES, remaining),
            )
        except (ValueError, urllib.error.URLError, urllib.error.HTTPError) as exc:
            observations.append({
                "url": candidate["url"],
                "observed": False,
                "error": str(exc)[:300],
            })
            continue

        bytes_observed += result.bytes_read
        observations.append({
            "url": result.url,
            "finalUrl": result.final_url,
            "observed": True,
            "changed": result.changed,
            "contentSha256": result.content_sha256,
            "bytesObservedLocally": result.bytes_read,
        })

    changed_count = sum(1 for x in observations if x.get("observed") and x.get("changed"))
    unchanged_count = sum(1 for x in observations if x.get("observed") and not x.get("changed"))
    observed_count = changed_count + unchanged_count
    completed = int(time.time())

    db.execute(
        """UPDATE investigation_state SET completed_at=?,sources_discovered=?,sources_observed=?,
           changed_sources=?,unchanged_sources=?,bytes_observed=?,stop_reason=? WHERE intent_id=?""",
        (completed, discovery["resultCount"], observed_count, changed_count,
         unchanged_count, bytes_observed, stop_reason, intent_id),
    )
    db.commit()

    return {
        "intentId": intent_id,
        "query": query,
        "status": "perception-complete",
        "sourcesDiscovered": discovery["resultCount"],
        "sourcesObserved": observed_count,
        "changedSources": changed_count,
        "unchangedSources": unchanged_count,
        "bytesObservedLocally": bytes_observed,
        "stopReason": stop_reason,
        "observations": observations,
        "semanticConclusion": None,
        "sufficiencyJudgment": None,
        "paidSearchProviderUsed": False,
        "paidCognitionAuthorized": False,
        "externalActionAuthorized": False,
        "institutionalTruthAuthority": False,
    }

def emit_change_evidence(
    bridge_url: str,
    bridge_secret: str,
    result: PerceptionResult,
    timeout: int = DEFAULT_BRIDGE_TIMEOUT_SECONDS,
) -> dict:
    """
    Send only compact change evidence to Maddy's authenticated cognition bridge.
    The retrieved body never crosses this bridge.
    """
    if not result.changed:
        return {
            "success": True,
            "sent": False,
            "reason": "unchanged-local-perception-no-bridge-transfer",
            "bulkContentTransferred": False,
        }

    if not bridge_url or not bridge_secret:
        return {
            "success": True,
            "sent": False,
            "reason": "bridge-not-configured-local-evidence-retained",
            "bulkContentTransferred": False,
        }

    parsed = urllib.parse.urlparse(bridge_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Bridge URL requires HTTP(S).")

    payload = json.dumps(
        {
            "changed": True,
            "url": result.url,
            "finalUrl": result.final_url,
            "contentSha256": result.content_sha256,
            "observedAt": result.observed_at,
            "bytesObservedLocally": result.bytes_read,
        },
        separators=(",", ":"),
    ).encode("utf-8")

    # The server hard-limits this bridge to 8 KB. Keep the local side tighter.
    if len(payload) > 4096:
        raise ValueError("Compact perception evidence exceeded 4 KB.")

    request = urllib.request.Request(
        bridge_url,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {bridge_secret}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": BRIDGE_USER_AGENT,
        },
    )

    with urllib.request.urlopen(request, timeout=max(1, timeout)) as response:
        body = response.read(8192)
        decoded = json.loads(body.decode("utf-8")) if body else {}
        return {
            "success": 200 <= int(getattr(response, "status", 200)) < 300,
            "sent": True,
            "status": int(getattr(response, "status", 200)),
            "response": decoded,
            "evidenceBytesTransferred": len(payload),
            "bulkContentTransferred": False,
        }

def status(db: sqlite3.Connection) -> dict:
    counters = db.execute(
        "SELECT observations, changed, unchanged, bytes_downloaded FROM perception_counters WHERE id = 1"
    ).fetchone()
    resources = db.execute("SELECT COUNT(*) FROM resource_state").fetchone()[0]
    discovered = db.execute("SELECT COUNT(*) FROM discovery_state").fetchone()[0]
    investigations = db.execute("SELECT COUNT(*) FROM investigation_state").fetchone()[0]
    return {
        "name": "MEOS Maddy Local Perception Substrate",
        "version": VERSION,
        "buildId": BUILD_ID,
        "mode": "local-first-cheap-perception",
        "resourcesKnown": resources,
        "discoveredResourcesKnown": discovered,
        "boundedInvestigationsKnown": investigations,
        "observations": counters[0],
        "changedObservations": counters[1],
        "unchangedObservationsSuppressedFromEscalation": counters[2],
        "bytesDownloadedLocally": counters[3],
        "paidProviderUsed": False,
        "paidCognitionAuthorized": False,
        "externalActionAuthorized": False,
        "institutionalTruthAuthority": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Maddy local-first public-web perception.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    sub = parser.add_subparsers(dest="command", required=True)

    observe_cmd = sub.add_parser("observe", help="Observe one public HTTP(S) resource.")
    observe_cmd.add_argument("url")
    observe_cmd.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT_SECONDS)
    observe_cmd.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES)
    observe_cmd.add_argument(
        "--bridge-url",
        default="",
        help="Authenticated MEOS local perception bridge endpoint.",
    )
    observe_cmd.add_argument(
        "--bridge-secret",
        default="",
        help="Dedicated local perception bridge secret.",
    )
    observe_cmd.add_argument(
        "--bridge-timeout",
        type=int,
        default=DEFAULT_BRIDGE_TIMEOUT_SECONDS,
    )

    discover_cmd = sub.add_parser("discover", help="Discover public-web resources locally without a paid search provider.")
    discover_cmd.add_argument("query")
    discover_cmd.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT_SECONDS)
    discover_cmd.add_argument("--max-results", type=int, default=10)

    investigate_cmd = sub.add_parser(
        "investigate",
        help="Run one bounded public-web perception investigation for an existing cognitive intent.",
    )
    investigate_cmd.add_argument("--intent-id", required=True)
    investigate_cmd.add_argument("query")
    investigate_cmd.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT_SECONDS)
    investigate_cmd.add_argument("--max-results", type=int, default=10)
    investigate_cmd.add_argument("--max-observations", type=int, default=5)
    investigate_cmd.add_argument("--max-total-bytes", type=int, default=16 * 1024 * 1024)

    handoff_cmd = sub.add_parser(
        "handoff",
        help="Consume an Executive Brain local-perception handoff JSON contract.",
    )
    handoff_cmd.add_argument(
        "handoff_json",
        help="Path to handoff JSON, or - to read one JSON object from stdin.",
    )
    handoff_cmd.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT_SECONDS)

    sub.add_parser("status", help="Show local perception evidence.")
    args = parser.parse_args()

    db = open_db(args.db)
    try:
        if args.command == "observe":
            result = observe(db, args.url, max(1, args.timeout), max(1024, args.max_bytes))
            bridge = emit_change_evidence(
                args.bridge_url,
                args.bridge_secret,
                result,
                max(1, args.bridge_timeout),
            )
            output = asdict(result)
            output["bridge"] = bridge
            print(json.dumps(output, indent=2, sort_keys=True))
        elif args.command == "discover":
            print(json.dumps(discover_public_web(db, args.query, args.timeout, args.max_results), indent=2, sort_keys=True))
        elif args.command == "investigate":
            print(json.dumps(investigate_intent(
                db, args.intent_id, args.query, args.timeout, args.max_results,
                args.max_observations, args.max_total_bytes
            ), indent=2, sort_keys=True))
        elif args.command == "handoff":
            handoff = load_handoff_json(args.handoff_json)
            print(json.dumps(
                execute_executive_brain_handoff(db, handoff, args.timeout),
                indent=2,
                sort_keys=True,
            ))
        else:
            print(json.dumps(status(db), indent=2, sort_keys=True))
        return 0
    except (ValueError, urllib.error.URLError, urllib.error.HTTPError) as exc:
        print(json.dumps({"success": False, "error": str(exc)}, indent=2), file=sys.stderr)
        return 2
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
