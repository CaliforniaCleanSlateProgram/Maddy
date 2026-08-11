#!/usr/bin/env python3
"""
MEOS Maddy Local Perception Substrate
Version: 1.1.0
Commission: 006.017D7N3
Build: MLP110-CHANGE-EVIDENCE-EMITTER-20260811-A

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

VERSION = "1.1.0"
BUILD_ID = "MLP110-CHANGE-EVIDENCE-EMITTER-20260811-A"
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
    return {
        "name": "MEOS Maddy Local Perception Substrate",
        "version": VERSION,
        "buildId": BUILD_ID,
        "mode": "local-first-cheap-perception",
        "resourcesKnown": resources,
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
