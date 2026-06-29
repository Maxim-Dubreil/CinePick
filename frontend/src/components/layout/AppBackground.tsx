const orbBase = "absolute rounded-full pointer-events-none";

export function AppBackground() {
  return (
    <div className="app-bg fixed inset-0 -z-10 bg-bg-page">
      {/* top-left */}
      <div
        className={orbBase}
        style={{
          width: 700,
          height: 500,
          background: "var(--app-orb-1)",
          top: -150,
          left: -150,
          filter: "blur(60px)",
          opacity: 0.9,
        }}
      />
      {/* top-right */}
      <div
        className={orbBase}
        style={{
          width: 600,
          height: 500,
          background: "var(--app-orb-2)",
          top: -80,
          right: -120,
          filter: "blur(70px)",
          opacity: 0.85,
        }}
      />
      {/* center */}
      <div
        className={orbBase}
        style={{
          width: 550,
          height: 400,
          background: "var(--app-orb-5)",
          top: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          filter: "blur(90px)",
          opacity: 0.6,
        }}
      />
      {/* mid-left */}
      <div
        className={orbBase}
        style={{
          width: 400,
          height: 350,
          background: "var(--app-orb-6)",
          top: "40%",
          left: -80,
          filter: "blur(75px)",
          opacity: 0.65,
        }}
      />
      {/* bottom-center */}
      <div
        className={orbBase}
        style={{
          width: 500,
          height: 450,
          background: "var(--app-orb-3)",
          bottom: -100,
          left: "25%",
          filter: "blur(80px)",
          opacity: 0.75,
        }}
      />
      {/* bottom-right */}
      <div
        className={orbBase}
        style={{
          width: 450,
          height: 400,
          background: "var(--app-orb-4)",
          bottom: -80,
          right: -80,
          filter: "blur(65px)",
          opacity: 0.7,
        }}
      />
    </div>
  );
}
