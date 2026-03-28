(function() {
    console.log('[FJFE-Student][rclick:gate] script loaded on', window.location.href);

    /*
     * Lightweight gate that keeps the right-click addon disabled unless
     * the user is both authorized and has the setting enabled.
     */
    if (!/^(?:www\.)?funnyjunk\.com$/i.test(window.location.hostname) && !/\.funnyjunk\.com$/i.test(window.location.hostname) && window.location.hostname !== 'funnyjunk.com') {
        console.log('[FJFE-Student][rclick:gate] skipped due to host', window.location.hostname);
        return;
    }

    let authorized = true;
    // Mirrors apichk so the right-click helper never runs for unauthorized accounts
    const computeAuthorized = () => {
        try {
            return !(window.fjApichk && typeof window.fjApichk.isAuthorized === 'function') || window.fjApichk.isAuthorized();
        } catch (_) {
            return true;
        }
    };

    function isEnabled() {
        return Boolean(authorized);
    }

    // Re-run whenever settings or apichk status changes
    function updateState() {
        authorized = computeAuthorized();
        if (isEnabled()) {
            
        } else {
            
        }
    }

    updateState();
    document.addEventListener('fjTweakerSettingsChanged', updateState);
    document.addEventListener('fjApichkStatus', updateState, { passive: true });
})();


