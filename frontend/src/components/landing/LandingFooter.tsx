const PARTNERS = ["LETTERBOXD", "TMDB", "AI API", "GOOGLE OAUTH"];

export function LandingFooter() {
  return (
    <footer
      className="relative z-10 w-full flex items-center justify-center gap-6 h-12 shrink-0"
      style={{
        background: "linear-gradient(0deg, rgba(4,4,10,0.3) 0%, transparent 100%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "0.5px solid rgba(255,255,255,0.08)",
      }}
    >
      {PARTNERS.map((item, i) => (
        <div key={item} className="flex items-center gap-6">
          {i > 0 && (
            <div className="w-0.75 h-0.75 rounded-full bg-border-strong" />
          )}
          <span className="text-[11px] tracking-[0.08em] text-text-disabled">
            {item}
          </span>
        </div>
      ))}
    </footer>
  );
}
