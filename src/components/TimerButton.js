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

/**
 * Play src and return a Promise that resolves when audio ends (or errors/absent).
 * Stores the Audio in `ref` so it can be skipped externally.
 */
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

/**
 * Play a non-blocking instant sound (start / pause / resume).
 * Stored in instantRef so it can be stopped on reset.
 * WILDCARD LOGIC: for eligible stages, there is a randomly-determined
 * chance (re-rolled each call) that the wildcard plays INSTEAD of the
 * normal sound. Pomodoro finish and cycle finish are excluded.
 *
 * Returns the src that was actually played (or null).
 */
function playInstantWithWildcard(src, stageKey, sm, instantRef) {
  const wildcardEligible =
    stageKey !== "pomodoroFinish" &&
    stageKey !== "cycleFinish";

  const pool = sm?.__wildcard;
  const hasWildcard = wildcardEligible && pool?.length > 0;

  // Fully random chance: threshold is itself random (0–1), then we roll against it.
  // Two separate named variables avoids the no-self-compare lint rule.
  const wildcardThreshold = Math.random();
  const wildcardRoll = Math.random();
  const wildcardFires = hasWildcard && wildcardRoll < wildcardThreshold;

  const actualSrc = wildcardFires
    ? pool[Math.floor(Math.random() * pool.length)]
    : src;

  if (!actualSrc) return null;
  try {
    try { instantRef.current?.pause(); } catch {}
    const a = new Audio(actualSrc);
    instantRef.current = a;
    a.play().catch(() => {});
  } catch {}
  return actualSrc;
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
  isBreakPhase,        // passed from App — avoids stale phaseRef in label
  pomodoroCount, setPomodoroCount,
  interval,
  soundMapRef,
  sTimeRef, lTimeRef, pTimeRef, intervalRef,
  autoBreakRef, autoPomRef,
  onPomodoroFinish,
  onBreakFinish,
  colors, font,
}) {
  const timerID     = useRef(null);
  const hasFinished = useRef(false);

  // finishRef  — holds the currently-playing finish/cycle audio (can be skipped)
  // instantRef — holds start/pause/resume/wildcard audio (independent)
  const finishRef  = useRef(null);
  const instantRef = useRef(null);

  // Expose a skip-resolve function so the skip button can resolve playAndWait early
  const skipResolveRef = useRef(null);

  const [audioWait,   setAudioWait]   = useState(false);
  const [audioLabel,  setAudioLabel]  = useState(""); // what's playing

  const phaseRef    = useRef(phase);
  const pomCountRef = useRef(pomodoroCount);
  const resetRef    = useRef(reset);

  useEffect(() => { phaseRef.current    = phase;         }, [phase]);
  useEffect(() => { pomCountRef.current = pomodoroCount; }, [pomodoroCount]);
  useEffect(() => { resetRef.current    = reset;         }, [reset]);

  useEffect(() => () => {
    stopTimer();
    try { finishRef.current?.pause();  } catch {}
    try { instantRef.current?.pause(); } catch {}
  }, []);

  function stopTimer() {
    if (timerID.current) { clearInterval(timerID.current); timerID.current = null; }
  }

  /**
   * Wrap playAndWait so:
   *  1. skipResolveRef is registered (skip button calls it)
   *  2. setAudioLabel shows what's playing
   *  3. Cleans up after
   */
  function playFinishAndWait(src, label) {
    setAudioLabel(label);
    setAudioWait(true);
    return new Promise(resolve => {
      // Register skip handler
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
  function _runTimer(initSecs, runPhase, soundIdx) {
    if (timerID.current) return;
    let rem = initSecs;
    hasFinished.current = false;
    setAudioWait(false);
    setAudioLabel("");

    // Start sound — wildcard may replace it
    const startKey = runPhase === PHASES.POMODORO ? "pomodoroStart" : "breakStart";
    const startSrc = stageSrc(soundMapRef.current, startKey, 0);
    playInstantWithWildcard(startSrc, startKey, soundMapRef.current, instantRef);

    function tick() {
      setTimer(fmtT(rem));

      if (rem === 0) {
        stopTimer();
        hasFinished.current = true;
        setIsRunning(false);

        const sm      = soundMapRef.current;
        const isPomo  = runPhase === PHASES.POMODORO;

        if (isPomo) {
          const newCount = pomCountRef.current + 1;
          pomCountRef.current = newCount;
          setPomodoroCount(newCount);
          onPomodoroFinish(); // App side-effects only

          const isCycle = newCount % intervalRef.current === 0;

          // Play pomodoroFinish, then switch to break phase
          const finSrc = stageSrc(sm, "pomodoroFinish", soundIdx);
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

            if (autoBreakRef.current) {
              setIsRunning(true);
              _runTimer(parseT(bTime), bPhase, 0);
            }
          });

        } else {
          // Break finish
          const isLongBreak = runPhase === PHASES.LONG_BREAK;
          const finSrc = stageSrc(sm, "breakFinish", soundIdx);
          playFinishAndWait(finSrc, "Break finish").then(() => {

            // If this was the long break (end of a full cycle), play cycleFinish after
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

            if (autoPomRef.current) {
              setIsRunning(true);
              _runTimer(parseT(pTime), PHASES.POMODORO, pomCountRef.current);
            }
          });
        }
        return;
      }
      rem -= 1;
    }

    tick();
    timerID.current = setInterval(tick, 1000);
  }

  // ── Start / Pause ────────────────────────────────────────────────────────
  function handleStartPause() {
    if (audioWait) return;

    if (!isRunning) {
      // isFresh: only restart if the timer has fully finished OR was never started
      // (timer === reset AND timerID was never set = pristine state)
      // Crucially: after a phase switch, hasFinished is false and timer===reset
      // but we want Start not Restart — that's correct fresh behaviour.
      // After pause, hasFinished is false and timer < reset — resume.
      const isFresh = hasFinished.current || (!timerID.current && timer === reset);
      setIsRunning(true);
      if (isFresh) {
        hasFinished.current = false;
        try { finishRef.current?.pause(); } catch {}
        const t = resetRef.current;
        setTimer(t);
        _runTimer(parseT(t), phaseRef.current, pomCountRef.current);
      } else {
        // Resume from pause
        const resumeSrc = stageSrc(soundMapRef.current, "resume", 0);
        playInstantWithWildcard(resumeSrc, "resume", soundMapRef.current, instantRef);
        _runTimer(parseT(timer), phaseRef.current, pomCountRef.current);
      }
    } else {
      stopTimer();
      setIsRunning(false);
      const pauseSrc = stageSrc(soundMapRef.current, "pause", 0);
      playInstantWithWildcard(pauseSrc, "pause", soundMapRef.current, instantRef);
    }
  }

  // ── Skip audio (finish sound only) ──────────────────────────────────────
  function handleSkipAudio() {
    if (skipResolveRef.current) {
      skipResolveRef.current(); // resolves playFinishAndWait early
    }
  }

  // ── Reset current timer ──────────────────────────────────────────────────
  function handleReset() {
    stopTimer();
    skipResolveRef.current = null;
    try { finishRef.current?.pause();  finishRef.current  = null; } catch {}
    try { instantRef.current?.pause(); instantRef.current = null; } catch {}
    hasFinished.current = false;
    setAudioWait(false);
    setAudioLabel("");
    setIsRunning(false);
    setTimer(reset);
  }

  // ── Reset entire cycle ───────────────────────────────────────────────────
  function handleCycleReset() {
    stopTimer();
    skipResolveRef.current = null;
    try { finishRef.current?.pause();  finishRef.current  = null; } catch {}
    try { instantRef.current?.pause(); instantRef.current = null; } catch {}
    hasFinished.current = false;
    setAudioWait(false);
    setAudioLabel("");
    setIsRunning(false);
    setPomodoroCount(0);
    pomCountRef.current = 0;
    const pTime = pTimeRef.current;
    setPhase(PHASES.POMODORO);
    phaseRef.current = PHASES.POMODORO;
    setTimer(pTime);
    setReset(pTime);
    resetRef.current = pTime;
  }

  // ── Skip Break ───────────────────────────────────────────────────────────
  function handleSkipBreak() {
    stopTimer();
    skipResolveRef.current = null;
    try { finishRef.current?.pause();  finishRef.current  = null; } catch {}
    try { instantRef.current?.pause(); instantRef.current = null; } catch {}
    hasFinished.current = false;
    setAudioWait(false);
    setAudioLabel("");
    setIsRunning(false);
    const pTime = pTimeRef.current;
    setPhase(PHASES.POMODORO);
    phaseRef.current = PHASES.POMODORO;
    setTimer(pTime);
    setReset(pTime);
    resetRef.current = pTime;
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

  // Show "Restart" only if the current phase itself finished, not a previous one
  // isBreakPhase comes from App so it's always current
  const label = isRunning ? "Pause"
    : (hasFinished.current && !isBreakPhase) ? "Restart"
    : "Start";

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, marginTop:16 }}>

      {/* Main controls */}
      <div style={{ display:"flex" }}>
        <button style={{ ...btn(), opacity: audioWait ? 0.4 : 1, cursor: audioWait ? "not-allowed" : "pointer" }}
          onClick={handleStartPause}>{label}</button>
        <button style={btn("rgba(0,0,0,.3)")} onClick={handleReset}>Reset</button>
      </div>

      {/* Audio playing indicator + skip button */}
      {audioWait && (
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", letterSpacing:.5 }}>
            ♪ {audioLabel || "playing"}…
          </div>
          <button
            onClick={handleSkipAudio}
            style={{ ...btn("rgba(255,255,255,.15)", true), padding:"4px 10px", fontSize:11 }}
            title="Skip this sound"
          >
            ⏭ Skip audio
          </button>
        </div>
      )}

      {/* Skip Break */}
      {isBreakPhase && !audioWait && (
        <button style={btn("rgba(255,255,255,.12)", true)} onClick={handleSkipBreak}
          title="Skip break and return to Pomodoro">
          ⏭ Skip Break
        </button>
      )}

      {/* Cycle reset */}
      <button style={btn("rgba(255,255,255,.08)", true)} onClick={handleCycleReset}
        title="Reset entire cycle — clears count and returns to Pomodoro">
        ↺ Reset Cycle
      </button>

    </div>
  );
}
