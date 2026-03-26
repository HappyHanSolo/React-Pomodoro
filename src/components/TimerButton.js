import { useRef, useEffect, useState } from "react";
import { PHASES } from "../App";

// ─── Audio helpers ────────────────────────────────────────────────────────

function pickClip(entry, seqIdx = 0) {
  if (!entry || !entry.enabled || !entry.clips?.length) return null;
  if (entry.fiftyFifty && Math.random() < 0.5) return null;
  if (entry.random) return entry.clips[Math.floor(Math.random() * entry.clips.length)];
  return entry.clips[seqIdx % entry.clips.length];
}

function stageSrc(sm, key, idx = 0) {
  return pickClip(sm?.[key], idx) ?? null;
}

function playAndWait(src, ref) {
  return new Promise(resolve => {
    if (!src) { resolve(); return; }
    try {
      try { ref.current?.pause(); } catch {}
      const a = new Audio(src);
      ref.current = a;
      a.onended = resolve;
      a.onerror = resolve;
      a.play().catch(resolve);
    } catch { resolve(); }
  });
}

function playInstantWithWildcard(src, stageKey, sm, instantRef) {
  const excluded = stageKey === "pomodoroFinish" || stageKey === "cycleFinish";
  const pool = sm?.__wildcard;
  const hasWildcard = !excluded && pool?.length > 0;
  const wildcardThreshold = Math.random();
  const wildcardRoll = Math.random();
  const wildcardFires = hasWildcard && wildcardRoll < wildcardThreshold;
  const actualSrc = wildcardFires ? pool[Math.floor(Math.random() * pool.length)] : src;
  if (!actualSrc) return;
  try {
    try { instantRef.current?.pause(); } catch {}
    const a = new Audio(actualSrc);
    instantRef.current = a;
    a.play().catch(() => {});
  } catch {}
}

function parseT(t) {
  const p = (t || "0:0").split(":");
  return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
}

