/*
 * Background service worker entry point.
 * Sets up the context menu hook used by the content scripts so
 * moderators can jump to the training site straight from FJ tabs.
 */

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'fjfe-info',
    title: 'More Info',
    contexts: ['all'],
    documentUrlPatterns: ['https://funnyjunk.com/*']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'fjfe-info') {
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'fjfe-context-info' }, (response) => {
        // Give the content script first shot so it can block unauthorized users.
        if (response && response.handled) {
          return;
        }
        if (response && response.authorized === true) {
          chrome.tabs.create({ url: 'https://edu.fjme.me/' });
        }
      });
    } else {
      chrome.tabs.create({ url: 'https://edu.fjme.me/' });
    }
  }
});

const fetchGifBuffer = async (url) => {
  if (!url) {
    throw new Error('Missing URL.');
  }
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  return { buffer, contentType };
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'fjfe-framegif-fetch') {
    return undefined;
  }
  const { url } = message;
  fetchGifBuffer(url)
    .then(({ buffer, contentType }) => {
      const bytes = Array.from(new Uint8Array(buffer));
      sendResponse({ ok: true, buffer: bytes, contentType });
    })
    .catch((error) => {
      sendResponse({ ok: false, error: error?.message || 'Fetch failed.' });
    });
  return true;
});
