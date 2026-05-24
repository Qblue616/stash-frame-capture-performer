# Frame Capture Performer

A Stash plugin that lets you capture the current video frame while watching a scene and set it as a performer's profile image — directly from the player controls.

## Features

- Camera button injected into the video player controls on every scene page
- Single performer → image updates immediately with a confirmation
- Multiple performers → a picker shows each performer's current photo so you can choose the right one
- Works with Stash's cookie-based auth and API key auth automatically
- No hardcoded paths — works with any Stash setup

## Installation

### Option 1 — Via Stash Package Manager (recommended)

1. In Stash go to **Settings → Plugins**
2. Under Sources click **Add Source**
3. Set the name to anything you like (e.g. `Qblue616`)
4. Paste this as the Source URL:
   ```
   https://raw.githubusercontent.com/Qblue616/stash-frame-capture-performer/main/index.yml
   ```
5. Click **Confirm**
6. Find **Frame Capture Performer** in the list and click **Install**
7. Reload Plugins or fully close and restart StashDB

### Option 2 — Manual installation

1. Download or clone this repository
2. Copy the `frameCapturePerformer` folder into your Stash plugins directory
3. In Stash go to **Settings → Plugins** and click **Reload Plugins** or fully close and restart StashDB

## Usage

1. Open any scene in Stash and start playing it
2. Seek to the frame you want to use as the performer image
3. Click the **camera icon** in the video player controls (near the fullscreen button)
4. If the scene has one performer, the image updates immediately
5. If the scene has multiple performers, a picker appears — click the performer you want to update

## Requirements

- Stash (recent version)
- Python 3.x (only needed for the optional Test Connection task)
- `stashapp-tools` Python package (optional — only for the task)

## License

MIT
