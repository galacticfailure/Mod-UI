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

  ensureAddonContentScripts().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  ensureAddonContentScripts().catch(() => {});
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

const ADDON_REGISTRY_KEY = 'fjfe_addon_registry_v1';
const ADDON_SCRIPT_ID_PREFIX = 'fjfe-addon-';
const ADDON_MATCHES = ['https://funnyjunk.com/*'];
const KNOWN_ADDON_FOLDERS = Object.freeze(['clicker', 'farm']);
const MODULE_SCRIPT_ALLOWLIST = Object.freeze({
  runtimeFlags: ['content/runtime-flags.js'],
  parityHarness: ['content/parity-harness.js'],
  assistCommon: ['content/assist-common.js'],
  apichk: ['content/apichk.js'],
  bs: ['content/bs.js'],
  info: ['content/info.js'],
  sel: ['content/sel.js'],
  slick: ['content/slick.js'],
  modjs: ['content/modjs.js'],
  framegif: ['content/framegif.js'],
  ratetrack: ['content/ratetrack.js'],
  radar: ['content/radar.js'],
  hunt: ['content/hunt.js'],
  batchassist: ['content/batchassist.js'],
  reviewAssist: ['content/revassist.js'],
  sccustom: ['content/sccustom.js'],
  userpop: ['content/userpop.js'],
  nextMove: ['content/nextmove.js'],
  workingPrev: ['content/prev.js'],
  rclick: ['content/rclick.js'],
  textcheck: ['content/textcheck.js'],
  flagchk: ['content/flagchk.js'],
  walcorn: ['content/walcorn.js'],
  warn: ['content/warn.js'],
  ufjpMobicon: ['content/ufjp/mobicon.js'],
  ufjpNukeRef: ['content/ufjp/nukeref.js'],
  disableButtons: ['content/buttondis.js'],
  funnyjunkModifier: ['content/funnyjunkModifier.js']
});

const logParity = (eventName, detail) => {
  try {
    console.info('[FJFE SW]', {
      ts: Date.now(),
      event: eventName,
      detail: detail || {}
    });
  } catch (_) {}
};

const normalizeModuleKeys = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(new Set(
    value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
  ));
};

const resolveScriptsForModules = (moduleKeys) => {
  const files = [];
  const unknown = [];
  normalizeModuleKeys(moduleKeys).forEach((key) => {
    const mapped = MODULE_SCRIPT_ALLOWLIST[key];
    if (!mapped || !mapped.length) {
      unknown.push(key);
      return;
    }
    mapped.forEach((file) => {
      if (!files.includes(file)) {
        files.push(file);
      }
    });
  });
  return { files, unknown };
};

const injectModuleScriptsForSender = async (sender, moduleKeys) => {
  const tabId = sender?.tab?.id;
  if (!Number.isInteger(tabId)) {
    return { ok: false, error: 'Missing sender tab id.', injected: [], unknown: [] };
  }
  const frameId = Number.isInteger(sender?.frameId) ? sender.frameId : 0;
  const { files, unknown } = resolveScriptsForModules(moduleKeys);
  if (!files.length) {
    return { ok: true, injected: [], unknown };
  }

  await chrome.scripting.executeScript({
    target: {
      tabId,
      frameIds: [frameId]
    },
    files
  });
  return { ok: true, injected: files, unknown };
};

const getPackageRootEntry = () => new Promise((resolve, reject) => {
  try {
    chrome.runtime.getPackageDirectoryEntry((entry) => {
      if (entry) {
        resolve(entry);
        return;
      }
      reject(new Error('Package directory entry is unavailable.'));
    });
  } catch (error) {
    reject(error);
  }
});

const getDirectoryEntry = (parent, name) => new Promise((resolve, reject) => {
  parent.getDirectory(name, {}, resolve, reject);
});

const getFileEntry = (parent, name) => new Promise((resolve, reject) => {
  parent.getFile(name, {}, resolve, reject);
});

const readAllEntries = async (dirEntry) => {
  const reader = dirEntry.createReader();
  const out = [];
  while (true) {
    const chunk = await new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (!chunk.length) {
      break;
    }
    out.push(...chunk);
  }
  return out;
};

const readTextFile = async (fileEntry) => {
  const file = await new Promise((resolve, reject) => {
    fileEntry.file(resolve, reject);
  });

  if (file && typeof file.text === 'function') {
    return await file.text();
  }

  return await new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      reject(new Error('No file text reader available.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsText(file);
  });
};

