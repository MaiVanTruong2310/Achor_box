import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const compiled = ts.transpileModule(readFileSync(new URL('../src/components/commercePresentation.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const ui=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('payment pending is distinct from order approval pending',()=>{
 assert.equal(ui.statusLabel('pending','payment'),'Chờ thanh toán');
 assert.equal(ui.statusLabel('pending'),'Chờ duyệt đơn');
});
test('technical installation events receive Vietnamese labels without discarding unknown codes',()=>{
 assert.equal(ui.eventLabel('TECH_PO_APPROVE_COMPLETION'),'PO đã duyệt nghiệm thu');
 assert.equal(ui.eventLabel('TECH_SUBMIT_COMPLETION'),'Đã gửi báo cáo nghiệm thu');
 assert.equal(ui.knownLabel('FUTURE_SERVER_EVENT'),false);
 assert.equal(ui.eventDescription('Customer supplied reason'),'Customer supplied reason');
});
test('timestamps use Vietnam calendar and date-only warranty values stay on the supplied date',()=>{
 assert.match(ui.displayDate('2026-10-20T23:00:00Z'),/21\/10\/2026/);
 assert.match(ui.displayDate('2026-10-20'),/20\/10\/2026/);
 assert.equal(ui.displayDate('invalid'),'invalid');
 assert.equal(ui.displayDate(null),'Chưa cập nhật');
 assert.match(ui.eventDescription('Lịch hẹn 2026-10-21T02:00Z'),/09:00/);
});
test('warranty dates and issued status determine display independently of order completion',()=>{
 const record={status:'active',startDate:'2026-10-20',endDate:'2027-10-19'};
 assert.equal(ui.warrantyState(record,'2026-10-19'),'Chưa đến ngày hiệu lực');
 assert.equal(ui.warrantyState(record,'2027-10-19'),'Còn hiệu lực');
 assert.equal(ui.warrantyState(record,'2027-10-20'),'Đã hết hạn');
 assert.equal(ui.warrantyState({...record,status:'void'},'2026-10-20'),'Đã vô hiệu');
});
