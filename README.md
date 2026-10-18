# Dear Tomorrow — Firebase + GitHub Pages

A responsive personal journal built with HTML, CSS and vanilla JavaScript. Firebase Authentication provides sign-in; Firebase Realtime Database stores each user's entries under `users/{uid}`. GitHub Pages hosts the static frontend.

## Project files

- `index.html` — page layout and module entry point
- `style.css` — responsive design and themes
- `script.js` — authentication, journal, photos, history, gallery, statistics and export
- `config.js` — Firebase web configuration for this project
- `database.rules.json` — database security rules to publish in Firebase Console
- `.nojekyll` — disables GitHub Pages Jekyll processing

## 1. Create a Firebase project

1. Open https://console.firebase.google.com/ and choose **Add project**.
2. Enter a project name such as `dear-tomorrow`. Google Analytics is not required; you can disable it.
3. Keep the project on the no-cost Spark plan. Do not upgrade to Blaze for this setup.
4. In Project Overview, click the web icon `</>` to register a web app. Give it a name such as `Dear Tomorrow Web`. Do not select Firebase Hosting; GitHub Pages will host the site.
5. Firebase will show a `firebaseConfig` object. Copy the values into `config.js`, replacing every `PASTE_...` placeholder. The `databaseURL` must be copied exactly from the Realtime Database page or Firebase config. Do not guess it.

Example shape (not real values):
```js
export const firebaseConfig = {
  apiKey: "YOUR_WEB_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_DATABASE_INSTANCE",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

Firebase web config is intended to identify your Firebase project; it is not a service-account secret. Never put Admin SDK credentials or private service-account keys in this website.

## 2. Enable email/password sign-in

1. Firebase Console → **Build → Authentication**.
2. Click **Get started** if prompted.
3. Open **Sign-in method** (or **Sign-in providers**).
4. Enable **Email/Password** and save.

## 3. Create Realtime Database

1. Firebase Console → **Build → Realtime Database** → **Create Database**.
2. Select a region close to you. For Spark, use the available no-cost setup and do not enable billing.
3. After creation, copy the displayed database URL exactly into `config.js` as `databaseURL`.
4. Open the **Rules** tab, replace the rules with the contents of `database.rules.json`, and click **Publish**.

The rules deny access by default and allow a signed-in user to access only their own `/users/{uid}` tree. They check entry timestamps and the required text field for saved quotes. Firebase Realtime Database Rules do not support `numChildren()`, so these rules intentionally avoid it. The photo count/size limits are enforced in the browser app, not by these rules. The app has not been live-tested against your Firebase project because your private project configuration is not available here.

## 4. Add the GitHub Pages domain to Firebase Auth

1. Publish the site to GitHub Pages first (steps below), then copy its host name. For a project site it is normally `YOUR-USERNAME.github.io`; do not include `https://` or the repository path.
2. Firebase Console → **Authentication → Settings → Authorized domains**.
3. Add `YOUR-USERNAME.github.io`. For a custom domain, add that domain too.
4. Firebase may list `localhost` for local testing. Only add domains you control.

## 5. Publish on GitHub Pages

1. Create a GitHub repository, e.g. `dear-tomorrow`.
2. Upload all project files to the repository root:
   - `index.html`
   - `style.css`
   - `script.js`
   - `config.js`
   - `database.rules.json`
   - `README.md`
   - `.nojekyll`
3. Commit the files to the `main` branch.
4. Repository → **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/(root)`, then **Save**.
6. Wait for the deployment. Your URL will look like `https://YOUR-USERNAME.github.io/dear-tomorrow/`.
7. Add `YOUR-USERNAME.github.io` to Firebase Authorized domains as described above, then reload the site.

You can upload files using GitHub's **Add file → Upload files** option. If using Git locally:
```bash
git add .
git commit -m "Add Dear Tomorrow Firebase journal"
git push origin main
```

## 6. Use the journal

1. Open the published site.
2. Enter an email and password of at least 6 characters, then choose **Create account**.
3. Sign in with the same account on your phone and laptop. Entries sync through Realtime Database.
4. Write, add up to three photos, then choose **Save today's entry**. Existing dates can be opened from **My journal** and edited using the detail dialog.
5. Use **Export my journal** regularly to download a JSON backup. It includes photo data and may be large.
6. **Delete my journal data** permanently removes all entries and saved quotes for the signed-in account.

## Photo storage and Spark plan

This app does **not** use Firebase Cloud Storage. It resizes images to a maximum dimension of 1200 px, compresses to JPEG in the browser, aims for about 300 KB or less per image, and stores the data URL inside the corresponding Realtime Database entry. There are up to three photos per entry.

Photo data uses Realtime Database storage and download bandwidth. Large journals can reach free quotas sooner; keep photos small and export backups. Realtime Database has no unlimited free storage or bandwidth. Quotas, pricing and Firebase policies can change; check the official documentation before relying on the free plan:

- https://firebase.google.com/pricing
- https://firebase.google.com/docs/database/usage/billing
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024

The intended architecture uses Firebase Spark and Realtime Database, not Cloud Storage. Do not upgrade to Blaze automatically. If your project exceeds the available quota, requests may be restricted until usage resets or the issue is resolved.

## Privacy and security notes

- Each user's records are stored under `users/{uid}/entries/{YYYY-MM-DD}`.
- Firebase client config is visible in the browser by design. Protect data with Authentication and Realtime Database rules, not by hiding the config.
- Never use `.read: true` or `.write: true`.
- Never commit service-account keys or Admin SDK credentials.
- Export a backup before deleting entries or your account.
- This project has not been connected to or live-tested with your Firebase project. Test account creation, sign-in, save, edit, delete, cross-device sync, and rules before relying on it for private journaling.

## Troubleshooting

- **“Configure Firebase”**: replace placeholders in `config.js`, commit the file, and reload.
- **`auth/operation-not-allowed`**: enable Email/Password under Authentication → Sign-in method.
- **Unauthorized domain**: add `YOUR-USERNAME.github.io` under Authentication → Settings → Authorized domains.
- **Permission denied**: publish `database.rules.json` in Realtime Database → Rules and confirm the user is signed in.
- **Database URL error**: copy the exact URL shown in Realtime Database; regional instances can have different URL formats.
- **Photo too large**: select a smaller image; each compressed photo is limited to about 300 KB.
- **GitHub Pages not updating**: check Actions/Pages deployment status and hard-refresh the page.

## Final checklist

- [ ] Replace all Firebase placeholders in `config.js`
- [ ] Enable Email/Password Authentication
- [ ] Create Realtime Database and publish rules
- [ ] Add GitHub Pages host to Authorized domains
- [ ] Upload all files to the repository root
- [ ] Enable Pages from `main` / root
- [ ] Create an account and sign in
- [ ] Save an entry and verify it appears after refresh
- [ ] Sign in on another device and confirm sync
- [ ] Test edit, delete, search, gallery and JSON export
- [ ] Test that an unauthenticated session cannot read/write user data
- [ ] Keep a private backup
