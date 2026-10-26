import { createContext, useContext, useMemo, useState } from 'react'

export const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'zu', label: 'ZU' },
  { code: 'af', label: 'AF' },
]

// Type values are listed in the same order as constants.js INCIDENT_TYPES,
// so TYPE_LABELS[lang][i] lines up with INCIDENT_TYPES[i].value.
const TYPE_VALUES = [
  'suspicious_activity',
  'theft',
  'vandalism',
  'traffic',
  'fire',
  'medical',
  'noise',
  'infrastructure',
  'other',
]

const TRANSLATIONS = {
  en: {
    title: 'What happened?',
    subtitle: 'Pick the closest match. Our AI double-checks it.',
    whereLabel: 'Where?',
    useLocation: 'Use my current location',
    locationFound: 'Location found',
    addPhoto: 'Add a photo',
    photoHelper: "Optional · helps responders see it",
    tellUsMore: 'Tell us more',
    anonymousToggle: 'Report anonymously',
    anonymousHelper: 'Your name is never stored',
    yourName: 'Your name',
    sendReport: 'Send report',
    sending: 'Sending…',
    errorDescription: 'Please add a few words about what happened',
    errorLocation: 'Add a location, or use your current location',
    errorGeneric: 'Something went wrong. Please try again.',
    types: {
      suspicious_activity: 'Suspicious',
      theft: 'Theft',
      vandalism: 'Vandalism',
      traffic: 'Traffic',
      fire: 'Fire',
      medical: 'Medical',
      noise: 'Noise',
      infrastructure: 'Infrastructure',
      other: 'Other',
    },
    reportSent: 'Report sent',
    refLabel: 'Ref',
    aiTriageTitle: 'AI-assessed priority',
    whatNext: 'What happens next',
    steps: {
      new: 'Received and triaged',
      acknowledged: 'Acknowledged',
      dispatched: 'Help dispatched',
      resolved: 'Resolved',
    },
    safetyTitle: 'Life in danger right now?',
    safetyBody:
      'Call 10111 (police) or 112 from any phone. This app does not replace emergency services.',
    reportAnother: 'Report another',
    back: 'Back',
    processingFallback: "We're processing your report.",
    photoDropped: "Your report was sent, but the photo couldn't be uploaded.",
  },
  zu: {
    title: 'Kwenzekeni?',
    subtitle: 'Khetha okufana kakhulu. I-AI izokuhlola.',
    whereLabel: 'Kuphi?',
    useLocation: 'Sebenzisa indawo yami',
    locationFound: 'Indawo itholakele',
    addPhoto: 'Engeza isithombe',
    photoHelper: 'Akuphoqelekile · kusiza abaphenduli ukubona',
    tellUsMore: 'Sitshele kabanzi',
    anonymousToggle: 'Bika ungaziwa',
    anonymousHelper: 'Igama lakho aligcinwa',
    yourName: 'Igama lakho',
    sendReport: 'Thumela umbiko',
    sending: 'Kuyathunyelwa…',
    errorDescription: 'Sicela ufake imininingwane yalokho okwenzekile',
    errorLocation: 'Faka indawo, noma usebenzise indawo yakho yamanje',
    errorGeneric: 'Kukhona okungahambanga kahle. Sicela uzame futhi.',
    types: {
      suspicious_activity: 'Okusolisayo',
      theft: 'Ukweba',
      vandalism: 'Ukonakalisa',
      traffic: 'Ithrafikhi',
      fire: 'Umlilo',
      medical: 'Ezempilo',
      noise: 'Umsindo',
      infrastructure: 'Ugesi namanzi',
      other: 'Okunye',
    },
    reportSent: 'Umbiko uthunyelwe',
    refLabel: 'Inombolo',
    aiTriageTitle: 'Ukubaluleka okuhlolwe yi-AI',
    whatNext: 'Okulandelayo',
    steps: {
      new: 'Itholiwe futhi ihloliwe',
      acknowledged: 'Yamukelwe',
      dispatched: 'Usizo luthunyelwe',
      resolved: 'Isixazululiwe',
    },
    safetyTitle: 'Impilo isengozini manje?',
    safetyBody:
      'Shayela ku-10111 (amaphoyisa) noma ku-112 kunoma iyiphi ifoni. Lolu hlelo alusitshali izinsizakalo zesimo esiphuthumayo.',
    reportAnother: 'Bika okunye',
    back: 'Emuva',
    processingFallback: 'Sisalungiselela umbiko wakho.',
    photoDropped: 'Umbiko wakho uthunyelwe, kodwa isithombe asikwazanga ukulayishwa.',
  },
  af: {
    title: 'Wat het gebeur?',
    subtitle: 'Kies die naaste opsie. Ons KI kontroleer dit.',
    whereLabel: 'Waar?',
    useLocation: 'Gebruik my huidige ligging',
    locationFound: 'Ligging gevind',
    addPhoto: "Voeg 'n foto by",
    photoHelper: 'Opsioneel · help reageerders',
    tellUsMore: 'Vertel ons meer',
    anonymousToggle: 'Rapporteer anoniem',
    anonymousHelper: "Jou naam word nooit gestoor nie",
    yourName: 'Jou naam',
    sendReport: 'Stuur verslag',
    sending: 'Stuur tans…',
    errorDescription: "Voeg asseblief 'n paar woorde by oor wat gebeur het",
    errorLocation: "Voeg 'n ligging by, of gebruik jou huidige ligging",
    errorGeneric: 'Iets het verkeerd geloop. Probeer asseblief weer.',
    types: {
      suspicious_activity: 'Verdag',
      theft: 'Diefstal',
      vandalism: 'Vandalisme',
      traffic: 'Verkeer',
      fire: 'Brand',
      medical: 'Medies',
      noise: 'Geraas',
      infrastructure: 'Infrastruktuur',
      other: 'Ander',
    },
    reportSent: 'Verslag gestuur',
    refLabel: 'Verw',
    aiTriageTitle: 'KI-bepaalde prioriteit',
    whatNext: 'Wat volgende gebeur',
    steps: {
      new: 'Ontvang en getrieer',
      acknowledged: 'Erken',
      dispatched: 'Hulp uitgestuur',
      resolved: 'Opgelos',
    },
    safetyTitle: "Is lewens nou in gevaar?",
    safetyBody:
      'Skakel 10111 (polisie) of 112 vanaf enige foon. Hierdie app vervang nie nooddienste nie.',
    reportAnother: "Rapporteer 'n ander",
    back: 'Terug',
    processingFallback: 'Ons verwerk tans jou verslag.',
    photoDropped: 'Jou verslag is gestuur, maar die foto kon nie opgelaai word nie.',
  },
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en')

  const value = useMemo(() => {
    const dict = TRANSLATIONS[lang] ?? TRANSLATIONS.en
    return {
      lang,
      setLang,
      t: (key) => dict[key] ?? TRANSLATIONS.en[key] ?? key,
      typeLabel: (value) => dict.types[value] ?? TRANSLATIONS.en.types[value] ?? value,
      stepLabel: (value) => dict.steps[value] ?? TRANSLATIONS.en.steps[value] ?? value,
    }
  }, [lang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}

export { TYPE_VALUES }
