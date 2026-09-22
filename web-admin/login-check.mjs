import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {chromium} from '@playwright/test';
const require=createRequire(import.meta.url);
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function evaluate(path, imports={}) {
  const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText;
  const exports={};new Function('require','exports',code)(name=>imports[name]??require(name),exports);return exports;
}
const {getRoleDefaultPath}=evaluate('src/types/database.ts');
const roles={super_admin:'/dashboard',technician:'/devices',product_manager:'/products',support_agent:'/warranties',accountant:'/orders',customer:'/guide'};
for(const [role,path] of Object.entries(roles)) assert.equal(getRoleDefaultPath(role),path);
assert.equal(getRoleDefaultPath('unknown'),'/403');
const staff=Object.keys(roles).filter(role=>role!=='customer');
let profile=null;
const {ProtectedRoute}=evaluate('src/components/ProtectedRoute.tsx',{
  '../contexts/AuthContext':{useAuth:()=>({profile,loading:false,hasRole:allowed=>profile?.role==='super_admin'||allowed.includes(profile?.role)})},
  'react-router-dom':{useLocation:()=>({pathname:'/admin'}),Navigate:({to})=>React.createElement('span',null,to)},
  '../pages/Forbidden403':{Forbidden403:()=>React.createElement('span',null,'FORBIDDEN')}
});
const render=()=>renderToStaticMarkup(React.createElement(ProtectedRoute,{allowedRoles:staff},React.createElement('span',null,'ALLOWED')));
assert.match(render(),/\/login/);
for(const role of staff){profile={role};assert.match(render(),/ALLOWED/);}
profile={role:'customer'};assert.match(render(),/FORBIDDEN/);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  const page=await browser.newPage({reducedMotion:'reduce'});
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});
    await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
    await page.locator('.sb-nav').getByRole('link',{name:'Đăng nhập'}).click();
    await page.waitForURL('**/login');
    await page.locator('#email').waitFor({state:'visible'});
    await page.getByRole('heading',{name:'Đăng nhập SmartBox'}).waitFor();
    for(const label of ['Khách hàng','Quản trị viên','Quản lý sản phẩm','Nhân viên hỗ trợ','Kỹ thuật viên','Kế toán']) assert(await page.locator('.sb-auth-audience').getByText(label,{exact:true}).isVisible());
    await page.locator('#password').fill('preview-password');
    await page.getByRole('button',{name:'Hiện mật khẩu',exact:true}).click();
    assert.equal(await page.locator('#password').getAttribute('type'),'text');
    await page.getByRole('button',{name:'Ẩn mật khẩu',exact:true}).click();
    assert.equal(await page.locator('#password').getAttribute('type'),'password');
    await page.locator('#password').fill('');
    await page.screenshot({path:`landing-login-${width}.png`,fullPage:true});
    await page.getByRole('button',{name:'Chuyển sang giao diện sáng'}).click();
    await page.locator('.sb-auth-light').waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.getByRole('button',{name:'Chuyển sang giao diện tối'}).click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  console.log('PASS: all 6 default routes, unknown role fallback, guest/staff/customer guards, desktop and mobile login links.');
} finally {await browser.close();}
