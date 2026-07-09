# Hardening Reddit NSFW Lock against impulsive uninstall

## The honest limit

Chrome does **not** give extensions any API to prevent, intercept, or delay their own removal. There is no permission, manifest key, or content-script trick that greys out **Remove** on `chrome://extensions`.

`chrome.management` can enable/disable *other* extensions (with the `management` permission) or call `uninstallSelf()` — nothing runs in the reverse direction. That is intentional: it stops malware from locking itself onto a machine. StayFocusd and similar tools asked Chromium for this years ago; it was never added.

So this extension **does not** pretend to block uninstall. Its real defense is **Module B**: breathing + your own reminder + a ten-minute cooldown that survives closed tabs. That raises the cost of an impulsive unlock. It does not stop a deliberate uninstall.

If you want a *harder* guarantee on a personal device, use Chrome’s enterprise **force-install** policy. That lives outside the extension sandbox.

---

## What actually works: `ExtensionInstallForcelist`

Chrome’s policy `ExtensionInstallForcelist` pins specific extensions so the UI greys out Remove/Disable for those IDs. Setup is deliberate multi-step work — which is the point versus a one-click Remove during an urge.

**Caveat:** On a machine where *you* hold admin rights, you can still reverse the policy later. That still beats an impulsive click. A true accountability setup is someone else holding admin credentials (or a managed browser/profile you don’t fully control).

---

## 1. Find your extension ID

1. Load the extension unpacked (or pack it) in Chrome.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Find **Reddit NSFW Lock** and copy the **ID** (a long lowercase string).

You’ll need that ID below.

---

## 2. Windows (registry)

1. Open Registry Editor (`regedit`) as Administrator.
2. Go to (create keys if missing):

   `HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist`

   For Chromium / some builds, the path may use `Chromium` instead of `Google\Chrome`. Edge uses `Microsoft\Edge` under `Policies`.

3. Create a string value named `1` (then `2`, `3`, … for more extensions).
4. Set its data to:

   ```
   EXTENSION_ID;https://clients2.google.com/service/update2/crx
   ```

   Replace `EXTENSION_ID` with your ID.

   **Note for unpacked extensions:** Force-install is designed for store/update URLs. For a purely local unpacked build, options are:

   - Publish/pack and host a CRX + update manifest, **or**
   - Use a managed machine policy that allows force-install from a self-hosted update URL, **or**
   - Accept that for day-to-day unpacked use, Module B + not leaving Developer mode as a habit is the practical layer, and use force-list once you pack/distribute the CRX.

5. Restart Chrome fully (all windows).
6. Confirm on `chrome://policy` that the policy is applied, and on `chrome://extensions` that Remove is greyed out.

Exact value format for enterprise-hosted CRX:

```
EXTENSION_ID;https://your-server.example/updates.xml
```

---

## 3. macOS (configuration profile)

1. Create or edit a Chrome configuration profile (`.mobileconfig`) that sets:

   - Preference domain: `com.google.Chrome`
   - Key: `ExtensionInstallForcelist`
   - Type: array of strings
   - Value entry: `EXTENSION_ID;https://clients2.google.com/service/update2/crx` (or your update URL)

2. Install the profile (System Settings → Privacy & Security → Profiles, or `profiles install` with admin rights).
3. Restart Chrome and verify on `chrome://policy`.

Example plist fragment:

```xml
<key>ExtensionInstallForcelist</key>
<array>
  <string>YOUR_EXTENSION_ID;https://clients2.google.com/service/update2/crx</string>
</array>
```

---

## 4. Linux

Set Chrome policy JSON, e.g.:

`/etc/opt/chrome/policies/managed/reddit_nsfw_lock.json`

```json
{
  "ExtensionInstallForcelist": [
    "YOUR_EXTENSION_ID;https://clients2.google.com/service/update2/crx"
  ]
}
```

Restart Chrome; check `chrome://policy`.

---

## 5. Practical middle ground (no enterprise policy)

If force-install is more than you want right now:

- Keep the extension **enabled in Incognito** if you use Incognito (extension details → Allow in Incognito). Otherwise Incognito is an easy bypass.
- Don’t leave spare browsers installed “just in case” if that is your usual escape hatch.
- Optional: OS-level site blockers / hosts / DNS for extra distance from Reddit when locked (outside this project).

None of those replace the cooldown; they only shrink common bypass paths.

---

## 6. What we will never ship

- Fake “disable protection” toggles  
- Scripts that claim to block `chrome://extensions`  
- `beforeunload` or other theater that pretends to stop removal  

Those either don’t work or actively mislead the person relying on the tool.

---

## Summary

| Layer | What it does | Strength |
|--------|----------------|----------|
| Module B (wait + reminder) | Makes impulsive unlock costly | Real, built-in |
| Force-install policy | Greys out Remove/Disable for the extension ID | Stronger; OS/admin setup |
| Accountability partner | Holds admin / managed browser | Strongest practical guarantee |

The extension’s job is Module B and honest disclosure. Browser-level pinning is *your* optional setup, documented here — not faked in code.
