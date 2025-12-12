"use client";

import { useCallback, useRef, useState } from "react";

type RecordingState = "idle" | "recording" | "processing";

export function useVoiceRecording() {
  const [recordingState, setRecordingState] =
    useState<RecordingState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setRecordingState("recording");
    } catch (error) {
      console.error("Error starting recording:", error);
      throw error;
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || recordingState !== "recording") {
        reject(new Error("No active recording"));
        return;
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        // Stop all tracks to release the microphone
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());

        resolve(audioBlob);
      };

      mediaRecorder.onerror = (event) => {
        reject(event);
      };

      setRecordingState("processing");
      mediaRecorder.stop();
    });
  }, [recordingState]);

  const cancelRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;

    if (mediaRecorder && recordingState === "recording") {
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      mediaRecorder.stop();
      audioChunksRef.current = [];
      setRecordingState("idle");
    }
  }, [recordingState]);

  const resetState = useCallback(() => {
    setRecordingState("idle");
  }, []);

  return {
    recordingState,
    startRecording,
    stopRecording,
    cancelRecording,
    resetState,
  };
}
