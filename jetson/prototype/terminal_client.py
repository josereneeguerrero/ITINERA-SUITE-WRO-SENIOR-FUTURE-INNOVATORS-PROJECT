#!/usr/bin/env python3
"""
Minimal Supabase client for Jetson / terminal (stdlib only).
Reads published places and calls search_places_nearby; stores session state in SQLite.
"""
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from uuid import uuid4


def load_env_file(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        os.environ.setdefault(key, val)


def _req_json(
    method: str,
    url: str,
    headers: dict[str, str],
    body: dict | None = None,
    timeout: float = 60.0,
) -> object:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code}: {detail}") from e
    if not raw:
        return None
    return json.loads(raw)


class TerminalClient:
    def __init__(self, base_url: str, anon_key: str, state_path: Path) -> None:
        self.base_url = base_url.rstrip("/")
        self.anon_key = anon_key
        self.state_path = state_path
        self._init_db()

    def _headers(self) -> dict[str, str]:
        return {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {self.anon_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=representation",
        }

    def _init_db(self) -> None:
        conn = sqlite3.connect(self.state_path)
        try:
            conn.execute(
                """
                create table if not exists session_kv (
                  k text primary key,
                  v text not null
                )
                """
            )
            conn.commit()
        finally:
            conn.close()

    def state_set(self, key: str, value: object) -> None:
        conn = sqlite3.connect(self.state_path)
        try:
            conn.execute(
                "insert into session_kv(k, v) values(?, ?) "
                "on conflict(k) do update set v = excluded.v",
                (key, json.dumps(value, ensure_ascii=False)),
            )
            conn.commit()
        finally:
            conn.close()

    def state_get(self, key: str) -> object | None:
        conn = sqlite3.connect(self.state_path)
        try:
            cur = conn.execute("select v from session_kv where k = ?", (key,))
            row = cur.fetchone()
        finally:
            conn.close()
        if row is None:
            return None
        return json.loads(row[0])

    def fetch_places(
        self,
        limit: int = 10,
        columns: str = "id,slug,name_i18n,ai_description_i18n,ai_tips_i18n,aggregated_rating",
    ) -> list:
        q = urllib.parse.urlencode(
            {"select": columns, "order": "slug.asc", "limit": str(limit)}
        )
        url = f"{self.base_url}/rest/v1/places?{q}"
        out = _req_json("GET", url, self._headers())
        if not isinstance(out, list):
            raise RuntimeError(f"unexpected places response: {type(out)}")
        return out

    def search_nearby(
        self,
        lat: float,
        lng: float,
        radius_km: float = 50,
        category_id: str | None = None,
        limit: int = 20,
        apply_sponsor_boost: bool = True,
    ) -> list:
        url = f"{self.base_url}/rest/v1/rpc/search_places_nearby"
        body = {
            "p_lat": lat,
            "p_lng": lng,
            "p_radius_km": radius_km,
            "p_category_id": category_id,
            "p_limit": limit,
            "p_apply_sponsor_boost": apply_sponsor_boost,
        }
        out = _req_json("POST", url, self._headers(), body)
        if not isinstance(out, list):
            raise RuntimeError(f"unexpected rpc response: {type(out)}")
        return out


def cmd_places(client: TerminalClient, limit: int) -> int:
    rows = client.fetch_places(limit=limit)
    client.state_set(
        "last_places_fetch",
        {
            "count": len(rows),
            "ids": [r.get("id") for r in rows if isinstance(r, dict)],
            "sample_slugs": [
                r.get("slug") for r in rows[:5] if isinstance(r, dict)
            ],
        },
    )
    print(json.dumps(rows, ensure_ascii=False, indent=2))
    return 0


def cmd_search(
    client: TerminalClient,
    lat: float,
    lng: float,
    radius: float,
    limit: int,
) -> int:
    rows = client.search_nearby(lat, lng, radius_km=radius, limit=limit)
    ids = [r.get("id") for r in rows if isinstance(r, dict)]
    client.state_set("last_search", {"lat": lat, "lng": lng, "place_ids": ids})
    print(json.dumps(rows, ensure_ascii=False, indent=2))
    return 0


def cmd_demo(client: TerminalClient) -> int:
    print("--- fetch_places (3) ---", file=sys.stderr)
    places = client.fetch_places(limit=3)
    for p in places:
        if not isinstance(p, dict):
            continue
        print(p.get("slug"), p.get("name_i18n"), file=sys.stderr)
    client.state_set("demo_session_id", str(uuid4()))

    print("--- search_places_nearby (Tegucigalpa-ish) ---", file=sys.stderr)
    lat, lng = 14.0818, -87.20681
    found = client.search_nearby(lat, lng, radius_km=80, limit=5)
    client.state_set(
        "last_demo",
        {
            "intent": "listar_cercanos",
            "place_ids_shown": [f.get("id") for f in found if isinstance(f, dict)],
        },
    )
    print(json.dumps(found, ensure_ascii=False, indent=2))
    return 0


def main() -> int:
    root = Path(__file__).resolve().parent
    load_env_file(root / ".env")

    parser = argparse.ArgumentParser(description="Itinera terminal data prototype")
    parser.add_argument(
        "--state-db",
        default=str(root / "state.sqlite"),
        help="SQLite path for session state",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_places = sub.add_parser("places", help="List published places")
    p_places.add_argument("--limit", type=int, default=5)

    p_search = sub.add_parser("search", help="RPC search_places_nearby")
    p_search.add_argument("lat", type=float)
    p_search.add_argument("lng", type=float)
    p_search.add_argument("--radius", type=float, default=50)
    p_search.add_argument("--limit", type=int, default=20)

    sub.add_parser("demo", help="Run a small scripted flow")

    args = parser.parse_args()
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_ANON_KEY", "").strip()
    if not url or not key:
        print(
            "Set SUPABASE_URL and SUPABASE_ANON_KEY (e.g. jetson/prototype/.env).",
            file=sys.stderr,
        )
        return 1

    client = TerminalClient(url, key, Path(args.state_db))

    if args.cmd == "places":
        return cmd_places(client, args.limit)
    if args.cmd == "search":
        return cmd_search(client, args.lat, args.lng, args.radius, args.limit)
    if args.cmd == "demo":
        return cmd_demo(client)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
