/// <reference types="vite/client" />

interface Window {
  dragonai?: {
    platform: string;
    versions: { node: string; electron: string; chrome: string };
  };
}
