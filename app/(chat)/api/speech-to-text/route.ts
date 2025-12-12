import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";

// Singleton OpenAI client instance
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return null;
  }
  
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  
  return openaiClient;
}

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
          "audio/mp4",
        ].includes(file.type),
      {
        message: "File type should be webm, mp3, wav, m4a, or mp4",
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

    // Get or create OpenAI client instance
    const openai = getOpenAIClient();

    if (!openai) {
      return NextResponse.json(
        { error: "Voice chat is not configured. Please contact the administrator to enable this feature." },
        { status: 503 }
      );
    }

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
    
    // Provide more specific error messages based on error type
    let status = 500;
    let message = "Failed to process request";

    if (error && typeof error === "object") {
      const err: any = error;
      
      // Handle OpenAI API errors
      if (err.status === 429) {
        status = 429;
        message = "OpenAI API rate limit exceeded. Please try again later.";
      } else if (err.status === 400) {
        status = 400;
        message = "Invalid audio file. Please check your recording and try again.";
      } else if (err.status === 401 || err.status === 403) {
        status = 503;
        message = "Voice chat is not properly configured. Please contact the administrator.";
      } else if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
        status = 503;
        message = "Unable to connect to transcription service. Please try again later.";
      } else if (typeof err.message === "string" && err.message.toLowerCase().includes("timeout")) {
        status = 504;
        message = "Transcription request timed out. Please try again.";
      }
    }

    return NextResponse.json({ error: message }, { status });
  }
}
