// Vetted, static helplines. Never let the LLM invent phone numbers.
// Verify these periodically; numbers change.
//
// Every entry is bilingual ({ en, si }) so the client can switch language instantly, and carries
// the data the app needs to act on it:
//   kind: 'helpline' (emotional / crisis support) | 'emergency' (police, ambulance) | 'directory'
//   tel:  digits to dial (tap-to-call)      sms: { number, body } (tap-to-text)      url: web link
const t = (en, si) => ({ en, si });
const same = (v) => ({ en: v, si: v });
const allDay = t('24/7', 'පැය 24ම');

const find = {
  kind: 'directory',
  name: t('Find a Helpline (worldwide directory)', 'Find a Helpline (ලෝකව්‍යාප්ත නාමාවලිය)'),
  contact: same('findahelpline.com'),
  note: t('Search by country', 'රට අනුව සොයන්න'),
  url: 'https://findahelpline.com',
};
const emergency = (num, label = t('Emergency', 'හදිසි අවස්ථා')) => ({
  kind: 'emergency',
  name: label,
  contact: same(num),
  note: t('Immediate danger', 'ක්ෂණික අන්තරායක දී'),
  tel: num.replace(/\s+/g, ''),
});

export const HELPLINES = {
  LK: [
    {
      kind: 'helpline',
      name: t('National Mental Health Helpline (CCCline)', 'ජාතික මානසික සෞඛ්‍ය උපකාරක දුරකථන සේවාව (CCCline)'),
      contact: same('1333'), note: t('24/7, free', 'පැය 24ම, නොමිලේ'), tel: '1333',
    },
    {
      kind: 'helpline',
      name: t('Sumithrayo', 'සුමිත්‍රයෝ'),
      contact: same('011 2682535'), note: t('Confidential emotional support', 'රහස්‍යභාවය රැකෙන චිත්තවේගී සහාය'), tel: '+94112682535',
    },
    emergency('119', t('Emergency: Police', 'හදිසි අවස්ථා: පොලිසිය')),
    emergency('1990', t('Emergency: Ambulance (Suwa Seriya)', 'හදිසි අවස්ථා: ගිලන් රථ (සුව සැරිය)')),
    find,
  ],
  US: [
    {
      kind: 'helpline',
      name: t('988 Suicide & Crisis Lifeline', '988 සියදිවි නසාගැනීම් සහ අර්බුද උපකාරක සේවාව'),
      contact: t('Call or text 988', '988 අමතන්න හෝ පණිවිඩයක් යවන්න'), note: allDay, tel: '988', sms: { number: '988', body: '' },
    },
    {
      kind: 'helpline',
      name: t('Crisis Text Line', 'Crisis Text Line (පණිවිඩ සේවාව)'),
      contact: t('Text HOME to 741741', '741741 වෙත HOME ලෙස පණිවිඩයක් යවන්න'), note: allDay, sms: { number: '741741', body: 'HOME' },
    },
    emergency('911'),
    find,
  ],
  CA: [
    {
      kind: 'helpline',
      name: t('988 Suicide Crisis Helpline', '988 සියදිවි නසාගැනීම් අර්බුද උපකාරක සේවාව'),
      contact: t('Call or text 988', '988 අමතන්න හෝ පණිවිඩයක් යවන්න'), note: allDay, tel: '988', sms: { number: '988', body: '' },
    },
    emergency('911'),
    find,
  ],
  GB: [
    { kind: 'helpline', name: t('Samaritans', 'සැමරිටන්ස් (Samaritans)'), contact: same('116 123'), note: t('24/7, free', 'පැය 24ම, නොමිලේ'), tel: '116123' },
    {
      kind: 'helpline',
      name: t('NHS urgent mental health help', 'NHS හදිසි මානසික සෞඛ්‍ය සහාය'),
      contact: t('111 (option 2)', '111 (2 වන විකල්පය)'), note: t('England', 'එංගලන්තය'), tel: '111',
    },
    emergency('999'),
    find,
  ],
  IN: [
    { kind: 'helpline', name: same('Tele-MANAS'), contact: same('14416'), note: t('24/7, multilingual', 'පැය 24ම, බහු භාෂා'), tel: '14416' },
    emergency('112'),
    find,
  ],
  AU: [
    { kind: 'helpline', name: t('Lifeline', 'Lifeline (ජීවන රේඛාව)'), contact: same('13 11 14'), note: allDay, tel: '131114' },
    emergency('000'),
    find,
  ],
  OTHER: [
    find,
    {
      kind: 'emergency',
      name: t('Local emergency number', 'ඔබේ රටේ හදිසි අංකය'),
      contact: same('112 / 911 / 999'),
      note: t('Use the number for your country', 'ඔබේ රටට අදාළ අංකය භාවිතා කරන්න'),
      tel: '112', // 112 is recognised by mobile networks in most countries
    },
  ],
};

// Fast server-side safety net that does not depend on the AI response.
const EN_CRISIS =
  /\b(kill myself|end my life|suicid\w*|want to die|don'?t want to live|better off dead|self[- ]harm|hurt myself|cut myself|overdose)\b/i;

// Sinhala (script) + common romanized phrases. Zero-width joiners are stripped from the
// text before matching, so these patterns are written without them.
// NOTE: have a native Sinhala speaker review/extend this list before production use.
const SI_CRISIS = new RegExp(
  [
    'මැරෙන්න\\s*(ඕන|ඕනේ|ඕනෙ|හිතෙනවා|හිතුණා|හිතෙන|යනවා)',
    'මැරුණොත්\\s*හොඳයි',
    'මැරිලා\\s*යන්න',
    'මැරෙනවා\\s*කියලා',
    'සියදිවි',
    'ආත්මඝාත',
    'ජීවිතය\\s*(නැති\\s*කරගන්න|අවසන්|නසාගන්න|ඉවරයි)',
    'මරාගන්න',
    'මට\\s*මැරෙන්න',
    'ජීවත්\\s*වෙන්න\\s*(ඕන\\s*නෑ|ඕනේ\\s*නෑ|කැමති\\s*නෑ|බෑ)',
    'තමන්ටම\\s*(රිදවා|හානි)',
    'අත\\s*කපා',
    'කපාගන්න',
    '\\b(marenna|maranna)\\s*(one|hithenawa)\\b',
    '\\bjeewath\\s*wenna\\s*one\\s*na\\b',
  ].join('|'),
  'i'
);

export function isCrisisText(text) {
  const clean = String(text).replace(/[​-‍⁠﻿]/g, '');
  return EN_CRISIS.test(clean) || SI_CRISIS.test(clean);
}
