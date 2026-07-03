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
        <button
          className="play-btn"
          aria-label="Play product walkthrough"
          onClick={start}
          style={{ zIndex: 4 }}
        ></button>
      )}
      <div className="video-corner-tl" style={{ zIndex: 3, pointerEvents: "none" }}></div>
      <div className="video-corner-br" style={{ zIndex: 3, pointerEvents: "none" }}></div>
    </div>
  );
}
