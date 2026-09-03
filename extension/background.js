/*!
 * Oliver4 Dynamics 365 Accessibility Checker - extension service worker
 * Version 1.5.0
 *
 * This file is the extension's service worker. It does three things:
 *
 *   1. On a toolbar click, run d365-accessibility-checker.js in the page.
 *   2. A second click closes the panel, because the tool's own re-run guard
 *      tears the previous instance down when it finds its host element.
 *   3. Say something useful when that fails, instead of failing silently.
 *
 * The tool reads window.Xrm. An extension content script
 * runs in an isolated world by default, where the page's own JavaScript objects
 * are not visible, so Xrm would always come back missing and the tool would
 * drop to DOM-only checks. Injecting with world: 'MAIN' puts it in the same
 * execution context the page's own scripts run in.
 *
 * Why activeTab and not host permissions. activeTab grants access to the
 * current tab only, only when the user clicks the toolbar button, and only
 * until that tab navigates. No "read your data on all websites" warning, no
 * standing access, and it works on any org URL including vanity domains.
 */

'use strict';

/* The checker script that runs in the page. */
var CHECKER_FILE = 'lib/d365-accessibility-checker.js';

/* The tool's own host element. Its presence in the DOM is how this file knows
   whether a click opened the panel or closed it. Kept in step with HOST_ID in
   d365-accessibility-checker.js - if that ever changes, change it here too. */
var HOST_ID = 'd365-accessibility-aid-host';

/* Schemes no extension may script, whatever permissions it holds. */
var BLOCKED_SCHEME = /^(chrome|edge|brave|opera|vivaldi|about|devtools|view-source|chrome-extension|extension|moz-extension|data|blob|filesystem):/i;

/* Browser storefronts, which Chrome and Edge protect the same way. */
var BLOCKED_HOST = /(^|\.)(chromewebstore\.google\.com|chrome\.google\.com|microsoftedge\.microsoft\.com)$/i;

/* Said whenever the browser refuses access, because the browser's own wording
   ("Cannot access contents of the page") does not tell anyone what to do. */
var OFF_LIMITS = 'Browser pages, the extensions page, the web store and PDF tabs are off limits to every extension. On any other page, make sure the page has finished loading and click the toolbar button again.';

chrome.action.onClicked.addListener(function (tab) {
  toggle(tab).catch(function (err) {
    /* Nothing should reach here. This one is a defect, so it is logged as an
       error and does belong on the extensions page. */
    report(tab && tab.id, 'Unexpected failure: ' + text(err), true);
  });
});

/* A warning badge is about one page. Drop it as soon as that page goes away. */
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
  if (changeInfo.status === 'loading') quiet(tabId);
});

chrome.runtime.onInstalled.addListener(function () {
  console.info('[Oliver4 Dynamics 365 Accessibility Checker] extension v' +
    chrome.runtime.getManifest().version + ' installed.');
});

/* ------------------------------------------------------------------ */
/* The toggle                                                          */
/* ------------------------------------------------------------------ */

async function toggle(tab) {
  var tabId = tab && tab.id;
  if (typeof tabId !== 'number' || tabId < 0) return;

  var refusal = refuse(tab.url || '');
  if (refusal) { report(tabId, refusal); return; }

  quiet(tabId);

  /* Read the DOM before and after, so a click that does nothing at all is
     reported rather than looking like a closed panel. This runs in the
     isolated world on purpose: the host element is in the shared DOM, and
     nothing here needs the page's own objects. */
  var before;
  try {
    before = await panelOpen(tabId);
  } catch (err) {
    report(tabId, 'This page cannot be read by the extension. ' + OFF_LIMITS + ' ' + text(err));
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId, frameIds: [0] },
      world: 'MAIN',
      files: [CHECKER_FILE]
    });
  } catch (err) {
    report(tabId, 'The tool could not be injected into this page. ' + OFF_LIMITS + ' ' + text(err));
    return;
  }

  var after;
  try {
    after = await panelOpen(tabId);
  } catch (err) {
    /* The injection itself came back clean, so treat this as a success we
       could not confirm rather than a failure. */
    return;
  }

  if (after === before) {
    report(tabId, after
      ? 'The panel is open but did not close. Press Escape with focus in the panel, or reload the page.'
      : 'The panel did not open. The page may still be loading, or its content security policy may have blocked the script. Reload the page and try again.');
    return;
  }

  if (after) {
    /* The tool logs its own line, but it reports "unknown source" here: there
       is no script element to read a URL from when the browser injects the
       file directly. This line says where it actually came from. */
    chrome.scripting.executeScript({
      target: { tabId: tabId, frameIds: [0] },
      world: 'MAIN',
      args: [chrome.runtime.getManifest().version],
      func: function (v) {
        console.info('[Oliver4 Dynamics 365 Accessibility Checker] injected by the ' +
          'browser extension, v' + v + '.');
      }
    }).catch(function () {});
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function panelOpen(tabId) {
  return chrome.scripting.executeScript({
    target: { tabId: tabId, frameIds: [0] },
    args: [HOST_ID],
    func: function (id) { return !!document.getElementById(id); }
  }).then(function (frames) {
    return !!(frames && frames[0] && frames[0].result);
  });
}

/* Returns the reason this URL cannot be scripted, or '' if it can.

   An empty url is not a refusal. Chrome only fills in tab.url for an extension
   that holds access to that tab, and with activeTab alone the grant arrives
   with the click - so an empty string here means "not known yet", not "not
   allowed". Those cases fall through and are reported by the injection error,
   which says what actually went wrong. */
function refuse(url) {
  if (!url) return '';
  if (BLOCKED_SCHEME.test(url)) {
    return 'Browser pages cannot be scripted by an extension. Open a Dynamics 365 page in a normal tab.';
  }
  if (url.slice(0, 5).toLowerCase() === 'file:') {
    return 'Local files need "Allow access to file URLs" switching on for this extension on the extensions page.';
  }
  var host = '';
  try { host = new URL(url).hostname; } catch (e) {}
  if (host && BLOCKED_HOST.test(host)) {
    return 'The browser blocks extensions from running on its own web store pages.';
  }
  return '';
}

/* No alert() and no notifications permission, so a failure shows as a badge on
   the toolbar button with the detail in its tooltip, and in this worker's
   console for anyone who opens it from the extensions page.

   Severity matters here. Chrome collects whatever a service worker logs with
   console.error onto the extension's Errors page, so logging an expected
   refusal that way - clicking the button on a browser tab, say - leaves what
   looks like a defect sitting on the extensions page. Expected refusals are
   logged with console.info, which is not collected. Only the unexpected flag,
   set by the catch-all on the click handler, logs an error. */
function report(tabId, message, unexpected) {
  var line = '[Oliver4 Dynamics 365 Accessibility Checker] ' + message;
  if (unexpected) console.error(line);
  else console.info(line);
  if (typeof tabId !== 'number' || tabId < 0) return;
  try {
    chrome.action.setBadgeText({ tabId: tabId, text: '!' });
    chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#8a1c1c' });
    chrome.action.setTitle({
      tabId: tabId,
      title: 'Oliver4 accessibility checker\n\n' + message
    });
  } catch (e) {}
}

function quiet(tabId) {
  if (typeof tabId !== 'number' || tabId < 0) return;
  try {
    chrome.action.setBadgeText({ tabId: tabId, text: '' });
    chrome.action.setTitle({
      tabId: tabId,
      title: 'Oliver4 accessibility checker (open or close the panel)'
    });
  } catch (e) {}
}

function text(err) {
  if (!err) return '';
  return String(err.message || err);
}
