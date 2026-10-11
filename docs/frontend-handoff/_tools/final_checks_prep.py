"""Honor no-sample-data policy in retained Swagger metadata and Markdown tables."""
import hashlib,json,re
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]
capture=OUT/'validation/runtime-capture.json';rawfile=OUT/'contracts/openapi-runtime.raw.json'
if not capture.exists():
    original=rawfile.read_bytes();count=[0]
    def sanitize(x):
        if isinstance(x,list):return [sanitize(v)for v in x]
        if isinstance(x,dict):
            result={}
            for k,v in x.items():
                if k in ['example','examples']:count[0]+=1
                else:result[k]=sanitize(v)
            return result
        return x
    cleaned=sanitize(json.loads(original.decode('utf-8-sig')))
    payload=json.dumps(cleaned,ensure_ascii=False,indent=2).encode('utf-8');rawfile.write_bytes(payload)
    capture.write_text(json.dumps({'originalPayloadSha256':hashlib.sha256(original).hexdigest(),'retainedPayloadSha256':hashlib.sha256(payload).hexdigest(),'annotationExamplesRemoved':count[0],'reason':'No copied demo customer/product/price/address examples; routes and field schemas unchanged','runtime':'Isolated H2, demo, workers disabled, metadata export only'},ensure_ascii=False,indent=2),encoding='utf-8')
for name in ['06-API-CONTRACTS.md','contracts/DTO-DICTIONARY.md']:
    p=OUT/name;s=p.read_text(encoding='utf-8')
    # Swagger regex patterns inside table cells require escaping pipe separators.
    for pattern in ['LOCK|UNLOCK|TARE','PDF|XLSX','SUCCESS|FAILED']:
        s=s.replace('pattern='+pattern,'pattern='+pattern.replace('|',r'\|'))
    p.write_text(s,encoding='utf-8')
print('Swagger annotation examples removed; Markdown validation patterns escaped.')
