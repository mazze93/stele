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

## EPOCHÉ hero — October 16, 2026

`integrity-cycle.mp4` adds a guided explanation of all four integrity states,
followed by an eight-second recording of the updated application in Vellum &
Smoke (`epoche-vellum-smoke.mp4`). The final
frame remains in application lockout; the deliberate reset stays in the original
recording. This cut has no audio, automatic playback, or repeat loop.

The application segment records a local production build with the durable
mirror disabled, a non-credential key placeholder, and a real gate submission.
The network trace observed zero requests during the gate and lockout; no model
response was simulated. The lockout records one TOBIRA and three local audit
entries. It is the actual application UI, not an editorial reconstruction.

The first approximately 22 seconds record the editorial website walkthrough,
not four application sessions. The page labels the examples as independent.
They are not a mandatory sequence of inputs: a severe signal can move straight
to EPOCHÉ, and WABI already prevents another extraction in that session.
`node site/check-story.mjs` checks each quoted input, exact audit code, blocked
result, and four advertised capabilities against the production gate and
integrity module. CI runs this contract alongside the application checks.

The page initially shows EPOCHÉ and explains why suspension is appropriate.
Playback is deliberate, progresses once through ZANSHIN, UNHEIMLICH, WABI,
and EPOCHÉ, and stays there. State buttons allow manual exploration. Reduced
motion removes timed playback; without JavaScript, all four explanations remain
readable. No system override or simulated model response was added to the app.

The final walkthrough capture uses the same screencast/encoder pipeline as the
original recordings. Raw frames and timestamps remain in persistent ignored
`.release/recordings/integrity-cycle-final/` and `epoche-vellum-smoke/`.
`integrity-cycle.json` records
source hashes and the boundary between explanation and application footage.
The original application footage and raw captures are preserved. Captions for
both original recordings now explain the purpose before introducing terminology.
The new poster is a static README preview linking to deliberate video playback.

Reviewed at 1280×934 and 390×844, including touch target dimensions, keyboard
selection, reduced-motion manual mode, and absence of horizontal overflow.
These are implementation checks, not measured audience comprehension or a
usability study. The three-to-six-second comprehension target still needs a
first-time-viewer test.
