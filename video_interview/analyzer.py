"""
video_interview/analyzer.py
Full pipeline: voice confidence + eye contact + posture + content scoring
"""
import os, json, tempfile, subprocess, numpy as np
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Force ffmpeg into PATH for this process (fixes Windows PATH inheritance issue)
FFMPEG_BIN_DIR = r"C:\Users\HP\Videos\ffmpeg-8.1-essentials_build\ffmpeg-8.1-essentials_build\bin"
os.environ["PATH"] = FFMPEG_BIN_DIR + os.pathsep + os.environ.get("PATH", "")

GROQ_API_KEY = os.getenv("GROQ_API_KEY_TEXTINTERVIEW")
groq_client  = Groq(api_key=GROQ_API_KEY)
GROQ_MODEL   = "llama-3.1-8b-instant"

MODEL_PKL       = os.path.join(os.path.dirname(__file__), "confidence_model.pkl")
FACE_MODEL_PATH = os.path.join(os.path.dirname(__file__), "face_landmarker.task")
POSE_MODEL_PATH = os.path.join(os.path.dirname(__file__), "pose_landmarker.task")
FACE_MODEL_URL  = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
POSE_MODEL_URL  = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
FRAME_SKIP      = 5

FFMPEG_PATH = r"C:\Users\HP\Videos\ffmpeg-8.1-essentials_build\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"


def _load_mediapipe_models():
    import urllib.request
    for url, path in [(FACE_MODEL_URL, FACE_MODEL_PATH), (POSE_MODEL_URL, POSE_MODEL_PATH)]:
        if not os.path.exists(path):
            print(f"Downloading {os.path.basename(path)}...")
            urllib.request.urlretrieve(url, path)


# ── 1. Audio extraction ───────────────────────────────────────────────────────
def _extract_audio(video_path: str) -> str:
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.close()
    subprocess.run(
        [FFMPEG_PATH, "-y", "-i", video_path, "-ac", "1", "-ar", "16000", tmp.name],
        capture_output=True, check=True
    )
    return tmp.name


# ── 2. Acoustic feature extraction ───────────────────────────────────────────
def _extract_features(audio_path: str):
    import librosa, parselmouth, warnings
    from parselmouth.praat import call
    warnings.filterwarnings("ignore")
    try:
        y, sr = librosa.load(audio_path, sr=16000)
        if len(y) < sr * 0.3:
            return None
        feats = []
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        feats.extend(np.mean(mfccs, axis=1).tolist())
        feats.extend(np.std(mfccs,  axis=1).tolist())
        feats.append(float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))))
        feats.append(float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr))))
        feats.append(float(np.mean(librosa.feature.spectral_bandwidth(y=y, sr=sr))))
        feats.append(float(np.mean(librosa.feature.zero_crossing_rate(y))))
        rms = librosa.feature.rms(y=y)[0]
        feats.append(float(np.mean(rms))); feats.append(float(np.std(rms)))
        try:
            snd    = parselmouth.Sound(audio_path)
            pobj   = snd.to_pitch()
            pv     = pobj.selected_array["frequency"]
            voiced = pv[pv > 0]
            if len(voiced) > 1:
                t = np.linspace(0, 1, len(voiced))
                feats += [float(np.mean(voiced)), float(np.std(voiced)),
                          float(np.max(voiced) - np.min(voiced)),
                          float(np.polyfit(t, voiced, 1)[0]),
                          len(voiced) / max(len(pv), 1)]
            else:
                feats += [0.0] * 5
            pp = call(snd, "To PointProcess (periodic, cc)", 75, 500)
            feats.append(float(call(pp, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)))
            feats.append(float(call([snd, pp], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6)))
            harm = call(snd, "To Harmonicity (cc)", 0.01, 75, 0.1, 1.0)
            feats.append(float(call(harm, "Get mean", 0, 0)))
            iv = snd.to_intensity().values.T.flatten()
            iv = iv[iv > 0]
            feats += [float(np.mean(iv)), float(np.std(iv))] if len(iv) else [0.0, 0.0]
        except:
            feats += [0.0] * 10
        dur    = len(y) / sr
        onsets = librosa.onset.onset_detect(y=y, sr=sr, units="time")
        feats.append(len(onsets) / max(dur, 0.1))
        rms2   = librosa.feature.rms(y=y, frame_length=int(0.025*sr), hop_length=int(0.010*sr))[0]
        feats.append(float(np.mean(rms2 < np.percentile(rms2, 25))))
        r = np.array(feats, dtype=np.float32)
        return np.nan_to_num(r, nan=0.0, posinf=0.0, neginf=0.0)
    except:
        return None


