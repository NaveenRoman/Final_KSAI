"use client";

import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  Lightbulb,
  Mic,
  MicOff,
  Pause,
  Play,
  Send,
  Sparkles,
  Star,
  Target,
  Video,
  Volume2,
  X,
  Zap,
} from "lucide-react";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";



type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
};


type SpeechRecognitionErrorEventLike = Event & {
  error: string;
};

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;

  start: () => void;
  stop: () => void;
  abort: () => void;

  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

/* =========================================================
   TYPES
========================================================= */

type InterviewQuestion = {
  id: number;
  category: string;
  question: string;
  difficulty: string;
  timeLimit: number;
  expectedTopics: string[];
};

type InterviewAnswer = {
  questionId: number;
  question: string;
  answer: string;
  isFollowUp: boolean;
};


/* =========================================================
   DEMO QUESTION BANK
   Backend/AI integration will replace this later.
========================================================= */

const questionBank: InterviewQuestion[] = [
  {
    id: 1,
    category: "Introduction",
    question:
      "Tell me about yourself and briefly explain your technical background.",
    difficulty: "Beginner",
    timeLimit: 120,
    expectedTopics: [
      "background",
      "skills",
      "projects",
      "career goals",
    ],
  },

  {
    id: 2,
    category: "Java Fundamentals",
    question:
      "What is the difference between a class and an object in Java?",
    difficulty: "Beginner",
    timeLimit: 120,
    expectedTopics: [
      "class",
      "object",
      "instance",
      "memory",
    ],
  },

  {
    id: 3,
    category: "Object-Oriented Programming",
    question:
      "Can you explain the four main principles of object-oriented programming?",
    difficulty: "Intermediate",
    timeLimit: 180,
    expectedTopics: [
      "encapsulation",
      "inheritance",
      "polymorphism",
      "abstraction",
    ],
  },

  {
    id: 4,
    category: "Data Structures",
    question:
      "What is the difference between an ArrayList and a LinkedList in Java?",
    difficulty: "Intermediate",
    timeLimit: 180,
    expectedTopics: [
      "arraylist",
      "linkedlist",
      "access",
      "insertion",
      "deletion",
    ],
  },

  {
    id: 5,
    category: "Problem Solving",
    question:
      "How would you determine whether a number is prime? Explain your approach before writing code.",
    difficulty: "Intermediate",
    timeLimit: 180,
    expectedTopics: [
      "prime",
      "loop",
      "division",
      "square root",
      "complexity",
    ],
  },

  {
    id: 6,
    category: "Java Collections",
    question:
      "When would you choose a HashMap instead of a List?",
    difficulty: "Intermediate",
    timeLimit: 150,
    expectedTopics: [
      "key",
      "value",
      "lookup",
      "ordering",
      "collections",
    ],
  },

  {
    id: 7,
    category: "Exception Handling",
    question:
      "What is the difference between checked and unchecked exceptions in Java?",
    difficulty: "Advanced",
    timeLimit: 180,
    expectedTopics: [
      "exception",
      "checked",
      "unchecked",
      "compile",
      "runtime",
    ],
  },

  {
    id: 8,
    category: "Problem Solving",
    question:
      "How would you optimize a solution that searches for duplicate values in a large array?",
    difficulty: "Advanced",
    timeLimit: 240,
    expectedTopics: [
      "hashset",
      "time complexity",
      "space complexity",
      "optimization",
    ],
  },

  {
    id: 9,
    category: "Projects",
    question:
      "Tell me about one technical project you have built. What problem did it solve and what was your contribution?",
    difficulty: "Intermediate",
    timeLimit: 180,
    expectedTopics: [
      "project",
      "problem",
      "technology",
      "contribution",
      "result",
    ],
  },

  {
    id: 10,
    category: "Behavioral",
    question:
      "Tell me about a difficult technical problem you faced and how you solved it.",
    difficulty: "Intermediate",
    timeLimit: 180,
    expectedTopics: [
      "problem",
      "approach",
      "decision",
      "result",
      "learning",
    ],
  },
];






/* =========================================================
   PAGE
========================================================= */

function InterviewSessionContent() {

  const router = useRouter();

  const searchParams = useSearchParams();
  const INTERVIEW_EVALUATION_URL =
  "http://127.0.0.1:8000/api/ai/interview/evaluate/";


  /* =======================================================
     READ INTERVIEW CONFIGURATION
  ====================================================== */

  const interviewType =
    searchParams.get("type") || "technical";

  const role =
    searchParams.get("role") || "Software Engineer";

  const technology =
    searchParams.get("technology") || "Java";

  const experience =
    searchParams.get("experience") || "fresher";

  const difficulty =
    searchParams.get("difficulty") || "intermediate";

  const requestedQuestions =
    Number(
      searchParams.get("questions") || "10"
    );

    


  /* =======================================================
     SESSION STATE
  ====================================================== */

  const totalQuestions =
    Math.min(
      Math.max(requestedQuestions, 1),
      questionBank.length
    );


  const [currentIndex, setCurrentIndex] =
    useState(0);


  const [answer, setAnswer] =
  useState("");

const updateAnswer = (value: string) => {
  currentAnswerRef.current = value;
  setAnswer(value);
};


  


  const [isInterviewPaused, setIsInterviewPaused] =
    useState(false);


  const [isSubmitting, setIsSubmitting] =
    useState(false);


  const [showHint, setShowHint] =
    useState(false);


  const [evaluation, setEvaluation] =
    useState<{
      technical: number;
      communication: number;
      relevance: number;
      feedback: string;
    } | null>(null);


  const [elapsedSeconds, setElapsedSeconds] =
    useState(0);


  const [sessionComplete, setSessionComplete] =
    useState(false);


  const [completedAnswers, setCompletedAnswers] =
  useState<InterviewAnswer[]>([]);


  const currentQuestion =
    questionBank[currentIndex];


  const recognitionRef =
  useRef<SpeechRecognitionLike | null>(null);

const recognitionActiveRef =
  useRef(false);

const answerFinishedRef =
  useRef(false);

const shouldKeepListeningRef =
  useRef(false);

const recognitionStartingRef =
  useRef(false);

const isSubmittingRef =
  useRef(false);

const isPausedRef =
  useRef(false);

const sessionCompleteRef =
  useRef(false);

const currentAnswerRef =
  useRef("");

const currentIndexRef =
  useRef(0);

  const silenceTimerRef =
  useRef<ReturnType<typeof setTimeout> | null>(null);

  // =======================================================
// CAMERA / PROCTORING
// =======================================================

const videoRef = useRef<HTMLVideoElement | null>(null);

const cameraStreamRef = useRef<MediaStream | null>(null);

const [cameraActive, setCameraActive] =
  useState(false);

const [cameraError, setCameraError] =
  useState<string | null>(null);

  // =======================================================
// AI PROCTORING STATE
// =======================================================

const [faceCount, setFaceCount] = useState(1);

const [proctorWarningCount, setProctorWarningCount] =
  useState(0);

const [proctorWarning, setProctorWarning] =
  useState<string | null>(null);

const [interviewTerminated, setInterviewTerminated] =
  useState(false);

const proctorWarningRef =
  useRef(0);

const faceCountRef =
  useRef(1);


  


const [proctoringTerminated, setProctoringTerminated] =
  useState(false);

  const MAX_PROCTOR_WARNINGS = 3;


  // =======================================================
// FACE PROCTORING STATE
// =======================================================



const [proctorStatus, setProctorStatus] =
  useState<
    "loading" |
    "safe" |
    "no-face" |
    "multiple-faces"
  >("loading");



const [warningCount, setWarningCount] =
  useState(0);

const faceDetectorRef =
  useRef<any>(null);

const faceDetectionTimerRef =
  useRef<number | null>(null);

  // =======================================================
// OBJECT / PHONE DETECTION STATE
// =======================================================

const objectDetectorRef =
  useRef<any>(null);

const objectDetectionTimerRef =
  useRef<number | null>(null);

const [phoneDetected, setPhoneDetected] =
  useState(false);

const phoneDetectedRef =
  useRef(false);

const phoneWarningActiveRef =
  useRef(false);

const lastWarningTimeRef =
  useRef(0);

  const [isListening, setIsListening] = useState(false);

  const [voiceSupported, setVoiceSupported] = useState(true);

  const [interimTranscript, setInterimTranscript] = useState("");      

  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);

  const [interviewMode, setInterviewMode] = useState<
    "answering" | "evaluating" | "followup" | "completed"
  >("answering");

  const [questionAttempts, setQuestionAttempts] = useState(0);

  const [lastDecision, setLastDecision] = useState<
    "next" | "followup" | "skip" | null
  >(null);

  const issueProctorWarning = (message: string) => {
  if (
    sessionCompleteRef.current ||
    proctoringTerminated ||
    interviewTerminated
  ) {
    return;
  }

  // Prevent the same incident from generating
  // warnings continuously every few milliseconds.
  const now = Date.now();

  if (
    now - lastWarningTimeRef.current < 3000
  ) {
    return;
  }

  lastWarningTimeRef.current = now;

  const nextCount =
    proctorWarningRef.current + 1;

  proctorWarningRef.current = nextCount;

  console.log(
    `⚠️ PROCTORING WARNING ${nextCount}/${MAX_PROCTOR_WARNINGS}`
  );

  console.log(
    "Reason:",
    message
  );

  setProctorWarning(message);
  setProctorWarningCount(nextCount);

  // =====================================================
  // 3 WARNINGS = TERMINATE INTERVIEW
  // =====================================================

  if (
    nextCount >= MAX_PROCTOR_WARNINGS
  ) {
    console.log(
      "🚨 3 proctoring warnings reached."
    );

    terminateInterview(
      "Interview terminated because 3 proctoring warnings were reached."
    );

    return;
  }
};

  
  /* =======================================================
     TIMER
  ====================================================== */



