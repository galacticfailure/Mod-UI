# FJFE Addon Template Contract

This folder supports drop-in addons without editing main content scripts.

## Required Files

- `addons/<your-addon>/addon.json`
- `addons/<your-addon>/content/*.js`

## Minimal addon.json

```json
{
  "id": "my-addon",
  "name": "My Addon",
  "access": "independent",
  "moduleKey": "myAddon",
  "setting": {
    "settingName": "myAddon",
    "settingLabel": "My Addon",
    "defaultSwitchState": false,
    "infoText": "What this addon does.",
    "category": "Games",
    "section": "Extras"
  },
  "scripts": [
    "myAddon.js"
  ]
}
```

## Runtime Behavior

The main bootstrap now handles addon enable/disable centrally.

When your addon is loaded, the switch in Mod UI will automatically drive one of these hooks if present:

- `setEnabled(enabled, context)` preferred
- `enable(context)` and `disable(context)` fallback

`context` includes:

- `reason` string
- `addon` metadata from `addon.json`

A document event is also dispatched for event-driven addons:

- `fjfeAddonToggle`
- `event.detail = { addonId, moduleKey, settingName, enabled, reason, prevEnabled }`

## Optional Default Animation

If you want built-in show/hide animation, add a `ui` block:

```json
{
  "ui": {
    "rootSelector": "#my-addon-root",
    "durationMs": 180
  }
}
```

When switch state changes, the bootstrap applies a default fade/slide toggle to matching nodes.

## Notes

- Keep your addon self-contained under your addon folder.
- Use `chrome.runtime.getURL(...)` for assets.
- If your addon has no `setting`, it is treated as always enabled.