def analyze_voice_confidence(audio_path: str) -> dict:
    import joblib
    default = {"score": 50, "label": "Medium Confidence",
               "probabilities": {"low": 0.2, "medium": 0.6, "high": 0.2}}
    if not os.path.exists(MODEL_PKL):
        return default
    try:
        d      = joblib.load(MODEL_PKL)
        model  = d["model"]; scaler = d["scaler"]
        vec    = _extract_features(audio_path)
        if vec is None:
            return default
        vs    = scaler.transform(vec.reshape(1, -1))
        pred  = model.predict(vs)[0]
        proba = model.predict_proba(vs)[0]
        score = round(proba[1] * 50 + proba[2] * 100, 1)
        return {
            "score": score,
            "label": {0: "Low Confidence", 1: "Medium Confidence", 2: "High Confidence"}[pred],
            "probabilities": {"low":    round(float(proba[0]), 3),
                              "medium": round(float(proba[1]), 3),
                              "high":   round(float(proba[2]), 3)}
        }
    except Exception as e:
        return {**default, "error": str(e)}


# ── 3. Transcription + disfluency ────────────────────────────────────────────
FILLERS = {"um","uh","er","ah","hmm","like","you know","i mean",
           "basically","literally","sort of","kind of"}

def transcribe_and_disfluency(audio_path: str) -> dict:
    import whisper
    model      = whisper.load_model("base")
    res        = model.transcribe(audio_path, word_timestamps=True)
    transcript = res["text"].strip()
    tl, words  = transcript.lower(), transcript.lower().split()
    segs       = res.get("segments", [])
    dur        = (segs[-1]["end"] - segs[0]["start"]) if segs else max(len(words)/2.5, 1)
    fc  = sum(words.count(f.split()[0]) if len(f.split())==1 else tl.count(f) for f in FILLERS)
    reps= sum(1 for i in range(len(words)-1) if words[i]==words[i+1] and len(words[i])>2)
    return {
        "transcript":    transcript,
        "total_words":   len(words),
        "filler_count":  fc,
        "filler_rate":   round(fc / max(dur, 1) * 60, 1),
        "filler_pct":    round(fc / max(len(words), 1) * 100, 1),
        "repetitions":   reps,
        "duration_sec":  round(dur, 1),
        "words_per_min": round(len(words) / max(dur/60, 0.01), 1),
    }


# ── 4. Eye contact ────────────────────────────────────────────────────────────
L_IRIS      = [474, 475, 476, 477]
R_IRIS      = [469, 470, 471, 472]
L_EYE_OUTER = [33,  133]
R_EYE_OUTER = [362, 263]