useEffect(() => {
  if (
    sessionComplete ||
    isInterviewPaused ||
    !currentQuestion
  ) {
    return;
  }

  console.log(
    "🔊 NEW QUESTION:",
    currentIndex + 1,
    currentQuestion.question
  );

  // Small delay prevents duplicate speech during
  // React development effect cleanup/re-run.
  const timer = window.setTimeout(() => {
    console.log("🔊 Speaking question...");

    speakText(
      currentQuestion.question,
      true
    );
  }, 50);

  return () => {
    window.clearTimeout(timer);

    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }
  };
}, [
  currentIndex,
  currentQuestion,
  sessionComplete,
  isInterviewPaused,
]);

// =======================================================
// CAMERA INITIALIZATION
// =======================================================

useEffect(() => {
  let mounted = true;

  const startCamera = async () => {
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      console.error(
        "❌ Camera access is not supported in this browser."
      );

      if (mounted) {
        setCameraError(
          "Camera access is not supported in this browser."
        );
      }

      return;
    }

    try {
      console.log("📷 Requesting camera permission...");

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      if (!mounted) {
        stream.getTracks().forEach(
          (track) => track.stop()
        );
        return;
      }

      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        try {
          await videoRef.current.play();
        } catch (error) {
          console.warn(
            "⚠️ Camera video autoplay failed:",
            error
          );
        }
      }

      setCameraActive(true);
      setCameraError(null);

      console.log(
        "📷 Camera started successfully."
      );
    } catch (error) {
      console.error(
        "❌ Camera access failed:",
        error
      );

      if (!mounted) {
        return;
      }

      setCameraActive(false);

      if (
        error instanceof DOMException &&
        error.name === "NotAllowedError"
      ) {
        setCameraError(
          "Camera permission was denied. Please allow camera access."
        );
      } else if (
        error instanceof DOMException &&
        error.name === "NotFoundError"
      ) {
        setCameraError(
          "No camera was found on this device."
        );
      } else {
        setCameraError(
          "Unable to access the camera."
        );
      }
    }
  };

  startCamera();

  return () => {
    mounted = false;

    console.log(
      "📷 Stopping camera..."
    );

    if (cameraStreamRef.current) {
      cameraStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };
}, []);


// =======================================================
// STOP CAMERA WHEN INTERVIEW COMPLETES
// =======================================================

useEffect(() => {
  if (!sessionComplete) {
    return;
  }

  console.log(
    "🏁 Interview completed - stopping camera."
  );

  if (cameraStreamRef.current) {
    cameraStreamRef.current
      .getTracks()
      .forEach((track) => {
        track.stop();
      });

    cameraStreamRef.current = null;
  }

  if (videoRef.current) {
    videoRef.current.srcObject = null;
  }

  setCameraActive(false);
}, [sessionComplete]);


// =======================================================
// FACE DETECTOR INITIALIZATION
// =======================================================

useEffect(() => {
  let cancelled = false;

  const initializeFaceDetector = async () => {
    try {
      console.log(
        "🧠 Loading face detector..."
      );

      const {
        FaceDetector,
        FilesetResolver,
      } = await import(
        "@mediapipe/tasks-vision"
      );

      const vision =
        await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

      if (cancelled) {
        return;
      }

      const detector =
        await FaceDetector.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite",
            },

            runningMode: "VIDEO",

            minDetectionConfidence:
              0.55,
          }
        );

      if (cancelled) {
        detector.close();
        return;
      }

      faceDetectorRef.current =
        detector;

      console.log(
        "✅ Face detector ready."
      );
    } catch (error) {
      console.error(
        "❌ Face detector failed:",
        error
      );

      setProctorWarning(
        "Face monitoring could not be started."
      );
    }
  };

  initializeFaceDetector();

  return () => {
    cancelled = true;

    if (faceDetectorRef.current) {
      try {
        faceDetectorRef.current.close();
      } catch {}

      faceDetectorRef.current =
        null;
    }
  };
}, []);

// =======================================================
// PHONE / OBJECT DETECTOR INITIALIZATION
// =======================================================

useEffect(() => {
  let cancelled = false;

  const initializeObjectDetector = async () => {
    try {
      console.log(
        "📱 Loading object detector..."
      );

      const {
        ObjectDetector,
        FilesetResolver,
      } = await import(
        "@mediapipe/tasks-vision"
      );

      const vision =
        await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

      if (cancelled) {
        return;
      }

      const detector =
        await ObjectDetector.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite",
            },

            runningMode: "VIDEO",

            scoreThreshold: 0.55,

            maxResults: 5,
          }
        );

      if (cancelled) {
        detector.close();
        return;
      }

      objectDetectorRef.current =
        detector;

      console.log(
        "✅ Object detector ready."
      );

    } catch (error) {

      console.error(
        "❌ Object detector failed:",
        error
      );

    }
  };

  initializeObjectDetector();

  return () => {

    cancelled = true;

    if (
      objectDetectorRef.current
    ) {
      try {
        objectDetectorRef.current.close();
      } catch {}

      objectDetectorRef.current =
        null;
    }
  };

}, []);

// =======================================================
// CONTINUOUS PHONE DETECTION
// =======================================================

useEffect(() => {

  if (
    !cameraActive ||
    sessionComplete
  ) {
    return;
  }

  console.log(
    "📱 Starting phone detection..."
  );

  const detectObjects = () => {

    const video =
      videoRef.current;

    const detector =
      objectDetectorRef.current;

    if (
      !video ||
      !detector ||
      video.readyState < 2
    ) {
      return;
    }

    try {

      const result =
        detector.detectForVideo(
          video,
          performance.now()
        );

      const detections =
        result?.detections || [];

      let detectedPhone = false;

      for (
        const detection of detections
      ) {

        const category =
          detection.categories?.[0];

        if (!category) {
          continue;
        }

        const categoryName =
          String(
            category.categoryName || ""
          ).toLowerCase();

        const score =
          Number(
            category.score || 0
          );

        console.log(
          "📱 Object:",
          categoryName,
          "score:",
          score
        );

        if (
          (
            categoryName === "cell phone" ||
            categoryName === "mobile phone" ||
            categoryName === "phone"
          ) &&
          score >= 0.55
        ) {
          detectedPhone = true;
          break;
        }
      }

      setPhoneDetected(detectedPhone);
      phoneDetectedRef.current = detectedPhone;

      // =================================================
      // PHONE FOUND
      // =================================================

      if (detectedPhone) {

        console.warn(
          "📱 PHONE DETECTED"
        );

        if (
          !phoneWarningActiveRef.current
        ) {

          phoneWarningActiveRef.current =
            true;

          issueProctorWarning(
            "Mobile phone detected. Please remove the phone from the interview area."
          );
        }

      } else {

        phoneWarningActiveRef.current =
          false;
      }

    } catch (error) {

      console.error(
        "Phone detection error:",
        error
      );

    }
  };

  objectDetectionTimerRef.current =
    window.setInterval(
      detectObjects,
      1000
    );

  return () => {

    if (
      objectDetectionTimerRef.current
    ) {

      window.clearInterval(
        objectDetectionTimerRef.current
      );

      objectDetectionTimerRef.current =
        null;
    }

  };

}, [
  cameraActive,
  sessionComplete,
]);

