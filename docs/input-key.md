# The Input key

The remote's **Input** button opens an Inputs picker over the running app.

![Inputs picker on the Input key](screenshots/picker.jpg)

The picker shows the dock apps in a row, the inputs below (each with its port and what is connected, and a green dot on the
active one) and, when [Live TV](live-tv.md) is on, **Live TV**.

| Key | Action |
|---|---|
| Left / Right | Move |
| Up / Down | Switch rows |
| OK | Open |
| Back or Input | Close |

The pointer works too.

## How it works

It uses the bundled [inputhook](credits.md#inputhook) library, which injects a small hook into LG's input process so that a remote
button can run a command. The Input button's code is **241** by default. The command opens the picker app
(`com.cleanyourtv.picker`) over whatever is on screen.

The picker runs **on demand only**: it is started when you press the key and closed again when you are done, so nothing
from CleanYourTV stays running in the background. A hidden overlay app keeps the remote on some firmware and freezes the
whole UI, which is why the old always-running mode is gone. The trade-off is the web app's cold start: the first press
after a while can take a few seconds. The layout and icons are cached on the TV, so the page is ready as soon as the
web view is up.

The overlay window itself follows the firmware: `overlay` below webOS 25 and `topui` from webOS 25 on (the setup rewrites
this once, the screen blinks when it changes). The app reports relaunches (`handlesRelaunch`), so opening it is the
page's decision — a press shows it, a second press closes it, and nothing is displayed without the page asking for it.

## Learning your remote's code

Remotes differ. In the manager app, **Input key** > **Learn the Input key** reads the code of the button you press and tests that
the picker opens. **Clear** restores the default.

The switch in the same menu removes the bind and gives the button back to LG's own picker. **Learn the Home key** is optional.

The Guide button can be bound the same way; that is part of [Live TV](live-tv.md#the-guide-button) (manager app > **Live TV** > **Learn the Guide key**).

!!! note "When the hook is not attached"
    On some firmware the hook cannot attach. The manager then shows the Input key as not available and LG's picker is used.
