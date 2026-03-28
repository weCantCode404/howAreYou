"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

const SLIDES = [
  { src: "/assets/Levitate Meditate Peace and love.json", label: "Peace & Wellness" },
  { src: "/assets/Doctor.json", label: "Doctor Support" },
  { src: "/assets/health blue.json", label: "Health Monitoring" },
];

const INTERVAL_MS = 5000;

export default function LottieCarousel() {
  const [animationDataList, setAnimationDataList] = useState([]);
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    Promise.all(SLIDES.map((s) => fetch(s.src).then((r) => r.json()))).then(
      setAnimationDataList
    );
  }, []);

  const goTo = useCallback(
    (idx) => {
      if (idx === active) return;
      setFading(true);
      setTimeout(() => {
        setActive(idx);
        setFading(false);
      }, 300);
    },
    [active]
  );

  useEffect(() => {
    if (animationDataList.length === 0) return;

    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setActive((prev) => (prev + 1) % SLIDES.length);
        setFading(false);
      }, 300);
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, [animationDataList]);

  if (animationDataList.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="w-full max-w-[340px] aspect-square flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-border-default" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="w-full max-w-[340px] aspect-square transition-opacity duration-300 ease-out"
        style={{ opacity: fading ? 0 : 1 }}
      >
        <Lottie
          animationData={animationDataList[active]}
          loop
          autoplay
          className="w-full h-full"
        />
      </div>

      <div className="flex items-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === active
                ? "w-6 h-2.5 bg-primary"
                : "w-2.5 h-2.5 bg-border-default hover:bg-text-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