(function() {
    console.log('[FJFE-Student][rclick] script loaded on', window.location.href);

    /*
     * Right-click helper. Sends context-menu selections back to the
     * background script so the EDU article that matches the element can
     * open instantly. Works for categories, skin buttons, flag radios, etc.
     */
    if (!/funnyjunk\.com$/i.test(window.location.hostname) && !/\.funnyjunk\.com$/i.test(window.location.hostname) && window.location.hostname !== 'funnyjunk.com') {
        console.log('[FJFE-Student][rclick] skipped due to host', window.location.hostname);
        return;
    }

    // Background pings this before letting us open EDU links
    const isAuthorizedNow = () => {
        try {
            return !(window.fjApichk && typeof window.fjApichk.isAuthorized === 'function') || window.fjApichk.isAuthorized();
        } catch (_) {
            return true;
        }
    };

    const RATING_GUIDE_URL = 'https://edu.fjme.me/books/rating-guide-30/page/skin-rating';
    const PC_GUIDE_URL = 'https://edu.fjme.me/books/rating-guide-30/page/pc-rating-%28political-correctness%29';
    const CATEGORY_GUIDE_URL = 'https://edu.fjme.me/books/rating-guide-30/page/category-and-no-index';
    const NOINDEX_IMAGE_URL = 'https://edu.fjme.me/uploads/images/gallery/2024-03/scaled-1680-/image-1709692061587.png';
    const FLAG_GUIDE_URL = 'https://edu.fjme.me/books/flagging-guide';
    const FLAGMOD_IMAGE_URL = 'https://edu.fjme.me/uploads/images/gallery/2024-06/yes.png';
    const MODS_DIRECTORY_URL = 'https://funnyjunk.com/mods/directory';
    const RATING_GUIDE_MAIN_URL = 'https://edu.fjme.me/books/rating-guide-30';
    const FLAG_RADIO_URLS = {
        nsfw: 'https://edu.fjme.me/books/flagging-guide/page/nsfw',
        borderline_nsfw: 'https://edu.fjme.me/books/flagging-guide/page/borderline-nsfw',
        illegal: 'https://edu.fjme.me/books/flagging-guide/page/illegal',
        spam: 'https://edu.fjme.me/books/flagging-guide/page/spam',
        harassment: 'https://edu.fjme.me/books/flagging-guide/page/other-flags-and-flag-accessories#bkmrk-harassment%3A%C2%A0-0',
        loli: 'https://edu.fjme.me/books/flagging-guide/page/other-flags-and-flag-accessories#bkmrk-ban-time-for-%23mod-lo',
        copyrighted_content: 'https://edu.fjme.me/books/flagging-guide/page/other-flags-and-flag-accessories#bkmrk-copyright-issue%3A',
        gore: 'https://edu.fjme.me/books/flagging-guide/page/gore',
    };
    // Static DOM signatures for the controls we support
    const matchers = [
        { id: 'skinTitle', classList: ['skinBox'], text: 'Skin:', url: RATING_GUIDE_URL },
        { id: 'skinLevel1', classList: ['skinB', 'ctButton4'], url: RATING_GUIDE_URL },
        { id: 'skinLevel2', classList: ['skinB', 'ctButton4'], url: RATING_GUIDE_URL },
        { id: 'skinLevel3', classList: ['skinB', 'ctButton4'], url: RATING_GUIDE_URL },
        { id: 'skinTitle', classList: ['skinBox'], text: 'PC:', url: PC_GUIDE_URL },
        { id: 'pcLevel1', classList: ['pcLevel', 'ctButton4'], url: PC_GUIDE_URL },
        { id: 'pcLevel2', classList: ['pcLevel', 'ctButton4'], url: PC_GUIDE_URL },
        { id: 'pcLevel3', classList: ['pcLevel', 'ctButton4'], url: PC_GUIDE_URL },
        { dataId: true, classList: ['ctButton4'], url: CATEGORY_GUIDE_URL },
        { id: 'noIndexEasy', tag: 'DIV', url: NOINDEX_IMAGE_URL },
        { id: 'flagContent', classList: ['nBtns', 'flagCn'], url: FLAG_GUIDE_URL },
        { classList: ['flagModifier'], url: FLAGMOD_IMAGE_URL },
    
    { classList: ['ctBox', 'ctBox2', 'mbt', 'boxed'], tag: 'DIV', text: 'Mods', url: MODS_DIRECTORY_URL },
    
    { classList: ['ctBox', 'ctBox2', 'mbt'], tag: 'DIV', text: 'Mods', url: MODS_DIRECTORY_URL },
    
    { classList: ['adminButtonMenu', 'mbm', 'peaceOut'], tag: 'DIV', url: MODS_DIRECTORY_URL },
        { id: 'skinGuide', classList: ['ctButton4'], tag: 'SPAN', url: RATING_GUIDE_MAIN_URL },
    ];

    const FLAG_MENU_SELECTOR = 'body > div.ui-dialog.ui-corner-all.ui-widget.ui-widget-content.ui-front.ui-dialog-buttons.ui-draggable';

    let lastRightClicked = null;

    // Map DOM nodes (skin buttons, flag radios, etc.) to the matching wiki URL.
    // Given any element in the click chain, decide which guide URL applies
    function matchesTarget(el) {
        if (!(el instanceof Element)) return false;
        if (el.tagName === 'INPUT' && el.type === 'radio' && el.name === 'flag' && FLAG_RADIO_URLS[el.value]) {
            return { url: FLAG_RADIO_URLS[el.value] };
        }
        try {
            const onclickAttr = el.getAttribute && el.getAttribute('onclick');
            if (onclickAttr && /flagContent\s*\(/.test(onclickAttr)) {
                return { url: FLAG_GUIDE_URL };
            }
            const text = el.textContent && el.textContent.trim();
            if ((el.tagName === 'DIV' || el.tagName === 'A' || el.tagName === 'SPAN' || el.tagName === 'BUTTON') && text === 'Flag Content') {
                return { url: FLAG_GUIDE_URL };
            }
        } catch (_) {  }
        try {
            const isFlagModifier = el.classList && el.classList.contains('flagModifier');
            const isWrapperForFlagModifier = (
                el instanceof Element &&
                (
                    (el.classList && (el.classList.contains('fMf') || el.classList.contains('fMf1'))) ||
                    el.tagName === 'LABEL' || el.tagName === 'DIV'
                ) &&
                typeof el.querySelector === 'function' &&
                !!el.querySelector('input.flagModifier')
            );
            if (isFlagModifier || isWrapperForFlagModifier) {
                return { url: FLAGMOD_IMAGE_URL };
            }
        } catch (_) {  }
        for (const matcher of matchers) {
            if (matcher.tag && el.tagName !== matcher.tag) continue;
            if (matcher.id && el.id !== matcher.id) continue;
            if (matcher.dataId && !el.hasAttribute('data-id')) continue;
            if (matcher.classList) {
                let ok = matcher.classList.every(cls => el.classList.contains(cls));
                if (!ok) continue;
            }
            if (matcher.text && el.textContent.trim() !== matcher.text) continue;
            return matcher;
        }
        return false;
    }

    function isInFlagMenu(el) {
        if (!(el instanceof Element)) return false;
        let menu = el.closest(FLAG_MENU_SELECTOR);
        return !!menu;
    }

    // Track the last right-clicked element so the background page can react later
    document.addEventListener('contextmenu', (e) => {
        if (!isAuthorizedNow()) { lastRightClicked = null; return; }
        lastRightClicked = null;
        let el = e.target;
        while (el && el !== document.body) {
            const match = matchesTarget(el);
            if (match) {
                lastRightClicked = { url: match.url };
                return;
            }
            el = el.parentElement;
        }
        el = e.target;
        while (el && el !== document.body) {
            if (isInFlagMenu(el)) {
                lastRightClicked = { url: FLAG_GUIDE_URL };
                return;
            }
            el = el.parentElement;
        }
    }, true);

    // Background script requests the stored URL when the custom menu item fires
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg && msg.type === 'fjfe-context-info') {
            if (!isAuthorizedNow()) {
                sendResponse({ handled: false, authorized: false });
                return true;
            }
            if (lastRightClicked && lastRightClicked.url) {
                window.open(lastRightClicked.url, '_blank');
                sendResponse({ handled: true, authorized: true });
                return true;
            }
            sendResponse({ handled: false, authorized: true });
        }
    });
})();
