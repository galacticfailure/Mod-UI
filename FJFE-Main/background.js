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
