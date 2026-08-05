/**
 * Speaking Test Web Application — server side (Google Apps Script)
 *
 * This script acts purely as a storage endpoint. The user interface is a static
 * page hosted separately (e.g. GitHub Pages), which posts each recorded segment
 * here as base64-encoded data.
 *
 * Deployment
 *   Deploy > New deployment > Web app
 *     Execute as:  Me
 *     Who has access:  Anyone
 *   Copy the resulting /exec URL into GAS_ENDPOINT in index.html.
 *
 * NOTE ON ACCESS CONTROL
 *   A web app deployed with "Anyone" access accepts requests from any client.
 *   For classroom use inside a closed network this was acceptable, but anyone
 *   who knows the URL can write files into the destination folder. Use a
 *   dedicated folder, and remove or restrict the deployment when not in use.
 */

// Replace with the ID of the Drive folder that will hold the recordings.
const ROOT_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID';

/**
 * Receives one recorded segment and stores it in Drive.
 * Expected JSON body:
 *   { b64, contentType, grade, classNum, attNo, studentName, label, seq }
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('empty request body');
    }
    const p = JSON.parse(e.postData.contents);
    const fileId = saveSegment_(p);
    return json_({ ok: true, fileId: fileId });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** Simple health check: open the /exec URL in a browser to verify deployment. */
function doGet() {
  return json_({ ok: true, service: 'speaking-test-storage' });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function saveSegment_(p) {
  const grade       = String(p.grade || '').trim();
  const classNum    = String(p.classNum || '').trim();
  const attNo       = String(p.attNo || '').trim();
  const studentName = String(p.studentName || '').trim();
  const label       = String(p.label || '').trim();
  const seq         = Number(p.seq || 0);
  const b64         = p.b64;

  if (!b64 || !grade || !classNum || !attNo || !studentName || !label || !seq) {
    throw new Error('missing params');
  }

  const root        = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const classFolder = getOrCreateFolder_(root, `${grade}_${classNum}`);
  const safeName    = sanitize_(studentName);
  const studentDir  = getOrCreateFolder_(classFolder, `${attNo}_${safeName}`);

  const seqStr = String(seq).padStart(2, '0');
  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const filename = `${seqStr}_${grade}_${classNum}_${attNo}_${safeName}_${label}_${ts}.webm`;

  const bytes = Utilities.base64Decode(b64);
  const blob  = Utilities.newBlob(bytes, String(p.contentType || 'video/webm'), filename);

  return studentDir.createFile(blob).getId();
}

/**
 * Returns the named child folder, creating it if absent.
 *
 * The lock is essential. Without it, simultaneous submissions from a whole
 * class each check for the folder, each find it missing, and each create one,
 * producing duplicates such as "2_1", "2_1 (2)", "2_1 (3)". Serialising this
 * section removes the race condition.
 */
function getOrCreateFolder_(parent, name) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const it = parent.getFoldersByName(name);
    return it.hasNext() ? it.next() : parent.createFolder(name);
  } finally {
    lock.releaseLock();
  }
}

function sanitize_(s) {
  return String(s || '').trim().replace(/[\\\/:*?"<>|#%]/g, '_');
}
