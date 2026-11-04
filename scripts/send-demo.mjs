// Kirim pesan lab yang sudah ditandatangani HMAC ke lokal / Cloudflare.
// Contoh: node scripts/send-demo.mjs https://nama.workers.dev hp1 123456
import {createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
const [base,device='hp1',code='123456']=process.argv.slice(2);
if(!base || !/^hp[12]$/.test(device) || !/^\d{6}$/.test(code)) {
  console.error('Pakai: node scripts/send-demo.mjs https://nama.workers.dev hp1 123456');
  process.exit(1);
}
let vars;
try {vars=readFileSync('.env.local','utf8');}
catch{console.error('Belum ada file .env.local. Jalankan node scripts/generate-secrets.mjs dahulu.');process.exit(1);}
const keyName=device==='hp1'?'SMS_SECRET_HP1':'SMS_SECRET_HP2';
const line=vars.split(/\r?\n/).find(s=>s.startsWith(keyName+'='));
const secret=line?.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g,'');
if (!secret || secret.length<32) {console.error('Secret '+keyName+' tidak valid');process.exit(1);}
const payload=JSON.stringify({from:'DEMO-LAB',text:`Tes koneksi HP ${code}`,sentStamp:Date.now(),receivedStamp:Date.now(),sim:'0'});
const signature=createHmac('sha256',secret).update(payload).digest('hex');
const url=new URL('/api/webhook/'+device,base);
try {
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Signature':signature},body:payload});
  console.log('HTTP '+response.status,await response.text());
  if(!response.ok) process.exitCode=1;
}catch(e){console.error('Tidak dapat menghubungi server:',e.message);process.exitCode=1;}
