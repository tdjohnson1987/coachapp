// src/api/sttApi.js
const STT_ENDPOINT = "http://192.168.0.137:8000/stt" // change to your server URL

export async function transcribeAudio(audioUri) {
  if (!audioUri) {
    return { text: "", segments: [], language: "en", confidence: 0 };
  }

  try {
    const fileName = audioUri.split("/").pop() || "audio.m4a";
    const fileType = guessMimeType(fileName);

    const formData = new FormData();
    formData.append("file", {
      uri: audioUri,
      name: fileName,
      type: fileType,
    });
    formData.append("language", "auto"); // or "sv", "en", etc.

    const res = await fetch(STT_ENDPOINT, {
      method: "POST",
      body: formData,
      headers: {
        // Do NOT set Content-Type manually; RN will set multipart boundary
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`STT error ${res.status}: ${txt}`);
    }

    const json = await res.json();

    // Normalize shape for AnalysisService / STT report code
    return {
      text: json.text || "",
      segments: json.segments || [],
      language: json.language || "en",
      confidence: json.confidence ?? 0,
    };
  } catch (e) {
    console.warn("transcribeAudio failed", e);
    return { text: "", segments: [], language: "en", confidence: 0, error: e.message };
  }
}

function guessMimeType(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".m4a")) return "audio/m4a";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".caf")) return "audio/x-caf";
  return "audio/m4a";
}