function fmtT(n) {
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────────────
export default function TimerButton({
  isRunning, setIsRunning,
  timer, setTimer,
  reset, setReset,
  phase, setPhase,
  isBreakPhase,
  pomodoroCount, setPomodoroCount,
  interval,
  soundMapRef,
  sTimeRef, lTimeRef, pTimeRef, intervalRef,
  autoBreakRef, autoPomRef,
  onPomodoroFinish,
  onBreakFinish,
  colors, font,
}) {
  // Use a ref for the interval ID
  const timerID      = useRef(null);
  // remRef holds the current countdown value — avoids stale closure in tick()
  const remRef       = useRef(0);
  // Track timer state with refs (not React state) to avoid stale closures
  const hasFinished  = useRef(false);
  const hasStarted   = useRef(false); // set true on first _runTimer, false on any reset/phase-switch

  const finishRef    = useRef(null);
  const instantRef   = useRef(null);
  const skipResolveRef = useRef(null);

  const [audioWait,  setAudioWait]  = useState(false);
  const [audioLabel, setAudioLabel] = useState("");

  const phaseRef    = useRef(phase);
  const pomCountRef = useRef(pomodoroCount);
  const resetRef    = useRef(reset);

  useEffect(() => { phaseRef.current    = phase;         }, [phase]);
  useEffect(() => { pomCountRef.current = pomodoroCount; }, [pomodoroCount]);
  useEffect(() => { resetRef.current    = reset;         }, [reset]);

  useEffect(() => () => {
    clearInterval(timerID.current);
    try { finishRef.current?.pause();  } catch {}
    try { instantRef.current?.pause(); } catch {}
  }, []);

  function stopTimer() {
    if (timerID.current) {
      clearInterval(timerID.current);
      timerID.current = null;
    }
  }

  function playFinishAndWait(src, label) {
    if (label) { setAudioLabel(label); setAudioWait(true); }
    return new Promise(resolve => {
      skipResolveRef.current = () => {
        try { finishRef.current?.pause(); } catch {}
        skipResolveRef.current = null;
        resolve();
      };
      playAndWait(src, finishRef).then(() => {
        skipResolveRef.current = null;
        resolve();
      });
    });
  }

  // ── Core countdown ──────────────────────────────────────────────────────
  // initSecs is the starting value. remRef holds current value so pause/stop
  // can read it without stale closure issues.
  function _runTimer(initSecs, runPhase, soundIdx) {
    if (timerID.current) return; // already running
    remRef.current = initSecs;
    hasFinished.current = false;
    hasStarted.current  = true;
    setAudioWait(false);
    setAudioLabel("");

    const startKey = runPhase === PHASES.POMODORO ? "pomodoroStart" : "breakStart";
    playInstantWithWildcard(
      stageSrc(soundMapRef.current, startKey, 0),
      startKey, soundMapRef.current, instantRef
    );

    function tick() {
      // Read and display current value
      setTimer(fmtT(remRef.current));

      if (remRef.current === 0) {
        stopTimer();
        hasFinished.current = true;
        hasStarted.current  = false;
        setIsRunning(false);

        const sm     = soundMapRef.current;
        const isPomo = runPhase === PHASES.POMODORO;

        if (isPomo) {
          const newCount = pomCountRef.current + 1;
          pomCountRef.current = newCount;
          setPomodoroCount(newCount);
          onPomodoroFinish();

          const isCycle = newCount % intervalRef.current === 0;
          const finSrc  = stageSrc(sm, "pomodoroFinish", soundIdx);

          playFinishAndWait(finSrc, "Pomodoro finish").then(() => {
            setAudioWait(false);
            setAudioLabel("");

            const bPhase = isCycle ? PHASES.LONG_BREAK : PHASES.SHORT_BREAK;
            const bTime  = isCycle ? lTimeRef.current  : sTimeRef.current;
            setPhase(bPhase);
            phaseRef.current = bPhase;
            setTimer(bTime);
            setReset(bTime);
            resetRef.current = bTime;
            hasStarted.current = false;

            if (autoBreakRef.current) {
              setIsRunning(true);
              _runTimer(parseT(bTime), bPhase, 0);
            }
          });

        } else {
          const isLongBreak = runPhase === PHASES.LONG_BREAK;
          const finSrc = stageSrc(sm, "breakFinish", soundIdx);

          playFinishAndWait(finSrc, "Break finish").then(() => {
            const cfSrc = isLongBreak ? stageSrc(sm, "cycleFinish", 0) : null;
            return playFinishAndWait(cfSrc, isLongBreak ? "Cycle finish" : "");
          }).then(() => {
            setAudioWait(false);
            setAudioLabel("");
            onBreakFinish();

            const pTime = pTimeRef.current;
            setPhase(PHASES.POMODORO);
            phaseRef.current = PHASES.POMODORO;
            setTimer(pTime);
            setReset(pTime);
            resetRef.current = pTime;
            hasStarted.current = false;

            if (autoPomRef.current) {
              setIsRunning(true);
              _runTimer(parseT(pTime), PHASES.POMODORO, pomCountRef.current);
            }
          });
        }
        return;
      }

      remRef.current -= 1;
    }

    tick();
    timerID.current = setInterval(tick, 1000);
  }

  // ── Start / Pause ────────────────────────────────────────────────────────
  function handleStartPause() {
    if (audioWait) return;

    if (!isRunning) {
      // Fresh = phase never started, or finished. After pause: hasStarted=true, hasFinished=false → resume.
      const isFresh = !hasStarted.current || hasFinished.current;
      setIsRunning(true);
      if (isFresh) {
        hasFinished.current = false;
        hasStarted.current  = false;
        try { finishRef.current?.pause(); } catch {}
        const t = resetRef.current;
        setTimer(t);
        remRef.current = parseT(t);
        _runTimer(parseT(t), phaseRef.current, pomCountRef.current);
      } else {
        // Resume — remRef still holds where we paused
        playInstantWithWildcard(
          stageSrc(soundMapRef.current, "resume", 0),
          "resume", soundMapRef.current, instantRef
        );
        _runTimer(remRef.current, phaseRef.current, pomCountRef.current);
      }
    } else {
      // Pause — stop interval, remRef keeps current value for resume
      stopTimer();
      setIsRunning(false);
      playInstantWithWildcard(
        stageSrc(soundMapRef.current, "pause", 0),
        "pause", soundMapRef.current, instantRef
      );
    }
  }

  // ── Skip audio ───────────────────────────────────────────────────────────
  function handleSkipAudio() {
    if (skipResolveRef.current) skipResolveRef.current();
  }

  // ── Reset = full cycle reset ──────────────────────────────────────────────
  // Stops everything, resets count, switches back to Pomodoro
  function handleReset() {
    stopTimer();
    skipResolveRef.current = null;
    try { finishRef.current?.pause();  finishRef.current  = null; } catch {}
    try { instantRef.current?.pause(); instantRef.current = null; } catch {}
    hasFinished.current = false;
    hasStarted.current  = false;
    setAudioWait(false);
    setAudioLabel("");
    setIsRunning(false);

    // Reset count
    setPomodoroCount(0);
    pomCountRef.current = 0;

    // Return to Pomodoro phase
    const pTime = pTimeRef.current;
    setPhase(PHASES.POMODORO);
    phaseRef.current = PHASES.POMODORO;
    setTimer(pTime);
    setReset(pTime);
    resetRef.current  = pTime;
    remRef.current    = parseT(pTime);
  }

  // ── Skip Break ───────────────────────────────────────────────────────────
  function handleSkipBreak() {
    stopTimer();
    skipResolveRef.current = null;
    try { finishRef.current?.pause();  finishRef.current  = null; } catch {}
    try { instantRef.current?.pause(); instantRef.current = null; } catch {}
    hasFinished.current = false;
    hasStarted.current  = false;
    setAudioWait(false);
    setAudioLabel("");
    setIsRunning(false);
    const pTime = pTimeRef.current;
    setPhase(PHASES.POMODORO);
    phaseRef.current  = PHASES.POMODORO;
    setTimer(pTime);
    setReset(pTime);
    resetRef.current  = pTime;
    remRef.current    = parseT(pTime);
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const btn = (bg, small) => ({
    padding:      small ? "7px 14px" : "10px 24px",
    margin:       "0 4px",
    borderRadius: 10,
    background:   bg || "rgba(255,255,255,.2)",
    border:       "none",
    color:        "#fff",
    fontWeight:   700,
    fontSize:     small ? 12 : 15,
    cursor:       "pointer",
    fontFamily:   font || "inherit",
    boxShadow:    "0 2px 8px rgba(0,0,0,.3)",
    transition:   "opacity .2s",
  });

  const label = isRunning ? "Pause"
    : (hasFinished.current && !isBreakPhase) ? "Restart"
    : "Start";

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, marginTop:16 }}>

      <div style={{ display:"flex" }}>
        <button style={{ ...btn(), opacity: audioWait ? 0.4 : 1, cursor: audioWait ? "not-allowed" : "pointer" }}
          onClick={handleStartPause}>{label}</button>
        <button style={btn("rgba(0,0,0,.3)")} onClick={handleReset} title="Reset entire cycle">Reset</button>
      </div>

      {audioWait && (
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", letterSpacing:.5 }}>
            ♪ {audioLabel || "playing"}…
          </div>
          <button onClick={handleSkipAudio}
            style={{ ...btn("rgba(255,255,255,.15)", true), padding:"4px 10px", fontSize:11 }}>
            ⏭ Skip audio
          </button>
        </div>
      )}

      {isBreakPhase && !audioWait && (
        <button style={btn("rgba(255,255,255,.12)", true)} onClick={handleSkipBreak}>
          ⏭ Skip Break
        </button>
      )}

    </div>
  );
}
