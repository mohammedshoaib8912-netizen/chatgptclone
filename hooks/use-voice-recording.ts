"use client";

import { useCallback, useRef, useState } from "react";

type RecordingState = "idle" | "recording" | "processing";

export function useVoiceRecording() {
  const [recordingState, setRecordingState] =
    useState<RecordingState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Try to use webm first, fall back to supported formats
      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/wav")) {
          mimeType = "audio/wav";
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
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
      // Clean up stream if an error occurs after obtaining it
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      console.error("Error starting recording:", error);
      throw error;
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder) {
        reject(new Error("No active recording"));
        return;
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        // Stop all tracks to release the microphone
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());

        resolve(audioBlob);
      };

      mediaRecorder.onerror = (event: Event) => {
        const error = (event as ErrorEvent).error || new Error("Recording failed");
        reject(error);
      };

      setRecordingState("processing");
      mediaRecorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;

    if (mediaRecorder) {
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      mediaRecorder.stop();
      audioChunksRef.current = [];
      setRecordingState("idle");
    }
  }, []);

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
