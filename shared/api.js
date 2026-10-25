/* Root API capability stays in memory, not localStorage or a public HTTP endpoint. */
(function () {
  var pending;
  function ready() {
    if (!pending) pending = new Promise(function (resolve, reject) {
      try {
        var bridge = new PalmServiceBridge(), timer = setTimeout(function () { pending = null; reject(new Error('API authorization timed out')); }, 8000);
        bridge.onservicecallback = function (message) {
          clearTimeout(timer);
          try { var result = JSON.parse(message), token = String(result.stdoutString || '').trim();
            if (result.returnValue === false || !/^[0-9a-f]{64}$/.test(token)) throw new Error('API authorization failed');
            window.CYTV.token = token; resolve(token);
          } catch (error) { pending = null; reject(error); }
        };
        bridge.call('luna://org.webosbrew.hbchannel.service/exec', JSON.stringify({ command: 'node /media/developer/apps/usr/palm/applications/com.cleanyourtv.manager/root/helper/security.js token' }));
      } catch (error) { pending = null; reject(error); }
    });
    pending.catch(function () { pending = null; });
    return pending;
  }
  window.CYTV = {
    ready: ready,
    image: function (url) { return url + (url.indexOf('?') < 0 ? '?' : '&') + 'token=' + encodeURIComponent(window.CYTV.token || ''); },
    api: function (url, body) { return ready().then(function (token) {
      return new Promise(function (resolve, reject) {
        var request = new XMLHttpRequest(); request.open(body === undefined ? 'GET' : 'POST', url); request.timeout = 30000;
        request.setRequestHeader('X-CYTV-Token', token);
        if (body !== undefined) request.setRequestHeader('Content-Type', 'application/json');
        request.onload = function () { try { var value = JSON.parse(request.responseText);
          if (request.status < 200 || request.status >= 300) throw new Error(value.error || 'HTTP ' + request.status);
          resolve(value);
        } catch (error) { reject(error); } };
        request.onerror = request.ontimeout = function () { reject(new Error('no answer')); };
        request.send(body === undefined ? null : JSON.stringify(body));
      });
    }); }
  };
})();