const normalizeAddonId = (name) => String(name || 'addon')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9_-]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'addon';

const normalizeScriptPath = (addonName, scriptPath) => {
  if (typeof scriptPath !== 'string') {
    return null;
  }
  const trimmed = scriptPath.trim();
  if (!trimmed || trimmed.includes('..')) {
    return null;
  }
  const normalized = trimmed.replace(/\\/g, '/');
  if (normalized.startsWith('addons/')) {
    return normalized;
  }
  if (normalized.startsWith('content/')) {
    return `addons/${addonName}/${normalized}`;
  }
  return `addons/${addonName}/content/${normalized}`;
};

const normalizeAddonSetting = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const settingName = typeof value.settingName === 'string' ? value.settingName.trim() : '';
  if (!settingName) {
    return null;
  }
  return {
    settingName,
    settingLabel: typeof value.settingLabel === 'string' ? value.settingLabel : '',
    defaultSwitchState: value.defaultSwitchState === true,
    infoText: typeof value.infoText === 'string' ? value.infoText : '',
    category: typeof value.category === 'string' ? value.category : 'Games',
    section: typeof value.section === 'string' ? value.section : 'Extras'
  };
};

const loadAddonJson = async (addonDirEntry) => {
  try {
    const fileEntry = await getFileEntry(addonDirEntry, 'addon.json');
    const text = await readTextFile(fileEntry);
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
};

const loadAddonJsonByFetch = async (addonName) => {
  try {
    const url = chrome.runtime.getURL(`addons/${addonName}/addon.json`);
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (_) {
    return null;
  }
};

const getDefaultAddonScripts = async (addonDirEntry, addonName) => {
  let contentDir;
  try {
    contentDir = await getDirectoryEntry(addonDirEntry, 'content');
  } catch (_) {
    return [];
  }
  const entries = await readAllEntries(contentDir);
  return entries
    .filter((entry) => entry.isFile && /\.js$/i.test(entry.name))
    .map((entry) => `addons/${addonName}/content/${entry.name}`)
    .sort((a, b) => a.localeCompare(b));
};

const discoverAddons = async (previousRegistry = []) => {
  const discoveredByName = new Map();

  try {
    const packageRoot = await getPackageRootEntry();
    let addonsRoot;
    try {
      addonsRoot = await getDirectoryEntry(packageRoot, 'addons');
    } catch (_) {
      addonsRoot = null;
    }

    if (addonsRoot) {
      const addonEntries = (await readAllEntries(addonsRoot))
        .filter((entry) => entry.isDirectory)
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const dirEntry of addonEntries) {
        const addonName = dirEntry.name;
        const addonJson = await loadAddonJson(dirEntry);
        const rawScripts = Array.isArray(addonJson?.scripts)
          ? addonJson.scripts
          : await getDefaultAddonScripts(dirEntry, addonName);

        const scripts = rawScripts
          .map((raw) => normalizeScriptPath(addonName, raw))
          .filter((item) => typeof item === 'string' && item.endsWith('.js'));

        if (!scripts.length) {
          continue;
        }

        const id = normalizeAddonId(addonJson?.id || addonName);
        discoveredByName.set(addonName, {
          id,
          name: addonJson?.name || addonName,
          folder: addonName,
          access: addonJson?.access || 'independent',
          moduleKey: typeof addonJson?.moduleKey === 'string' ? addonJson.moduleKey : null,
          setting: normalizeAddonSetting(addonJson?.setting),
          scripts,
          enabled: addonJson?.enabled !== false
        });
      }
    }
  } catch (_) {
  }

  const previousFolders = Array.from(new Set([
    ...KNOWN_ADDON_FOLDERS,
    ...(Array.isArray(previousRegistry) ? previousRegistry : [])
      .map((entry) => typeof entry?.folder === 'string' ? entry.folder.trim() : '')
      .filter(Boolean)
  ]));

  for (const addonName of previousFolders) {
    if (discoveredByName.has(addonName)) {
      continue;
    }
    const addonJson = await loadAddonJsonByFetch(addonName);
    if (!addonJson) {
      continue;
    }

    const rawScripts = Array.isArray(addonJson?.scripts) ? addonJson.scripts : [];
    const scripts = rawScripts
      .map((raw) => normalizeScriptPath(addonName, raw))
      .filter((item) => typeof item === 'string' && item.endsWith('.js'));

    if (!scripts.length) {
      continue;
    }

    const id = normalizeAddonId(addonJson?.id || addonName);
    discoveredByName.set(addonName, {
      id,
      name: addonJson?.name || addonName,
      folder: addonName,
      access: addonJson?.access || 'independent',
      moduleKey: typeof addonJson?.moduleKey === 'string' ? addonJson.moduleKey : null,
      setting: normalizeAddonSetting(addonJson?.setting),
      scripts,
      enabled: addonJson?.enabled !== false
    });
  }

  return Array.from(discoveredByName.values());
};

const storeAddonRegistry = async (addons) => {
  await chrome.storage.local.set({ [ADDON_REGISTRY_KEY]: addons });
};

const getStoredAddonRegistry = async () => {
  const stored = await chrome.storage.local.get(ADDON_REGISTRY_KEY);
  const addons = stored && Array.isArray(stored[ADDON_REGISTRY_KEY])
    ? stored[ADDON_REGISTRY_KEY]
    : [];
  return addons;
};

const ensureAddonContentScripts = async () => {
  let discovered = [];
  let previousRegistry = [];
  try {
    previousRegistry = await getStoredAddonRegistry();
  } catch (_) {
    previousRegistry = [];
  }

  try {
    discovered = await discoverAddons(previousRegistry);
  } catch (error) {
    try { console.warn('[FJFE] Addon discovery failed.', error); } catch (_) {}
  }

  await storeAddonRegistry(discovered);

  const existing = await chrome.scripting.getRegisteredContentScripts();
  const addonIds = existing
    .filter((script) => typeof script.id === 'string' && script.id.startsWith(ADDON_SCRIPT_ID_PREFIX))
    .map((script) => script.id);

  if (addonIds.length) {
    await chrome.scripting.unregisterContentScripts({ ids: addonIds });
  }

  const toRegister = discovered
    .filter((addon) => addon.enabled)
    .map((addon) => ({
      id: `${ADDON_SCRIPT_ID_PREFIX}${addon.id}`,
      matches: ADDON_MATCHES,
      js: addon.scripts,
      runAt: 'document_idle',
      allFrames: false,
      persistAcrossSessions: true
    }));

  if (toRegister.length) {
    await chrome.scripting.registerContentScripts(toRegister);
  }

  return discovered;
};

ensureAddonContentScripts().catch(() => {});

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
  if (message && message.type === 'fjfe-load-modules') {
    injectModuleScriptsForSender(sender, message.moduleKeys)
      .then((result) => {
        logParity('load-modules', {
          senderTab: sender?.tab?.id,
          frameId: sender?.frameId,
          requested: normalizeModuleKeys(message.moduleKeys),
          injected: result?.injected || [],
          unknown: result?.unknown || [],
          ok: result?.ok === true
        });
        sendResponse(result);
      })
      .catch((error) => {
        logParity('load-modules-error', {
          senderTab: sender?.tab?.id,
          frameId: sender?.frameId,
          message: error?.message || 'Injection failed.'
        });
        sendResponse({ ok: false, error: error?.message || 'Injection failed.', injected: [], unknown: [] });
      });
    return true;
  }

  if (message && message.type === 'fjfe-get-addons') {
    getStoredAddonRegistry()
      .then(async (addons) => {
        if (addons.length) {
          sendResponse({ ok: true, addons });
          return;
        }
        try {
          const refreshed = await ensureAddonContentScripts();
          sendResponse({ ok: true, addons: refreshed });
        } catch (_) {
          sendResponse({ ok: true, addons: [] });
        }
      })
      .catch(() => sendResponse({ ok: true, addons: [] }));
    return true;
  }

  if (!message || message.type !== 'fjfe-framegif-fetch') {
    return undefined;
  }
  const { url } = message;
  fetchGifBuffer(url)
    .then(({ buffer, contentType }) => {
      if (message.binaryBridge === false) {
        const bytes = Array.from(new Uint8Array(buffer));
        sendResponse({ ok: true, buffer: bytes, contentType });
        return;
      }
      sendResponse({ ok: true, buffer, contentType });
    })
    .catch((error) => {
      sendResponse({ ok: false, error: error?.message || 'Fetch failed.' });
    });
  return true;
});
