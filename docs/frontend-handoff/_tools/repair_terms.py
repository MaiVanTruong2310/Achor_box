"""Restore known technical terms in prose after editorial spacing."""
import re,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'docs/frontend-handoff'
words='''contract view ownership production attestation authorized authorization allocation declaration projection implementation transaction installation inventory preference notification invocation configuration integration authentication application qualification virtualization architecture specification identification registration aggregation pagination normalization validation serialization deserialization parameter isolation cancellation comparison operation position definition condition exception selection presentation provision provisioning compensation documentation verification information coordinator coordination coordination association expiration communication command performance asynchronous synchronization timestamp capability schedule marketing technical trace customer programmer programmer collection direction rotation classification explanation concurrent concurrency concurrency dependency functionality unavailable acknowledge acknowledged acknowledgement cardinality duplicate duplicate orchestration reflection privacy polymorphism operator generator container ownership environment format scalar path constraint default strategy interface state terminal description diagnostics manipulation instructions archive hardware software firmware database repository service controller serializer envelope mandatory idempotency immutable mutable unsupported transient snapshot schedule service source state metadata skeleton placeholder readonly progress HTMLElement RETURNED APPROVED REJECTED PENDING FAILED ASSIGNED INSTALLED COMPLETED DELIVERED IN_PROGRESS NOT_VERIFIED PLANNED PROPOSED PARTIAL IMPLEMENTED'''.split()
api=json.loads((OUT/'contracts/openapi-runtime.raw.json').read_text(encoding='utf-8'));words+=list(api['components']['schemas'])
for s in api['components']['schemas'].values():words+=list(s.get('properties',{}))
patterns=[re.compile(r'\b'+'[ \t]*'.join(re.escape(c)for c in w)+r'\b',re.I)for w in set(words)if len(w)>4]
for p in list(OUT.glob('*.md'))+list((OUT/'contracts').glob('*.md')):
    if p.name in ['06-API-CONTRACTS.md','DTO-DICTIONARY.md']:continue
    s=p.read_text(encoding='utf-8');parts=re.split(r'(```[\s\S]*?```|`[^`\n]+`|https?://[^\s)]+|\]\([^)]*\))',s)
    for i in range(0,len(parts),2):
        for pat in patterns:parts[i]=pat.sub(lambda m:re.sub('[ \t]+','',m.group()),parts[i])
        for a,b in {'là mtruth':'làm nguồn dữ liệu đúng','tr ánh':'tránh','ra ce':'race','UI dois':'UI phải','min Amount':'minAmount','khôngtựnhiên':'không tự nhiên','ngày10':'ngày 10','APIchi tiết':'API chi tiết','nhiệm vụtài':'nhiệm vụ tài','theo11':'theo 11'}.items():parts[i]=parts[i].replace(a,b)
    p.write_text(''.join(parts),encoding='utf-8')
print('Technical prose terms restored; code fences/inline identifiers preserved.')
