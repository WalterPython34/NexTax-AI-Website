"use client";

import { useState } from "react";

/**
 * VideoWalkthrough — styled placeholder that swaps to a native <video>
 * on play. Video loads only after the user clicks (no page-weight cost).
 *
 * Assets expected in the repo:
 *   /public/video/acquiflow-tutorial.mp4
 *   /public/video/acquiflow-tutorial-poster.jpg
 */
export default function VideoWalkthrough() {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="video-frame">
        <video
          src="/video/acquiflow-tutorial.mp4"
          poster="/video/acquiflow-tutorial-poster.jpg"
          controls
          autoPlay
          playsInline
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            background: "#0d1117",
            zIndex: 2,
          }}
        />
      </div>
    );
  }

  return (
    <div className="video-frame">
      <div className="video-bg-grid"></div>
      <div className="video-corner-tl"></div>
      <div className="video-corner-br"></div>
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          opacity: 0.35,
        }}
        viewBox="0 0 1080 608"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="vidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10D597" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <circle
          cx="200"
          cy="200"
          r="80"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="4"
        />
        <circle
          cx="200"
          cy="200"
          r="80"
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
        <path
          d="M 280 200 Q 500 150 800 220"
          stroke="rgba(34,211,238,0.3)"
          strokeWidth="1"
          fill="none"
          strokeDasharray="4,4"
        />
      </svg>
      <button
        className="play-btn"
        aria-label="Play product walkthrough"
        onClick={() => setPlaying(true)}
      ></button>
      <div className="video-meta">
        <div className="label">Walkthrough</div>
        <div className="title">From raw listing to LOI-ready</div>
        <div className="duration">0:39 · HD</div>
      </div>
    </div>
  );
}
