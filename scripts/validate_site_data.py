#!/usr/bin/env python3
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"
QUICK_IDS=["A01","A10","A12","A17","A19","A24","A30","A31","A36","A40","A43","A47"]

errors=[]
for p in sorted(DATA.glob("*.json")):
    try:
        json.loads(p.read_text(encoding="utf-8"))
        print("OK JSON",p.relative_to(ROOT))
    except Exception as e:
        errors.append(f"{p.relative_to(ROOT)}: {e}")

questions=[]
for n in range(1,5):
    p=DATA/f"diagnosis-a48-{n}.json"
    try:
        part=json.loads(p.read_text(encoding="utf-8"))
        if not isinstance(part,list): errors.append(f"{p.name}: root must be an array")
        else: questions.extend(part)
    except Exception:
        pass

if questions:
    ids=[q.get("id") for q in questions]
    if len(ids)!=len(set(ids)): errors.append("diagnosis: duplicate question IDs")
    by_id={q.get("id"):q for q in questions}
    for qid in QUICK_IDS:
        q=by_id.get(qid)
        if not q:
            errors.append(f"quick diagnosis: missing {qid}")
            continue
        if not q.get("auto_score"):
            errors.append(f"quick diagnosis: {qid} must be auto_score")
        option_ids={x[0] for x in q.get("options",[])}
        if not set(q.get("correct",[])).issubset(option_ids):
            errors.append(f"quick diagnosis: {qid} correct answer not in options")
    if len(questions)!=48:
        errors.append(f"diagnosis: expected 48 questions, found {len(questions)}")


# B-area free 12-question diagnosis
bp=DATA/"diagnosis-b12.json"
try:
    b=json.loads(bp.read_text(encoding="utf-8"))
    if not isinstance(b,list) or len(b)!=12:
        errors.append(f"diagnosis-b12: expected 12 questions, found {len(b) if isinstance(b,list) else 'non-array'}")
    else:
        ids=[q.get("id") for q in b]
        if len(ids)!=len(set(ids)): errors.append("diagnosis-b12: duplicate question IDs")
        for q in b:
            for field in ("id","title","prompt","options","correct","domain","cognition","knowledge_type","key_explanation"):
                if field not in q or q[field] in ("",None): errors.append(f"diagnosis-b12: {q.get('id','?')} missing {field}")
            option_ids={x[0] for x in q.get("options",[])}
            if not set(q.get("correct",[])).issubset(option_ids): errors.append(f"diagnosis-b12: {q.get('id','?')} correct answer not in options")
except Exception as e:
    errors.append(f"diagnosis-b12: {e}")

if errors:
    print("\nVALIDATION FAILED")
    for e in errors: print("-",e)
    raise SystemExit(1)
print("\nAll site data checks passed.")
