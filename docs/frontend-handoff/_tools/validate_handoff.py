"""Offline document checks, API consistency, and no-source-change verification."""
import hashlib,json,re,xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import unquote
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'docs/frontend-handoff'
names=['PROJECT-OVERVIEW','REQUIREMENTS-TRACEABILITY','MODULE-SPECIFICATIONS','BUSINESS-FLOWS','STATE-MACHINES','DATABASE-DOMAIN-MODEL','API-CONTRACTS','BUSINESS-RULES','AUTHORIZATION-MATRIX','EMAIL-NOTIFICATION-SPEC','FRONTEND-REQUIREMENTS','FRONTEND-API-INTEGRATION','UI-UX-DESIGN-SYSTEM','LANDING-PAGE-DESIGN','WIREFRAMES-AND-USER-FLOWS','MOTION-AND-ASSET-SPEC','FRONTEND-IMPLEMENTATION-ROADMAP','BACKEND-GAP-ANALYSIS','ACCEPTANCE-TEST-CASES']
required=[f'{i:02}-{name}.md'for i,name in enumerate(names)]+['DESIGN.md','README.md']
missing=[n for n in required if not (OUT/n).is_file()]
broken=[];fences=[];json_errors=[];bad_scripts=[]
for p in OUT.rglob('*.md'):
    s=p.read_text(encoding='utf-8')
    if len(re.findall(r'^```',s,re.M))%2:fences.append(str(p.relative_to(OUT)))
    for target in re.findall(r'\]\(([^)]+)\)',s):
        target=target.strip('<>');base=target.split('#')[0]
        if not base or re.match(r'(?:https?://|app://|codex://)',base):continue
        if not (p.parent/unquote(base)).resolve().exists():broken.append({'file':str(p.relative_to(OUT)),'target':target})
    for block in re.findall(r'```json\n([\s\S]*?)\n```',s):
        try:json.loads(block)
        except Exception as e:json_errors.append({'file':str(p.relative_to(OUT)),'error':str(e)})
    if re.search(r'[\u0e00-\u0e7f\u4e00-\u9fff]',s):bad_scripts.append(str(p.relative_to(OUT)))
for p in OUT.rglob('*.json'):json.loads(p.read_text(encoding='utf-8'))
baseline=json.loads((OUT/'validation/application-hashes.json').read_text(encoding='utf-8'))
now={str(p.relative_to(ROOT)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest()for tree in ['backend/src','web-shop/src','web-admin/src']for p in (ROOT/tree).rglob('*')if p.is_file()}
changes=[p for p in sorted(set(baseline)|set(now))if baseline.get(p)!=now.get(p)]
source=json.loads((OUT/'contracts/source-inventory.json').read_text(encoding='utf-8'));raw=json.loads((OUT/'contracts/openapi-runtime.raw.json').read_text(encoding='utf-8'))
routes_source={(e['method'],e['path'])for e in source};routes_runtime={(m.upper(),p)for p,x in raw['paths'].items()for m in x if m in ['get','post','put','patch','delete','options','head']}
contract=(OUT/'06-API-CONTRACTS.md').read_text(encoding='utf-8');sections=re.findall(r'^### API-(\d+)',contract,re.M)
tests=[]
for p in (ROOT/'backend/build/test-results').rglob('TEST-*.xml'):
    root=ET.parse(p).getroot();tests.append({k:root.attrib.get(k)for k in ['name','tests','failures','errors','skipped','timestamp']})
docs=[r'D:\KyVII_HocVienNganHang\DATN\Đề cương\Đề cương đồ án tốt nghiệp.docx',r'D:\KyVII_HocVienNganHang\DATN\Đề cương\Đề-cương.pdf',r'D:\KyVII_HocVienNganHang\DATN\Đề cương\Các modules của websitedf.pdf',r'D:\Downloads\requirements.docx',str(ROOT/'database.sql')]
sources=[{'path':s,'bytes':Path(s).stat().st_size,'sha256':hashlib.sha256(Path(s).read_bytes()).hexdigest()}for s in docs]
(OUT/'validation/input-sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf-8')
colors=json.loads((OUT/'preview/tokens.json').read_text(encoding='utf-8'))['colors']
def luminance(color):
    channels=[int(color[i:i+2],16)/255 for i in (1,3,5)]
    return sum((v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4)*w for v,w in zip(channels,[.2126,.7152,.0722]))
def contrast(a,b):
    values=sorted([luminance(colors[a]),luminance(colors[b])]);return (values[1]+.05)/(values[0]+.05)
contrast_tests=[('text/background','text','background',4.5),('muted/surface','textMuted','surface',4.5),('white/blue','text','primary',4.5),('cyan-button','primaryText','accent',4.5),('focus/surface','focus','surface',3),('control-border/surface','controlBorder','surface',3)]
contrast_results=[{'pair':name,'ratio':round(contrast(a,b),2),'minimum':minimum,'pass':contrast(a,b)>=minimum}for name,a,b,minimum in contrast_tests]
results={'requiredTopLevelDocuments':len(required),'present':len(required)-len(missing),'missing':missing,'operationsSource':len(routes_source),'operationsRuntime':len(routes_runtime),'operationSections':len(sections),'routeDifference':sorted(routes_source^routes_runtime),'schemas':len(raw['components']['schemas']),'brokenLocalLinks':broken,'unbalancedMarkdownFences':fences,'invalidExampleJSON':json_errors,'unexpectedScriptCharacters':bad_scripts,'applicationFilesCompared':len(now),'applicationFilesChanged':changes,'priorTestXML':tests,'allChecksPassed':not(any([missing,broken,fences,json_errors,bad_scripts,changes,routes_source^routes_runtime])or len(sections)!=len(source))}
results['contrastChecks']=contrast_results
results['allChecksPassed']=results['allChecksPassed']and all(c['pass']for c in contrast_results)
(OUT/'validation/check-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in results.items()if k!='priorTestXML'},ensure_ascii=False))
if not results['allChecksPassed']:raise SystemExit(1)
