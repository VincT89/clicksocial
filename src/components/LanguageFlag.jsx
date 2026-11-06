export default function LanguageFlag({ language }) {
  return <svg viewBox="0 0 30 20" className="language-flag" aria-hidden="true" focusable="false">
    {language === 'it' ? <><path fill="#fff" d="M0 0h30v20H0z" /><path fill="#009246" d="M0 0h10v20H0z" /><path fill="#ce2b37" d="M20 0h10v20H20z" /></> : language === 'de' ? <><path fill="#111" d="M0 0h30v7H0z" /><path fill="#d00" d="M0 7h30v6H0z" /><path fill="#ffce00" d="M0 13h30v7H0z" /></> : <><path fill="#012169" d="M0 0h30v20H0z" /><path stroke="#fff" strokeWidth="5" d="m0 0 30 20M30 0 0 20" /><path stroke="#c8102e" strokeWidth="2" d="m0 0 30 20M30 0 0 20" /><path stroke="#fff" strokeWidth="7" d="M15 0v20M0 10h30" /><path stroke="#c8102e" strokeWidth="4" d="M15 0v20M0 10h30" /></>}
  </svg>;
}
