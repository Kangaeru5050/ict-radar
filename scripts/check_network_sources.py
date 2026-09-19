#!/usr/bin/env python3
import hashlib, json, re, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
path=ROOT/"data/network-watch.json"
data=json.loads(path.read_text(encoding="utf-8"))
now=datetime.now(timezone.utc).isoformat()
dirty=False

def normalized_bytes(url):
    req=urllib.request.Request(url,headers={"User-Agent":"ICT-RADAR/1.0 (+https://kangaeru5050.github.io/ict-radar/)"})
    with urllib.request.urlopen(req,timeout=30) as r:
        raw=r.read()
        ctype=r.headers.get("Content-Type","")
    if "html" in ctype.lower():
        text=raw.decode("utf-8","ignore")
        text=re.sub(r"<script[\\s\\S]*?</script>","",text,flags=re.I)
        text=re.sub(r"<style[\\s\\S]*?</style>","",text,flags=re.I)
        text=re.sub(r"\\s+"," ",text)
        return text.encode("utf-8")
    return raw

for src in data["sources"]:
    try:
        h=hashlib.sha256(normalized_bytes(src["url"])).hexdigest()
        old=src.get("hash","")
        if not old:
            src["hash"]=h
            dirty=True
        elif h!=old:
            src["hash"]=h
            src["changed"]=True
            src["changed_at"]=now
            dirty=True
            print("CHANGE:",src["name"])
    except Exception as ex:
        print("WARN:",src["name"],ex)

if dirty:
    data["last_run"]=now
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
else:
    print("No source changes")
