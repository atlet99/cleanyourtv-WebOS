# Service API

The service runs as root on `127.0.0.1:8765` and answers JSON. It is what the launcher, the manager and the other apps use, and
you can call it from a shell on the TV (for example over SSH).

!!! note "Who may call it"
    HTTP(S) origins are refused. All other requests need `X-CYTV-Token`; neither `Origin: null` nor an absent Origin
    authorizes a request. Apps obtain the token through the Homebrew Channel. See [Local API access](development/signed-releases.md#local-api).

| Endpoint | Purpose |
|---|---|
| `GET /api/apps` | Installed apps, config, usage, version |
| `POST /api/launch` `{id, params}` | Launch an app |
| `GET /api/running` | Apps that are open now (never Home, never CleanYourTV's own apps) |
| `POST /api/running/close` `{id}` or `{all: true}` | Close listed running apps and drop them from LG's recents |
| `GET /api/inputs` | HDMI inputs and their state |
| `POST /api/picker/release` | Close the Inputs picker app (the page calls this when it is done; nothing stays hidden) |
| `POST /api/notify` | Picture notification (on the network: `POST :8767/notify` with the token) |
| `GET /api/voice/status`, `POST /api/voice/install`, `/uninstall`, `/set`, `/listen`, `/ask`, `/forget`, `/ha-test`, `/ha-agents` | Optional voice function and AI chat |
| `GET /api/theme/list`, `POST /api/theme/set`, `/revert` | Themes for the home screen; see [Themes](themes.md) |
| `GET /api/live/status`, `/api/live/channels`, `/api/live/epg` | Live TV data |
| `POST /api/live/settings`, `/api/live/refresh`, `/api/live/reset` | Live TV setup |
| `GET /api/manager/status` | Versions, updates, options, hook state |

## Examples

```sh
TOKEN=$(node /media/developer/cleanyourtv/security.js token)
# launch an app
curl -H "X-CYTV-Token: $TOKEN" -X POST localhost:8765/api/launch -d '{"id":"com.palm.app.settings"}'

# show a picture notification from the TV (local API capability, not the network notification token)
curl -H "X-CYTV-Token: $TOKEN" -X POST localhost:8765/api/notify -d '{"title":"Hello","text":"From a shell","seconds":8}'

# the service version and updates
curl -s -H "X-CYTV-Token: $TOKEN" localhost:8765/api/manager/status
```

See the pages for [Live TV](live-tv.md), [Picture notifications](notifications.md) and [Voice](voice.md) for their bodies.