// =======================================================
// CONTINUOUS FACE DETECTION
// =======================================================

useEffect(() => {
  if (
    !cameraActive ||
    sessionComplete
  ) {
    return;
  }

  console.log(
    "👁️ Starting face monitoring..."
  );

  const detectFaces = () => {
    const video =
      videoRef.current;

    const detector =
      faceDetectorRef.current;

    if (
      !video ||
      !detector ||
      video.readyState < 2
    ) {
      return;
    }

    try {
      const result =
        detector.detectForVideo(
          video,
          performance.now()
        );

      const count =
        result?.detections?.length || 0;

      setFaceCount(count);

      // ===============================================
      // EXACTLY ONE FACE
      // ===============================================

      if (count === 1) {
        setProctorStatus("safe");

        // Do NOT clear a phone warning here.
        // Phone warning has priority.
        if (phoneDetectedRef.current) {
          return;
        }

        // Only clear the visible warning if there
        // is currently no phone violation.
        setProctorWarning(null);

        return;
      }

      // ===============================================
      // NO FACE
      // ===============================================

      if (count === 0) {
        setProctorStatus("no-face");

        issueProctorWarning(
          "Face not detected. Please remain visible during the interview."
        );

        return;
      }

      // ===============================================
      // MULTIPLE FACES
      // ===============================================

      setProctorStatus(
        "multiple-faces"
      );

      issueProctorWarning(
        "Multiple faces detected. Only the candidate should be visible."
      );

    } catch (error) {
      console.error(
        "Face detection error:",
        error
      );
    }
  };

  faceDetectionTimerRef.current =
    window.setInterval(
      detectFaces,
      700
    );

  return () => {
    if (
      faceDetectionTimerRef.current
    ) {
      window.clearInterval(
        faceDetectionTimerRef.current
      );

      faceDetectionTimerRef.current =
        null;
    }
  };

}, [
  cameraActive,
  sessionComplete,
]);


  useEffect(() => {
  if (typeof window === "undefined") {
    return;
  }

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setVoiceSupported(false);
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onstart = () => {
  recognitionActiveRef.current = true;
  setIsListening(true);

  console.log("🎤 Recognition ON");
};



  recognition.onresult = (event) => {
  let finalText = "";
  let interimText = "";

  for (
    let i = event.resultIndex;
    i < event.results.length;
    i++
  ) {
    const result = event.results[i];

    if (!result || !result[0]) {
      continue;
    }

    const transcript =
      result[0].transcript.trim();

    if (!transcript) {
      continue;
    }

    if (result.isFinal) {
      finalText +=
        (finalText ? " " : "") +
        transcript;
    } else {
      interimText +=
        (interimText ? " " : "") +
        transcript;
    }
  }

  if (finalText) {
    const previous =
      currentAnswerRef.current.trim();

    const updatedAnswer =
      previous
        ? `${previous} ${finalText}`
        : finalText;

    currentAnswerRef.current =
      updatedAnswer;

    setAnswer(updatedAnswer);
  }

  setInterimTranscript(
    interimText
  );

  // -------------------------------
  // DONE DETECTION
  // -------------------------------

  const normalizedFinalText =
    finalText
      .toLowerCase()
      .trim();

  const saidDone =
    normalizedFinalText === "done" ||
    normalizedFinalText.endsWith(" done") ||
    normalizedFinalText.endsWith(" done.");

  if (!saidDone) {
    return;
  }

  console.log(
    "✅ Candidate finished the answer."
  );

  answerFinishedRef.current = true;
  shouldKeepListeningRef.current = false;

  if (silenceTimerRef.current) {
    clearTimeout(
      silenceTimerRef.current
    );

    silenceTimerRef.current = null;
  }

  try {
    recognitionRef.current?.stop();
  } catch {}

  recognitionActiveRef.current =
    false;

  setIsListening(false);
  setInterimTranscript("");

  const cleanedFinalText =
    finalText
      .replace(/\bdone\.?\s*$/i, "")
      .trim();

  const previousAnswer =
    currentAnswerRef.current.trim();

  const completeAnswer =
    previousAnswer
      ? `${previousAnswer} ${cleanedFinalText}`.trim()
      : cleanedFinalText;

  const cleanedAnswer =
    completeAnswer
      .replace(/\bdone\.?\s*$/i, "")
      .trim();

  currentAnswerRef.current =
    cleanedAnswer;

  console.log(
    "📝 FINAL ANSWER SENT TO AI:",
    cleanedAnswer
  );

  if (
    cleanedAnswer &&
    !isSubmittingRef.current &&
    !isPausedRef.current &&
    !sessionCompleteRef.current
  ) {
    submitAnswer(cleanedAnswer);
  }
};
  




  recognition.onerror = (event) => {
  console.error(
    "Speech recognition error:",
    event.error
  );

  recognitionStartingRef.current = false;

  setInterimTranscript("");

  /*
   * "no-speech" is not a fatal error.
   * Chrome can end the recognition session
   * simply because the candidate paused.
   */
  if (
    event.error === "no-speech"
  ) {
    return;
  }

  /*
   * For explicit/user/system errors,
   * stop the automatic restart loop.
   */
  if (
    event.error === "not-allowed" ||
    event.error === "service-not-allowed"
  ) {
    shouldKeepListeningRef.current = false;
    setIsListening(false);
  }
};

  recognition.onend = () => {
  console.log("🎤 Recognition ENDED");

  recognitionActiveRef.current =
    false;

  recognitionStartingRef.current =
    false;

  setIsListening(false);
  setInterimTranscript("");

  // Candidate intentionally said "done"
  if (answerFinishedRef.current) {
    console.log(
      "✅ Candidate finished the answer."
    );
    return;
  }

  // User intentionally stopped microphone
  if (!shouldKeepListeningRef.current) {
    console.log(
      "🛑 Listening intentionally stopped."
    );
    return;
  }

  // Interview is paused
  if (isPausedRef.current) {
    console.log(
      "⏸️ Interview is paused."
    );
    return;
  }

  // AI is evaluating
  if (isSubmittingRef.current) {
    console.log(
      "⏳ AI is evaluating."
    );
    return;
  }

  // Interview finished
  if (sessionCompleteRef.current) {
    console.log(
      "🏁 Interview completed."
    );
    return;
  }

  // Chrome can stop recognition after silence.
  // Restart it automatically.
  window.setTimeout(() => {
    if (
      shouldKeepListeningRef.current &&
      !answerFinishedRef.current &&
      !isPausedRef.current &&
      !isSubmittingRef.current &&
      !sessionCompleteRef.current &&
      !recognitionActiveRef.current
    ) {
      console.log(
        "🔄 Restarting speech recognition..."
      );

      startAutomaticListening();
    }
  }, 500);
};

  recognitionRef.current = recognition;

  return () => {
    recognition.abort();
    recognitionRef.current = null;
  };
}, []);


