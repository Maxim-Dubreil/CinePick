const orbBase = "absolute rounded-full pointer-events-none";

export function AppBackground() {
  return (
    <div className="app-bg fixed inset-0 -z-10">
      {/* top-left */}
      <div
        className={orbBase}
        style={{
          width: 640,
          height: 640,
          background: "var(--app-orb-1)",
          top: -220,
          left: -160,
          filter: "blur(50px)",
        }}
      />
      {/* top-right */}
      <div
        className={orbBase}
        style={{
          width: 560,
          height: 560,
          background: "var(--app-orb-2)",
          top: -140,
          right: -180,
          filter: "blur(55px)",
        }}
      />
      {/* bottom-center */}
      <div
        className={orbBase}
        style={{
          width: 620,
          height: 560,
          background: "var(--app-orb-3)",
          bottom: -260,
          left: "20%",
          filter: "blur(55px)",
        }}
      />
      <div className="app-vignette" />
      <div className="app-grain" />
    </div>
  );
}
