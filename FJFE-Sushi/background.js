browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: 'fjfe-info',
    title: 'More Info',
    contexts: ['all'],
    documentUrlPatterns: ['https://funnyjunk.com/*']
  });
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'fjfe-info') {
    if (tab && tab.id) {
      browser.tabs.sendMessage(tab.id, { type: 'fjfe-context-info' }).then(response => {
        if (!response || !response.handled) {
          browser.tabs.create({ url: 'https://edu.fjme.me/' });
        }
      }, () => {
        browser.tabs.create({ url: 'https://edu.fjme.me/' });
      });
    } else {
      browser.tabs.create({ url: 'https://edu.fjme.me/' });
    }
  }
});