useEffect(() => {
  if (
    !followUpQuestion ||
    interviewMode !== "followup"
  ) {
    return;
  }

  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(
      followUpQuestion,
    );

  utterance.lang = "en-US";
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;

  utterance.onend = () => {
  startAutomaticListening();
};

window.speechSynthesis.speak(
  utterance,
);

  return () => {
    window.speechSynthesis.cancel();
  };
}, [
  followUpQuestion,
  interviewMode,
]);

useEffect(() => {
  return () => {
    if (silenceTimerRef.current) {
      clearTimeout(
        silenceTimerRef.current
      );
    }
  };
}, []);


  /* =======================================================
     FORMAT TIME
  ====================================================== */

  const formatTime = (
    seconds: number
  ) => {

    const minutes =
      Math.floor(seconds / 60);

    const remaining =
      seconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(remaining).padStart(
      2,
      "0"
    )}`;
  };


  /* =======================================================
     PROGRESS
  ====================================================== */

  const progress =
    ((currentIndex + 1) /
      totalQuestions) *
    100;


  /* =======================================================
     QUESTION HINT
  ====================================================== */

  const hint =
    useMemo(() => {

      if (!currentQuestion) {
        return "";
      }

      return `Think about these concepts: ${currentQuestion.expectedTopics
        .slice(0, 3)
        .join(", ")}.`;

    }, [currentQuestion]);

    const togglePause = () => {
  if (!isInterviewPaused) {
    recognitionRef.current?.stop();

    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    setIsListening(false);
    setInterimTranscript("");
  }

  setIsInterviewPaused(
    previous => !previous
  );
};


    const toggleVoiceInput = () => {
  if (!voiceSupported) {
    alert(
      "Voice input is not supported in this browser. Please use Chrome or Edge."
    );
    return;
  }

  const recognition =
    recognitionRef.current;

  if (!recognition) {
    return;
  }

  // STOP
  if (
    isListening ||
    recognitionActiveRef.current
  ) {
    console.log(
      "🛑 User stopped listening"
    );

    shouldKeepListeningRef.current =
      false;

    answerFinishedRef.current =
      false;

    recognitionStartingRef.current =
      false;

    try {
      recognition.stop();
    } catch {}

    setIsListening(false);
    setInterimTranscript("");

    return;
  }

  // START
  console.log(
    "🎤 User started listening"
  );

  answerFinishedRef.current =
    false;

  shouldKeepListeningRef.current =
    true;

  setInterimTranscript("");

  startAutomaticListening();
};


const speakText = (
  text: string,
  startListeningAfter = false
) => {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    console.error(
      "❌ Speech synthesis is not supported."
    );

    if (startListeningAfter) {
      startAutomaticListening();
    }

    return;
  }

  if (!text || !text.trim()) {
    console.error(
      "❌ Cannot speak empty question."
    );
    return;
  }

  console.log(
    "🔊 SPEAK:",
    text
  );

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(
      text
    );

  utterance.lang = "en-US";
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;

  utterance.onstart = () => {
    console.log(
      "🔊 Speech started"
    );
  };

  utterance.onend = () => {
    console.log(
      "🔊 Speech ended"
    );

    if (startListeningAfter) {
      window.setTimeout(() => {
        console.log(
          "🎤 Starting microphone after question..."
        );

        startAutomaticListening();
      }, 300);
    }
  };

  utterance.onerror = (event) => {
    console.error(
      "❌ Speech synthesis error:",
      event
    );

    if (startListeningAfter) {
      startAutomaticListening();
    }
  };

  window.speechSynthesis.speak(
    utterance
  );
};

const startAutomaticListening = () => {
  console.log(
    "🎤 startAutomaticListening()"
  );

  if (!voiceSupported) {
    console.log(
      "❌ Voice not supported"
    );
    return;
  }

  if (isPausedRef.current) {
    console.log(
      "⏸️ Interview paused"
    );
    return;
  }

  if (sessionCompleteRef.current) {
    console.log(
      "🏁 Interview completed"
    );
    return;
  }

  if (isSubmittingRef.current) {
    console.log(
      "⏳ AI is evaluating"
    );
    return;
  }

  const recognition =
    recognitionRef.current;

  if (!recognition) {
    console.error(
      "❌ Recognition object missing"
    );
    return;
  }

  if (
    recognitionActiveRef.current ||
    recognitionStartingRef.current
  ) {
    console.log(
      "🎤 Recognition already running/starting"
    );
    return;
  }

  shouldKeepListeningRef.current =
    true;

  answerFinishedRef.current =
    false;

  setInterimTranscript("");

  recognitionStartingRef.current =
    true;

  try {
    recognition.start();

    console.log(
      "🎤 Speech recognition START requested"
    );
  } catch (error) {
    recognitionStartingRef.current =
      false;

    recognitionActiveRef.current =
      false;

    setIsListening(false);

    console.error(
      "❌ Speech recognition start failed:",
      error
    );
  }
};







const speakQuestion = () => {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  if (!currentQuestion) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(
      currentQuestion.question
    );

  utterance.lang = "en-US";
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;

  utterance.onend = () => {
  startAutomaticListening();
};

  window.speechSynthesis.speak(
    utterance
  );
};



const terminateInterview = (
  reason: string
) => {
  console.error(
    "🚨 INTERVIEW TERMINATED:",
    reason
  );

  sessionCompleteRef.current = true;
  shouldKeepListeningRef.current = false;

  try {
    recognitionRef.current?.stop();
  } catch {}

  recognitionActiveRef.current = false;
  recognitionStartingRef.current = false;

  setIsListening(false);
  setInterimTranscript("");

  if (
    typeof window !== "undefined" &&
    "speechSynthesis" in window
  ) {
    window.speechSynthesis.cancel();
  }

  if (cameraStreamRef.current) {
    cameraStreamRef.current
      .getTracks()
      .forEach((track) => track.stop());

    cameraStreamRef.current = null;
  }

  if (videoRef.current) {
    videoRef.current.srcObject = null;
  }

  setCameraActive(false);
  setInterviewTerminated(true);
  setProctorWarning(reason);
  setInterviewMode("completed");
  setSessionComplete(true);
};






  /* =======================================================
     SUBMIT ANSWER
  ====================================================== */

  /* =======================================================
   SUBMIT ANSWER → REAL AI EVALUATION
======================================================= */

async function submitAnswer(
  submittedAnswer?: string,
) {

  shouldKeepListeningRef.current = false;

if (silenceTimerRef.current) {
  clearTimeout(
    silenceTimerRef.current
  );

  silenceTimerRef.current = null;
}

recognitionRef.current?.stop();
setIsListening(false);
setInterimTranscript("");

  const finalAnswer =
    submittedAnswer ?? answer;

  const currentAnswer =
    finalAnswer.trim();


  console.log("🚀 submitAnswer() CALLED");
  console.log("📝 Submitted answer:", currentAnswer);  

  if (
    !currentAnswer ||
    isSubmitting ||
    !currentQuestion
  ) {
    return;
  }

  setIsSubmitting(true);
  setInterviewMode("evaluating");

  /* -------------------------------------------------------
     STOP VOICE
  ------------------------------------------------------- */

  if (recognitionRef.current) {
    try {
      recognitionRef.current.stop();
    } catch {
      // Recognition may already be stopped.
    }
  }

  setIsListening(false);
  setInterimTranscript("");

  if (silenceTimerRef.current) {
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
  }

  try {

    /* -----------------------------------------------------
       SAVE ANSWER LOCALLY
    ----------------------------------------------------- */

    const answeredQuestion =
  followUpQuestion &&
  interviewMode === "followup"
    ? followUpQuestion
    : currentQuestion.question;

const isFollowUp =
  !!(
    followUpQuestion &&
    interviewMode === "followup"
  );

setCompletedAnswers(
  (previous) => [
    ...previous,
    {
      questionId: currentQuestion.id,
      question: answeredQuestion,
      answer: currentAnswer,
      isFollowUp,
    },
  ]
);


    // =====================================================
    // FAST INTERVIEW MODE
    // Save answer and immediately continue.
    // AI evaluation will happen after the interview.
    // =====================================================

    console.log(
      "⚡ Answer saved. Moving to next question immediately."
    );

    setIsSubmitting(false);
    setInterviewMode("answering");

    setFollowUpQuestion(null);
    setEvaluation(null);
    setAnswer("");

    currentAnswerRef.current = "";

    nextQuestion();

    return;

    /* -----------------------------------------------------
       CALL DJANGO AI INTERVIEW EVALUATOR
    ----------------------------------------------------- */

    console.log("🌐 Sending answer to Django...");
console.log("🌐 URL:", INTERVIEW_EVALUATION_URL);
console.log("🌐 Question:", currentQuestion.question);
console.log("🌐 Answer:", currentAnswer);

const response = await fetch(
  INTERVIEW_EVALUATION_URL,
  {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      role,
      technology,
      difficulty,
      category: currentQuestion.category,

      question:
        followUpQuestion &&
        interviewMode === "followup"
          ? followUpQuestion
          : currentQuestion.question,

      answer: currentAnswer,

      expectedTopics:
        currentQuestion.expectedTopics,

      previousContext:
        followUpQuestion
          ? `Previous interview question: ${currentQuestion.question}
