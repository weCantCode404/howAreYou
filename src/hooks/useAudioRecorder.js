"use client";

import { useState, useRef, useCallback } from "react";

const MIME_TYPES = ["audio/webm", "audio/mp4", "audio/ogg"];

function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || null;
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = useCallback(() => {
    setError(null);

    return new Promise((resolve, reject) => {
      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        const err = new Error("Audio recording is not supported in this browser.");
        setError(err.message);
        reject(err);
        return;
      }

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          chunksRef.current = [];
          const recorder = new MediaRecorder(stream, { mimeType });

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };

          recorder.onerror = () => {
            setError("Recording failed.");
            setIsRecording(false);
          };

          mediaRecorderRef.current = recorder;
          recorder.start();
          setIsRecording(true);
          resolve();
        })
        .catch((err) => {
          const msg =
            err.name === "NotAllowedError"
              ? "Microphone access denied. Please allow microphone permissions."
              : "Could not access microphone.";
          setError(msg);
          reject(new Error(msg));
        });
    });
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        recorder.stream.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        setIsRecording(false);
        resolve(blob);
      };

      recorder.stop();
    });
  }, []);

  return { isRecording, error, startRecording, stopRecording };
}
