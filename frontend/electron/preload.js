const { contextBridge } = require("electron");

// Exposed to the renderer as `window.dragonai`.
// Kept minimal on purpose: the renderer talks to the Python backend over
// HTTP, so the only thing the main process needs to hand over here is
// environment/version info. Automation & voice IPC channels get added
// here in later phases as those modules are wired in.
contextBridge.exposeInMainWorld("dragonai", {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
});