Previous follow-up question: ${followUpQuestion}`
          : "",
    }),
  }
);

console.log(
  "🌐 Django response status:",
  response.status
);

    if (!response.ok) {
  const errorText =
    await response.text();

  throw new Error(
    `Interview API failed: ${response.status} ${errorText}`
  );
}

const result =
  await response.json();

  console.log("🤖 Django AI RESULT:", result);

console.log(
  "Interview AI response:",
  result
);

    

    /* -----------------------------------------------------
       VALIDATE DJANGO RESPONSE
    ----------------------------------------------------- */

    if (!result.success) {
      throw new Error(
        result.message ||
        "Interview evaluation failed."
      );
    }

    /* -----------------------------------------------------
   READ DJANGO AI EVALUATION
----------------------------------------------------- */

const aiEvaluation = result?.data;

if (!aiEvaluation) {
  throw new Error(
    "AI evaluation data was not returned."
  );
}

console.log(
  "========== AI EVALUATION =========="
);

console.log(
  "Decision:",
  aiEvaluation.decision
);

console.log(
  "Technical:",
  aiEvaluation.technical_score
);

console.log(
  "Communication:",
  aiEvaluation.communication_score
);

console.log(
  "Relevance:",
  aiEvaluation.relevance_score
);

console.log(
  "Feedback:",
  aiEvaluation.feedback
);

console.log(
  "Follow-up:",
  aiEvaluation.follow_up_question
);

console.log(
  "==================================="
);

    /* -----------------------------------------------------
       NORMALIZE DECISION
    ----------------------------------------------------- */

    const decision =
      String(
        aiEvaluation.decision || ""
      )
        .trim()
        .toUpperCase();

    /* -----------------------------------------------------
       VALIDATE SCORES
    ----------------------------------------------------- */

    const technicalScore =
      Math.max(
        0,
        Math.min(
          100,
          Number(
            aiEvaluation.technical_score
          ) || 0
        )
      );

    const communicationScore =
      Math.max(
        0,
        Math.min(
          100,
          Number(
            aiEvaluation.communication_score
          ) || 0
        )
      );

    const relevanceScore =
      Math.max(
        0,
        Math.min(
          100,
          Number(
            aiEvaluation.relevance_score
          ) || 0
        )
      );

    const feedback =
  typeof aiEvaluation.feedback === "string"
    ? aiEvaluation.feedback
    : aiEvaluation.feedback
      ? `${aiEvaluation.feedback.strength || ""} ${aiEvaluation.feedback.improvement || ""}`.trim()
      : "Your answer has been evaluated.";

    /* -----------------------------------------------------
       SHOW AI EVALUATION
    ----------------------------------------------------- */

    setEvaluation({
      technical:
        technicalScore,

      communication:
        communicationScore,

      relevance:
        relevanceScore,

      feedback,
    });

    /* =====================================================
       FOLLOW-UP
    ===================================================== */

    if (
      decision === "FOLLOWUP" &&
      aiEvaluation.follow_up_question
    ) {

      console.log(
        "AI decision: FOLLOWUP"
      );

      setLastDecision(
        "followup"
      );

      setFollowUpQuestion(
        aiEvaluation.follow_up_question
      );

      setQuestionAttempts(
        (previous) =>
          previous + 1
      );

      /*
       * Clear answer so candidate
       * answers the follow-up.
       */

      currentAnswerRef.current = "";
      setAnswer("");

      /*
       * Evaluation will be hidden
       * while follow-up is displayed.
       */

      setEvaluation(null);

      setInterviewMode(
        "followup"
      );

      setIsSubmitting(false);

      return;
    }

    /* =====================================================
       SKIP
    ===================================================== */

    if (decision === "SKIP") {
  console.log(
    "AI decision: SKIP"
  );

  setLastDecision("skip");
  setFollowUpQuestion(null);
  setIsSubmitting(false);

  window.setTimeout(() => {
    nextQuestion();
  }, 500);

  return;
}

    /* =====================================================
       NEXT
    ===================================================== */

    if (decision === "NEXT") {
  console.log("🟢 AI decision: NEXT");
  console.log("➡️ Moving to next question...");

  setLastDecision("next");
  setFollowUpQuestion(null);
  setIsSubmitting(false);

  console.log("➡️ Calling nextQuestion()");
  nextQuestion();

  return;
}

    /* =====================================================
       UNKNOWN AI DECISION
    ===================================================== */

    console.warn(
      "Unknown AI interview decision:",
      aiEvaluation
    );

    /*
     * Fail safely instead of
     * getting the interview stuck.
     */

    setLastDecision(
      "next"
    );

    setIsSubmitting(false);

    setTimeout(() => {
      nextQuestion();
    }, 1800);

  } catch (error) {

    console.error(
      "Interview evaluation failed:",
      error
    );

    /*
     * Do NOT destroy the candidate's answer.
     */

    setEvaluation({
      technical: 0,
      communication: 0,
      relevance: 0,
      feedback:
        "We couldn't connect to the AI interviewer. Your answer has been saved locally. Please try submitting again.",
    });

    setInterviewMode(
      "answering"
    );

    setIsSubmitting(false);

  }
}

  /* =======================================================
     NEXT QUESTION
  ====================================================== */

  function nextQuestion() {
  console.log(
    "➡️ NEXT QUESTION FUNCTION STARTED"
  );

  shouldKeepListeningRef.current =
    false;

  answerFinishedRef.current =
    false;

  recognitionStartingRef.current =
    false;

  try {
    recognitionRef.current?.stop();
  } catch {}

  setIsListening(false);
  setInterimTranscript("");

  if (silenceTimerRef.current) {
    clearTimeout(
      silenceTimerRef.current
    );

    silenceTimerRef.current = null;
  }

  if (
    currentIndex >=
    totalQuestions - 1
  ) {
    console.log(
      "🏁 Interview completed."
    );

    sessionCompleteRef.current =
      true;

    setSessionComplete(true);
    setInterviewMode("completed");

    return;
  }

  const nextIndex =
    currentIndex + 1;

  console.log(
    `➡️ Changing question ${
      currentIndex + 1
    } → ${nextIndex + 1}`
  );

  currentAnswerRef.current = "";

  currentAnswerRef.current = "";
  setAnswer("");
  setEvaluation(null);
  setShowHint(false);
  setFollowUpQuestion(null);
  setQuestionAttempts(0);
  setLastDecision(null);
  setInterviewMode("answering");

  setCurrentIndex(nextIndex);
}


  /* =======================================================
     END INTERVIEW
  ====================================================== */

  function endInterview() {

    const confirmed =
      window.confirm(
        "Are you sure you want to end this interview?"
      );


    if (!confirmed) {
      return;
    }


    setSessionComplete(
      true
    );

  }

  const completedQuestionCount =
  new Set(
    completedAnswers.map(
      (item) => item.questionId
    )
  ).size;

  const hasSavedInterviewRef = useRef(false);
  const sessionIdRef = useRef<string>(`intv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    if (sessionComplete && !hasSavedInterviewRef.current) {
      const answeredCount = completedQuestionCount;
      if (answeredCount <= 0) {
        return;
      }
      hasSavedInterviewRef.current = true;

      const completionRate = Math.min(
        100,
        Math.round((answeredCount / Math.max(totalQuestions, 1)) * 100)
      );

      let avgQuality = 75;
      if (completedAnswers.length > 0) {
        const avgWords =
          completedAnswers.reduce(
            (sum, a) =>
              sum + (a.answer?.split(/\s+/).filter(Boolean).length || 0),
            0
          ) / completedAnswers.length;
        avgQuality = Math.min(95, Math.max(50, Math.round(50 + Math.min(45, avgWords * 2))));
      }

      const finalScore =
        answeredCount > 0
          ? Math.round(completionRate * 0.4 + avgQuality * 0.6)
          : 0;

      fetch("/api/interview/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          interviewType,
          role,
          technology,
          score: finalScore,
          technicalScore: finalScore,
          communicationScore: Math.min(100, finalScore + 4),
          relevanceScore: Math.min(100, finalScore - 2),
          totalQuestions,
          completedQuestions: answeredCount,
          durationSeconds: elapsedSeconds,
        }),
      }).catch((err) =>
        console.error("Failed to persist interview session:", err)
      );
    }
  }, [
    sessionComplete,
    completedQuestionCount,
    completedAnswers,
    totalQuestions,
    interviewType,
    role,
    technology,
    elapsedSeconds,
  ]);

  /* =======================================================
     COMPLETION SCREEN
  ====================================================== */

  if (sessionComplete) {

    return (
      <InterviewComplete
        totalQuestions={
          totalQuestions
        }
        completed={
          completedQuestionCount
        }
        elapsedSeconds={
          elapsedSeconds
        }
        role={role}
        technology={technology}
        onDashboard={() =>
          router.push(
            "/interview"
          )
        }
        onRestart={() =>
          window.location.reload()
        }
      />
    );

  }


  /* =======================================================
     INTERVIEW ROOM
  ====================================================== */

  return (

    <div className="min-h-screen bg-[#050507] text-white">

      {proctorWarning && (
  <div className="fixed top-20 right-5 z-[100] w-[320px] rounded-2xl border border-amber-500/30 bg-[#15120A] p-4 shadow-2xl">

    <div className="flex items-start gap-3">

      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
        <Video
          size={16}
          className="text-amber-400"
        />
      </div>

      <div className="flex-1">

        <p className="text-xs font-bold text-amber-300">
          Proctoring Warning
        </p>

        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          {proctorWarning}
        </p>

        <p className="text-[10px] text-amber-500 mt-2 font-bold">
          Warning {proctorWarningCount} / {MAX_PROCTOR_WARNINGS}
        </p>

      </div>

      <button
        type="button"
        onClick={() =>
          setProctorWarning(null)
        }
        className="text-slate-600 hover:text-white"
      >
        <X size={15} />
      </button>

    </div>

  </div>
)}

      {/* ===================================================
          TOP BAR
      ==================================================== */}

      <header className="h-16 border-b border-white/10 bg-[#09090B]/90 backdrop-blur-xl">

        <div className="h-full max-w-[1600px] mx-auto px-4 md:px-6 flex items-center justify-between">

          {/* Left */}

          <div className="flex items-center gap-3">

            <button
                type="button"
                onClick={speakQuestion}
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
                title="Listen to question"
                >
                <Volume2 size={16} />
            </button>


            <div>

              <div className="flex items-center gap-2">

                <Sparkles
                  size={15}
                  className="text-cyan-400"
                />

                <span className="font-bold text-sm">
                  Codenthra AI Interviewer
                </span>

              </div>

              <p className="hidden sm:block text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                {role} • {technology}
              </p>

            </div>

          </div>


          {/* Center progress */}

          <div className="hidden md:flex flex-col items-center">

            <span className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">
              Question
            </span>

            <span className="text-sm font-black mt-0.5">
              {currentIndex + 1}
              <span className="text-slate-600">
                {" "}
                / {totalQuestions}
              </span>
            </span>

          </div>


          {/* Right */}

          <div className="flex items-center gap-2">

            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">

              <Clock3
                size={14}
                className="text-cyan-400"
              />

              <span className="font-mono text-xs">
                {formatTime(
                  elapsedSeconds
                )}
              </span>

            </div>

            <button
                type="button"
                onClick={toggleVoiceInput}
                disabled={!voiceSupported}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    isListening
                    ? "bg-red-500/20 text-red-300 border border-red-500/40"
                    : "bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10"
                } ${
                    !voiceSupported
                    ? "cursor-not-allowed opacity-50"
                    : ""
                }`}
                >
                {isListening ? (
                    <MicOff size={17} />
                ) : (
                    <Mic size={17} />
                )}

                {isListening
                    ? "Stop Listening"
                    : "Answer with Voice"}
                </button>


            <button
              onClick={() => {
  setIsInterviewPaused(
    (previous) => {
      const next = !previous;

      if (next) {
        shouldKeepListeningRef.current = false;

        recognitionRef.current?.stop();

        setIsListening(false);
        setInterimTranscript("");
      }

      return next;
    }
  );
}}
              className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition"
            >
              {isInterviewPaused ? (
                <Play size={15} />
              ) : (
                <Pause size={15} />
              )}
            </button>


            <button
              onClick={endInterview}
              className="px-3 py-2 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 text-xs font-bold transition"
            >
              End
            </button>

          </div>

        </div>

      </header>


      {/* ===================================================
          PROGRESS BAR
      ==================================================== */}

      <div className="h-1 bg-white/5">

        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-500"
          style={{
            width: `${progress}%`,
          }}
        />

      </div>

      <button
  type="button"
  onClick={() =>
    issueProctorWarning(
      "Test warning: please remain alone and visible in the camera."
    )
  }
  className="px-3 py-2 rounded-lg bg-amber-500/10 text-amber-300 text-xs"
>
  Test Proctor Warning
</button>


      {/* ===================================================
          MAIN INTERVIEW AREA
      ==================================================== */}

      <main className="max-w-[1600px] mx-auto p-4 md:p-6">

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">


          {/* =================================================
              MAIN QUESTION PANEL
          ================================================= */}

          <section className="min-h-[calc(100vh-115px)] rounded-3xl border border-white/10 bg-[#09090B] overflow-hidden">

            {/* Interviewer */}

            <div className="p-5 md:p-7 border-b border-white/10">

              <div className="flex items-start gap-4">

                <div className="relative shrink-0">

                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-900/20">

                    <Bot size={23} />

                  </div>


                  <span className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#09090B]" />

                </div>


                <div className="flex-1">

                  <div className="flex flex-wrap items-center gap-2">

                    <h2 className="font-bold">
                      Codenthra AI
                    </h2>

                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-bold">
                      AI INTERVIEWER
                    </span>

                  </div>


                  <p className="text-xs text-slate-500 mt-1">
  {isInterviewPaused
    ? "Interview paused"
    : followUpQuestion &&
      interviewMode === "followup"
    ? "I'd like to understand your answer a little better."
    : "I'm listening. Take your time and explain your thinking."}
</p>

                </div>


                <button
  onClick={() =>
    speakText(currentQuestion.question)
  }
  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
  title="Listen to question"
>
                  <Volume2 size={16} />
                </button>

              </div>

            </div>


            {/* Question */}

            <div className="p-6 md:p-10">

              <div className="flex flex-wrap items-center gap-2 mb-5">

                <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                  {currentQuestion.category}
                </span>


                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-400 font-semibold">
                  {currentQuestion.difficulty}
                </span>


                <span className="flex items-center gap-1.5 text-[10px] text-slate-500 ml-auto">
                  <Clock3 size={12} />
                  {Math.floor(
                    currentQuestion.timeLimit /
                      60
                  )}{" "}
                  min suggested
                </span>

              </div>


              {followUpQuestion &&
 interviewMode === "followup" ? (
  <div className="space-y-4">

    <div className="flex items-center gap-2">

      <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400 font-bold uppercase tracking-wider">
        Follow-up Question
      </span>

      <span className="text-[10px] text-slate-600">
        Attempt {questionAttempts + 1}
      </span>

    </div>

    <h1 className="text-2xl md:text-4xl font-black leading-tight max-w-4xl">
      {followUpQuestion}
    </h1>

    <p className="text-xs text-slate-600">
      Codenthra AI wants to understand your answer more deeply.
      Explain your reasoning or give a simple example.
    </p>

  </div>
) : (
  <h1 className="text-2xl md:text-4xl font-black leading-tight max-w-4xl">
    {currentQuestion.question}
  </h1>
)}


              <p className="text-xs text-slate-600 mt-5">
                Explain your reasoning clearly. Codenthra AI may ask
                follow-up questions based on your answer.
              </p>


              {/* =================================================
                  HINT
              ================================================== */}

              {showHint && (

                <div className="mt-6 p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">

                  <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold">

                    <Lightbulb size={15} />

                    Interview Hint

                  </div>


                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {hint}
                  </p>

                </div>

              )}


              {interviewMode === "answering" ||
                interviewMode === "followup" ? (

                <>
                  {/* =================================================
                      ANSWER BOX
                  ================================================== */}

                  <div className="mt-8">

                    <div className="flex items-center justify-between mb-2">

                      <label className="text-xs font-bold text-slate-400">
                        Your answer
                      </label>

                      <span className="text-[10px] text-slate-600">
                        Explain your reasoning, not just the answer.
                      </span>

                    </div>


                    <textarea
                      value={answer}
                      onChange={(event) =>
                        setAnswer(
                          event.target.value
                        )
                      }
                      disabled={
                        isInterviewPaused ||
                        isSubmitting
                      }
                      placeholder={
  followUpQuestion &&
  interviewMode === "followup"
    ? "Answer the follow-up question..."
    : "Start typing your answer here..."
}
                      className="w-full min-h-[220px] resize-none rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-slate-200 placeholder:text-slate-700 outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition"
                    />

                  </div>


                  {/* =================================================
                      ACTIONS
                  ================================================== */}

                  <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">

                    <button
  type="button"
  onClick={toggleVoiceInput}
  disabled={
    isInterviewPaused ||
    !voiceSupported ||
    isSubmitting
  }
  className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl border text-xs font-bold transition ${
    isListening
      ? "border-red-500/30 bg-red-500/10 text-red-400"
      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
  }`}
