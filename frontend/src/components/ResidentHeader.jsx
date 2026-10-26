import Logo from './Logo'
import { LANGUAGES, useLanguage } from '../i18n.jsx'

export default function ResidentHeader() {
  const { lang, setLang } = useLanguage()

  return (
    <header className="resident-header">
      <Logo />
      <div className="lang-switch" role="group" aria-label="Language">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            className={lang === l.code ? 'is-active' : ''}
            onClick={() => setLang(l.code)}
            aria-pressed={lang === l.code}
          >
            {l.label}
          </button>
        ))}
      </div>
    </header>
  )
}
