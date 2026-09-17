# Hoshino — Launching on Google Play

The plan for the first store release, written 17/09/26 so it can be picked up
again after a gap. Steps are in the order they have to happen. Things marked
**Hannah** need her account, identity or device; things marked **code** can be
done in the repo.

## What sets the timeline

**The 12-tester rule.** A personal Play developer account created after 13
November 2023 cannot publish to production until the app has run a **closed
test with at least 12 testers opted in for 14 continuous days**. Internal
testing does not count. After the 14 days you apply for production access
from the Console dashboard, and Google may still ask for more testing if
engagement looks thin. Realistically: three weeks from account creation, and
the gating item is finding 12 people with Android phones who will install the
app from the closed-testing link and keep it. An organisation account is
exempt but needs a D-U-N-S number and business verification, which takes its
own weeks. Personal account plus 12 testers is the faster route.

**Dictionary licence compliance.** JMdict and KANJIDIC2 come from the
Electronic Dictionary Research and Development Group under CC BY-SA 4.0, and
their terms are specific: a phone app must acknowledge them **on a separate
screen reached from a menu** (About, Sources, or similar). A line on a launch
screen is explicitly not enough. Settings has no such screen yet. Tatoeba
(CC BY 2.0), the JLPT vocabulary mapping (CC BY) and the kanji-level overlay
(MIT) need attribution too. This ships in the first store build or the app is
not compliant.

## Steps

1. **Play Console account** — Hannah. One-time US$25, government ID, verified
   payment profile. Verification can take days; start first.

2. **Prerequisites in the app** — code.
   - An "About and sources" screen in Settings: the EDRDG acknowledgement
     (sample wording on the EDRDG licence page), Tatoeba and JLPT attributions,
     the MIT notice, a link to the privacy policy, and the version.
   - A privacy policy at a public URL (Play requires one for every app).
     Content: no personal data is collected; everything stays on the device;
     the update check sends the operating system, app version and a random
     per-installation identifier to Expo's update service, not linked to a
     person. Host from the repo on GitHub Pages (Hannah switches Pages on in
     the repository settings).
   - Version `1.0.0` in `app.json` — `0.1.0` reads as unfinished on a listing.
     The changelog's version name is internal and can stay or change.
   - A fresh production build after these land: `npm run release:production`.

3. **Create the app in the Console** — Hannah. Name "hoshino: jisho", English
   default, App not Game, **Free**. Free is irrevocable: a free app can never
   become paid, though it can add in-app purchases. Matches the decision that
   the logged-out app is free forever.

4. **Store listing** — visuals Hannah, text from the repo.
   - App icon 512×512 PNG; feature graphic 1024×500 (needs making).
   - 2–8 phone screenshots, 16:9 or 9:16, shortest side ≥ 320px. From the S25
     on build 16 or later, dark mode: a search result, a word page, the reader
     with a paragraph, the Study landing, a flashcard back, Lists.
   - Short description ≤ 80 characters; full description ≤ 4,000. Draft both
     from `CHANGELOG.md`. Category Education. Contact email (public).

5. **App content declarations** — Hannah, answers below.
   - Privacy policy URL from step 2.
   - Ads: none. App access: all functionality available without login.
     News, government, financial, health apps: no.
   - Content rating (IARC): dictionary and study app, no user-generated
     content, no violence → Everyone.
   - Target audience: 13 and over, so the app is not "designed for children".
   - Data safety: no data collected or shared. The one thing to think about
     is the random installation identifier in the update check; Expo's own
     wording describes it as not linked to the user. Read Google's form text
     before answering — a wrong declaration is a policy violation.

6. **Signing** — Hannah, on first upload. Choose Google-managed Play App
   Signing. The EAS keystore becomes the upload key; Google holds the release
   key. This is the default and correct.

7. **Internal testing, then closed testing** — Hannah. Upload the production
   app bundle to Internal testing and install it from the link to confirm the
   store-delivered build works. Then create a Closed testing track, add the
   testers (emails or a Google Group), publish, and start the 14-day clock.
   Tell testers they must opt in through the link and keep the app installed.

8. **Production access** — Hannah, after 14 days. Apply from the dashboard;
   once granted, promote the closed-testing release to Production. First
   review of a new app can take several days.

9. **After launch** — code. `eas submit --platform android` with a service
   account JSON so bundles upload from the terminal (add a `release:submit`
   script alongside the others). Over-the-air JavaScript fixes go to the
   `production` channel: `npm run release:update -- --branch production`.
   Rebuild only for native changes, as for the beta.

## Status

| Step | State |
|---|---|
| 1 Account | not started |
| 2 About screen, privacy policy, version | not started |
| 3 App record | not started |
| 4 Listing | not started |
| 5 Declarations | not started |
| 6 Signing | not started |
| 7 Internal → closed testing | not started |
| 8 Production access | not started |
| 9 Submit script, production channel | not started |

## Sources

- Play Console Help, "App testing requirements for new personal developer accounts": https://support.google.com/googleplay/android-developer/answer/14151465
- Play Developer Community, "Everything about the 12 testers requirement": https://support.google.com/googleplay/android-developer/community-guide/255621488
- EDRDG licence statement: https://www.edrdg.org/edrdg/licence.html
- JMdict-EDICT project (sample acknowledgements): https://www.edrdg.org/wiki/JMdict-EDICT_Dictionary_Project.html
- Play Console Help, "Data safety section": https://support.google.com/googleplay/android-developer/answer/10787469
