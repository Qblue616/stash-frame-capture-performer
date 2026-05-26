// frame-capture.js — Frame Capture Performer plugin for Stash
// Injects a camera button into the VideoJS control bar.
// Captures the current frame and sets it as a performer's profile image via GraphQL.

(function () {
  "use strict";

  const PLUGIN_ID  = "frame-capture-performer";
  const BUTTON_ID  = "fcp-capture-btn";
  const MODAL_ID   = "fcp-modal";

  /* ─────────────────────────────────────────
     GraphQL
  ───────────────────────────────────────── */

  async function gql(query, variables = {}) {
    const headers = { "Content-Type": "application/json" };

    // Support both cookie-based sessions and API key auth.
    // Stash stores the API key in localStorage when the user logs in with one.
    const apiKey = localStorage.getItem("apiKey");
    if (apiKey) headers["ApiKey"] = apiKey;

    const res = await fetch("/graphql", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) throw new Error(`GraphQL HTTP error ${res.status}`);
    const json = await res.json();
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data;
  }

  async function fetchScenePerformers(sceneId) {
    const data = await gql(
      `query FCPScene($id: ID!) {
        findScene(id: $id) {
          performers { id name image_path }
        }
      }`,
      { id: sceneId }
    );
    return data?.findScene?.performers ?? [];
  }

  async function updatePerformerImage(performerId, imageDataUrl) {
    await gql(
      `mutation FCPPerformerUpdate($input: PerformerUpdateInput!) {
        performerUpdate(input: $input) { id }
      }`,
      { input: { id: performerId, image: imageDataUrl } }
    );
  }

  /* ─────────────────────────────────────────
     Frame capture
  ───────────────────────────────────────── */

  function getSceneId() {
    const m = window.location.pathname.match(/^\/scenes\/(\d+)/);
    return m?.[1] ?? null;
  }

  function captureFrame() {
    const video = document.querySelector("video");
    if (!video)              throw new Error("No video element found.");
    if (video.readyState < 2) throw new Error("Video is not ready yet — try again.");

    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d").drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  /* ─────────────────────────────────────────
     Toast notifications
  ───────────────────────────────────────── */

  function toast(message, type = "info") {
    const el = document.createElement("div");
    el.className = `fcp-toast fcp-toast-${type}`;
    el.textContent = message;
    document.body.appendChild(el);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add("fcp-toast-visible"));
    });

    setTimeout(() => {
      el.classList.remove("fcp-toast-visible");
      setTimeout(() => el.remove(), 350);
    }, 3200);
  }

  /* ─────────────────────────────────────────
     Performer picker modal
  ───────────────────────────────────────── */

  // Escape HTML special chars so performer names/ids can't break innerHTML
  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function buildPerformerCard(performer) {
    // image_path can be null if the performer has no photo yet
    let thumbHtml = "";
    if (performer.image_path) {
      const sep   = performer.image_path.includes("?") ? "&" : "?";
      const thumb = performer.image_path + sep + "v=" + Date.now();
      thumbHtml = `<img src="${esc(thumb)}" alt="" onerror="this.style.display='none'"/>`;
    }

    const initials = performer.name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return `
      <button class="fcp-performer-card" data-id="${esc(performer.id)}" data-name="${esc(performer.name)}">
        <div class="fcp-performer-photo">
          ${thumbHtml}
          <span class="fcp-performer-initials" aria-hidden="true">${esc(initials)}</span>
        </div>
        <span class="fcp-performer-name">${esc(performer.name)}</span>
      </button>`;
  }

  function showPerformerPicker(performers, imageDataUrl) {
    document.getElementById(MODAL_ID)?.remove();

    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="fcp-backdrop" role="dialog" aria-modal="true" aria-label="Choose performer">
        <div class="fcp-dialog">
          <div class="fcp-dialog-header">
            <span class="fcp-dialog-title">Set frame as performer image</span>
            <button class="fcp-close-btn" aria-label="Close">&#x2715;</button>
          </div>
          <div class="fcp-dialog-body">
            <img class="fcp-frame-preview" src="${esc(imageDataUrl)}" alt="Captured frame"/>
            <p class="fcp-choose-label">Choose a performer</p>
            <div class="fcp-performer-grid">
              ${performers.map(buildPerformerCard).join("")}
            </div>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector(".fcp-close-btn").addEventListener("click", close);
    modal.querySelector(".fcp-backdrop").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) close();
    });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
    });

    modal.querySelectorAll(".fcp-performer-card").forEach((card) => {
      card.addEventListener("click", async () => {
        const pid  = card.dataset.id;
        const name = card.dataset.name;

        // Disable all cards while saving
        modal.querySelectorAll(".fcp-performer-card").forEach((c) => (c.disabled = true));
        card.classList.add("fcp-loading");

        try {
          await updatePerformerImage(pid, imageDataUrl);
          close();
          toast(`✓ Image updated for ${name}`, "success");
        } catch (err) {
          console.error(`[${PLUGIN_ID}]`, err);
          modal.querySelectorAll(".fcp-performer-card").forEach((c) => (c.disabled = false));
          card.classList.remove("fcp-loading");
          toast(`Error: ${err.message}`, "error");
        }
      });
    });
  }

  /* ─────────────────────────────────────────
     Capture button
  ───────────────────────────────────────── */

  // Camera SVG icon — works at any size, inherits color
  const CAMERA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="currentColor" width="16" height="16" aria-hidden="true">
    <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/>
    <path d="M9 2 7.17 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0
      2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76
      0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
  </svg>`;

  function createCaptureButton() {
    const btn = document.createElement("button");
    btn.id        = BUTTON_ID;
    btn.className = "vjs-control vjs-button fcp-btn";
    btn.title     = "Capture frame as performer image";
    btn.innerHTML = CAMERA_SVG;
    return btn;
  }

  async function handleCapture(btn) {
    btn.disabled = true;
    btn.classList.add("fcp-busy");
    const sceneId = getSceneId();

    try {
      const frame      = captureFrame();
      const performers = await fetchScenePerformers(sceneId);

      if (!performers.length) {
        toast("No performers are linked to this scene.", "warn");
        return;
      }

      if (performers.length === 1) {
        await updatePerformerImage(performers[0].id, frame);
        toast(`✓ Image updated for ${performers[0].name}`, "success");
      } else {
        showPerformerPicker(performers, frame);
      }
    } catch (err) {
      console.error(`[${PLUGIN_ID}]`, err);
      toast(`Error: ${err.message}`, "error");
    } finally {
      btn.disabled = false;
      btn.classList.remove("fcp-busy");
    }
  }

  /* ─────────────────────────────────────────
     Button injection
  ───────────────────────────────────────── */

  function injectButton() {
    if (!getSceneId())               return false; // not on a scene page
    if (document.getElementById(BUTTON_ID)) return false; // already injected

    // Try to place the button immediately before the fullscreen button so it
    // sits naturally in the right-hand controls cluster. Fall back to simply
    // appending to the control bar.
    const anchor     = document.querySelector(".vjs-fullscreen-control")
                    || document.querySelector(".vjs-picture-in-picture-control");
    const controlBar = document.querySelector(".vjs-control-bar");

    if (!anchor && !controlBar) return false; // player not rendered yet

    const btn = createCaptureButton();
    btn.addEventListener("click", () => handleCapture(btn));

    if (anchor) {
      anchor.parentNode.insertBefore(btn, anchor);
    } else {
      controlBar.appendChild(btn);
    }

    return true;
  }

  /* ─────────────────────────────────────────
     Lifecycle / route handling
  ───────────────────────────────────────── */

  let domObserver = null; // holds the setInterval ID

  function stopWatching() {
    if (domObserver) { clearInterval(domObserver); domObserver = null; }
  }

  function startWatching() {
    stopWatching();
    if (!getSceneId()) return;

    // Try immediately — player may already be in the DOM
    if (injectButton()) return;

    // VideoJS can take several seconds to finish mounting its control bar.
    // Poll every 500ms for up to 30 seconds rather than using a MutationObserver
    // that can exhaust its attempt limit before the player is ready.
    let elapsed = 0;
    domObserver = setInterval(() => {
      elapsed += 500;
      if (!getSceneId() || injectButton() || elapsed >= 30000) {
        stopWatching();
      }
    }, 500);
  }

  function onRouteChange() {
    // Clean up from the previous page
    document.getElementById(BUTTON_ID)?.remove();
    document.getElementById(MODAL_ID)?.remove();
    stopWatching();

    // Re-inject if we're now on a scene page
    if (getSceneId()) startWatching();
  }

  function init() {
    // stash:location fires on every client-side navigation (React Router)
    window.PluginApi.Event.addEventListener("stash:location", onRouteChange);
    // Handle initial page load
    startWatching();
  }

  // PluginApi is injected asynchronously — poll until it's available
  const readyPoll = setInterval(() => {
    if (window.PluginApi?.Event) {
      clearInterval(readyPoll);
      init();
    }
  }, 100);

})();
