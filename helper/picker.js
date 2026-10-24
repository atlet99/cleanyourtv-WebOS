// The Inputs picker (com.cleanyourtv.picker) runs on demand only: the Input key launches it (scripts/inputkey.sh) and the
// page asks the service to close it when it is done. Nothing starts or keeps it in the background: on several firmwares
// a hidden overlay app keeps the remote and the whole UI freezes (upstream issue #6, fork issue #5) — the old keepalive
// started it hidden after every boot for exactly that reason, on every webOS version. A cold start costs a few seconds;
// the page caches its layout in localStorage, so only the icons need the network afterwards.
const fs = require('fs');
const PICKER = 'com.cleanyourtv.picker';
let releasedAt = 0;
async function release(luna) {
  const r = await luna('luna://com.webos.applicationManager/closeByAppId', { id: PICKER });
  if (r && r.returnValue !== false) {
    releasedAt = Date.now();
    try { console.log(fs.readFileSync('/proc/uptime', 'utf8').split(' ')[0] + ' picker released'); } catch (_) { console.log('picker released'); }   // Share log: shows whether an overlay was left up
  } else console.error('picker release failed:', JSON.stringify(r).slice(0, 120));
  return r;
}
const status = () => ({ mode: 'ondemand', releasedAt: releasedAt || undefined });
module.exports = { release, status };
