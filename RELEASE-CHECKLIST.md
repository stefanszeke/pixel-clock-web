# Little Pixel for Firefox — Release checklist (v6.19.0)

## Package checks
- [x] `manifest.json` is at the package root, with stable add-on ID and v6.19.0.
- [x] JavaScript syntax checks completed; extension ZIP passes integrity test.
- [x] Simulated Firefox background test covers Factory Reset, native shortcut re-import and sync rewrite.
- [x] Browser simulation loads the Settings UI and tooltip controls without script errors.

## Tests still needed on real Firefox
- [ ] Back up your existing Little Pixel data with **Export everything**.
- [ ] Load the unpacked add-on using `about:debugging` → **This Firefox** → **Load Temporary Add-on** → `manifest.json`.
- [ ] Open a New Tab: verify the title, no demo shortcuts, and automatic import of native Firefox sites.
- [ ] Test shortcut add/edit/delete, groups, Free grid movement, clock/calendar, and note/reminder completion.
- [ ] Export backup → Factory reset → confirm fresh defaults and imported Firefox shortcuts → restore backup.
- [ ] Test reminder notification and test button with Firefox open, including a background tab / closed New Tab page.
- [ ] Verify **Sync now** and two real desktop Firefox profiles signed into the same Mozilla account (Add-ons sync enabled); test conflict handling.
- [ ] Verify the settings, focus behavior and fullscreen layout at several window sizes.
- [ ] Submit to Mozilla AMO as a listed or unlisted extension; complete any requested review and obtain a **signed XPI**.
- [ ] Install the signed XPI in standard Firefox and retest, including restart and update persistence.

## Release caution
A Factory Reset also clears Little Pixel's synced configuration. Close Little Pixel on other synced computers first, because an older open profile could upload old data again. Firefox itself and its own native shortcuts are not reset.
