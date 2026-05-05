export function AppBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-bg-page">
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 600,
          height: 400,
          background: "radial-gradient(ellipse, #1e0a3c 0%, transparent 70%)",
          top: -100,
          left: -100,
          opacity: 0.9,
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 500,
          height: 400,
          background: "radial-gradient(ellipse, #0a1a2e 0%, transparent 70%)",
          top: 0,
          right: -80,
          opacity: 0.8,
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 400,
          height: 400,
          background: "radial-gradient(ellipse, #1a0a0a 0%, transparent 70%)",
          bottom: -80,
          left: "30%",
          opacity: 0.7,
        }}
      />
    </div>
  );
}
