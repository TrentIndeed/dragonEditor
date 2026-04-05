"""
Local transcription server for Dragon Editor.
Receives raw audio (WAV), runs faster-whisper, returns word-level timestamps.
"""

import io
import sys
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from faster_whisper import WhisperModel

app = Flask(__name__)
CORS(app)

print("Loading Whisper model...")
model = WhisperModel("base.en", device="cpu", compute_type="int8")
print("Model loaded.")


@app.route("/transcribe", methods=["POST"])
def transcribe():
    """
    Accepts raw PCM float32 audio at 16kHz mono in the request body.
    Returns word-level timestamps + silence regions.
    """
    try:
        audio_bytes = request.data
        if not audio_bytes:
            return jsonify({"error": "No audio data"}), 400

        # Parse raw float32 PCM
        audio = np.frombuffer(audio_bytes, dtype=np.float32)

        if len(audio) < 1600:  # Less than 0.1s
            return jsonify({"error": "Audio too short"}), 400

        # Run transcription with word timestamps
        segments, info = model.transcribe(
            audio,
            beam_size=5,
            language="en",
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=800),
            word_timestamps=True,
        )

        words = []
        segment_list = []
        for seg in segments:
            segment_list.append({
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": seg.text.strip(),
            })
            if seg.words:
                for w in seg.words:
                    words.append({
                        "word": w.word.strip(),
                        "start": round(w.start, 3),
                        "end": round(w.end, 3),
                        "probability": round(w.probability, 3),
                    })

        # Detect silence regions (gaps between segments > 1s)
        silences = []
        all_times = []
        for s in segment_list:
            all_times.append((s["start"], s["end"]))

        all_times.sort()
        for i in range(len(all_times) - 1):
            gap_start = all_times[i][1]
            gap_end = all_times[i + 1][0]
            if gap_end - gap_start > 1.0:
                silences.append({
                    "start": round(gap_start, 3),
                    "end": round(gap_end, 3),
                    "duration": round(gap_end - gap_start, 3),
                })

        # Check for silence at the beginning
        if all_times and all_times[0][0] > 1.0:
            silences.insert(0, {
                "start": 0,
                "end": round(all_times[0][0], 3),
                "duration": round(all_times[0][0], 3),
            })

        # Detect filler words
        FILLERS = {"um", "uh", "like", "you know", "basically", "literally",
                   "actually", "so", "right", "i mean", "er", "ah"}
        filler_instances = []
        for w in words:
            if w["word"].lower().strip(".,!?") in FILLERS:
                filler_instances.append(w)

        audio_duration = len(audio) / 16000.0

        return jsonify({
            "duration": round(audio_duration, 3),
            "language": info.language if hasattr(info, "language") else "en",
            "segments": segment_list,
            "words": words,
            "silences": silences,
            "fillers": filler_instances,
            "stats": {
                "total_words": len(words),
                "total_segments": len(segment_list),
                "silence_count": len(silences),
                "filler_count": len(filler_instances),
                "total_silence_duration": round(sum(s["duration"] for s in silences), 3),
            },
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("Transcription server running on http://localhost:5555")
    app.run(host="127.0.0.1", port=5555, debug=False)
