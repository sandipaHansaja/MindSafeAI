import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// To add another language: add an entry here, add its code to LANGUAGES, and add
// the same code to the server (LANGS in server.js, LANG_RULES in gemini.js, helplines.js).
export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'si', label: 'සිංහල', short: 'සිං' },
];

const dict = {
  en: {
    title: 'MindSafe AI: a private space to write it out',
    brand: 'MindSafe AI',
    language: 'Language',
    theme: 'Theme',
    themes: { auto: 'Auto (follows the time of day)', morning: 'Morning', evening: 'Evening', night: 'Night' },
    heroTitle: 'Say it here. Nobody is watching.',
    heroText: "Write whatever is on your mind. There is no account, we don't keep your words, and nothing links this to you.",
    prompts: ['What is weighing on you today?', 'What happened that you keep replaying?', 'What would you say to a friend feeling this way?'],
    placeholder: "Start anywhere. It doesn't have to make sense.",
    helplinesFor: 'Show helplines for',
    getSupport: 'Get support',
    reading: 'Reading with care…',
    breatheIn: 'Breathe in',
    breatheOut: 'Breathe out',
    countries: { LK: 'Sri Lanka', US: 'United States', GB: 'United Kingdom', IN: 'India', AU: 'Australia', CA: 'Canada', OTHER: 'Another country' },
    thanks: 'Thank you for sharing that.',
    summaryLabel: 'Check-in summary',
    stress: 'Stress right now',
    stressOf: (n) => `${n} of 10`,
    stressAria: (n) => `Stress level ${n} out of 10`,
    tone: 'Overall tone',
    sentiments: { positive: 'positive', neutral: 'neutral', negative: 'negative', mixed: 'mixed' },
    helpTitle: 'Things that might help',
    affirmTitle: 'Words to hold onto',
    urgentHelp: 'Please reach out to someone right now',
    crisisTitle: 'You deserve support right now',
    crisisBody: "What you wrote sounds really painful, and your safety matters. Please reach out to someone now. You don't have to carry this alone.",
    highTitle: 'Please talk to someone today',
    highBody: "You seem to be carrying a lot. Talking with a trained listener or someone you trust can ease the weight, and it's okay to ask for help.",
    talkNow: 'Talk to someone now',
    emergencyNow: 'If you might act on these thoughts or are in danger, call emergency services',
    emergencyIf: 'If you are in immediate danger',
    callLabel: 'Call',
    textLabel: 'Send a text message',
    textInstead: 'Prefer to text?',
    trustedPerson: 'You can also tell someone you trust right now: a family member, a friend, a neighbour or a teacher. If you can, stay with another person for the moment.',
    moreHelp: 'More helplines',
    closeAlert: 'Close',
    barText: 'Need to talk to someone right now?',
    peopleTitle: 'People you can talk to',
    again: 'Write another entry',
    langNotice: (from) => `This reflection was written in ${from}. Write a new entry to get it in English.`,
    footer: 'MindSafe AI offers supportive reflection, not medical advice or diagnosis. If you are in immediate danger, call your local emergency number.',
    langNames: { en: 'English', si: 'Sinhala' },
    errors: {
      BAD_LENGTH: 'Please write between 10 and 5,000 characters.',
      ANALYSIS_UNAVAILABLE: 'The analysis service is unavailable. Please try again shortly.',
      RATE_LIMITED: 'Too many requests. Please wait a little and try again.',
      NETWORK: 'Could not reach the server. Check your connection and try again.',
      GENERIC: 'Something went wrong.',
    },
  },
  si: {
    title: 'MindSafe AI: ඔබේ හිතේ තියෙන දේ ලියන්න පෞද්ගලික ඉඩක්',
    brand: 'MindSafe AI',
    language: 'භාෂාව',
    theme: 'තේමාව',
    themes: { auto: 'ස්වයංක්‍රීය (වේලාව අනුව)', morning: 'උදෑසන', evening: 'සවස', night: 'රාත්‍රිය' },
    heroTitle: 'මෙතැන නිදහසේ කියන්න. කවුරුත් බලාගෙන නැහැ.',
    heroText: 'ඔබේ හිතේ තියෙන ඕනෑම දෙයක් ලියන්න. ගිණුමක් අවශ්‍ය නැහැ, ඔබේ වචන අපි තබාගන්නේ නැහැ, මේක ඔබ හා සම්බන්ධ කරන කිසිවක් නැහැ.',
    prompts: ['අද ඔබේ හිතට බරක් වෙලා තියෙන්නේ මොකක්ද?', 'ඔබ නිතර නිතර සිහිපත් කරමින් ඉන්න දේ මොකක්ද?', 'මේ විදියට දුකෙන් ඉන්න මිතුරෙකුට ඔබ කියන්නේ මොනවාද?'],
    placeholder: 'ඕනෑම තැනකින් පටන් ගන්න. තේරුමක් තියෙන්න ඕනේ නැහැ.',
    helplinesFor: 'උපකාරක දුරකථන අංක පෙන්වන්න:',
    getSupport: 'සහාය ලබාගන්න',
    reading: 'සැලකිල්ලෙන් කියවමින්…',
    breatheIn: 'හුස්ම ගන්න',
    breatheOut: 'හුස්ම හෙළන්න',
    countries: { LK: 'ශ්‍රී ලංකාව', US: 'ඇමරිකා එක්සත් ජනපදය', GB: 'එක්සත් රාජධානිය', IN: 'ඉන්දියාව', AU: 'ඕස්ට්‍රේලියාව', CA: 'කැනඩාව', OTHER: 'වෙනත් රටක්' },
    thanks: 'මේක බෙදාගත්තාට ස්තූතියි.',
    summaryLabel: 'සාරාංශය',
    stress: 'දැන් ඇති ආතතිය',
    stressOf: (n) => `10න් ${n}`,
    stressAria: (n) => `ආතති මට්ටම 10න් ${n}`,
    tone: 'සමස්ත ස්වභාවය',
    sentiments: { positive: 'ධනාත්මක', neutral: 'මධ්‍යස්ථ', negative: 'සෘණාත්මක', mixed: 'මිශ්‍ර' },
    helpTitle: 'උපකාරී වෙන්න පුළුවන් දේවල්',
    affirmTitle: 'සිහියේ තබාගන්න වචන',
    urgentHelp: 'කරුණාකර දැන්ම කෙනෙකුට කතා කරන්න',
    crisisTitle: 'ඔබට දැන්ම සහාය ලැබිය යුතුයි',
    crisisBody: 'ඔබ ලියපු දේ ගොඩක් වේදනාකාරී බවක් පේනවා. ඔබේ ආරක්ෂාව ගොඩක් වැදගත්. කරුණාකර දැන්ම කෙනෙකුට කතා කරන්න. මේක තනියම දරාගන්න ඕනේ නැහැ.',
    highTitle: 'අද කෙනෙකුට කතා කරන්න',
    highBody: 'ඔබ ගොඩක් බරක් දරාගෙන ඉන්නවා වගේ. පුහුණු සවන්දෙන්නෙකුට හෝ ඔබ විශ්වාස කරන කෙනෙකුට කතා කිරීමෙන් බර අඩු වෙන්න පුළුවන්. උදව් ඉල්ලන එක කිසිම වරදක් නැහැ.',
    talkNow: 'දැන්ම කෙනෙකුට කතා කරන්න',
    emergencyNow: 'මේ සිතුවිලි අනුව ක්‍රියා කරන්න ඉඩ තියෙනවා නම් හෝ ඔබ අන්තරායක සිටී නම්, හදිසි සේවාවට අමතන්න',
    emergencyIf: 'ඔබ ක්ෂණික අන්තරායක සිටී නම්',
    callLabel: 'අමතන්න',
    textLabel: 'කෙටි පණිවිඩයක් යවන්න',
    textInstead: 'පණිවිඩයක් යවන්නද?',
    trustedPerson: 'ඔබට විශ්වාස කෙනෙකුටත් දැන්ම කියන්න පුළුවන්: පවුලේ කෙනෙක්, මිතුරෙක්, අසල්වැසියෙක් හෝ ගුරුවරයෙක්. පුළුවන් නම් මේ මොහොතේ වෙනත් කෙනෙකු සමඟ ඉන්න.',
    moreHelp: 'තවත් උපකාරක සේවා',
    closeAlert: 'වසන්න',
    barText: 'දැන්ම කෙනෙකුට කතා කරන්න ඕනද?',
    peopleTitle: 'ඔබට කතා කළ හැකි අය',
    again: 'තවත් සටහනක් ලියන්න',
    langNotice: (from) => `මේ සාරාංශය ලියවී ඇත්තේ ${from} භාෂාවෙන්. සිංහලෙන් ලබාගන්න නව සටහනක් ලියන්න.`,
    footer: 'MindSafe AI සපයන්නේ සහායක පරාවර්තනයක් පමණි; එය වෛද්‍ය උපදෙස් හෝ රෝග විනිශ්චයක් නොවේ. ඔබ ක්ෂණික අන්තරායක සිටී නම්, ඔබේ රටේ හදිසි අංකයට අමතන්න.',
    langNames: { en: 'ඉංග්‍රීසි', si: 'සිංහල' },
    errors: {
      BAD_LENGTH: 'කරුණාකර අකුරු 10ත් 5,000ත් අතර ප්‍රමාණයක් ලියන්න.',
      ANALYSIS_UNAVAILABLE: 'විශ්ලේෂණ සේවාව දැන් ලබාගත නොහැක. මද වේලාවකින් නැවත උත්සාහ කරන්න.',
      RATE_LIMITED: 'ඉල්ලීම් වැඩියි. මද වේලාවක් රැඳී සිට නැවත උත්සාහ කරන්න.',
      NETWORK: 'සේවාදායකයට සම්බන්ධ විය නොහැකි වුණා. ඔබේ සම්බන්ධතාවය පරීක්ෂා කර නැවත උත්සාහ කරන්න.',
      GENERIC: 'මොකක්දෝ වැරැද්දක් සිදු වුණා.',
    },
  },
};

const STORAGE_KEY = 'mindsafe-lang';

function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && dict[saved]) return saved;
  } catch { /* storage can be blocked; fall through */ }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'en';
  return nav.toLowerCase().startsWith('si') ? 'si' : 'en';
}

const LangContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  const setLang = useCallback((code) => {
    if (!dict[code]) return;
    setLangState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  }, []);

  // Keep <html lang> and the tab title in sync (drives fonts, screen readers, hyphenation).
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = dict[lang].title;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t: dict[lang] }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
