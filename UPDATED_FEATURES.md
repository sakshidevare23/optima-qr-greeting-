#  Greetings — Indian Catalogue Update

Updated:
- Complete language selector catalogue: 87 unique entries (22 Scheduled languages + requested regional/local/tribal languages).
- Searchable language selector continues to use the existing mobile-first UI.
- Expanded occasion catalogue to 175 unique entries.
- Added religious categories: Hindu, Islamic, Christian, Sikh, Buddhist, Jain, Parsi/Zoroastrian.
- Added Harvest/Agricultural and Important Days categories.
- Added aliases/alternative names so duplicate festival names resolve to one canonical occasion.
- Added dates for fixed-date important days and major national/state days.
- Occasion search now searches alternative names and dates.
- Added `INDIAN_CATALOGUE.md` explaining the data structure and how to extend it.
- Existing greeting renderer, templates, uploads, download and sharing flows are preserved.

Translation coverage:
- All 87 language codes map to locale files and registered scripts. The 86 non-English dictionaries contain static machine-generated translations, using explicitly recorded model mappings for regional varieties without a separate translation pack.
- Automated checks cover all 689 interface/occasion keys, all 175 occasion records, dynamic region labels, placeholder integrity, and translation-model metadata. A small explicit set of brand, place, and festival names may remain unchanged. 26 locale codes use a matching model and 60 use a mapped approximation; all generated translations and dialect mappings are machine-generated and not human-reviewed, so the mapping does not certify linguistic accuracy. See `client/src/i18n/locale-translation-sources.json`.
- Festival cards use the existing renderer/themes; adding a catalogue entry does not require a new component.

## Flow / analytics update
- Added a dedicated landing page at `/#/` matching the supplied visual direction.
- The landing page has a language dropdown and `Get started` opens the occasion page in the selected language.
- Template selection is now placed immediately after occasion selection/title, before the details form, so the user does not need to scroll down to find templates.
- Added anonymous in-memory funnel counters in `/#/qr`: QR scans, landing visits, landing backouts, greetings generated, and QR-session-to-greeting completions.
- No analytics database, user profile, contact information, IP storage, or persistent greeting storage is used by the updated analytics flow. Counters reset when the Node server restarts.
- Removed the browser-level "remember my details" storage so sender information remains only in the current app session.
- Added locale modules for all registered language codes and corrected font/script handling for Ladakhi (Tibetan script) and Chakma. Locale loading is code-based; missing interface values are surfaced by key, while approved brand/proper names retain their established form.
