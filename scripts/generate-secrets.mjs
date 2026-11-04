import {randomBytes} from 'node:crypto';
import {existsSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const file=resolve('.env.local');
if(existsSync(file)) {
  console.log('File .env.local sudah ada. Tidak ditimpa agar secret HP tidak berubah.');
  process.exit(0);
}
const out=`SUPABASE_URL="https://PROJECT_REF.supabase.co"\nSUPABASE_SERVICE_ROLE_KEY="GANTI_DENGAN_SECRET_SERVICE_ROLE_KEY"\nSMS_SECRET_HP1="${randomBytes(32).toString('hex')}"\nSMS_SECRET_HP2="${randomBytes(32).toString('hex')}"\nPUBLIC_NOTICE_SENDERS=""\nCRON_SECRET="${randomBytes(32).toString('hex')}"\n`;
writeFileSync(file,out,{flag:'wx',mode:0o600});
console.log('Berhasil membuat .env.local dengan secret acak untuk HP1, HP2, dan cron.');
console.log('Lengkapi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY sebelum menjalankan aplikasi.');
console.log('JANGAN upload .env.local ke GitHub atau membagikannya.');
