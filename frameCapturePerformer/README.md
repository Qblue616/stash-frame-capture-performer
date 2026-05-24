# Frame Capture Performer

A Stash plugin that lets you capture the current video frame while watching a scene and set it as a performer's profile image — directly from the player controls.

## Features

- Camera button injected into the VideoJS control bar on every scene page
- Single performer → image updates immediately with a toast confirmation
- Multiple performers → a picker modal shows each performer's current photo so you can choose the right one
- Works with Stash's cookie-based auth and API key auth automatically
- No hardcoded paths — reads all connection details from Stash at runtime

## Requirements

- Stash (any recent version)
- Python 3.x available on your system (only needed for the optional Test Connection task)
- `stashapp-tools` installed in the Python environment Stash uses (optional — only for the task)

```
pip install stashapp-tools
```

## Installation

1. Copy the `frame-capture-performer` folder into your Stash plugins directory.
   - The plugins folder is shown in Stash → Settings → System → Plugins directory
2. In Stash, go to **Settings → Plugins** and click **Reload Plugins**
3. The plugin will appear in the list as **Frame Capture Performer**

No further configuration is needed. The button appears automatically on scene pages.

## Usage

1. Open any scene in Stash and start playing it
2. Seek to the frame you want to use as the performer image
3. Click the **camera icon** (📷) in the video player controls (near the fullscreen button)
4. If the scene has one performer, the image updates immediately
5. If the scene has multiple performers, a picker appears — click the performer you want to update

## Optional: Test Connection task

In Stash → Settings → Plugins → Frame Capture Performer, run the **Test Connection** task to verify `stashapp-tools` is installed and the plugin can reach your Stash instance.

## Python path note

If the Test Connection task fails with a Python error, check that Stash is using the correct Python executable. In Stash → Settings → System, set the **Python Path** to the full path of your Python interpreter (e.g. the one in your virtual environment).

The capture button and all core functionality work entirely in the browser and do **not** require Python.

## Troubleshooting

**Button doesn't appear**
Open browser DevTools (F12) on a scene page, go to the Console tab, and look for any errors prefixed with `[frame-capture-performer]`. Also check the Elements tab and search for `.vjs-control-bar` to confirm the player has rendered.

**GraphQL errors when clicking the button**
The error message is shown as a toast and also logged to the browser console. The most common cause is the performer update mutation being called before the video has fully loaded — wait for the video to start playing and try again.

**Image looks low quality**
Frame capture uses JPEG at 92% quality by default. This matches Stash's own image handling. The resolution depends on the video's native resolution.

## File structure

```
frame-capture-performer/
├── frame-capture-performer.yml   Plugin manifest
├── frame-capture-performer.py    Python task handler
├── frame-capture.js              Browser-side logic (button, capture, GraphQL)
└── frame-capture.css             Styles (button, modal, toasts)
```
