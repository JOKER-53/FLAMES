import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { COMPLETION_TASKS, DEFAULT_CERTIFICATE_TEMPLATE, validateCertificateTemplate, renderCertificate, type CertificateDetails, type CertificateTemplate, type CertificateVendor } from '@fortisim/engine';
import { migrate } from '../db/migrations';
import { PlatformStore } from '../platform/store';
import { ContentStore } from '../content/store';
import { requestUser } from '../platform/auth';
import { academyRequest } from '../integration/academy';

export function certificatesRouter(accounts:PlatformStore, content:ContentStore, academy:boolean) {
 const db=content.db;
 migrate(db,'certificates',[{version:1,name:'Internal completion certificates',sql:`CREATE TABLE certificate_templates (vendor TEXT PRIMARY KEY, template_json TEXT NOT NULL);
 CREATE TABLE certificate_roll_numbers (scope TEXT NOT NULL,user_id TEXT NOT NULL,roll_number TEXT NOT NULL,PRIMARY KEY(scope,user_id));
 CREATE TABLE certificates (id TEXT PRIMARY KEY,scope TEXT NOT NULL,user_id TEXT NOT NULL,vendor TEXT NOT NULL,snapshot_json TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(scope,user_id,vendor));`}]);
 const scope=academy?`academy:${process.env.ACADEMY_ORIGIN}`:'standalone';
 const router=Router();
 router.use((req,res,next)=>{const user=academy?res.locals.academyUser:requestUser(req,accounts);if(!user){res.status(401).json({error:'Sign in to access certificates.'});return;}res.locals.certificateUser=user;next();});
 const admin=(req:any,res:any,next:any)=>{const u=res.locals.certificateUser;if(academy?!u.canManageContent:u.role!=='instructor'){res.status(403).json({error:'Content administrator access required.'});return;}next();};
 const template=(vendor:string):CertificateTemplate=>{const row=db.prepare('SELECT template_json FROM certificate_templates WHERE vendor=?').get(vendor);return row?JSON.parse(row.template_json):DEFAULT_CERTIFICATE_TEMPLATE;};
 router.get('/admin/templates',admin,(_req,res)=>res.json({fortigate:template('fortigate'),paloalto:template('paloalto')}));
 router.put('/admin/templates/:vendor',admin,(req,res)=>{if(!['fortigate','paloalto'].includes(req.params.vendor)){res.status(400).json({error:'Unknown vendor.'});return;}try{const value=validateCertificateTemplate(req.body);db.prepare('INSERT INTO certificate_templates VALUES (?,?) ON CONFLICT(vendor) DO UPDATE SET template_json=excluded.template_json').run(req.params.vendor,JSON.stringify(value));res.json({template:value});}catch(error){res.status(400).json({error:(error as Error).message});}});
 router.put('/admin/roll-number',admin,(req,res)=>{
  if(academy){res.status(409).json({error:'Update roll numbers in Academy profiles.'});return;}
  const email=typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():'';const roll=req.body?.rollNumber;
  const user=accounts.findEmail(email)?.user;
  if(!user||typeof roll!=='string'||!roll.trim()||roll.length>64||/[\x00-\x1f]/.test(roll)){res.status(400).json({error:'Enter an existing local account email and a roll number of up to 64 characters.'});return;}
  db.prepare('INSERT INTO certificate_roll_numbers VALUES (?,?,?) ON CONFLICT(scope,user_id) DO UPDATE SET roll_number=excluded.roll_number').run(scope,user.id,roll.trim());res.json({saved:true});
 });
 router.get('/:vendor',async(req,res,next)=>{
  const vendor=req.params.vendor as CertificateVendor;if(!['fortigate','paloalto'].includes(vendor)){res.status(400).json({error:'Unknown vendor.'});return;}
  try{
   const user=res.locals.certificateUser;
   // Always obtain progress from its owning service. Browser localStorage is never certificate evidence.
   const progress=academy?(await academyRequest(req,`/integrations/fortisim/progress/${vendor}`)).completed:accounts.progress(user.id,vendor);
   if(!Array.isArray(progress)||progress.some(id=>typeof id!=='string'))throw new Error('Progress service returned invalid completion data.');
   const required=[...COMPLETION_TASKS[vendor],...content.catalog().filter(module=>module.vendor===vendor).flatMap(module=>module.lessons.map(lesson=>lesson.id))];
   const completed=new Set(progress);const remaining=required.filter(id=>!completed.has(id));
   const rollNumber=academy?user.rollNumber:db.prepare('SELECT roll_number FROM certificate_roll_numbers WHERE scope=? AND user_id=?').get(scope,user.id)?.roll_number;
   const old=db.prepare('SELECT snapshot_json FROM certificates WHERE scope=? AND user_id=? AND vendor=?').get(scope,user.id,vendor);
   if(old){const snapshot=JSON.parse(old.snapshot_json);res.json({...snapshot,svg:renderCertificate(snapshot.template,snapshot.details),remaining:remaining.length,required:required.length});return;}
   if(remaining.length||typeof rollNumber!=='string'||!rollNumber.trim()){res.json({eligible:false,completed:required.length-remaining.length,required:required.length,remaining:remaining.length,needsRollNumber:!rollNumber});return;}
   const details:CertificateDetails={id:`FL-${randomUUID()}`,name:user.name,rollNumber,vendor,issuedAt:new Date().toISOString()};
   const snapshot={eligible:true,details,template:template(vendor),requiredTaskIds:required};
   db.prepare('INSERT OR IGNORE INTO certificates VALUES (?,?,?,?,?,?)').run(details.id,scope,user.id,vendor,JSON.stringify(snapshot),Date.now());
   const stored=JSON.parse(db.prepare('SELECT snapshot_json FROM certificates WHERE scope=? AND user_id=? AND vendor=?').get(scope,user.id,vendor).snapshot_json);
   res.json({...stored,svg:renderCertificate(stored.template,stored.details),remaining:0,required:required.length});
  }catch(error){next(error);}
 });
 return router;
}
