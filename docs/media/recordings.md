# Product recordings — October 16, 2026

These are recordings of the actual hosted STELE browser application at code
revision c508c2768c3e2a5fac8176eb09d5808bb8861944. They are demonstrations,
not synthetic reconstructions of UI states or general prevention evidence.

- `unicode-gate.mp4` (about 10 seconds): paste contains U+200B inside the
  first override keyword, Gate + Extract enters EPOCHÉ with KAPU-001 and
  three local audit entries; deliberate reset restores ZANSHIN.
- `compile-and-audit.mp4` (about 11 seconds): select Secure Pride, switch to
  REVIEW, select project CLAUDE.md output, and open the UTSUROI integrity panel.
  The final view shows state and the coupling matrix; it does not claim a
  production replay result or a full trail inspection.

Only synthetic test data and already-public project configuration were used.
The placeholder model key is not a credential and no real model key was entered.
The capture excludes other desktop applications, audio, and browser chrome.
Ephemeral session identifiers visible in the app are not bearer credentials.

The live page was captured using Chrome DevTools screencast JPEG frames with
original frame timestamps. Raw frames and capture manifests remain in the
persistent ignored `.release/recordings/` directory beside this release checkout.
FFmpeg 7.1 from pinned `imageio-ffmpeg==0.6.0` encoded H.264 MP4, 1280-pixel width,
24 fps, yuv420p, CRF 22, faststart, no audio. Static intervals are retained rather
than implying continuous animation. No UI values were changed during editing.
English WebVTT captions explain each step. JPEG posters and an 8 fps, 960-pixel
GIF preview support the website and GitHub README respectively.

Playback is user-initiated: native controls, playsinline, preload=none, no
autoplay or looping MP4, with captions and a linked caption transcript. The
README links its animated preview to the captioned website players. Asset byte
sizes and hashes are recorded in `manifest.json`.

The recordings demonstrate bounded product behavior. The threat-model paper
and production receipts describe the stronger checks and remaining limitations.