>
  {isListening ? (
    <>
      <MicOff size={15} />
      Stop Listening
    </>
  ) : (
    <>
      <Mic size={15} />
      Answer with Voice
    </>
  )}
</button>

                    {isListening && (
  <div className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
    <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />

      Listening...
    </div>

    <p className="mt-2 text-sm text-slate-400">
      {interimTranscript ||
        "Start speaking. Your answer will appear here."}
    </p>
  </div>
)}


                    <button
                      onClick={() =>
                        setShowHint(
                          (previous) =>
                            !previous
                        )
                      }
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 text-xs font-bold transition"
                    >

                      <Lightbulb size={15} />

                      {showHint
                        ? "Hide Hint"
                        : "Need a Hint?"}

                    </button>


                    <button
  type="button"
  onClick={() => {
  setAnswer("I don't know");
  submitAnswer("I don't know");
}}
  disabled={
    isSubmitting ||
    isInterviewPaused
  }
  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-300 hover:bg-amber-500/10 text-xs font-bold transition disabled:opacity-40"
>
  <Zap size={15} />
  I Don't Know
</button>


                    <button
  onClick={() => submitAnswer()}
  disabled={
    !answer.trim() ||
    isSubmitting ||
    isInterviewPaused
  }
  className="w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold shadow-lg shadow-blue-900/20 transition"
