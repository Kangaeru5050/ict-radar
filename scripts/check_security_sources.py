#!/usr/bin/env python3
import hashlib, html, json, re, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
path=ROOT/"data/security-watch.json"
data=json.loads(path.read_text(encoding="utf-8"))
now=datetime.now(timezone.utc).isoformat()
dirty=False

def normalized_text(url, pattern=""):
    req=urllib.request.Request(url,headers={"User-Agent":"ICT-RADAR/1.0 (+https://kangaeru5050.github.io/ict-radar/)"})
    with urllib.request.urlopen(req,timeout=30) as r:
        raw=r.read()
    text=raw.decode("utf-8","ignore")
    text=re.sub(r"<script[\\s\\S]*?</script>"," ",text,flags=re.I)
    text=re.sub(r"<style[\\s\\S]*?</style>"," ",text,flags=re.I)
    text=re.sub(r"<[^>]+>","\n",text)
    text=html.unescape(text)
    lines=[re.sub(r"\\s+"," ",x).strip() for x in text.splitlines()]
    lines=[x for x in lines if x]
    if pattern:
        rx=re.compile(pattern,re.I)
        lines=[x for x in lines if rx.search(x)]
    return "\n".join(lines)

for src in data["sources"]:
    try:
        body=normalized_text(src["url"],src.get("filter",""))
        h=hashlib.sha256(body.encode("utf-8")).hexdigest()
        old=src.get("hash","")
        if not old:
            src["hash"]=h; dirty=True
        elif h!=old:
            src["hash"]=h; src["changed"]=True; src["changed_at"]=now; dirty=True
            print("CHANGE:",src["name"])
    except Exception as ex:
        print("WARN:",src["name"],ex)

data["last_run"]=now
if dirty:
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
else:
    print("No source changes")
