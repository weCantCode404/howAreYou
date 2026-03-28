"use client";

import { useState, useEffect, useRef } from "react";
import Lottie from "lottie-react";

const ANIMATION_SRC = "/assets/ai animation Flow 1.json";

export default function AIAnimation({ isAnimating = false, className = "" }) {
  const [animationData, setAnimationData] = useState(null);
  const lottieRef = useRef(null);

  useEffect(() => {
    fetch(ANIMATION_SRC)
      .then((r) => r.json())
      .then(setAnimationData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!lottieRef.current) return;

    if (isAnimating) {
      lottieRef.current.play();
    } else {
      lottieRef.current.goToAndStop(0, true);
    }
  }, [isAnimating]);

  if (!animationData) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={className}>
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={isAnimating}
        autoplay={false}
        className="w-full h-full"
      />
    </div>
  );
}
