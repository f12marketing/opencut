import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

export const initFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();

  // Use locally hosted files instead of CDN
  const baseURL = "/ffmpeg";

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
};

export const generateThumbnail = async (
  videoFile: File,
  timeInSeconds = 1
): Promise<string> => {
  const ffmpeg = await initFFmpeg();

  const inputName = "input.mp4";
  const outputName = "thumbnail.jpg";

  // Write input file
  await ffmpeg.writeFile(
    inputName,
    new Uint8Array(await videoFile.arrayBuffer())
  );

  try {
    // Generate thumbnail at specific time
    await ffmpeg.exec([
      "-i",
      inputName,
      "-ss",
      timeInSeconds.toString(),
      "-vframes",
      "1",
      "-vf",
      "scale=320:240",
      "-q:v",
      "2",
      outputName,
    ]);

    // Read output file
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: "image/jpeg" });

    return URL.createObjectURL(blob);
  } finally {
    // Cleanup
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {}
    try {
      await ffmpeg.deleteFile(outputName);
    } catch {}
  }
};

export const trimVideo = async (
  videoFile: File,
  startTime: number,
  endTime: number,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();

  const inputName = "input.mp4";
  const outputName = "output.mp4";

  // Set up progress callback and ensure cleanup afterwards
  const progressHandler = onProgress
    ? ({ progress }: { progress: number }) => {
        onProgress(progress * 100);
      }
    : null;
  if (progressHandler) ffmpeg.on("progress", progressHandler as any);

  // Write input file
  await ffmpeg.writeFile(
    inputName,
    new Uint8Array(await videoFile.arrayBuffer())
  );

  const duration = endTime - startTime;

  try {
    // Trim video
    await ffmpeg.exec([
      "-i",
      inputName,
      "-ss",
      startTime.toString(),
      "-t",
      duration.toString(),
      "-c",
      "copy", // Use stream copy for faster processing
      outputName,
    ]);

    // Read output file
    const data = await ffmpeg.readFile(outputName);
    return new Blob([data], { type: "video/mp4" });
  } finally {
    // Cleanup
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {}
    try {
      await ffmpeg.deleteFile(outputName);
    } catch {}

    // Reset progress listener to a no-op to avoid listener buildup across calls
    if (progressHandler) ffmpeg.on("progress", () => {} as any);
  }
};

export const getVideoInfo = async (
  videoFile: File
): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
}> => {
  const ffmpeg = await initFFmpeg();

  const inputName = "input.mp4";

  // Write input file
  await ffmpeg.writeFile(
    inputName,
    new Uint8Array(await videoFile.arrayBuffer())
  );

  // Capture FFmpeg stderr output with a one-time listener pattern
  let ffmpegOutput = "";
  const logHandler = ({ message }: { message: string }) => {
    ffmpegOutput += message;
  };
  ffmpeg.on("log", logHandler as any);

  try {
    // Run ffmpeg to get info (stderr will contain the info)
    await ffmpeg.exec(["-i", inputName, "-f", "null", "-"]);
  } catch (error) {
    console.error("FFmpeg execution failed:", error);
    throw new Error(
      "Failed to extract video info. The file may be corrupted or in an unsupported format."
    );
  } finally {
    // Disable listener after exec completes to prevent accumulation across calls
    ffmpeg.on("log", () => {} as any);
    // Cleanup
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {}
  }

  // Parse output for duration, resolution, and fps
  // Example: Duration: 00:00:10.00, start: 0.000000, bitrate: 1234 kb/s
  // Example: Stream #0:0: Video: h264 (High), yuv420p(progressive), 1920x1080 [SAR 1:1 DAR 16:9], 30 fps, 30 tbr, 90k tbn, 60 tbc

  const durationMatch = ffmpegOutput.match(/Duration: (\d+):(\d+):([\d.]+)/);
  let duration = 0;
  if (durationMatch) {
    const [, h, m, s] = durationMatch;
    duration = parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
  }

  const videoStreamMatch = ffmpegOutput.match(
    /Video:.* (\d+)x(\d+)[^,]*, ([\d.]+) fps/
  );
  let width = 0,
    height = 0,
    fps = 0;
  if (videoStreamMatch) {
    width = parseInt(videoStreamMatch[1]);
    height = parseInt(videoStreamMatch[2]);
    fps = parseFloat(videoStreamMatch[3]);
  }

  return {
    duration,
    width,
    height,
    fps,
  };
};

export const convertToWebM = async (
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();

  const inputName = "input.mp4";
  const outputName = "output.webm";

  // Set up progress callback
  const progressHandler = onProgress
    ? ({ progress }: { progress: number }) => onProgress(progress * 100)
    : null;
  if (progressHandler) ffmpeg.on("progress", progressHandler as any);

  // Write input file
  await ffmpeg.writeFile(
    inputName,
    new Uint8Array(await videoFile.arrayBuffer())
  );

  try {
    // Convert to WebM
    await ffmpeg.exec([
      "-i",
      inputName,
      "-c:v",
      "libvpx-vp9",
      "-crf",
      "30",
      "-b:v",
      "0",
      "-c:a",
      "libopus",
      outputName,
    ]);

    // Read output file
    const data = await ffmpeg.readFile(outputName);
    return new Blob([data], { type: "video/webm" });
  } finally {
    // Cleanup
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {}
    try {
      await ffmpeg.deleteFile(outputName);
    } catch {}

    // Reset progress listener to a no-op to avoid listener buildup across calls
    if (progressHandler) ffmpeg.on("progress", () => {} as any);
  }
};

export const extractAudio = async (
  videoFile: File,
  format: "mp3" | "wav" = "mp3"
): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();

  const inputName = "input.mp4";
  const outputName = `output.${format}`;

  // Write input file
  await ffmpeg.writeFile(
    inputName,
    new Uint8Array(await videoFile.arrayBuffer())
  );

  try {
    // Extract audio
    await ffmpeg.exec([
      "-i",
      inputName,
      "-vn", // Disable video
      "-acodec",
      format === "mp3" ? "libmp3lame" : "pcm_s16le",
      outputName,
    ]);

    // Read output file
    const data = await ffmpeg.readFile(outputName);
    return new Blob([data], { type: `audio/${format}` });
  } finally {
    // Cleanup
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {}
    try {
      await ffmpeg.deleteFile(outputName);
    } catch {}
  }
};
