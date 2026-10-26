// Background service worker. It holds no wallet keys and runs no wallet code;
// the wallet runs in the extension page (side panel or tab). Its jobs:
//   - open the side panel from the toolbar button, plus "Open in a tab";
//   - Google sign-in for Drive backup, so the flow does not depend on the
//     page that started it staying open;
//   - expiring the unlock session after the auto-lock time (autoLock.js).
import {checkSessionExpiry, startAutoLock} from './autoLock';
import {
  GOOGLE_SIGN_IN_MESSAGE,
  runGoogleAuthFlow,
} from '@ext/extension/googleAuth';

const OPEN_IN_TAB_MENU = 'open-in-tab';

const appUrl = () => chrome.runtime.getURL('app.html');

const setUp = () => {
  chrome.sidePanel
    .setPanelBehavior({openPanelOnActionClick: true})
    .catch(error => console.error('[ext] side panel behaviour', error));
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: OPEN_IN_TAB_MENU,
      title: `Open ${process.env.EXT_BRAND_NAME} in a tab`,
      contexts: ['action'],
    });
  });
  startAutoLock();
};

chrome.runtime.onInstalled.addListener(({reason}) => {
  setUp();
  if (reason === 'install') {
    // First run: onboarding (create/import) is easier in a full tab.
    chrome.tabs.create({url: appUrl()});
  }
});

chrome.runtime.onStartup.addListener(setUp);

chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === OPEN_IN_TAB_MENU) {
    chrome.tabs.create({url: appUrl()});
  }
});

chrome.alarms.onAlarm.addListener(alarm => {
  checkSessionExpiry(alarm);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only the extension's own pages may start a sign-in.
  if (
    message?.type !== GOOGLE_SIGN_IN_MESSAGE ||
    sender.id !== chrome.runtime.id ||
    !sender.url?.startsWith(chrome.runtime.getURL(''))
  ) {
    return false;
  }
  runGoogleAuthFlow({interactive: message.interactive !== false}).then(
    session => sendResponse({ok: true, session}),
    error => sendResponse({ok: false, error: error?.message || String(error)}),
  );
  return true; // async response
});
