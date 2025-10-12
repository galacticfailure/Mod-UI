(() => {
  const STYLE_ID = 'fj-info-popup-style';
  const DIALOG_ID = 'fj-info-popup';
  const DEFAULT_TEXT = 'PLACEHOLDER: default popup';

  const resolveIconUrl = () => {
    try {
      if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
        return chrome.runtime.getURL('icons/fjinfo.png');
      }
    } catch (error) {
    }
    return '';
  };

  const ICON_URL = resolveIconUrl();

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .fj-info-button {
        position: relative;
        min-width: 44px;
        min-height: 44px;
        width: 44px;
        height: 44px;
        padding: 0;
        border: none;
        border-radius: 4px;
        background-color: transparent;
        background-position: center;
        background-repeat: no-repeat;
        background-size: 16px 16px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        touch-action: manipulation;
      }

      .fj-info-button:focus {
        outline: 1px solid #9ac7ff;
        outline-offset: 1px;
      }

      #${DIALOG_ID} {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647;
      }

      #${DIALOG_ID} .fj-info-panel {
        width: min(360px, 92vw);
        max-height: min(80vh, 420px);
        padding: 18px 20px 16px;
        background: #151515;
        border: 1px solid #3a3a3a;
        border-radius: 6px;
        box-shadow: 0 18px 32px rgba(0, 0, 0, 0.55);
        display: flex;
        flex-direction: column;
        gap: 14px;
        color: #f5f5f5;
        font: 500 14px 'Segoe UI', sans-serif;
      }

      #${DIALOG_ID} .fj-info-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      #${DIALOG_ID} .fj-info-body {
        margin: 0;
        font-size: 13px;
        line-height: 1.45;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      #${DIALOG_ID} .fj-info-actions {
        display: flex;
        justify-content: flex-end;
      }

      #${DIALOG_ID} .fj-info-close {
        padding: 8px 16px;
        min-height: 44px;
        font: 500 13px 'Segoe UI', sans-serif;
        color: #f8f8f8;
        background: #2a2a2a;
        border: 1px solid #3d3d3d;
        border-radius: 4px;
        cursor: pointer;
        touch-action: manipulation;
      }

      #${DIALOG_ID} .fj-info-close:hover {
        background: #353535;
      }
    `;

    document.head?.append(style);
  };

  const applyIcon = (button, size) => {

    const minTouchSize = 44;
    const requestedSize = Number.isFinite(size) ? size : 20;
    const finalSize = Math.max(requestedSize, minTouchSize);
    const dimension = `${finalSize}px`;
    
    button.style.width = dimension;
    button.style.height = dimension;
    button.style.minWidth = dimension;
    button.style.minHeight = dimension;

    if (ICON_URL) {
      button.style.backgroundImage = `url('${ICON_URL}')`;
      const targetSize = Math.max(12, Math.min(finalSize - 4, finalSize));
      button.style.backgroundSize = `${targetSize}px ${targetSize}px`;
    } else {
      button.textContent = 'i';
      Object.assign(button.style, {
        font: "600 12px 'Segoe UI', sans-serif",
        color: '#f8f8f8',
        background: 'rgba(40, 40, 40, 0.85)',
        borderRadius: '50%'
      });
    }
  };

  const closeDialog = () => {
    const existing = document.getElementById(DIALOG_ID);
    if (!existing) {
      return;
    }
    existing.remove();
  };

  const openDialog = (title, message, imagePath) => {
    closeDialog();

    const overlay = document.createElement('div');
    overlay.id = DIALOG_ID;

    const panel = document.createElement('div');
    panel.className = 'fj-info-panel';

    const heading = document.createElement('h2');
    heading.className = 'fj-info-title';
    heading.textContent = title || 'Details';

    const body = document.createElement('p');
    body.className = 'fj-info-body';
    body.textContent = message || DEFAULT_TEXT;

    let imgEl = null;
    if (imagePath) {
      imgEl = document.createElement('img');
      imgEl.src = imagePath;
      imgEl.style.width = '75px';
      imgEl.style.display = 'block';
      imgEl.style.marginBottom = '8px';
    }

    const actions = document.createElement('div');
    actions.className = 'fj-info-actions';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'fj-info-close';
    closeButton.textContent = 'Close';

    const handleClose = (event) => {
      event?.stopPropagation?.();
      closeDialog();
    };

    closeButton.addEventListener('click', handleClose);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeDialog();
      }
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeDialog();
      }
    };

    document.addEventListener('keydown', handleKeyDown, { once: true });

    actions.append(closeButton);
    if (imgEl) panel.append(heading, imgEl, body, actions);
    else panel.append(heading, body, actions);
    overlay.append(panel);
    document.body.append(overlay);
    closeButton.focus({ preventScroll: true });
  };

  const createInfoButton = ({ text = DEFAULT_TEXT, title = '', size = 20 } = {}) => {
    ensureStyles();

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fj-info-button';
    button.dataset.fjInfoText = typeof text === 'string' && text.length ? text : DEFAULT_TEXT;
    button.dataset.fjInfoTitle = title || '';

    applyIcon(button, size);

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openDialog(button.dataset.fjInfoTitle || '', button.dataset.fjInfoText || DEFAULT_TEXT, button.dataset.fjInfoImage);
    });

    return button;
  };

  const updateInfoContent = (button, { text, title }) => {
    if (!button) {
      return;
    }
    if (typeof text === 'string') {
      button.dataset.fjInfoText = text.length ? text : DEFAULT_TEXT;
    }
    if (typeof title === 'string') {
      button.dataset.fjInfoTitle = title;
    }
  };

  const updateInfoContentWithImage = (button, { text, title, imagePath } = {}) => {
    updateInfoContent(button, { text, title });
    if (!button) return;
    if (typeof imagePath === 'string' && imagePath.length) {
      button.dataset.fjInfoImage = imagePath;
    } else if (imagePath === null) {
      delete button.dataset.fjInfoImage;
    }
  };

  const api = window.fjTweakerInfo || {};
  api.createInfoButton = createInfoButton;
  api.updateTooltip = (button, nextText, imagePath) => updateInfoContentWithImage(button, { text: nextText, imagePath });
  api.updateInfoContent = updateInfoContentWithImage;
  api.ensureInfoStyles = ensureStyles;

  window.fjTweakerInfo = api;
})();

