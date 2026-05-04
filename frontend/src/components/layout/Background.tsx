import { useMemo, useEffect } from "react";

interface BackgroundProps {
  variant?: "landing" | "app";
  onLoaded?: () => void;
}

const ALL_POSTERS = [
  "/posters/1kgtDkErzW0igJFVVxr13nrTDGq.webp",
  "/posters/1pnigkWWy8W032o9TKDneBa3eVK.webp",
  "/posters/2IUCa73cvvIgZSiJcNtPBf4L5iF.jpg",
  "/posters/2KQI0x6AEdbiN6z4LWjKZHukMzZ.webp",
  "/posters/2V5Z0E1xmrPOZqCkRUkUCTxvixy.jpg",
  "/posters/4a0I37pYcdFY6HeutalHQTGs0sl.webp",
  "/posters/4y5AUH8oN9iRP1oRymxIgXkvWqy.jpg",
  "/posters/5gJOu3t2QrznuJqjCG7FQDMI76t.jpg",
  "/posters/5jVt4pVa0mPcYQmsXhYq19tXmT7.webp",
  "/posters/5k8QYv1vJGY2ymqxPbfkHwJLhNp.webp",
  "/posters/5QHAxJkx9BTs6YJa0BdnY9ZtBRA.webp",
  "/posters/6rhCcgAMr0LsvPEdV7wO4yrWXMf.jpg",
  "/posters/7hLSzZX2jROmEXz2aEoh6JKUFy2.webp",
  "/posters/7tTUs77uOWee6GIOMB6OhtLgslI.webp",
  "/posters/8OJnmZhClKdhyuplstGcoub7pJC.jpg",
  "/posters/8ZFw1Lx6epPmVVrovQP7RjaFAuE.jpg",
  "/posters/12TAqK0AUgdcYE9ZYZ9r7ASbH5Q.webp",
  "/posters/89GnRTK1CjJSUelKKHLIPXsVam9.webp",
  "/posters/352bJ6vCTnMJQKAsLmHpU5VLWcY.jpg",
  "/posters/A0Th0x8QIzP0njrFAJnYQ5ouIoB.jpg",
  "/posters/boAUuJBeID7VNp4L7LNMQs8mfQS.webp",
  "/posters/bp5mfMx73GqFlHALDv0cs8WhcPf.jpg",
  "/posters/c6NveyskoKlwAvouqEmKBRU0Pkp.jpg",
  "/posters/cf7hE1ifY4UNbS25tGnaTyyDrI2.webp",
  "/posters/cnniZQGtjK8kh2tsjih4GtkX6bl.jpg",
  "/posters/cRBUYC02CPsVa1GqBq6rfHn5a8g.webp",
  "/posters/dei0MF0dWPOLRGWNXa0LTJG8mtv.webp",
  "/posters/dn2tyLAx5syITEQ9989iQ79eMNW.webp",
  "/posters/dQIQZbJXn1pflQw3nwvXLJX0dHa.webp",
  "/posters/eEpy8IiR8N0S6mgkdAjDCMlMYQO.webp",
  "/posters/efqJtlo5J1hBNFmbwyjyAR9Mpr2.jpg",
  "/posters/fFXrCl7nBFFaQU3IgTlinvk6vTi.webp",
  "/posters/fnPw9ouGT89hE8mcyxq9oUwQjP4.jpg",
  "/posters/fQ0vGVTtxjCdAJnxwPZ88O3Wzrh.jpg",
  "/posters/ftnEmnoHI5Znlzg0TwGcSMoXJt1.webp",
  "/posters/fWVSwgjpT2D78VUh6X8UBd2rorW.webp",
  "/posters/gajOIkrWq10MDjpHwCmIt4Yip2z.webp",
  "/posters/gBxCZuieAe8KClWWP1vVijXBlTp.webp",
  "/posters/gfdhSzPyAWtAizqs4ytc0MwOlQg.jpg",
  "/posters/gRMalasZEzsZi4w2VFuYusfSfqf.webp",
  "/posters/gvWfXts6Qp34z8VTzpMagatA0nD.jpg",
  "/posters/h06jDZB4Y9YQJiSGTcUwbhuiUrB.jpg",
  "/posters/hkhbbSQdsV3U0HtuPugHfx2wOi9.jpg",
  "/posters/hUK9rewffKGqtXynH5SW3v9hzcu.jpg",
  "/posters/iT6afW4wKqZYeCqi7jHV2u6iq3W.webp",
  "/posters/j6G24dqI4WgUtChhWjfnI4lnmiK.jpg",
  "/posters/kO35BwoKHyP1VRulxZJVeEl5dvS.jpg",
  "/posters/l8CES84JndFlNfBNMxdLRYaLvI6.jpg",
  "/posters/lGlJ2cTDwMacj5nuANd38UjVGNQ.webp",
  "/posters/lPKwFzX4TiWLA4Mo5Bnf8aIIrJm.jpg",
  "/posters/mlSsQWIQV0NKIqqRQRI0yi9gqk8.jpg",
  "/posters/n6UChiAOSTHGih2FBactLjA4Cdt.jpg",
  "/posters/oJ7g2CifqpStmoYQyaLQgEU32qO.webp",
  "/posters/orN43xQQkoAmbUx1tYZl6HY7WKU.jpg",
  "/posters/pEoqbqtLc4CcwDUDqxmEDSWpWTZ.jpg",
  "/posters/pmKcZgqpe4DNErrHWLOogeflsfZ.webp",
  "/posters/pmYOsWz9F7qNQaT9MNe0n0JKsR4.webp",
  "/posters/prwtTDfRbwdNOzjURTabW3UYW0O.webp",
  "/posters/qcWTuWPu6x6t2MKt0MTfbResJiV.webp",
  "/posters/qEr65B4yGlsmLQjcM0xjSUMfZS2.webp",
  "/posters/qfuO1yue5bQnocFiOUM07dwLdmo.jpg",
  "/posters/r9a6jyW4CBsQ5QyF12eJC84YdAd.jpg",
  "/posters/r50wDuYKYA4iAO36X0kTivUHhFz.jpg",
  "/posters/rBrJl1vUtaM6NU0EwxKSnc3nBxE.jpg",
  "/posters/s27zqyyCJvSm72f3uThjxcgmX6M.webp",
  "/posters/scaiAT7I2KZ2GAeMvoU6Ro1515J.jpg",
  "/posters/sVmDIIFPzbyEz87dZYpLfetn4Lm.webp",
  "/posters/t4P2079IyK19njHDP2GwQrKdvzd.webp",
  "/posters/t30GjttOdb5At1sYy8b3TOwFgWV.webp",
  "/posters/u0Ct3708zXaoJCkF65bLfenQmhM.jpg",
  "/posters/udRaQKzT0LG4iQFxHLaYjno9uAT.webp",
  "/posters/vFXsutvgTZjvGxDkxISoENp6chp.jpg",
  "/posters/vLY17UVvhwXpEjnTqTYqlmuO2py.webp",
  "/posters/vRXUnWrXUgXRoX0BaEcuNMfyeQt.jpg",
  "/posters/vxMeKC7o5Gi8IHMi6lUgsdprTqv.webp",
  "/posters/wfuqMlaExcoYiUEvKfVpUTt1v4u.webp",
  "/posters/wGTpGGRMZmyFCcrY2YoxVTIBlli.webp",
  "/posters/wqG9YXPBpDbC4NpV1Xc42BOm2hO.jpg",
  "/posters/xHeuF5zzlx1YxkULiz0mx1TMBJ7.jpg",
  "/posters/xi8Iu6qyTfyZVDVy60raIOYJJmk.jpg",
  "/posters/xiPX9jCpPXQIqIrbbuHfsL4qt9c.jpg",
  "/posters/xjtWQ2CL1mpmMNwuU5HeS4Iuwuu.webp",
  "/posters/y1bgzJiMVTNY4RoNc29eCebio57.jpg",
  "/posters/yihdXomYb5kTeSivtFndMy5iDmf.webp",
  "/posters/ypUCFOvOf07bcHy81jng9LyMUfi.webp",
  "/posters/zf9GBMbvU2KA8dDpZ2MaApUsFX8.webp",
  "/posters/zoiGcNlYBR0r2fO2uP44XQF6S1W.jpg",
  "/posters/zppHKKEkHg9ZGzOdzZwW8lZYYqy.webp",
  "/posters/zRqCRaYXUnAtBBuU1J3DVA4yc5V.webp",
];

