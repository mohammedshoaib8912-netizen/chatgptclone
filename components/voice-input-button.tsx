"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { type Dispatch, memo, type SetStateAction, useCallback } from "react";
import { toast } from "sonner";

import type { ChatMessage } from "@/lib/types";

import { useVoiceRecording } from "@/hooks/use-voice-recording";
import { LoaderIcon, MicrophoneIcon } from "./icons";
import { Button } from "./ui/button";

function PureVoiceInputButton({
  setInput,
  status,
}: {
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>["status"];
}) {
  const {
    recordingState,
    startRecording,
    stopRecording,
    cancelRecording,
    resetState,
  } = useVoiceRecording();

  const handleTranscription = useCallback(
    async (audioBlob: Blob) => {
      try {
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");

        const response = await fetch("/api/speech-to-text", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Transcription failed");
        }

        const data = await response.json();

        if (data.text) {
          setInput((prev) => (prev ? `${prev} ${data.text}` : data.text));
        }

        resetState();
      } catch (error) {
        console.error("Transcription error:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to transcribe audio. Please try again."
        );
        resetState();
      }
    },
    [setInput, resetState]
  );

  const handleClick = useCallback(async () => {
    if (recordingState === "idle") {
      try {
        await startRecording();
      } catch (error) {
        console.error("Recording error:", error);
        if (
          error instanceof Error &&
          error.name === "NotAllowedError"
        ) {
          toast.error(
            "Microphone permission denied. Please allow microphone access in your browser settings."
          );
        } else {
          toast.error("Failed to start recording. Please try again.");
        }
      }
    } else if (recordingState === "recording") {
      try {
        const audioBlob = await stopRecording();
        await handleTranscription(audioBlob);
      } catch (error) {
        console.error("Stop recording error:", error);
        toast.error("Failed to stop recording. Please try again.");
        cancelRecording();
        resetState();
      }
    }
  }, [
    recordingState,
    startRecording,
    stopRecording,
    handleTranscription,
    cancelRecording,
    resetState,
  ]);

  const isDisabled = status !== "ready" || recordingState === "processing";

  return (
    <Button
      className="aspect-square h-8 rounded-lg p-1 transition-colors hover:bg-accent"
      data-testid="voice-input-button"
      disabled={isDisabled}
      onClick={handleClick}
      type="button"
      variant="ghost"
    >
      {recordingState === "processing" ? (
        <LoaderIcon size={14} style={{ animation: "spin 1s linear infinite" }} />
      ) : (
        <MicrophoneIcon
          className={
            recordingState === "recording"
              ? "animate-pulse text-red-500"
              : ""
          }
          size={14}
          style={{ width: 14, height: 14 }}
        />
      )}
    </Button>
  );
}

export const VoiceInputButton = memo(PureVoiceInputButton);
