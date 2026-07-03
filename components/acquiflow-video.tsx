"use client";

import { useRef, useState } from "react";

export function AcquiflowVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  const start = () => {
    setStarted(true);
    videoRef.current?.play();
  };

  return (
    <div className="video-frame">
      <video
        ref={videoRef}
        src="/video/acquiflow-tutorial.mp4"
        poster="/video/acquiflow-tutorial-poster.jpg"
        controls={started}
        playsInline
        preload="metadata"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 2,
          background: "#0d1117",
        }}
      />

      {!started && (
        <>
          <div className="video-bg-grid" style={{ zIndex: 3 }}></div>
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 3, opacity: 0.35, pointerEvents: "none" }}
            viewBox="0 0 1080 608"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <linearGradient id="vidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10D597" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <circle cx="200" cy="200" r="80" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
            <circle
              cx="200" cy="200" r="80"
              fill="none"
              stroke="url(#vidGrad)"
              strokeWidth="4"
              strokeDasharray="502.65"
              strokeDashoffset="55"
              strokeLinecap="round"
              transform="rotate(-90 200 200)"
            />
            <g transform="translate(820, 140)" opacity="0.8">
              <rect x="0" y="60" width="14" height="80" fill="rgba(34,211,238,0.3)" rx="2" />
              <rect x="22" y="40" width="14" height="100" fill="rgba(34,211,238,0.5)" rx="2" />
              <rect x="44" y="20" width="14" height="120" fill="rgba(16,213,151,0.6)" rx="2" />
              <rect x="66" y="0" width="14" height="140" fill="rgba(16,213,151,0.8)" rx="2" />
              <rect x="88" y="30" width="14" height="110" fill="rgba(34,211,238,0.4)" rx="2" />
            </g>
            <path d="M 280 200 Q 500 150 800 220" stroke="rgba(34,211,238,0.3)" strokeWidth="1" fill="none" strokeDasharray="4,4" />
          </svg>

          <button
            className="play-btn"
            aria-label="Play product walkthrough"
            onClick={start}
            style={{ zIndex: 5 }}
          ></button>

          <div className="video-meta" style={{ zIndex: 4, pointerEvents: "none" }}>
            <div className="label">Walkthrough</div>
            <div className="title">From raw listing to LOI-ready</div>
            <div className="duration">0:39 · HD</div>
          </div>
        </>
      )}

      <div className="video-corner-tl" style={{ zIndex: 4, pointerEvents: "none" }}></div>
      <div className="video-corner-br" style={{ zIndex: 4, pointerEvents: "none" }}></div>
    </div>
  );
}
