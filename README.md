# Speaking Test Web Application

A browser-based speaking test that a whole class can take at the same time. Students open a URL, enter their class and name, and respond to a prompt video; each response is recorded automatically and saved to the teacher's Google Drive.

Developed by a high school English teacher with generative-AI coding assistance, and reported in:

> Horikawa, S. (2026). Design and implementation of a speaking test web application for large classes: Toward teacher-led tool development. *SELT-Okinawa Journal, 23*.

## Architecture

```
Student's browser                     Google Apps Script            Google Drive
┌──────────────────────┐              ┌──────────────────┐          ┌──────────────┐
│ index.html           │  POST        │ doPost()         │          │ 2_1/         │
│  · YouTube prompt    │  base64 ───▶ │  saveSegment_()  │ ──────▶  │   1_Name/    │
│  · MediaRecorder     │  (text/plain)│  LockService     │          │     01_….webm│
│  · upload queue      │ ◀─── JSON    │                  │          │     …        │
└──────────────────────┘              └──────────────────┘          └──────────────┘
   hosted on GitHub Pages                web app (/exec)
```

`index.html` is served as a **top-level document**, not from inside the Apps Script sandbox. This matters: Apps Script renders HTML Service pages inside a cross-origin iframe that carries no `allow="camera; microphone"` attribute, so Chrome's Permissions Policy blocks `getUserMedia()` there:

```
[Violation] Permissions policy violation: camera is not allowed in this document.
NotAllowedError Permission denied
```

Hosting the interface separately and using Apps Script only as a storage endpoint removes the constraint entirely.

## Setup

**1. Prepare the destination folder**

Create a folder in Google Drive for the recordings and copy its ID from the URL
(`https://drive.google.com/drive/folders/<THIS_PART>`).

**2. Deploy the storage endpoint**

Create a new Apps Script project, paste `gas/Code.gs`, and set `ROOT_FOLDER_ID` to the folder ID from step 1. Then:

*Deploy → New deployment → Web app*
- Execute as: **Me**
- Who has access: **Anyone**

Copy the resulting `/exec` URL.

**3. Prepare the prompt video**

Record the test prompts as a single video and upload it to YouTube (unlisted is sufficient). Note the video ID from the URL.

**4. Configure the interface**

In `index.html`, set the three configuration values at the top of the `<script>` block:

```js
const GAS_ENDPOINT = 'https://script.google.com/macros/s/…/exec';
const VIDEO_ID = 'xxxxxxxxxxx';
const segments = [ … ];
```

`segments` defines when recording starts and stops, expressed in seconds of the prompt video's timeline. Adjust these to match your own video. `Name` and `Feeling` are warm-up segments and are not scored.

**5. Publish the interface**

Enable GitHub Pages for the repository (*Settings → Pages → Deploy from branch*). HTTPS is required — `getUserMedia()` does not work over plain HTTP.

## Test structure as reported

| Segment | Content | Points |
|---|---|---|
| Name, Feeling | Warm-up; recorded but not scored | — |
| Part 1 (Reading) | Read aloud a passage studied in class | 10 |
| Part 2 (Q1) | Comprehension question on the passage | 5 |
| Parts 3–4 (Q2, Q3) | Questions practised in class | 5 each |
| Part 5 (Q4) | Unpractised question answerable with studied expressions | 5 |
| | **Total** | **30** |

The seven recording windows total 132 seconds per session, of which 109 seconds are scored. Each class period runs the sequence twice — once for practice, once scored — using different content.

## Notes for anyone reusing this

**Access control.** A web app deployed with "Anyone" access accepts requests from any client that knows the URL. There is no authentication: students identify themselves by typing their class and name, and nothing prevents a third party from posting files to the endpoint. Use a dedicated folder, and undeploy when the test period ends. Anyone extending this for wider use should add a shared secret at minimum.

**Concurrent folder creation.** `getOrCreateFolder_()` is wrapped in `LockService`. Without it, simultaneous submissions from a class each find the class folder missing and each create one, yielding duplicates such as `2_1`, `2_1 (2)`, `2_1 (3)`. This was the behaviour observed in the reported implementation and was corrected afterwards.

**Microphone failures are usually hardware.** The level meter on the entry screen exists because audio-less recordings turned out to come from broken headsets, not from the application. Have students speak and watch the meter before starting; swap out any headset that leaves it flat.

**Recording quality is deliberately low** (360×202, 15 fps, 450 kbps). Each response is base64-encoded and posted individually, and forty devices upload at once. One student's full set of seven files is roughly 6.7 MB.

**Storage adds up.** 218 students × 2 sessions ≈ 2.9 GB.

## Licence

MIT
