(() => {
  if (window.fjfeFrameGifInitialized) {
    return;
  }

  window.fjfeFrameGifInitialized = true;

  const GRID_COLUMNS = 5;
  const GRID_ROWS_VISIBLE = 4;
  const THUMB_EDGE = 100;
  const GRID_GAP = 8;
  const GRID_WIDTH = GRID_COLUMNS * THUMB_EDGE + GRID_GAP * (GRID_COLUMNS - 1);
  const GRID_MAX_HEIGHT = GRID_ROWS_VISIBLE * THUMB_EDGE + GRID_GAP * (GRID_ROWS_VISIBLE - 1);
  const MENU_MAX_WIDTH = GRID_WIDTH + 40;
  const MAX_DECODE_FRAMES = 400;
  const VIDEO_SAMPLING_FPS = 8;
  const MIN_VIDEO_STEP = 1 / VIDEO_SAMPLING_FPS;
  const INITIAL_RENDER_FRAMES = 80;
  const RENDER_FRAMES_INCREMENT = 80;

  const resolveAssetUrl = (relativePath) => {
    if (!relativePath) {
      return relativePath;
    }
    try {
      if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
        return chrome.runtime.getURL(relativePath);
      }
    } catch (_) {}
    return relativePath;
  };

  const FRAME_ICON_URL = resolveAssetUrl('icons/frames.png');
  const state = {
    active: false,
    listenersAttached: false,
    hoverButton: null,
    hoveredMedia: null,
    menu: null,
    menuTarget: null,
    menuTargetKind: null,
    menuRequestToken: 0,
    menuPreview: null,
    menuPreviewLabel: null,
    menuPreviewImage: null,
    menuMessage: null,
    menuGrid: null,
    frameCache: new Map(),
    rafSync: null,
    lastPointerX: null,
    lastPointerY: null,
    menuFrames: null,
    renderedFrameCount: 0,
    menuTotalFrames: 0
  };

  const runtimeAdapter = (() => {
    if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage) {
      return { kind: 'chrome', api: chrome.runtime };
    }
    if (typeof browser !== 'undefined' && browser?.runtime?.sendMessage) {
      return { kind: 'browser', api: browser.runtime };
    }
    return null;
  })();

  const sendExtensionMessage = (payload) => {
    return new Promise((resolve, reject) => {
      if (!runtimeAdapter?.api?.sendMessage) {
        reject(new Error('Extension messaging unavailable.'));
        return;
      }
      if (runtimeAdapter.kind === 'browser') {
        runtimeAdapter.api.sendMessage(payload).then(resolve).catch(reject);
        return;
      }
      try {
        runtimeAdapter.api.sendMessage(payload, (response) => {
          if (chrome?.runtime?.lastError) {
            reject(new Error(chrome.runtime.lastError.message || 'Extension messaging failed.'));
            return;
          }
          resolve(response);
        });
      } catch (error) {
        reject(error);
      }
    });
  };

  const fetchGifBufferViaExtension = async (url) => {
    if (!url) {
      throw new Error('GIF URL missing.');
    }
    const response = await sendExtensionMessage({ type: 'fjfe-framegif-fetch', url });
    if (!response || !response.ok || !response.buffer) {
      throw new Error(response?.error || 'Extension fetch failed.');
    }
    const buffer = response.buffer;
    let resolvedBuffer = null;
    if (buffer instanceof ArrayBuffer) {
      resolvedBuffer = buffer;
    } else if (Array.isArray(buffer)) {
      resolvedBuffer = new Uint8Array(buffer).buffer;
    } else if (buffer?.buffer instanceof ArrayBuffer) {
      resolvedBuffer = buffer.buffer;
    }
    if (resolvedBuffer) {
      return { buffer: resolvedBuffer, contentType: response.contentType || 'application/octet-stream' };
    }
    throw new Error('Extension fetch returned invalid data.');
  };

  const isCrossOriginUrl = (url) => {
    try {
      const parsed = new URL(url, window.location.href);
      if (parsed.protocol === 'blob:') {
        return false;
      }
      return parsed.origin !== window.location.origin;
    } catch (_) {
      return true;
    }
  };

  const appendToBody = (element) => {
    const attach = () => {
      if (!document.body.contains(element)) {
        document.body.appendChild(element);
      }
    };
    if (document.body) {
      attach();
    } else {
      document.addEventListener('DOMContentLoaded', attach, { once: true });
    }
  };

  const updatePointerPosition = (event) => {
    if (!event) {
      return;
    }
    if (typeof event.clientX === 'number') {
      state.lastPointerX = event.clientX;
    }
    if (typeof event.clientY === 'number') {
      state.lastPointerY = event.clientY;
    }
  };

  const isPointerIntersectingHoveredMedia = () => {
    if (!state.hoveredMedia) {
      return false;
    }
    const x = state.lastPointerX;
    const y = state.lastPointerY;
    if (typeof x !== 'number' || typeof y !== 'number') {
      return false;
    }
    try {
      if (typeof document.elementsFromPoint === 'function') {
        const elements = document.elementsFromPoint(x, y) || [];
        if (elements.includes(state.hoveredMedia)) {
          return true;
        }
      }
    } catch (_) {}
    const rect = state.hoveredMedia.getBoundingClientRect?.();
    if (!rect) {
      return false;
    }
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  };

  const ensureStyles = () => {
    if (document.getElementById('fjfe-framegif-style')) {
      return;
    }
    const style = document.createElement('style');
    style.id = 'fjfe-framegif-style';
    style.textContent = `
      .fjfe-framegif-button {
        position: absolute;
        z-index: 2147483642;
        width: 38px;
        height: 38px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        background: rgba(10, 10, 10, 0.9);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
        display: none;
        align-items: center;
        justify-content: center;
        padding: 0;
        cursor: pointer;
      }
      .fjfe-framegif-button img {
        width: 20px;
        height: 20px;
        object-fit: contain;
        pointer-events: none;
      }
      .fjfe-framegif-button:hover {
        background: rgba(24, 24, 24, 0.95);
      }
      .fjfe-framegif-menu {
        position: absolute;
        z-index: 2147483643;
        min-width: 240px;
        max-width: ${MENU_MAX_WIDTH}px;
        padding: 12px 16px 16px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(8, 8, 8, 0.98);
        color: #f5f5f5;
        box-shadow: 0 18px 32px rgba(0, 0, 0, 0.6);
        display: none;
        flex-direction: column;
        gap: 10px;
      }
      .fjfe-framegif-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .fjfe-framegif-title {
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }
      .fjfe-framegif-close {
        border: none;
        background: rgba(255, 255, 255, 0.08);
        color: #fafafa;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 15px;
        line-height: 1;
        padding: 0;
      }
      .fjfe-framegif-close:hover {
        background: rgba(255, 255, 255, 0.16);
      }
      .fjfe-framegif-preview {
        display: none;
        flex-direction: column;
        gap: 6px;
      }
      .fjfe-framegif-preview[data-visible="1"] {
        display: flex;
      }
      .fjfe-framegif-preview img {
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        max-width: min(${GRID_WIDTH}px, 80vw);
        max-height: 320px;
        width: auto;
        height: auto;
        object-fit: contain;
        display: block;
      }
      .fjfe-framegif-status {
        font-size: 12px;
        color: #c9c9c9;
      }
      .fjfe-framegif-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(${THUMB_EDGE}px, 1fr));
        gap: ${GRID_GAP}px;
        width: min(${GRID_WIDTH}px, 80vw);
        max-height: ${GRID_MAX_HEIGHT}px;
        overflow-y: auto;
        overflow-x: hidden;
        padding-bottom: 4px;
      }
      .fjfe-framegif-frame {
        width: ${THUMB_EDGE}px;
        height: ${THUMB_EDGE}px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.03);
        padding: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .fjfe-framegif-frame:hover {
        border-color: rgba(255, 255, 255, 0.4);
        background: rgba(255, 255, 255, 0.08);
      }
      .fjfe-framegif-frame img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 6px;
        pointer-events: none;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  };

  const normalizeUrl = (url) => (url || '').split('#')[0];

  const getGifSourceUrl = (node) => {
    if (!node) {
      return '';
    }
    return normalizeUrl(node.currentSrc || node.src || '');
  };

  const getVideoSourceUrl = (node) => {
    if (!node) {
      return '';
    }
    const direct = normalizeUrl(node.currentSrc || node.src || '');
    if (direct) {
      return direct;
    }
    const sourceEl = node.querySelector?.('source');
    if (sourceEl) {
      return normalizeUrl(sourceEl.currentSrc || sourceEl.src || '');
    }
    return '';
  };

  const isGifImage = (node) => {
    if (!node || node.tagName !== 'IMG') {
      return false;
    }
    const src = getGifSourceUrl(node);
    if (!src) {
      return false;
    }
    return /\.gif($|\?)/i.test(src);
  };

  const isVideoElement = (node) => {
    if (!node || node.tagName !== 'VIDEO') {
      return false;
    }
    const src = getVideoSourceUrl(node);
    return Boolean(src);
  };

  const getMediaKind = (node) => {
    if (isGifImage(node)) {
      return 'gif';
    }
    if (isVideoElement(node)) {
      return 'video';
    }
    return null;
  };

  const isExcludedMediaTarget = (node) => {
    if (!node) {
      return false;
    }
    if (node.id === 'lightbox-secNav-btnClose') {
      return true;
    }
    if (typeof node.closest === 'function' && node.closest('#lightbox-secNav-btnClose')) {
      return true;
    }
    return false;
  };

  const getMediaSourceUrl = (node) => {
    const kind = getMediaKind(node);
    if (kind === 'gif') {
      return getGifSourceUrl(node);
    }
    if (kind === 'video') {
      return getVideoSourceUrl(node);
    }
    return '';
  };

  const guessVideoMimeType = (url, fallback) => {
    if (fallback && fallback !== 'application/octet-stream') {
      return fallback;
    }
    if (/\.webm($|\?)/i.test(url)) {
      return 'video/webm';
    }
    if (/\.(mp4|m4v)($|\?)/i.test(url)) {
      return 'video/mp4';
    }
    if (/\.mov($|\?)/i.test(url)) {
      return 'video/quicktime';
    }
    if (/\.mkv($|\?)/i.test(url)) {
      return 'video/x-matroska';
    }
    return fallback || 'video/mp4';
  };

  const ensureHoverButton = () => {
    if (state.hoverButton) {
      return state.hoverButton;
    }
    ensureStyles();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fjfe-framegif-button';
    button.setAttribute('aria-label', 'View frames');
    button.title = 'View frames';
    const icon = document.createElement('img');
    icon.src = FRAME_ICON_URL;
    icon.alt = '';
    icon.draggable = false;
    button.appendChild(icon);
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (state.hoveredMedia) {
        openMenuForTarget(state.hoveredMedia);
      }
    });
    appendToBody(button);
    state.hoverButton = button;
    return button;
  };

  const ensureMenu = () => {
    if (state.menu) {
      return state.menu;
    }
    ensureStyles();
    const menu = document.createElement('div');
    menu.className = 'fjfe-framegif-menu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-label', 'Frame viewer');
    menu.addEventListener('pointerdown', (event) => event.stopPropagation());
    menu.addEventListener('wheel', (event) => event.stopPropagation(), { passive: true });

    const header = document.createElement('div');
    header.className = 'fjfe-framegif-header';
    const title = document.createElement('span');
    title.className = 'fjfe-framegif-title';
    title.textContent = 'Frames';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'fjfe-framegif-close';
    closeBtn.setAttribute('aria-label', 'Close frame viewer');
    closeBtn.textContent = 'X';
    closeBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      closeMenu();
    });
    header.append(title, closeBtn);

    const preview = document.createElement('div');
    preview.className = 'fjfe-framegif-preview';
    const previewLabel = document.createElement('div');
    previewLabel.className = 'fjfe-framegif-status';
    const previewImg = document.createElement('img');
    previewImg.alt = 'Selected GIF frame';
    previewImg.draggable = false;
    preview.append(previewLabel, previewImg);

    const message = document.createElement('div');
    message.className = 'fjfe-framegif-status';

    const grid = document.createElement('div');
    grid.className = 'fjfe-framegif-grid';
    grid.setAttribute('role', 'list');

    menu.append(header, preview, message, grid);
    appendToBody(menu);

    state.menu = menu;
    state.menuPreview = preview;
    state.menuPreviewLabel = previewLabel;
    state.menuPreviewImage = previewImg;
    state.menuMessage = message;
    state.menuGrid = grid;
    return menu;
  };

  const hideHoverButton = () => {
    if (state.hoverButton) {
      state.hoverButton.style.display = 'none';
    }
    state.hoveredImage = null;
  };

  const positionHoverButton = () => {
    if (!state.hoverButton || !state.hoveredMedia) {
      return;
    }
    if (!document.contains(state.hoveredMedia)) {
      hideHoverButton();
      return;
    }
    const rect = state.hoveredMedia.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) {
      hideHoverButton();
      return;
    }
    const top = window.scrollY + rect.top + 6;
    const left = window.scrollX + rect.left + 6;
    state.hoverButton.style.top = `${top}px`;
    state.hoverButton.style.left = `${left}px`;
    state.hoverButton.style.display = 'flex';
  };

  const scheduleUiSync = () => {
    if (state.rafSync !== null) {
      return;
    }
    state.rafSync = window.requestAnimationFrame(() => {
      state.rafSync = null;
      positionHoverButton();
      repositionMenu();
    });
  };

  const onViewportChange = () => {
    if (!state.active) {
      return;
    }
    if (state.hoveredMedia && !isPointerIntersectingHoveredMedia()) {
      hideHoverButton();
      return;
    }
    scheduleUiSync();
  };

  const showHoverButton = (node, pointerEvent) => {
    if (pointerEvent) {
      updatePointerPosition(pointerEvent);
    }
    state.hoveredMedia = node;
    const button = ensureHoverButton();
    if (!button) {
      return;
    }
    scheduleUiSync();
  };

  const closeMenu = () => {
    state.menuRequestToken += 1;
    if (!state.menu) {
      state.menuTarget = null;
      state.menuTargetKind = null;
      return;
    }
    state.menu.style.display = 'none';
    state.menuTarget = null;
    state.menuTargetKind = null;
    state.menuFrames = null;
    state.renderedFrameCount = 0;
    state.menuTotalFrames = 0;
    if (state.menuPreview) {
      state.menuPreview.dataset.visible = '0';
      state.menuPreviewImage.removeAttribute('src');
      state.menuPreviewLabel.textContent = '';
    }
    if (state.menuMessage) {
      state.menuMessage.textContent = '';
    }
    if (state.menuGrid) {
      state.menuGrid.textContent = '';
    }
  };

  const repositionMenu = () => {
    if (!state.menu || state.menu.style.display !== 'flex' || !state.menuTarget) {
      return;
    }
    if (!document.contains(state.menuTarget)) {
      closeMenu();
      return;
    }
    const targetRect = state.menuTarget.getBoundingClientRect();
    const menuRect = state.menu.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    if (!targetRect || (!targetRect.width && !targetRect.height)) {
      closeMenu();
      return;
    }
    const absoluteAboveTop = scrollY + targetRect.top - menuRect.height - 10;
    let top = absoluteAboveTop;
    let placement = 'above';
    if (absoluteAboveTop < 8) {
      top = scrollY + targetRect.bottom + 10;
      placement = 'below';
    }
    let left = scrollX + targetRect.left;
    const rightLimit = scrollX + window.innerWidth - menuRect.width - 12;
    if (left > rightLimit) {
      left = Math.max(scrollX + 12, rightLimit);
    }
    if (left < scrollX + 12) {
      left = scrollX + 12;
    }
    state.menu.style.top = `${Math.max(8, top)}px`;
    state.menu.style.left = `${left}px`;
    state.menu.dataset.placement = placement;
  };

  const previewFrame = (frame, index) => {
    if (!state.menuPreview || !state.menuPreviewImage || !state.menuPreviewLabel) {
      return;
    }
    state.menuPreview.dataset.visible = '1';
    state.menuPreviewImage.src = frame.src;
    state.menuPreviewLabel.textContent = '';
    scheduleUiSync();
  };

  const renderFrames = () => {
    if (!state.menuGrid) {
      return;
    }
    const frames = state.menuFrames || [];
    const visibleCount = Math.min(frames.length, state.renderedFrameCount || frames.length);
    state.menuGrid.textContent = '';
    for (let index = 0; index < visibleCount; index += 1) {
      const frame = frames[index];
      if (!frame) {
        continue;
      }
      const frameBtn = document.createElement('button');
      frameBtn.type = 'button';
      frameBtn.className = 'fjfe-framegif-frame';
      frameBtn.setAttribute('aria-label', `Frame ${index + 1}`);
      const img = document.createElement('img');
      img.src = frame.src;
      img.alt = `Frame ${index + 1}`;
      img.draggable = false;
      frameBtn.appendChild(img);
      frameBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        previewFrame(frame, index);
      });
      state.menuGrid.appendChild(frameBtn);
    }

    if (visibleCount < frames.length) {
      const loadMoreBtn = document.createElement('button');
      loadMoreBtn.type = 'button';
      loadMoreBtn.textContent = 'Load more frames';
      loadMoreBtn.style.width = '100%';
      loadMoreBtn.style.padding = '10px 8px';
      loadMoreBtn.style.borderRadius = '8px';
      loadMoreBtn.style.border = '1px solid rgba(255, 255, 255, 0.2)';
      loadMoreBtn.style.background = 'rgba(255, 255, 255, 0.06)';
      loadMoreBtn.style.color = '#f8f8f8';
      loadMoreBtn.style.cursor = 'pointer';
      loadMoreBtn.style.font = "600 13px 'Segoe UI', sans-serif";
      loadMoreBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        state.renderedFrameCount = Math.min(frames.length, visibleCount + RENDER_FRAMES_INCREMENT);
        renderFrames();
        updateStatusMessage();
      });
      state.menuGrid.appendChild(loadMoreBtn);
    }
  };

  const updateStatusMessage = () => {
    if (!state.menuMessage) {
      return;
    }
    const frames = state.menuFrames || [];
    const total = state.menuTotalFrames || frames.length;
    if (!frames.length) {
      state.menuMessage.textContent = 'No frames detected in this media.';
      return;
    }
    const visible = Math.min(frames.length, state.renderedFrameCount || frames.length);
    if (visible < total) {
      state.menuMessage.textContent = `Showing ${visible} of ${total} frames. Load more to continue.`;
    } else {
      state.menuMessage.textContent = `${total} frame${total === 1 ? '' : 's'} loaded.`;
    }
  };

  const convertFrameToBitmap = async (image) => {
    if (typeof VideoFrame !== 'undefined' && image instanceof VideoFrame) {
      const bitmap = await createImageBitmap(image);
      image.close();
      return bitmap;
    }
    return image;
  };

  const bitmapToDataUrl = (bitmap) => {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width || THUMB_EDGE;
    canvas.height = bitmap.height || THUMB_EDGE;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    if (typeof bitmap.close === 'function') {
      bitmap.close();
    }
    return dataUrl;
  };

  const decodeBufferWithImageDecoder = async (buffer) => {
    if (typeof ImageDecoder === 'undefined') {
      throw new Error('GIF decoding is not supported in this browser.');
    }
    const decoder = new ImageDecoder({ data: buffer, type: 'image/gif' });
    const track = decoder.tracks?.selectedTrack;
    const reportedTotal = track?.frameCount ?? decoder.frameCount ?? 0;
    const limit = reportedTotal > 0 ? Math.min(reportedTotal, MAX_DECODE_FRAMES) : MAX_DECODE_FRAMES;
    const frames = [];
    let observedTotal = reportedTotal;
    for (let i = 0; i < limit; i += 1) {
      try {
        const { image } = await decoder.decode({ frameIndex: i });
        const bitmap = await convertFrameToBitmap(image);
        const src = bitmapToDataUrl(bitmap);
        frames.push({ index: i, src, width: bitmap.width, height: bitmap.height });
      } catch (error) {
        const message = String(error?.message || '').toLowerCase();
        if (message.includes('range') || message.includes('index')) {
          observedTotal = observedTotal ? Math.min(observedTotal, i) : i;
          break;
        }
        decoder.close?.();
        throw error;
      }
    }
    decoder.close?.();
    const total = observedTotal || frames.length;
    return { frames, total, truncated: total > frames.length };
  };

  const fetchGifBufferDirect = async (url) => {
    const response = await fetch(url, { credentials: 'include', cache: 'no-store', mode: 'cors' });
    if (!response.ok) {
      throw new Error(`GIF request failed (${response.status})`);
    }
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    return { buffer, contentType };
  };

  const downloadMediaResource = async (url) => {
    if (!url) {
      throw new Error('Media source missing.');
    }
    const preferExtension = isCrossOriginUrl(url);
    const tryExtension = async () => {
      if (!runtimeAdapter?.api?.sendMessage) {
        throw new Error('Extension fetch bridge unavailable.');
      }
      return fetchGifBufferViaExtension(url);
    };

    if (preferExtension) {
      try {
        return await tryExtension();
      } catch (extensionError) {
        try {
          return await fetchGifBufferDirect(url);
        } catch (directError) {
          const message = extensionError?.message || directError?.message || 'Unable to fetch GIF data.';
          const composite = new Error(message);
          composite.originalError = directError;
          composite.secondaryError = extensionError;
          throw composite;
        }
      }
    }

    try {
      return await fetchGifBufferDirect(url);
    } catch (directError) {
      if (!runtimeAdapter?.api?.sendMessage) {
        throw directError;
      }
      try {
        return await tryExtension();
      } catch (extensionError) {
        const message = extensionError?.message || directError?.message || 'Unable to fetch GIF data.';
        const composite = new Error(message);
        composite.originalError = directError;
        composite.secondaryError = extensionError;
        throw composite;
      }
    }
  };

  const fetchGifFrames = async (img) => {
    const src = getGifSourceUrl(img);
    if (!src) {
      throw new Error('GIF source missing.');
    }
    if (state.frameCache.has(src)) {
      return state.frameCache.get(src);
    }
    const pending = (async () => {
      const { buffer } = await downloadMediaResource(src);
      return decodeBufferWithImageDecoder(buffer);
    })();
    state.frameCache.set(src, pending);
    try {
      const result = await pending;
      return result;
    } catch (error) {
      state.frameCache.delete(src);
      throw error;
    }
  };

  const decodeVideoBuffer = async (srcUrl, resource) => {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      throw new Error('Video decoding is not supported in this browser.');
    }
    const mimeType = guessVideoMimeType(srcUrl, resource?.contentType);
    const blob = new Blob([resource.buffer], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.src = objectUrl;

    const waitForEvent = (eventName) => new Promise((resolve, reject) => {
      const cleanup = () => {
        video.removeEventListener(eventName, onSuccess);
        video.removeEventListener('error', onError);
      };
      const onSuccess = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Unable to load video for frame extraction.'));
      };
      video.addEventListener(eventName, onSuccess, { once: true });
      video.addEventListener('error', onError, { once: true });
    });

    try {
      await waitForEvent('loadeddata');
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      if (!width || !height || !duration) {
        throw new Error('Video metadata unavailable.');
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Unable to prepare drawing surface.');
      }
      const frames = [];
      const maxSamples = Math.max(1, Math.min(MAX_DECODE_FRAMES, Math.ceil(duration * VIDEO_SAMPLING_FPS)));
      const step = Math.max(duration / maxSamples, MIN_VIDEO_STEP);
      const seekTo = (time) => new Promise((resolve, reject) => {
        const target = Math.min(Math.max(time, 0), Math.max(duration - 0.0005, 0));
        const onSeeked = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error('Video seek failed.'));
        };
        const cleanup = () => {
          video.removeEventListener('seeked', onSeeked);
          video.removeEventListener('error', onError);
        };
        video.addEventListener('seeked', onSeeked);
        video.addEventListener('error', onError);
        if (Math.abs(video.currentTime - target) < 0.0005) {
          onSeeked();
        } else {
          video.currentTime = target;
        }
      });

      let currentTime = 0;
      while (frames.length < maxSamples && currentTime <= duration && frames.length < MAX_DECODE_FRAMES) {
        await seekTo(currentTime);
        ctx.drawImage(video, 0, 0, width, height);
        frames.push({ index: frames.length, src: canvas.toDataURL('image/png'), width, height });
        currentTime += step;
      }

      const estimatedTotal = Math.ceil(duration / step);
      const truncated = frames.length < estimatedTotal;
      return { frames, total: estimatedTotal, truncated };
    } finally {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
    }
  };

  const fetchVideoFrames = async (videoEl) => {
    const src = getVideoSourceUrl(videoEl);
    if (!src) {
      throw new Error('Video source missing.');
    }
    if (state.frameCache.has(src)) {
      return state.frameCache.get(src);
    }
    const pending = (async () => {
      const resource = await downloadMediaResource(src);
      return decodeVideoBuffer(src, resource);
    })();
    state.frameCache.set(src, pending);
    try {
      return await pending;
    } catch (error) {
      state.frameCache.delete(src);
      throw error;
    }
  };

  const openMenuForTarget = (node) => {
    const kind = getMediaKind(node);
    if (!node || !kind) {
      return;
    }
    const menu = ensureMenu();
    state.menuTarget = node;
    state.menuTargetKind = kind;
    state.menuRequestToken += 1;
    const requestId = state.menuRequestToken;
    menu.style.display = 'flex';
    hideHoverButton();
    if (state.menuPreview) {
      state.menuPreview.dataset.visible = '0';
      state.menuPreviewImage.removeAttribute('src');
      state.menuPreviewLabel.textContent = '';
    }
    if (state.menuMessage) {
      state.menuMessage.textContent = 'Loading...';
    }
    if (state.menuGrid) {
      state.menuGrid.textContent = '';
    }
    scheduleUiSync();

    const fetchPromise = kind === 'gif' ? fetchGifFrames(node) : fetchVideoFrames(node);
    fetchPromise
      .then((payload) => {
        if (state.menuRequestToken !== requestId) {
          return;
        }
        if (!payload.frames.length) {
          if (state.menuMessage) {
            state.menuMessage.textContent = 'No frames detected in this media.';
          }
          return;
        }
        state.menuFrames = payload.frames;
        state.menuTotalFrames = payload.total || payload.frames.length;
        state.renderedFrameCount = Math.min(payload.frames.length, INITIAL_RENDER_FRAMES);
        renderFrames();
        updateStatusMessage();
        scheduleUiSync();
      })
      .catch((error) => {
        if (state.menuRequestToken !== requestId) {
          return;
        }
        if (state.menuMessage) {
          state.menuMessage.textContent = error?.message || 'Unable to load frames.';
        }
      })
      .finally(() => {
        if (state.menuRequestToken === requestId) {
          scheduleUiSync();
        }
      });
  };

  const shouldIgnoreLeave = (relatedTarget) => {
    if (!relatedTarget) {
      return false;
    }
    if (state.hoverButton && (relatedTarget === state.hoverButton || state.hoverButton.contains(relatedTarget))) {
      return true;
    }
    if (state.hoveredMedia && relatedTarget === state.hoveredMedia) {
      return true;
    }
    return false;
  };

  const onPointerEnterCapture = (event) => {
    if (!state.active) {
      return;
    }
    const target = event.target;
    const kind = getMediaKind(target);
    if (!kind || isExcludedMediaTarget(target)) {
      return;
    }
    showHoverButton(target, event);
  };

  const onPointerLeaveCapture = (event) => {
    const target = event.target;
    if (target === state.hoveredMedia || target === state.hoverButton) {
      if (shouldIgnoreLeave(event.relatedTarget)) {
        return;
      }
      hideHoverButton();
    }
  };

  const onPointerMoveCapture = (event) => {
    updatePointerPosition(event);
    if (state.hoveredMedia && !isPointerIntersectingHoveredMedia()) {
      hideHoverButton();
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  };

  const attachListeners = () => {
    if (state.listenersAttached) {
      return;
    }
    state.listenersAttached = true;
    document.addEventListener('pointerenter', onPointerEnterCapture, true);
    document.addEventListener('pointerleave', onPointerLeaveCapture, true);
    document.addEventListener('pointermove', onPointerMoveCapture, true);
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange, true);
    document.addEventListener('keydown', onKeyDown, true);
  };

  const detachListeners = () => {
    if (!state.listenersAttached) {
      return;
    }
    state.listenersAttached = false;
    document.removeEventListener('pointerenter', onPointerEnterCapture, true);
    document.removeEventListener('pointerleave', onPointerLeaveCapture, true);
    document.removeEventListener('pointermove', onPointerMoveCapture, true);
    window.removeEventListener('scroll', onViewportChange, true);
    window.removeEventListener('resize', onViewportChange, true);
    document.removeEventListener('keydown', onKeyDown, true);
  };

  const setActive = (enabled) => {
    if (state.active === enabled) {
      return;
    }
    state.active = enabled;
    if (enabled) {
      ensureStyles();
      attachListeners();
    } else {
      detachListeners();
      hideHoverButton();
      closeMenu();
    }
  };

  const applySettings = (settings) => {
    const enabled = Boolean(settings && settings.gifViewer);
    setActive(enabled);
  };

  document.addEventListener('fjTweakerSettingsChanged', (event) => {
    applySettings(event?.detail || {});
  });

  applySettings(window.fjTweakerSettings || {});
})();
