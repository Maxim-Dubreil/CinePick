import { Link } from 'react-router-dom'

const PARTNERS =['LETTERBOXD', 'TMDB', 'AI API', 'GOOGLE OAUTH']

interface FooterProps {
  variant?: 'landing' | 'app'
}

export function Footer({ variant = 'landing' }: FooterProps) {
  return (
    <footer
      data-variant={variant}
      className="relative z-10 w-full flex items-center justify-center gap-6 h-12 shrink-0"
      style={{
        background: 'var(--footer-gradient)',
        borderTop: '0.5px solid var(--footer-border)',
      }}
    >
      {PARTNERS.map((item, i) => (
        <div key={item} className="flex items-center gap-6">
          {i > 0 && (
            <div className="w-0.75 h-0.75 rounded-full bg-border-strong" />
          )}
          <span className="text-[11px] tracking-[0.08em] text-text-secondary">
            {item}
          </span>
        </div>
      ))}
      <div className="flex items-center gap-6">
        <div className="w-0.75 h-0.75 rounded-full bg-border-strong" />
        <Link
          to="/about"
          className="text-[11px] tracking-[0.08em] text-text-secondary hover:opacity-70 transition-opacity"
        >
          À PROPOS
        </Link>
      </div>
    </footer>
  )
}