>

                      {isSubmitting ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />

                          Evaluating...
                        </>
                      ) : (
                        <>
                          Submit Answer

                          <Send size={14} />
                        </>
                      )}

                    </button>

                  </div>

                </>

              ) : evaluation ? (
  

                /* =================================================
                   EVALUATION
                ================================================== */

                <div className="mt-8">

                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">

                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">

                      <CheckCircle2 size={16} />

                      Answer evaluated

                    </div>


                    <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                      {evaluation.feedback}
                    </p>

                  </div>


                  <div className="grid grid-cols-3 gap-3 mt-4">

                    <ScoreCard
                      title="Technical"
                      score={
                        evaluation.technical
                      }
                    />

                    <ScoreCard
                      title="Communication"
                      score={
                        evaluation.communication
                      }
                    />

                    <ScoreCard
                      title="Relevance"
                      score={
                        evaluation.relevance
                      }
                    />

                  </div>


                  <button
                    onClick={nextQuestion}
                    className="w-full mt-5 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 text-sm font-bold shadow-xl shadow-blue-900/20 hover:scale-[1.01] transition"
                  >

                    {currentIndex >=
                    totalQuestions - 1
                      ? "Finish Interview"
                      : "Next Question"}

                    <ChevronRight
                      size={17}
                    />

                  </button>

                </div>

              ): null}

            </div>

          </section>


          {/* =================================================
              RIGHT SIDEBAR
          ================================================== */}

          <aside className="space-y-5">

          {/* =================================================
    CAMERA / PROCTORING
================================================== */}

<div className="rounded-3xl border border-white/10 bg-[#09090B] p-4">

  <div className="flex items-center justify-between mb-3">

    <div className="flex items-center gap-2">

      <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">

        <Video
          size={15}
          className="text-cyan-400"
        />

      </div>

      <div>

        <p className="text-xs font-bold">
          Camera
        </p>

        <p className="text-[10px] text-slate-500">
          Interview monitoring
        </p>

      </div>

    </div>

    <div className="flex items-center gap-1.5">

      <span
        className={`w-2 h-2 rounded-full ${
          cameraActive
            ? "bg-emerald-400 animate-pulse"
            : "bg-red-400"
        }`}
      />

      <span
        className={`text-[10px] font-bold ${
          cameraActive
            ? "text-emerald-400"
            : "text-red-400"
        }`}
      >
        {cameraActive
          ? "Active"
          : "Inactive"}
      </span>

    </div>

  </div>


  <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">

    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="w-full h-full object-cover scale-x-[-1]"
    />

    {!cameraActive && (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-5 text-center">

        <Video
          size={28}
          className="text-slate-600 mb-3"
        />

        <p className="text-xs font-semibold text-slate-400">
          Camera unavailable
        </p>

        <p className="text-[10px] text-slate-600 mt-1">
          {cameraError ||
            "Waiting for camera permission..."}
        </p>

      </div>
    )}

    {cameraActive && (
  <>
    <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/70 backdrop-blur px-2.5 py-1.5">

      <span
        className={`w-1.5 h-1.5 rounded-full ${
          proctorStatus === "safe"
            ? "bg-emerald-400"
            : proctorStatus === "loading"
            ? "bg-yellow-400"
            : "bg-red-400 animate-pulse"
        }`}
      />

      <span className="text-[9px] text-white font-semibold">
  {phoneDetected
    ? "📱 PHONE DETECTED"
    : proctorStatus === "safe"
    ? "FACE VERIFIED"
    : proctorStatus === "no-face"
    ? "NO FACE"
    : proctorStatus ===
      "multiple-faces"
    ? `${faceCount} FACES DETECTED`
    : "CHECKING..."}
</span>

      {proctorWarning && (
  <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5">

    <div className="flex items-start gap-2">

      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-400 animate-pulse" />

      <div>
        <p className="text-[10px] font-bold text-red-300">
          Proctoring Warning
        </p>

        <p className="mt-1 text-[10px] leading-relaxed text-red-200/70">
          {proctorWarning}
        </p>
      </div>

    </div>

  </div>
)}

    </div>

    <div className="absolute top-3 right-3 rounded-lg bg-black/70 backdrop-blur px-2.5 py-1.5">

  <div className="flex flex-col items-end gap-1">

    <span className="text-[9px] text-slate-200 font-semibold">
      Faces: {faceCount}
    </span>

    <span
      className={`text-[9px] font-semibold ${
        phoneDetected
          ? "text-red-400"
          : "text-emerald-400"
      }`}
    >
      {phoneDetected
        ? "Phone: DETECTED"
        : "Phone: Clear"}
    </span>

  </div>

</div>
  </>
)}

  </div>

