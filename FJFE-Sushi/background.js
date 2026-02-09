/*
 * Background service worker entry point.
 * Provides helper fetch for framegif decoding.
 */

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