def analyze_eye_contact(video_path: str) -> dict:
    import cv2, mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision
    _load_mediapipe_models()
    opts = mp_vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=FACE_MODEL_PATH),
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
        num_faces=1)
    cap = cv2.VideoCapture(video_path)
    contact, total, fi = 0, 0, 0
    with mp_vision.FaceLandmarker.create_from_options(opts) as detector:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
            fi += 1
            if fi % FRAME_SKIP: continue
            h, w   = frame.shape[:2]
            mp_img = mp.Image(image_format=mp.ImageFormat.SRGB,
                              data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            result = detector.detect(mp_img)
            if not result.face_landmarks: continue
            lm = result.face_landmarks[0]
            def pt(idx): return np.array([lm[idx].x*w, lm[idx].y*h])
            li = np.mean([pt(i) for i in L_IRIS], axis=0)
            ri = np.mean([pt(i) for i in R_IRIS], axis=0)
            def ratio(iris, a, b):
                d = np.linalg.norm(pt(b)-pt(a))
                return (iris[0]-pt(a)[0])/d if d else 0.5
            r = (ratio(li,L_EYE_OUTER[0],L_EYE_OUTER[1]) +
                 ratio(ri,R_EYE_OUTER[0],R_EYE_OUTER[1])) / 2
            if 0.28 <= r <= 0.72: contact += 1
            total += 1
    cap.release()
    if not total:
        return {"score": 40, "contact_pct": 40, "label": "Moderate Eye Contact"}
    pct = contact / total * 100
    return {
        "score":       round(min(pct * 1.1, 100), 1),
        "contact_pct": round(pct, 1),
        "label": ("Strong Eye Contact" if pct >= 65 else
                  "Moderate Eye Contact" if pct >= 40 else "Poor Eye Contact")
    }


# ── 5. Posture ────────────────────────────────────────────────────────────────
def analyze_posture(video_path: str) -> dict:
    import cv2, mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions
    _load_mediapipe_models()
    opts = PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=POSE_MODEL_PATH),
        num_poses=1)
    cap = cv2.VideoCapture(video_path)
    frame_scores, fi = [], 0
    LS, RS, NOSE_I, LH, RH = 11, 12, 0, 23, 24
    with PoseLandmarker.create_from_options(opts) as detector:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
            fi += 1
            if fi % FRAME_SKIP: continue
            mp_img = mp.Image(image_format=mp.ImageFormat.SRGB,
                              data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            result = detector.detect(mp_img)
            if not result.pose_landmarks: continue
            lm = result.pose_landmarks[0]
            def pt(idx):  return np.array([lm[idx].x, lm[idx].y])
            def vis(idx): return getattr(lm[idx], "visibility", 1.0)
            if min(vis(LS), vis(RS), vis(NOSE_I)) < 0.4: continue
            ls, rs = pt(LS), pt(RS); lh, rh = pt(LH), pt(RH); nose = pt(NOSE_I)
            sw  = abs(rs[0]-ls[0])+1e-6
            shm = (ls+rs)/2; hpm = (lh+rh)/2
            th  = abs(hpm[1]-shm[1])+1e-6
            ss  = max(0.0, 1.0-abs(rs[1]-ls[1])/sw*4)
            us  = max(0.0, 1.0-abs(shm[0]-hpm[0])/th*3)
            hs  = max(0.0, 1.0-abs(nose[0]-shm[0])/sw*3)
            sl  = min(1.0, th*3)
            frame_scores.append(ss*0.3 + us*0.3 + hs*0.2 + sl*0.2)
    cap.release()
    if not frame_scores:
        return {"score": 50, "bad_posture_pct": 0, "issues": ["Body not detected in frame"],
                "label": "Needs Improvement"}
    avg   = float(np.mean(frame_scores))
    bad   = sum(1 for s in frame_scores if s < 0.5) / len(frame_scores) * 100
    score = round(avg * 100, 1)
    issues = []
    if bad > 40: issues.append(f"Poor posture for {round(bad)}% of session")
    return {
        "score": score, "bad_posture_pct": round(bad, 1), "issues": issues,
        "label": ("Excellent Posture" if score >= 80 else
                  "Good Posture"      if score >= 65 else
                  "Needs Improvement" if score >= 45 else "Poor Posture")
    }


# ── 6. Content scoring via Groq ───────────────────────────────────────────────
def score_content(question: str, transcript: str, job_role: str = "Software Engineer") -> dict:
    if not transcript or len(transcript.strip()) < 15:
        return {"score": 30, "brief_feedback": "Answer too short to evaluate.",
                "strengths": [], "improvements": ["Provide a more detailed answer"],
                "missing_keywords": [], "relevance": 30, "clarity": 30,
                "depth": 30, "structure": 30}
    prompt = (
        f"You are an expert interview coach evaluating a {job_role} candidate.\n"
        f"Question: {question}\nAnswer (transcribed): {transcript}\n"
        'Respond ONLY with a valid JSON object — no markdown, no extra text:\n'
        '{"content_score":0-100,"relevance":0-100,"clarity":0-100,"depth":0-100,'
        '"structure":0-100,"strengths":["..."],"improvements":["..."],'
        '"missing_keywords":["..."],"brief_feedback":"2-3 sentences"}'
    )
    try:
        r   = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3, max_tokens=600)
        raw = r.choices[0].message.content.strip()
        raw = raw[raw.find("{"):raw.rfind("}")+1]
        d   = json.loads(raw)
        d["score"] = d.get("content_score", 50)
        return d
    except Exception as e:
        return {"score": 50, "brief_feedback": f"Scoring error: {e}",
                "strengths": [], "improvements": [], "missing_keywords": [],
                "relevance": 50, "clarity": 50, "depth": 50, "structure": 50}


