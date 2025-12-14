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
