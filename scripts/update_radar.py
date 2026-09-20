#!/usr/bin/env python3
import json, re, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
cfg = json.loads((ROOT / "data/sources.json").read_text(encoding="utf-8"))
radar_path = ROOT / "data/radar.json"
keywords = cfg["keywords"]
items = []
successful_sources = set()
failed_sources = set()

def local_name(tag):
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag

def child_text(el, names):
    wanted = set(names)
    for node in list(el):
        if local_name(node.tag) in wanted and node.text:
            return node.text.strip()
    return ""

def entries_from(root):
    return [node for node in root.iter() if local_name(node.tag) in {"item", "entry"}]

def entry_link(el):
    for node in list(el):
        if local_name(node.tag) != "link":
            continue
        if node.text and node.text.strip():
            return node.text.strip()
        href = node.attrib.get("href", "")
        rel = node.attrib.get("rel", "alternate")
        if href and rel in {"alternate", ""}:
            return href
    return el.attrib.get("{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about", "")

def date_iso(raw):
    if not raw:
        return ""
    try:
        d = parsedate_to_datetime(raw)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d.astimezone(timezone.utc).isoformat()
    except Exception:
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat()
        except Exception:
            return raw

for src in cfg["sources"]:
    if not src.get("enabled"):
        continue
    try:
        req = urllib.request.Request(
            src["feed"],
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; ICT-RADAR/1.1; +https://kangaeru5050.github.io/ict-radar/)",
                "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
            },
        )
        with urllib.request.urlopen(req, timeout=35) as response:
            root = ET.fromstring(response.read())
        entries = entries_from(root)
        if not entries:
            raise ValueError("RSS/Atom entries were not found")
        successful_sources.add(src["id"])
        matched = 0
        for entry in entries[:40]:
            title = child_text(entry, ["title"])
            link = entry_link(entry)
            rawdate = child_text(entry, ["pubDate", "date", "updated", "published"])
            hit = [k for k in keywords if k.lower() in title.lower()]
            if not title or not link or not hit:
                continue
            items.append({
                "title": title,
                "url": link,
                "source": src["name"],
                "source_id": src["id"],
                "published": date_iso(rawdate),
                "keywords": hit[:5],
                "status": "auto",
            })
            matched += 1
        print(f"OK {src['name']}: {len(entries)} entries, {matched} matched")
    except Exception as ex:
        failed_sources.add(src["id"])
        print(f"WARN {src['name']}: {ex}")

# A temporary feed failure must not erase articles that were already visible.
if radar_path.exists() and failed_sources:
    try:
        previous = json.loads(radar_path.read_text(encoding="utf-8"))
        items.extend(
            item for item in previous.get("items", [])
            if item.get("source_id") in failed_sources
        )
    except Exception as ex:
        print(f"WARN previous radar data: {ex}")

seen = set()
unique = []
for item in sorted(items, key=lambda value: value.get("published", ""), reverse=True):
    key = re.sub(r"\s+", "", item["title"]).lower()
    if key in seen:
        continue
    seen.add(key)
    unique.append(item)

out = {
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "note": "自動収集した掲載候補です。内容・制度上の意味は未確認です。",
    "collection": {
        "successful_sources": len(successful_sources),
        "failed_sources": len(failed_sources),
    },
    "items": unique[:24],
}
radar_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(out['items'])} items; success={len(successful_sources)}, failed={len(failed_sources)}")
