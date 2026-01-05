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
        
        if (response && response.handled) return;
        if (response && response.authorized === true) browser.tabs.create({ url: 'https://edu.fjme.me/' });
      }, () => {
        
      });
    } else {
      browser.tabs.create({ url: 'https://edu.fjme.me/' });
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

browser.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== 'fjfe-framegif-fetch') {
    return undefined;
  }
  const { url } = message;
  return fetchGifBuffer(url)
    .then(({ buffer, contentType }) => {
      const bytes = Array.from(new Uint8Array(buffer));
      return { ok: true, buffer: bytes, contentType };
    })
    .catch((error) => ({ ok: false, error: error?.message || 'Fetch failed.' }));
});
