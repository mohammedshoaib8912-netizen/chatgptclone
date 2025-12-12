import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";

const AudioFileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 25 * 1024 * 1024, {
      message: "File size should be less than 25MB",
    })
    .refine(
      (file) =>
        [
          "audio/webm",
          "audio/mpeg",
          "audio/mp3",
          "audio/wav",
          "audio/m4a",
        ].includes(file.type),
      {
        message: "File type should be webm, mp3, wav, or m4a",
      }
    ),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = AudioFileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Configure OpenAI client
    // Note: This requires OPENAI_API_KEY to be set in environment variables
    // The AI Gateway doesn't currently support the Whisper API endpoint
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Voice chat is not configured. Please contact the administrator to enable this feature." },
        { status: 503 }
      );
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Convert the Blob to a File object for OpenAI
    // Map MIME type to appropriate file extension
    const mimeTypeToExtension: Record<string, string> = {
      "audio/webm": "webm",
      "audio/mpeg": "mp3",
      "audio/mp3": "mp3",
      "audio/wav": "wav",
      "audio/m4a": "m4a",
      "audio/mp4": "m4a",
    };
    const extension = mimeTypeToExtension[file.type] || "webm";
    const audioFile = new File([file], `audio.${extension}`, {
      type: file.type,
    });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("Error processing transcription:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
