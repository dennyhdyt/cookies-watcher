# Pemantau Cookies (Cookie Watcher)

**Language:** **English** | [Bahasa Indonesia](README.id.md)

Version 0.5.0

A Chrome and Edge extension that helps limit account takeover by stolen login cookies. It watches session
cookies and warns you when something changes suspiciously, and it can clear the logins a browser leaves behind
(when a tab closes, when the browser opens, or with an emergency button).

> **Honest limits:** this extension only sees what happens *inside the browser*. It cannot see Windows programs,
> and malware on your computer or a hacked account is outside its reach. Deleting a cookie in your browser does
> **not** end a session on the server. See [Limits](#limits).

## How to install (developer mode)

1. Unzip the file until you have the `pemantau-cookies` folder.
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Turn on **Developer mode** (top right or bottom left).
4. Click **Load unpacked** and choose the `pemantau-cookies` folder.
5. The extension icon appears in the toolbar. Click it to open.

After changing the code, click the refresh button on the extension's card on the extensions page.

## What each file does

| File | Purpose |
|------|---------|
| `manifest.json` | The extension's "ID card": name, requested permissions, files used |
| `background.js` | Background monitor: changing session cookies, look-alike domains, new extensions, login cleanup, closed tabs |
| `popup.html` / `popup.css` | The small window shown when you click the icon, split into 5 tabs: Alerts, Scan, Extensions, Clean, Settings (the red number on the Alerts tab is the alert count) |
| `bahasa.js` | Indonesian and English text dictionary plus language selection. Loaded first by `background.js` and the popup |
| `umum.js` | Shared data and functions (fixed site list, default session cookie names, look-alike domain detection, storage). Loaded by `background.js` and the popup |
| `ekstensi.js` | Rules for checking other extensions' permissions, shared by `background.js` and the popup |
| `popup.js` | Popup logic: alerts, scan, site settings, clean cookies, allowlist |
| `periksa-keamanan.js` | Helper: `node periksa-keamanan.js` checks permissions and forbids network calls, eval, reading cookie values, etc. |
| `buat-rilis.js` | Helper: builds a release zip from the latest commit plus a SHA-256 checksum |
| `SECURITY.md` | Security rules, how to report vulnerabilities, release checklist (in Indonesian) |

## Monitoring status and the icon badge

The top of the **Alerts** tab has a status card so you can confirm the extension is working: when it last saw a
cookie change, how many login cookies were detected, how many sites are cleaned automatically, and whether
notifications are blocked by the browser or operating system. No cookie changes for a few hours is normal; when a
site changes a cookie, the time updates. The toolbar icon also shows a red number equal to the alerts you have
not cleared yet.

## Clean tab: login cookies detected automatically (optional)

The **Clean** tab lists sites you visited that have login cookies, with no typing needed. The site in your
current tab appears at the top. Each site has two buttons:

- **Add:** put the site on the list whose login cookies are deleted automatically every time the browser opens.
  A cookie stolen from an earlier session stops working, but you have to log in to that site again.
- **Delete now:** delete that site's login cookies immediately (for example after you finish a visit).

Only cookies with session-like names (sessionid, xs, etc.) are deleted, including on subdomains. Themes,
language, and other cookies are not touched. Only cookie **names** are read, never their values. A site only shows
up if one of its cookie names is in the built-in login-name list. The **Clean all now** button runs the whole
automatic list immediately. The automatic feature is off while the list is empty.

When automatic cleanup runs: when the browser **opens**, not when it closes (browsers do not give extensions a
reliable "about to close" signal), so cookies stay on disk while the browser is off. There are two triggers: the
browser starts from scratch, or a new window opens after **all windows were closed** (browsers often keep running
in the background after the last window closes, and then "browser start" never happens). Opening an extra window
in the middle of a session deletes nothing. The **Cleanup history** section on the Clean tab records when and why
a cleanup ran, so you can verify it.

If you are still logged in after cleaning: some sites use several login cookies at once, and some names may not
be recognized yet. Such sites cannot be detected yet. A page that is already open (for example a tab restored by
the browser) still looks logged in until you reload it.

## Language

The popup has an **ID | EN** button at the top right. Your choice is saved in the browser and is also used for
notifications. The default is Indonesian. Alerts that were already recorded keep the language they were created in.

Adding a new language: copy one language block in `bahasa.js`, translate it, add its code to `DAFTAR_BAHASA` and
`LOCALE`, and add one button in `popup.html`.

## How detection works today

- **Alerts:** a session cookie on an important site (Facebook, Google, etc.) is created or changed while no tab has that site open.
- **Scan:** session cookies without HttpOnly, without Secure, or with loose SameSite; domains that imitate a monitored site; and domains that "need attention" (public IP addresses or international/punycode domains, shown in a yellow box).
- **Look-alike domains:** a cookie from a domain imitating a monitored site immediately triggers an alert and a notification, once per domain. Recognized patterns: typos or digits replacing letters (`faceb00k.com`, `facebok.com`), bait words (`facebook-login.com`), the name as a subdomain (`facebook.com.evil.net`), the exact name on commonly abused endings (`google.xyz`, `facebook.top`), and homograph attacks: Cyrillic/Greek letters that look like Latin ones, or one name mixing Latin and Cyrillic letters. Homograph domains are shown in punycode (`xn--...`) so they cannot fool you. Ordinary tracking/advertising cookies are deliberately **not** flagged: there are very many and they are usually not theft. Official domains such as `google.co.id` or `googleapis.com` are recognized as safe.
- **Needs attention:** public IP addresses (local network addresses such as 192.168.x.x do not count) and ordinary punycode domains (for example legitimate Chinese or Russian sites) only appear in the scan, **without a notification**, because legitimate sites sometimes look like this too. The **Trust** button adds them to the allowlist.
- **Extensions with cookie permissions:** the popup lists other extensions that can read cookies or see web traffic (high risk if it applies to all sites). You can disable, remove, or mark them trusted (for example your own password manager). A notification also appears when such a new extension is installed or enabled. This uses the `management` permission, which is **optional**: off by default, and only enabled when you press "Enable extension check" in the popup (the browser asks for approval). You can turn it off again with the same button.
- **Sign out of all devices:** session cookie alerts have a button that opens the related site's session/security page (Facebook, Instagram, Google/YouTube, X, LinkedIn, GitHub, and any extra site you give a link for). Page addresses can change if the site changes its settings.
- **Allowlist:** sites you trust do not trigger alerts and do not appear in scan results. Add them with the input field in the popup, or the "Trust this site" button on an alert. Subdomains count (adding `google.com` also covers `accounts.google.com`).

These are heuristics (educated guesses from signs), not proof of a takeover, so false alerts can happen.

## Security

This extension is deliberately built with a small attack surface. Full details are in `SECURITY.md`.

| Permission | Required? | What for |
|---|---|---|
| `cookies` | yes | Read cookie names, domains, and settings (values are not read) |
| `storage` | yes | Store the alert list and settings locally |
| `notifications` | yes | Notify you of suspicious changes |
| access to all sites | yes | Chrome requires it to read cookies for all sites |
| `management` | optional | Check other extensions, only if you turn it on |
| `browsingData` | optional | Delete ALL `localStorage` of sites you protect (without reading it), only if you tick that option |
| `scripting` | optional | Read the NAMES of `localStorage` keys in a tab you choose and delete the keys you tick. Values are not read; it only runs when you press the button |

No network access, no outside code, no message receivers from web pages. This is not an invulnerability
guarantee: malware on your computer or a compromised owner account is still beyond this extension's reach.

Before committing or releasing: run `node periksa-keamanan.js`. For a release: `node buat-rilis.js`.

## Limits

- A browser extension **cannot tell whether a cookie is being used on another device**. Only the site's server can see that, through its "login activity" or "signed-in devices" page. The "Sign out of all devices" button on an alert opens that page.
- The extension check only reads declared permissions, not real behavior. An extension without cookie permissions can still read ordinary cookies through scripts in the page, so this is not full security.
- Personal extensions installed via Load unpacked (like this one) are not checked against themselves.
- Look-alike domain detection is a guess from the shape of the domain name. The lists of excluded official domains and risky endings are only partial; if a legitimate site is flagged, add it to the allowlist. Short brand names (under 5 letters, for example `x.com`) are not checked because they match wrongly too often.
- The extension has no way to know a cookie's parent site, so ordinary third-party cookies (ads, trackers) are not rated. What is rated is whether the domain imitates a site you monitor.

## Important

Deleting cookies in the browser **does not cancel the session on the server**. If you suspect your account was
hijacked: change your password and sign out of all devices on the related site.

## Ideas for later

1. An emergency guide in the popup: an ordered checklist when an alert appears (change password from a clean device, sign out of all devices, check extensions, run an antivirus scan)
2. Export/import of settings (sites, cookie names, allowlist)

## Protect this site (no typing)

On the Clean tab, the **This tab** card reads the site name from the tab you have open. Click **Protect this site**:
- The extension shows the cookie **names** of that site (the contents are never read). Login-like ones (`sessionid`, `token`, `auth`, etc.) are already ticked; trackers such as `_ga` are labeled and left unticked. You can change the choice.
- Choose when the login is deleted: when the tab closes, when the browser opens, or both. There is an option to **delete ALL cookies of the site**.
- An option to **also delete the site's storage (localStorage)** for sites that keep the login there (for example, sites with no visible login cookie). It needs the optional `browsingData` permission, only deletes, only for the address of the tab you protect (other subdomains need to be protected from their own tab), and browsing history is not touched.
- **localStorage can be chosen key by key.** The extension shows the key NAMES in the tab you have open (for example `token`) and you tick which to delete. It needs the optional `scripting` permission, and values are never read. Limit: per-key deletion only works while the site's tab is still open (through Delete now or the emergency button); after the tab closes, the browser does not let extensions touch those keys, so for automatic deletion when the tab closes use the delete ALL storage option.
- All protected sites are in the **Protected sites** list, with an on/off button per site, Delete now, and Remove from list. The emergency button covers these sites too.

Limit: logins a site keeps somewhere other than cookies and `localStorage` (for example `indexedDB`) are out of reach. Matching and deletion are tested automatically in Chromium and were tried manually in Chrome and Edge by the author.

## Emergency button and delete when a tab closes

- **Sign out everything now** (Clean tab): deletes the login cookies of all sites detected in this browser, with a confirmation. It does not sign you out on other devices; for that, change your password and choose "sign out of all devices" on the site.
- **When tab closes:** a button on each detected site. Chosen sites have their login cookies deleted when the last tab of that site is closed (nothing is deleted if another tab of the same site is still open). Only the sites you choose are watched; the extension keeps the site name (not the full address) in session memory, which disappears when the browser closes. No new permission: tab addresses are read through the existing site permission, not the "tabs" permission.
- Limit: if the whole browser is closed at once, deletion on tab close may not get to run. Add the same site to the "when browser opens" list to be sure.

## Extensions installed by other programs

On the Extensions tab (after you turn on the optional `management` permission), other extensions are also flagged if they were: **installed by another program** on the computer (`sideload`, the path used by Windows software), **installed by system policy** (`admin`, registry/Group Policy), or **able to talk to programs on the computer** (`nativeMessaging`), in addition to those with cookie or web-traffic permissions. A notification appears when such an extension is newly installed or enabled.

The honest limit: a browser extension cannot see Windows programs or services. All it sees is their trace in the browser (extensions they slip in). Websites also cannot read other sites' cookies; what can read cookies of all sites is an extension, and that is what is monitored here. This extension has no permanent script in web pages (no `content_scripts`), so it cannot see ads or scripts that read cookies inside a page (this is deliberate, to keep the attack surface small). The only script it runs in a page is a small function that reads the NAMES of `localStorage` keys or deletes keys you chose, and only when you press the button.

## Automated tests

Run `node tests/jalankan.js` (no browser, no installation). These tests also run automatically in GitHub Actions on every change to `main` or pull request, together with `periksa-keamanan.js`. The `tests` and `.github` folders are not included in the release zip.
