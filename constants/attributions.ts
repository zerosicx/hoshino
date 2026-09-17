/**
 * Where the dictionary comes from, and what each source's licence asks of us.
 *
 * The EDRDG's terms require the acknowledgement to sit on its own screen,
 * reached from a menu, not on a launch screen, so `settings/about.tsx`
 * exists for this before anything else. Wording follows the samples on the
 * EDRDG licence page. No contact address: feedback will come through an
 * anonymous channel later, and the founder keeps her own address private.
 */

export interface Attribution {
  name: string;
  what: string;
  licence: string;
  text: string;
  url: string;
}

export const PRIVACY_POLICY_URL = "https://zerosicx.github.io/hoshino/privacy.html";

export const ATTRIBUTIONS: Attribution[] = [
  {
    name: "JMdict",
    what: "Japanese–English vocabulary",
    licence: "CC BY-SA 4.0",
    text:
      "This app uses the JMdict/EDICT dictionary files. These files are the property of the Electronic Dictionary Research and Development Group, and are used in conformance with the Group's licence.",
    url: "https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project",
  },
  {
    name: "KANJIDIC2",
    what: "Kanji readings, meanings and metadata",
    licence: "CC BY-SA 4.0",
    text:
      "This app uses the KANJIDIC2 dictionary file. This file is the property of the Electronic Dictionary Research and Development Group, and is used in conformance with the Group's licence.",
    url: "https://www.edrdg.org/wiki/index.php/KANJIDIC_Project",
  },
  {
    name: "Tatoeba",
    what: "Example sentences and their English translations",
    licence: "CC BY 2.0 FR",
    text:
      "Example sentences come from the Tatoeba Project's collection of sentences and translations, released under the Creative Commons Attribution 2.0 France licence.",
    url: "https://tatoeba.org",
  },
  {
    name: "yomitan-jlpt-vocab",
    what: "JLPT levels for vocabulary",
    licence: "CC BY",
    text:
      "JLPT levels for words come from stephenmk's yomitan-jlpt-vocab, built on Jonathan Waller's JLPT vocabulary lists.",
    url: "https://github.com/stephenmk/yomitan-jlpt-vocab",
  },
  {
    name: "kanji-data",
    what: "JLPT levels for kanji",
    licence: "MIT",
    text: "JLPT levels for kanji come from David Gouveia's kanji-data.",
    url: "https://github.com/davidluzgouveia/kanji-data",
  },
];

export const EDRDG_LICENCE_URL = "https://www.edrdg.org/edrdg/licence.html";

/** The policy in full, so it can be read without a connection. */
export const PRIVACY_POLICY = [
  "Hoshino does not collect, store or share any personal data.",
  "Everything you do in the app, from the words you search and the lists you make to your study progress and any text you paste into the reader, stays on your device. Nothing is sent to us. There is no account and nothing to sign in to.",
  "When the app checks for updates it sends the operating system, the app version and a random identifier created for this installation to Expo's update service, so that the right update can be delivered. That identifier is not linked to you or to anything you do in the app.",
  "The app asks for no permissions beyond network access for those update checks.",
  "If you delete the app, all of its data goes with it.",
  "Accounts and optional sync may come later. If they do, this policy will say exactly what is stored and why before it ships.",
];
