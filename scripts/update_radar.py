#!/usr/bin/env python3
import json, re, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
cfg=json.loads((ROOT/"data/sources.json").read_text(encoding="utf-8"))
keywords=cfg["keywords"]
items=[]

def text(el, names):
    for name in names:
        node=el.find(name)
        if node is not None and node.text:
            return node.text.strip()
    return ""

def date_iso(raw):
    if not raw: return ""
    try:
        d=parsedate_to_datetime(raw)
        if d.tzinfo is None: d=d.replace(tzinfo=timezone.utc)
        return d.astimezone(timezone.utc).isoformat()
    except Exception:
        try:
            return datetime.fromisoformat(raw.replace("Z","+00:00")).astimezone(timezone.utc).isoformat()
        except Exception:
            return raw

for src in cfg["sources"]:
    if not src.get("enabled"): continue
    try:
        req=urllib.request.Request(src["feed"],headers={"User-Agent":"ICT-RADAR/1.0 (+https://kangaeru5050.github.io/ict-radar/)"})
        with urllib.request.urlopen(req,timeout=20) as r:
            root=ET.fromstring(r.read())
        entries=root.findall(".//item")
        if not entries:
            entries=root.findall(".//{http://www.w3.org/2005/Atom}entry")
        for e in entries[:30]:
            title=text(e,["title","{http://www.w3.org/2005/Atom}title"])
            link=text(e,["link"])
            if not link:
                ln=e.find("{http://www.w3.org/2005/Atom}link")
                if ln is not None: link=ln.attrib.get("href","")
            if not link:
                about=e.attrib.get("{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about","")
                link=about
            rawdate=text(e,["pubDate","{http://purl.org/dc/elements/1.1/}date","{http://www.w3.org/2005/Atom}updated","{http://www.w3.org/2005/Atom}published"])
            hit=[k for k in keywords if k.lower() in title.lower()]
            if not hit: continue
            items.append({"title":title,"url":link,"source":src["name"],"source_id":src["id"],"published":date_iso(rawdate),"keywords":hit[:5],"status":"auto"})
    except Exception as ex:
        print(f"WARN {src['name']}: {ex}")

seen=set(); unique=[]
for x in sorted(items,key=lambda z:z.get("published",""),reverse=True):
    key=re.sub(r"\s+","",x["title"]).lower()
    if key in seen: continue
    seen.add(key); unique.append(x)

out={"generated_at":datetime.now(timezone.utc).isoformat(),"note":"自動収集した掲載候補です。内容・制度上の意味は未確認です。","items":unique[:24]}
(ROOT/"data/radar.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(f"Wrote {len(out['items'])} items")