function getRandomPosters(count: number): string[] {
  return [...ALL_POSTERS].sort(() => Math.random() - 0.5).slice(0, count);
}

export function Background({ variant = "landing", onLoaded }: BackgroundProps) {
  const posters = useMemo(() => getRandomPosters(40), []);

  useEffect(() => {
    if (variant !== "landing") {
      onLoaded?.();
      return;
    }

    let loadedCount = 0;
    posters.forEach((src) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loadedCount++;
        if (loadedCount >= posters.length * 0.6) {
          onLoaded?.();
        }
      };
      img.src = src;
    });
  }, [onLoaded, posters, variant]);

  if (variant === "landing") {
    return (
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Grille d'affiches */}
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: "repeat(10, 1fr)",
            gridTemplateRows: "repeat(4, 1fr)",
          }}
        >
          {posters.map((src, i) => (
            <div
              key={i}
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${src})` }}
            />
          ))}
        </div>

        {/* Overlay blur */}
        <div
          className="absolute inset-0"
          style={{
            background: "rgba(8, 8, 16, 0.76)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(34px)",
          }}
        />

        {/* Orbe 1 */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 600,
            height: 600,
            background: "#5B21B6",
            opacity: 0.35,
            filter: "blur(120px)",
            top: -180,
            left: -100,
          }}
        />
        {/* Orbe 2 */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 400,
            height: 400,
            background: "#7C3AED",
            opacity: 0.25,
            filter: "blur(90px)",
            top: -100,
            right: -60,
          }}
        />
        {/* Orbe 3 */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 300,
            height: 300,
            background: "#4C1D95",
            opacity: 0.3,
            filter: "blur(80px)",
            bottom: 60,
            left: "40%",
          }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 -z-10" style={{ background: "#080810" }}>
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
