# Troubleshooting

- **HBC install error `-5: Service id should start with app id`.** Version 1.6.2 and earlier incorrectly registered a root
  payload as a Luna service without its descriptor. Install the corrected release from the updated feed and follow the
  [transition instructions](install.md#transition-from-162-and-earlier) if the TV was already configured.

- **Black screen after switching or rebooting.** Wait a minute; if it stays black, restart the TV. If the new Home does not come
  up, the setup removes the boot scripts and restarts the TV with LG's Home by itself.
- **The Home button opens LG's full-screen Home, not CleanYourTV.** Some TVs have a Home Style setting. Set TV Settings > General >
  Home Settings > Home Style to Basic.
- **An app is missing from the grid.** Check **Hidden apps** in Customise. Apps without a launch icon are not listed.
- **After a firmware update removed root.** Re-root, then run the [install command](install.md#1-install-the-manager-app-over-ssh) and the setup again.
- **The Input key opens LG's picker.** Check the Input key switch in the manager app and run **Learn the Input key**.
- **The UI freezes a few seconds after start.** Older versions kept the Inputs picker running hidden, and on some firmware
  a hidden overlay app keeps the remote. Update to the current release: the picker now runs only while the Input list is
  open and is closed afterwards ([the Input key](input-key.md)). If it still happens, attach **Share log** — the
  `picker show` / `picker hide` / `picker released` lines show whether an overlay was left up.
- **`FAILED_IPKG_INSTALL`.** Remove the `com.cleanyourtv.manager` entry marked `half-installed` from
  `/media/developer/apps/var/lib/opkg/status` and install again.
- **Live TV shows the setup code again.** The playlist address was reset or never saved; run the pairing again, or send it with
  `POST /api/live/settings` ([Live TV](live-tv.md#setting-it-up)).
- **Something is broken after an update.** A launcher or service that does not start is replaced by the previous version
  automatically. **Go back to launcher** in the manager returns to the previous launcher by hand.
- **Back to LG's Home right now.** In the manager, **CleanYourTV as Home** off, or `sh /media/developer/cleanyourtv/undo-home.sh`
  over SSH.

## Reporting a problem

Open an [issue](https://github.com/atlet99/cleanyourtv-WebOS/issues) and attach the output of **Share log**
(manager app, see [The manager app](manager.md#share-log)). It is masked, so it does not contain your addresses or keys. Say which
TV and firmware you have and what you expected.
