"use client";

import { useState, useEffect } from "react";
import Lottie from "lottie-react";

const WAVE_SRC = "/assets/wave.json";

export default function WaveAnimation({ className = "" }) {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    fetch(WAVE_SRC)
      .then((r) => r.json())
      .then(setAnimationData)
      .catch(() => {});
  }, []);

  if (!animationData) return null;

  return (
    <div className={className}>
      <Lottie animationData={animationData} loop autoplay className="w-full h-full" />
    </div>
  );
}
