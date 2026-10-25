// The launcher's Running apps menu (second Back on Home, issue #8): the apps that are open now, to close one or
// all, as LG's own Home does with its Recents panel. Only apps the launcher knows are listed (listApps, hidden
// ones included), never Home and never CleanYourTV's own apps (the manager, and the picker and notify apps are
// meant to stay up). Only listed apps can be closed, so the route cannot close Home or CleanYourTV's apps.
// Closing also drops the app from LG's recents, as LG's panel does; that call is best-effort, the service does
// not exist on every webOS and its failure is ignored.
const HOME = 'com.webos.app.home', OWN = /^com\.cleanyourtv\./, AM = 'luna://com.webos.applicationManager/';

// running: applicationManager/running entries (id or appId); apps: what listApps knows ({id, title})
function pick(running, apps) {
  const title = {}, seen = {}, out = [];
  (apps || []).forEach(a => { title[a.id] = a.title || a.id; });
  (running || []).forEach(r => {
    const id = r && (r.id || r.appId);
    if (!id || seen[id] || id === HOME || OWN.test(id) || !(id in title)) return;
    seen[id] = true;
    out.push({ id: id, title: title[id] });
  });
  return out;
}

function create(ctx) {
  const luna = ctx.luna;
  let known = null, knownAt = 0;
  const titles = async () => {   // every installed app, hidden ones included; the grid shows a subset of these
    if (known && Date.now() - knownAt < 5000) return known;
    const r = await luna(AM + 'listApps', {});
    known = (r.apps || []).filter(a => a.id !== HOME && !OWN.test(a.id)).map(a => ({ id: a.id, title: a.title || a.id }));
    knownAt = Date.now();
    return known;
  };
  async function list() {
    const r = await luna(AM + 'running', {});
    if (!Array.isArray(r.running)) return { apps: [], error: r.errorText || 'the app manager did not answer' };
    return { apps: pick(r.running, await titles()) };
  }
  // closeByAppId is the call that works on webOS 6; plain close is the fallback (as for the picker)
  async function close(id) {
    let r = await luna(AM + 'closeByAppId', { id: id });
    if (r.returnValue !== true) r = await luna(AM + 'close', { id: id });
    if (r.returnValue !== true) return false;
    await luna('luna://com.webos.service.recent/removeRecent', { appId: id });
    return true;
  }
  async function handle(req, res, u, body) {
    const json = (o, c) => { res.writeHead(c || 200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (u === '/api/running') return json(await list());
    if (u === '/api/running/close' && req.method === 'POST') {
      const b = await body(req);
      const ids = (await list()).apps.map(a => a.id).filter(id => b.all === true || id === b.id);
      if (!ids.length) return json({ returnValue: false, errorText: b.all ? 'nothing is running' : 'not a running app' });
      const closed = [];
      for (const id of ids) if (await close(id)) closed.push(id);
      return json({ returnValue: closed.length === ids.length, closed: closed });
    }
    res.writeHead(404); res.end();
  }
  return { handle: handle, list: list, close: close };
}

module.exports = { create: create, pick: pick };