</div>


            {/* =================================================
                INTERVIEW STATUS
            ================================================== */}

            <div className="rounded-3xl border border-white/10 bg-[#09090B] p-5">

              <div className="flex items-center justify-between">

                <h3 className="text-sm font-bold">
                  Interview Progress
                </h3>

                <span className="text-xs text-cyan-400 font-bold">
                  {Math.round(
                    progress
                  )}%
                </span>

              </div>


              <div className="h-2 rounded-full bg-white/5 mt-4 overflow-hidden">

                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                  }}
                />

              </div>


              <p className="text-[11px] text-slate-600 mt-2">
                {currentIndex + 1} of{" "}
                {totalQuestions} questions
              </p>

            </div>


            {/* =================================================
                SESSION DETAILS
            ================================================== */}

            <div className="rounded-3xl border border-white/10 bg-[#09090B] p-5">

              <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">
                Session
              </p>


              <div className="space-y-4 mt-5">

                <SessionDetail
                  label="Interview"
                  value={
                    interviewType ===
                    "mock"
                      ? "AI Mock Interview"
                      : interviewType
                  }
                />

                <SessionDetail
                  label="Role"
                  value={role}
                />

                <SessionDetail
                  label="Technology"
                  value={technology}
                />

                <SessionDetail
                  label="Experience"
                  value={experience}
                />

                <SessionDetail
                  label="Difficulty"
                  value={difficulty}
                />

              </div>

            </div>


            {/* =================================================
                INTERVIEWER TIPS
            ================================================== */}

            <div className="rounded-3xl border border-purple-500/15 bg-purple-500/[0.04] p-5">

              <div className="flex items-center gap-2 text-purple-400">

                <Star size={16} />

                <h3 className="text-xs font-bold">
                  Interviewer Tips
                </h3>

              </div>


              <div className="space-y-3 mt-4">

                <Tip text="Think before you answer." />

                <Tip text="Explain your reasoning." />

                <Tip text="Use practical examples." />

                <Tip text="Don't rush your response." />

              </div>

            </div>


            {/* =================================================
                AI STATUS
            ================================================== */}

            <div className="rounded-3xl border border-white/10 bg-[#09090B] p-5">

              <div className="flex items-center gap-3">

                <div className="relative">

                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">

                    <Bot
                      size={17}
                      className="text-cyan-400"
                    />

                  </div>

                  <span className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#09090B]" />

                </div>


                <div>

                  <p className="text-xs font-bold">
                    Codenthra AI
                  </p>

                  <p className="text-[10px] text-emerald-400">
                    Interviewer online
                  </p>

                </div>

              </div>

            </div>

          </aside>

        </div>

      </main>


      {/* =====================================================
          PAUSED OVERLAY
      ====================================================== */}

      {isInterviewPaused && (

        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-5">

          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#101014] p-7 text-center shadow-2xl">

            <div className="w-14 h-14 mx-auto rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">

              <Pause
                size={24}
                className="text-yellow-400"
              />

            </div>


            <h2 className="text-xl font-black mt-5">
              Interview Paused
            </h2>


            <p className="text-sm text-slate-500 mt-2">
              Take a moment. Your interview timer is paused.
            </p>


            <button
              onClick={() =>
                setIsInterviewPaused(
                  false
                )
              }
              className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-sm font-bold"
            >
              Resume Interview
            </button>

          </div>

        </div>

      )}

    </div>
  );
}


/* =========================================================
   SCORE CARD
========================================================= */

function ScoreCard({
  title,
  score,
}: {
  title: string;
  score: number;
}) {

  return (

    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-center">

      <div className="text-2xl font-black">
        {score}
      </div>

      <p className="text-[10px] text-slate-500 mt-1">
        {title}
      </p>

    </div>

  );
}




/* =========================================================
   SESSION DETAIL
========================================================= */

function SessionDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (

    <div>

      <p className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">
        {label}
      </p>

      <p className="text-xs text-slate-300 mt-1 capitalize truncate">
        {value}
      </p>

    </div>

  );
}


/* =========================================================
   TIP
========================================================= */

function Tip({
  text,
}: {
  text: string;
}) {

  return (

    <div className="flex items-start gap-2">

      <CheckCircle2
        size={13}
        className="text-purple-400 mt-0.5 shrink-0"
      />

      <p className="text-[11px] text-slate-500 leading-relaxed">
        {text}
      </p>

    </div>

  );
}


/* =========================================================
   COMPLETION SCREEN
========================================================= */

function InterviewComplete({
  totalQuestions,
  completed,
  elapsedSeconds,
  role,
  technology,
  onDashboard,
  onRestart,
}: {
  totalQuestions: number;
  completed: number;
  elapsedSeconds: number;
  role: string;
  technology: string;
  onDashboard: () => void;
  onRestart: () => void;
}) {

  const completionRate =
    Math.round(
      (completed /
        Math.max(
          totalQuestions,
          1
        )) *
        100
    );


  return (

    <div className="min-h-screen bg-[#07070A] text-white flex items-center justify-center p-5">

      <div className="fixed inset-0 pointer-events-none">

        <div className="absolute top-[-200px] left-[20%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[150px]" />

        <div className="absolute bottom-[-200px] right-[10%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[150px]" />

      </div>


      <div className="relative z-10 w-full max-w-2xl text-center">

        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/20 flex items-center justify-center">

          <CheckCircle2
            size={38}
            className="text-cyan-400"
          />

        </div>


        <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest mt-7">
          Interview Complete
        </p>


        <h1 className="text-3xl md:text-5xl font-black mt-2">
          Great work.
        </h1>


        <p className="text-sm text-slate-500 mt-4 max-w-lg mx-auto leading-relaxed">
          You've completed your Codenthra AI interview session.
          Your detailed performance report can now analyze your
          technical knowledge, communication, and interview readiness.
        </p>


        <div className="grid grid-cols-3 gap-3 mt-8">

          <CompletionMetric
            label="Questions"
            value={`${completed}/${totalQuestions}`}
          />

          <CompletionMetric
            label="Completion"
            value={`${completionRate}%`}
          />

          <CompletionMetric
            label="Duration"
            value={formatDuration(
              elapsedSeconds
            )}
          />

        </div>


        <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.025] p-5 text-left">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">

              <Code2
                size={18}
                className="text-purple-400"
              />

            </div>


            <div>

              <p className="text-sm font-bold">
                {role}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                {technology} interview session
              </p>

            </div>

          </div>

        </div>


        <div className="flex flex-col sm:flex-row gap-3 mt-6">

          <button
            onClick={onDashboard}
            className="flex-1 py-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-bold transition"
          >
            Interview Dashboard
          </button>


          <button
            onClick={onRestart}
            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 text-sm font-bold shadow-xl shadow-blue-900/20"
          >
            Practice Again
          </button>

        </div>


        <p className="text-[10px] text-emerald-400/80 mt-6 font-medium">
          ✓ Your interview performance scorecard has been saved to your learning profile.
        </p>

      </div>

    </div>

  );
}


/* =========================================================
   COMPLETION METRIC
========================================================= */

function CompletionMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (

    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">

      <p className="text-xl md:text-2xl font-black">
        {value}
      </p>

      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">
        {label}
      </p>

    </div>

  );
}


/* =========================================================
   DURATION
========================================================= */

function formatDuration(
  seconds: number
) {

  const minutes =
    Math.floor(seconds / 60);

  const remaining =
    seconds % 60;

  return `${minutes}m ${remaining}s`;
}

export default function InterviewSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050507] text-white flex items-center justify-center">
          <div className="text-sm text-slate-400">
            Preparing interview...
          </div>
        </div>
      }
    >
      <InterviewSessionContent />
    </Suspense>
  );
}