# ── 7. Full pipeline ──────────────────────────────────────────────────────────
def full_analysis(
    video_path: str,
    questions: list,
    job_role: str = "Software Engineer",
    questions_answered: int = 0
) -> dict:
    audio_path = None
    try:
        print(">>> STEP 1: Extracting audio...")
        audio_path = _extract_audio(video_path)
        print(">>> STEP 1 DONE")

        print(">>> STEP 2: Voice confidence...")
        voice = analyze_voice_confidence(audio_path)
        print(">>> STEP 2 DONE:", voice)

        print(">>> STEP 3: Transcribing...")
        speech = transcribe_and_disfluency(audio_path)
        print(">>> STEP 3 DONE")

        print(">>> STEP 4: Eye contact...")
        eye = analyze_eye_contact(video_path)
        print(">>> STEP 4 DONE:", eye)

        print(">>> STEP 5: Posture...")
        posture = analyze_posture(video_path)
        print(">>> STEP 5 DONE:", posture)

        print(">>> STEP 6: Content scoring...")
        transcript  = speech.get("transcript", "")
        words       = transcript.split()
        total_words = len(words)

        # Determine how many questions were actually answered
        # Use questions_answered from frontend; fall back to 1 if transcript has content
        n_answered = questions_answered if questions_answered > 0 else (1 if total_words >= 10 else 0)
        n_answered = min(n_answered, len(questions))  # cap at total questions

        print(f">>> Questions answered: {n_answered} / {len(questions)}")

        q_results = []
        if not questions:
            q_results = [{"question": "General",
                          **score_content("General interview question", transcript, job_role)}]
        else:
            if n_answered == 0 or total_words < 10:
                # Nothing was said
                for q in questions:
                    q_results.append({
                        "question": q, "score": 0,
                        "brief_feedback": "No answer recorded for this question.",
                        "strengths": [],
                        "improvements": ["Record an answer for this question"],
                        "missing_keywords": [],
                        "relevance": 0, "clarity": 0, "depth": 0, "structure": 0
                    })
            else:
                # Split transcript evenly across answered questions only
                chunk = max(1, total_words // n_answered)
                for i, q in enumerate(questions):
                    if i < n_answered:
                        part = " ".join(words[i * chunk:(i + 1) * chunk]).strip()
                        if len(part.split()) >= 8:
                            q_results.append({"question": q, **score_content(q, part, job_role)})
                        else:
                            q_results.append({
                                "question": q, "score": 0,
                                "brief_feedback": "Answer was too short to evaluate.",
                                "strengths": [],
                                "improvements": ["Provide a more detailed answer"],
                                "missing_keywords": [],
                                "relevance": 0, "clarity": 0, "depth": 0, "structure": 0
                            })
                    else:
                        # Not answered
                        q_results.append({
                            "question": q, "score": 0,
                            "brief_feedback": "No answer recorded for this question.",
                            "strengths": [],
                            "improvements": ["Record an answer for this question"],
                            "missing_keywords": [],
                            "relevance": 0, "clarity": 0, "depth": 0, "structure": 0
                        })

        print(">>> STEP 6 DONE")

        content_avg = round(sum(r["score"] for r in q_results) / max(len(q_results), 1), 1)
        overall     = round(
            voice["score"]   * 0.25 +
            eye["score"]     * 0.20 +
            posture["score"] * 0.15 +
            content_avg      * 0.40, 1)

        return {
            "overall_score":     overall,
            "voice":             voice,
            "eye_contact":       eye,
            "posture":           posture,
            "speech":            speech,
            "content_scores":    q_results,
            "content_avg":       content_avg,
            "questions_answered": n_answered,
        }

    except Exception as e:
        import traceback
        print(">>> PIPELINE CRASHED AT:")
        print(traceback.format_exc())
        raise
    finally:
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)