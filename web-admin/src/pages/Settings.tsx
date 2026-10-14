import React,{useState} from 'react';
import {TemplateManager} from '../components/TemplateManager';
import {AdminCatalogSettings} from '../components/AdminCatalogSettings';
export const SettingsPage:React.FC=()=>{
 const [tab,setTab]=useState<'catalogs'|'templates'>('catalogs');
 return <div className="page-body"><h2>Cấu hình hệ thống</h2><div style={{display:'flex',gap:12,margin:'16px 0'}}><button className="btn btn-secondary" onClick={()=>setTab('catalogs')}>Danh mục và phương thức</button><button className="btn btn-secondary" onClick={()=>setTab('templates')}>Mẫu thông báo</button></div>{tab==='catalogs'?<AdminCatalogSettings/>:<TemplateManager/>}</div>;
};
