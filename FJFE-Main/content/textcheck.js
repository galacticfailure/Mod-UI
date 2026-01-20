(() => {
  const targetHost = 'funnyjunk.com';
  const MODULE_KEY = 'textcheck';

  if (!window.location.hostname.endsWith(targetHost)) {
    return;
  }

  // TextCheck scans titles/descriptions for policy keywords (PC2/meta) and
  // tags the rate box with a floating notice when risky phrases are present.


  const PC_LIST = [
    'nigg', 'kike', 'jew', 'trump', 'zionist', 'israel', 'bondi', 'netanyahu',
    'deport', 'semetic', 'semitism', 'hitler', 'adolf', 'holocaust', 'nazi',
    '(((', ')))', 'jeet', 'globalist', ' adl', 'wef', 'right-wing', 'right wing',
    'left-wing', 'left wing', 'starmer', 'online safety act', 'digital id',
    'mudslime', 'lgbt', ' trans', ' trann', 'homophob', 'racis', 'sexis', 'islam',
    'christian', 'obama', 'epstein', '9/11', 'leftis', 'conservative',
    'nose tribe', 'hebrew', 'of satan', 'rfk', 'church', 'kkk', 'government',
    'shekel', 'genocide', 'gaza', 'fagg', 'democrat', 'republican', 'shitskin'
  ];

  const META_LIST = [
    'admin', 'fj', 'funnyjunk', 'pissname', 'bluename', 'whitename'
  ];

  const getSanitizedContentTitleNode = () => {
    try {
      const heading = document.querySelector('h1.contentTitle');
      if (!heading) {
        return null;
      }
      const clone = heading.cloneNode(true);
      const buttons = clone.querySelectorAll('button');
      buttons.forEach((button) => {
        try { button.remove(); } catch (_) {}
      });
      const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
      const textChunks = [];
      while (walker.nextNode()) {
        const value = walker.currentNode?.textContent?.trim();
        if (value) {
          textChunks.push(value);
        }
      }
      const textOnly = textChunks.join(' ').trim();
      if (!textOnly) {
        return null;
      }
      const wrapper = document.createElement('span');
      wrapper.textContent = textOnly;
      return wrapper;
    } catch (_) {
      return null;
    }
  };

  let isEnabled = false;
  let observer = null;

  document.addEventListener('fjTweakerSettingsChanged', (event) => {
    const settings = event.detail;
    if (settings.checkText) {
      enableTextCheck();
    } else {
      disableTextCheck();
    }
  });

  const enableTextCheck = () => {
    if (isEnabled) return;
    isEnabled = true;
    console.log('TextCheck: Enabled - Auto-checking content for PC2 or Meta');
    
    startObserver();
    scanExistingContent();
  };

  const disableTextCheck = () => {
    if (!isEnabled) return;
    isEnabled = false;
    console.log('TextCheck: Disabled');
    
    stopObserver();
    removeAllLabels();
  };

  const startObserver = () => {
    if (observer) return;
    
    observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.querySelector?.('h1.contentTitle, .innerContentDescription') ||
                node.matches?.('h1.contentTitle, .innerContentDescription')) {
              shouldScan = true;
            }
          }
        });
      });
      
      if (shouldScan) {
        setTimeout(scanExistingContent, 100);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };

  const stopObserver = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };


  const scanExistingContent = () => {
    if (!isEnabled) return;
    removeAllLabels();

    let allFoundWords = [];
    let allMatches = [];

    const addUnique = (arr, items) => {
      items.forEach(item => {
        if (!arr.includes(item)) arr.push(item);
      });
    };

    const contentTitle = getSanitizedContentTitleNode();
    if (contentTitle) {
      const { matches, foundWords } = scanElement(contentTitle);
      addUnique(allMatches, matches);
      addUnique(allFoundWords, foundWords);
    }

    const descriptions = document.querySelectorAll('.innerContentDescription');
    descriptions.forEach((desc) => {
      const { matches, foundWords } = scanElement(desc);
      addUnique(allMatches, matches);
      addUnique(allFoundWords, foundWords);
    });

    if (allMatches.length > 0 || allFoundWords.length > 0) {
      addLabels(allMatches, allFoundWords, 'all');
    }
  };

  
  const scanElement = (element) => {
    const text = element.textContent.toLowerCase();
    const matches = [];
    const foundWords = [];

    PC_LIST.forEach(word => {
      if (text.includes(word.toLowerCase())) {
        if (!matches.includes('PC2')) {
          matches.push('PC2');
        }
        const regex = new RegExp(`\\b\\w*${word.toLowerCase()}\\w*\\b`, 'gi');
        const originalMatches = element.textContent.match(regex);
        if (originalMatches) {
          originalMatches.forEach(match => {
            const cleanedMatch = (match || '').trim();
            if (cleanedMatch && !foundWords.includes(cleanedMatch)) {
              foundWords.push(cleanedMatch);
            }
          });
        }
      }
    });

    META_LIST.forEach(word => {
      if (text.includes(word.toLowerCase())) {
        if (!matches.includes('Meta')) {
          matches.push('Meta');
        }
        const regex = new RegExp(`\\b\\w*${word.toLowerCase()}\\w*\\b`, 'gi');
        const originalMatches = element.textContent.match(regex);
        if (originalMatches) {
          originalMatches.forEach(match => {
            const cleanedMatch = (match || '').trim();
            if (cleanedMatch && !foundWords.includes(cleanedMatch)) {
              foundWords.push(cleanedMatch);
            }
          });
        }
      }
    });

    return { matches, foundWords };
  };

  const addLabels = (matches, foundWords, identifier) => {
    const rateBoxButtons = document.getElementById('rateBoxButtons');
    const modRa = document.getElementById('modRa');
    if (!rateBoxButtons || !modRa) return;
    // Each identifier gets its own positioned label so multiple watchers do not conflict.

    let labelContainer = document.getElementById(`textcheck-labels-${identifier}`);
    if (!labelContainer) {
      labelContainer = document.createElement('div');
      labelContainer.id = `textcheck-labels-${identifier}`;
      labelContainer.style.cssText = `
        position: absolute;
        margin-left: 10px;
        font-size: 14px;
        font-weight: bold;
        color: #ff4444;
        line-height: 1.2;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        z-index: 1000;
      `;
      document.body.appendChild(labelContainer);
    }
    

    labelContainer.innerHTML = '';
    

    if (foundWords.length > 0) {
      const line1 = document.createElement('div');
      const wordList = foundWords.map(word => `'${word}'`).join(', ');
      line1.textContent = `Contains: ${wordList}`;
      line1.style.cssText = `
        font-size: 12px;
        font-weight: normal;
        margin-bottom: 2px;
      `;
      labelContainer.appendChild(line1);
    }
    

    const line2 = document.createElement('div');
    line2.textContent = `Possible: ${matches.join('/')}`;
    line2.style.cssText = `
      font-size: 12px;
      font-weight: normal;
    `;
    labelContainer.appendChild(line2);
    

    const updatePositionAndVisibility = () => {
      const modRaElement = document.getElementById('modRa');
      const rateBox = document.getElementById('rateBoxButtons');
      
      if (!modRaElement || !rateBox) {
        labelContainer.style.display = 'none';
        return;
      }
      

      const modRaStyle = window.getComputedStyle(modRaElement);
      const isModRaVisible = modRaStyle.display !== 'none' && 
                            modRaStyle.visibility !== 'hidden' && 
                            modRaStyle.opacity !== '0';
      

      const rateBoxStyle = window.getComputedStyle(rateBox);
      const isRateBoxVisible = rateBoxStyle.display !== 'none' && 
                               rateBoxStyle.visibility !== 'hidden' && 
                               rateBoxStyle.opacity !== '0';
      
      if (!isModRaVisible || !isRateBoxVisible) {
        labelContainer.style.display = 'none';
        return;
      }
      

      labelContainer.style.display = 'flex';
      const rect = rateBox.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      

      const labelHeight = labelContainer.offsetHeight || 40;
      const centerOffset = labelHeight / 2;
      
      
      labelContainer.style.top = (rect.top + scrollTop + (rect.height / 2) - centerOffset) + 'px';
      labelContainer.style.left = (rect.right + scrollLeft + 10) + 'px';
    };
    

    updatePositionAndVisibility();
    

    if (!labelContainer.dataset.hasListeners) {

      window.addEventListener('scroll', updatePositionAndVisibility);
      window.addEventListener('resize', updatePositionAndVisibility);
      

      const rateBoxObserver = new MutationObserver(() => {
        updatePositionAndVisibility();
      });
      

      const modRaElement = document.getElementById('modRa');
      if (modRaElement) {
        rateBoxObserver.observe(modRaElement, {
          attributes: true,
          attributeFilter: ['style', 'class'],
          childList: true,
          subtree: true
        });
      }
      

      const rateBox = document.getElementById('rateBoxButtons');
      if (rateBox) {
        rateBoxObserver.observe(rateBox, {
          attributes: true,
          attributeFilter: ['style', 'class'],
          childList: true,
          subtree: true
        });
      }
      

      labelContainer.rateBoxObserver = rateBoxObserver;
      labelContainer.dataset.hasListeners = 'true';
      

      const visibilityCheckInterval = setInterval(() => {
        if (!document.body.contains(labelContainer)) {
          clearInterval(visibilityCheckInterval);
          rateBoxObserver.disconnect();
          return;
        }
        updatePositionAndVisibility();
      }, 500);
      
      labelContainer.visibilityCheckInterval = visibilityCheckInterval;
    }
  };

  const removeAllLabels = () => {
    const existingLabels = document.querySelectorAll('[id^="textcheck-labels-"]');
    existingLabels.forEach(label => {

      if (label.rateBoxObserver) {
        label.rateBoxObserver.disconnect();
      }
      if (label.visibilityCheckInterval) {
        clearInterval(label.visibilityCheckInterval);
      }
      label.remove();
    });
  };


  const initializeTextCheck = () => {
    if (window.fjTweakerSettings?.checkText) {
      enableTextCheck();
    }
  };


  if (window.fjTweakerSettings) {
    initializeTextCheck();
  } else {

    const settingsInterval = setInterval(() => {
      if (window.fjTweakerSettings) {
        clearInterval(settingsInterval);
        initializeTextCheck();
      }
    }, 100);
  }
})();