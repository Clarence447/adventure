import { request as httpRequest } from 'node:http';
import { it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInbox, passwordHash } from './server.mjs';
import { submitLocal, openStore, backupStore } from '../store.mjs';
function fetch(url: string, options: {method?:string;headers?:Record<string,string>;body?:string} = {}): Promise<Response> {
  return new Promise((resolve,reject)=>{const req=httpRequest(url,options,res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve(new Response(text,{status:res.statusCode,headers:res.headers as Record<string,string>})));});req.on('error',reject);req.end(options.body);});
}

it('protects enquiry data and updates, detects conflicts, and persists notes through backup and restart', async () => {
  const dir = mkdtempSync(join(tmpdir(),'rr-inbox-')), path = join(dir,'db.sqlite');
  const payload = { submission_id:'test', email:'owner@example.com', consent:true, business_name:'Test <script>', contact_name:'Owner', business_type:'Automotive', inquiries:'Under 25', missed_calls:'Rarely', response_time:'Within an hour', follow_up:'Every inquiry', goal:'Recover missed calls', phone:'' } as const;
  submitLocal(payload,path);
  let clock = Date.now();
  const origin = 'http://localhost:3089', credential = passwordHash('test-password');
  const server = createInbox({path,credential,origin,now:()=>clock});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw Error('Address');
  const base = `http://127.0.0.1:${address.port}`;
  let cookie = '';
  const request = (route:string, body?:unknown, headers = {}) => fetch(base+route,{method:body === undefined?'GET':'POST',headers:{host:'localhost:3089',origin,'content-type':'application/json',cookie,...headers},body:body === undefined?undefined:JSON.stringify(body)});
  try {
    expect((await request('/api/enquiries')).status).toBe(401);
    expect((await request('/api/login',{password:'bad'})).status).toBe(401);
    expect((await request('/api/login',{password:'test-password'},{origin:'https://evil.test'})).status).toBe(403);
    const login = await request('/api/login',{password:'test-password'});
    expect(login.status).toBe(200); expect(login.headers.get('set-cookie')).toContain('HttpOnly');
    cookie = login.headers.get('set-cookie')!.split(';')[0];
    expect((await (await request('/api/enquiries')).json()).enquiries).toHaveLength(1);
    const update = {id:'test',status:'Contacted',notes:'Call tomorrow',revision:0};
    expect((await request('/api/followup',update,{origin:'https://evil.test'})).status).toBe(403);
    expect((await request('/api/followup',update)).status).toBe(200);
    expect((await request('/api/followup',update)).status).toBe(409);
    expect((await request('/api/followup',{...update,id:'missing'})).status).toBe(404);
    expect((await request('/api/followup',{...update,status:'invalid'})).status).toBe(400);
    expect(submitLocal(payload,path)).toBe('received');
    const backup = join(dir,'backup.sqlite'); await backupStore(path,backup);
    const restored = openStore(backup);
    expect(restored.prepare('SELECT notes FROM enquiry_followup').get()?.notes).toBe('Call tomorrow'); restored.close();
    clock += 9*3600000;
    expect((await request('/api/enquiries')).status).toBe(401);
    const again = await request('/api/login',{password:'test-password'}); cookie = again.headers.get('set-cookie')!.split(';')[0];
    expect((await request('/api/logout',{})).status).toBe(200);
    expect((await request('/api/enquiries')).status).toBe(401);
  } finally { await new Promise<void>(resolve=>server.close(()=>resolve())); }
  const reopened = createInbox({path,credential,origin});
  await new Promise<void>(resolve=>reopened.listen(0,'127.0.0.1',resolve));
  await new Promise<void>(resolve=>reopened.close(()=>resolve()));
  const db = openStore(path); expect(db.prepare('SELECT revision FROM enquiry_followup').get()?.revision).toBe(1); db.close();
  rmSync(dir,{recursive:true,force:true});
});

it('throttles failed sign-in attempts and rejects invalid credentials at startup',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'rr-auth-')),path=join(dir,'db.sqlite');openStore(path).close();
  expect(()=>createInbox({path,credential:'',origin:'http://localhost:3089'})).toThrow();
  const server=createInbox({path,credential:passwordHash('correct'),origin:'http://localhost:3089'});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();if(!address||typeof address==='string')throw Error('Address');
  try {for(let i=0;i<6;i++){const r=await fetch(`http://127.0.0.1:${address.port}/api/login`,{method:'POST',headers:{host:'localhost:3089',origin:'http://localhost:3089','content-type':'application/json'},body:JSON.stringify({password:'wrong'})});expect(r.status).toBe(i<5?401:429);}}
  finally {await new Promise<void>(resolve=>server.close(()=>resolve()));rmSync(dir,{recursive:true,force:true});}
});
