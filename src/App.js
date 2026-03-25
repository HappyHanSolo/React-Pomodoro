import "./App.css";
import React, { useCallback, useEffect, useRef, useState } from "react";
import TimerButton from "./components/TimerButton";
import PomodoroButtons from "./components/PomodoroButtons";
import Themes from "./components/Themes";
import Settings from "./components/Settings";
import { STAGES } from "./components/Themes";

export const PHASES = {
  POMODORO:    "pomodoro",
  SHORT_BREAK: "shortBreak",
  LONG_BREAK:  "longBreak",
};

const emptySoundMap = () => ({
  ...Object.fromEntries(STAGES.map(s => [s.key, { clips:[], random:false, enabled:true, fiftyFifty:false }])),
  __wildcard: [],
});

export const DEFAULT_COLORS = {
  pomodoroColor:   "#f87171",
  shortBreakColor: "#34d399",
  longBreakColor:  "#22d3ee",
  textColor:       "#ffffff",
  bgColor:         "#000000",
  timerTextColor:  "#ffffff",
};

const LS = {
  get: (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

export default function App() {
  const [pTime,    setPTime]    = useState(() => LS.get("pomo_pTime",   "25:00"));
  const [sTime,    setSTime]    = useState(() => LS.get("pomo_sTime",   "05:00"));
  const [lTime,    setLTime]    = useState(() => LS.get("pomo_lTime",   "15:00"));
  const [interval, setIntervalVal] = useState(() => LS.get("pomo_interval", 4));

  const [showSeconds,        setShowSeconds]        = useState(() => LS.get("pomo_showSec", true));
  const [autoStartBreaks,    setAutoStartBreaks]    = useState(() => LS.get("pomo_autoBreak", false));
  const [autoStartPomodoros, setAutoStartPomodoros] = useState(() => LS.get("pomo_autoPomo",  false));
  const [colors, setColors] = useState(() => LS.get("pomo_colors", DEFAULT_COLORS));
  const [font,   setFont]   = useState(() => LS.get("pomo_font",   "monospace"));

  const [phase,         setPhase]         = useState(PHASES.POMODORO);
  const [timer,         setTimer]         = useState(() => LS.get("pomo_pTime", "25:00"));
  const [reset,         setReset]         = useState(() => LS.get("pomo_pTime", "25:00"));
  const [isRunning,     setIsRunning]     = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [soundMap,      setSoundMap]      = useState(emptySoundMap);
  const [appThemes,     setAppThemes]     = useState([]);

  // ── Fullscreen ───────────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);
  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  // Persist
  useEffect(() => LS.set("pomo_pTime",    pTime),    [pTime]);
  useEffect(() => LS.set("pomo_sTime",    sTime),    [sTime]);
  useEffect(() => LS.set("pomo_lTime",    lTime),    [lTime]);
  useEffect(() => LS.set("pomo_interval", interval), [interval]);
  useEffect(() => LS.set("pomo_showSec",  showSeconds), [showSeconds]);
  useEffect(() => LS.set("pomo_autoBreak",  autoStartBreaks),    [autoStartBreaks]);
  useEffect(() => LS.set("pomo_autoPomo",   autoStartPomodoros), [autoStartPomodoros]);
  useEffect(() => LS.set("pomo_colors", colors), [colors]);
  useEffect(() => LS.set("pomo_font",   font),   [font]);

  // ── Refs passed directly to TimerButton ──────────────────────────────────
  const soundMapRef  = useRef(soundMap);
  const sTimeRef     = useRef(sTime);
  const lTimeRef     = useRef(lTime);
  const pTimeRef     = useRef(pTime);
  const intervalRef  = useRef(interval);
  const autoBreakRef = useRef(autoStartBreaks);
  const autoPomRef   = useRef(autoStartPomodoros);

  useEffect(() => { soundMapRef.current  = soundMap;           }, [soundMap]);
  useEffect(() => { sTimeRef.current     = sTime;              }, [sTime]);
  useEffect(() => { lTimeRef.current     = lTime;              }, [lTime]);
  useEffect(() => { pTimeRef.current     = pTime;              }, [pTime]);
  useEffect(() => { intervalRef.current  = interval;           }, [interval]);
  useEffect(() => { autoBreakRef.current = autoStartBreaks;    }, [autoStartBreaks]);
  useEffect(() => { autoPomRef.current   = autoStartPomodoros; }, [autoStartPomodoros]);

  // ── Sync timer display when settings change ───────────────────────────────
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => { if (!isRunning && phaseRef.current === PHASES.POMODORO)    { setTimer(pTime); setReset(pTime); } }, [pTime, isRunning]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!isRunning && phaseRef.current === PHASES.SHORT_BREAK) { setTimer(sTime); setReset(sTime); } }, [sTime, isRunning]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!isRunning && phaseRef.current === PHASES.LONG_BREAK)  { setTimer(lTime); setReset(lTime); } }, [lTime, isRunning]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPomodoroFinish = useCallback(() => {}, []);
  const onBreakFinish    = useCallback(() => {}, []);

  // ── Manual phase switch ───────────────────────────────────────────────────
  function switchPhase(newPhase) {
    setIsRunning(false);
    setPhase(newPhase);
    phaseRef.current = newPhase;
    const t = newPhase === PHASES.POMODORO ? pTime
            : newPhase === PHASES.SHORT_BREAK ? sTime : lTime;
    setTimer(t);
    setReset(t);
  }

  const phaseBG = {
    [PHASES.POMODORO]:    colors.pomodoroColor,
    [PHASES.SHORT_BREAK]: colors.shortBreakColor,
    [PHASES.LONG_BREAK]:  colors.longBreakColor,
  }[phase];

  const isBreakPhase = phase === PHASES.SHORT_BREAK || phase === PHASES.LONG_BREAK;

  // ── Cycle dots — groups of 5 per row ─────────────────────────────────────
  const completedInCycle = pomodoroCount % interval;
  const DOTS_PER_ROW = 5;
  const dotRows = [];
  for (let i = 0; i < interval; i += DOTS_PER_ROW) {
    dotRows.push(Array.from({ length: Math.min(DOTS_PER_ROW, interval - i) }, (_, j) => i + j));
  }

  return (
    <div style={{ background:colors.bgColor, width:"100vw", height:"100vh", display:"flex", overflow:"hidden", fontFamily:font }}>
      <Themes setSoundMap={setSoundMap} onThemesChange={setAppThemes} />

      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>

        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          style={{
            position:"absolute", top:16, right:16,
            background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)",
            color:"#fff", borderRadius:8, padding:"6px 12px", cursor:"pointer",
            fontSize:13, fontFamily:font, fontWeight:600,
          }}
        >
          {isFullscreen ? "⤡ Exit" : "⤢ Fullscreen"}
        </button>

        <section style={{
          background: phaseBG + "cc",
          width:"40vw", minWidth:320, maxWidth:520,
          display:"flex", flexDirection:"column", alignItems:"center",
          padding:"40px 20px", borderRadius:16,
          boxShadow:"0 8px 40px rgba(0,0,0,.4)",
        }}>
          <PomodoroButtons phase={phase} switchPhase={switchPhase} colors={colors} font={font}/>

          {/* Cycle dots — max 5 per row, stacks into multiple rows */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, margin:"12px 0" }}>
            {dotRows.map((row, ri) => (
              <div key={ri} style={{ display:"flex", gap:8 }}>
                {row.map(i => (
                  <div key={i} style={{
                    width:12, height:12, borderRadius:"50%",
                    border:`2px solid ${colors.timerTextColor}`,
                    background: i < completedInCycle ? colors.timerTextColor : "transparent",
                    transition:"background .3s",
                  }}/>
                ))}
              </div>
            ))}
          </div>

          {/* Timer display */}
          <div style={{
            fontSize:"clamp(64px,10vw,120px)", fontWeight:900,
            color:colors.timerTextColor, fontVariantNumeric:"tabular-nums",
            fontFamily:font, margin:"8px 0", letterSpacing:-2, lineHeight:1,
          }}>
            {showSeconds ? timer : timer.slice(0,5)}
          </div>

          <TimerButton
            isRunning={isRunning}     setIsRunning={setIsRunning}
            timer={timer}             setTimer={setTimer}
            reset={reset}             setReset={setReset}
            phase={phase}             setPhase={setPhase}
            isBreakPhase={isBreakPhase}
            pomodoroCount={pomodoroCount} setPomodoroCount={setPomodoroCount}
            interval={interval}
            soundMapRef={soundMapRef}
            sTimeRef={sTimeRef}   lTimeRef={lTimeRef}   pTimeRef={pTimeRef}
            intervalRef={intervalRef}
            autoBreakRef={autoBreakRef}
            autoPomRef={autoPomRef}
            onPomodoroFinish={onPomodoroFinish}
            onBreakFinish={onBreakFinish}
            colors={colors}
            font={font}
          />
        </section>
      </div>

      <Settings
        pTime={pTime} sTime={sTime} lTime={lTime}
        setPTime={setPTime} setSTime={setSTime} setLTime={setLTime}
        interval={interval} setInterval={setIntervalVal}
        showSeconds={showSeconds} setShowSeconds={setShowSeconds}
        autoStartBreaks={autoStartBreaks}       setAutoStartBreaks={setAutoStartBreaks}
        autoStartPomodoros={autoStartPomodoros} setAutoStartPomodoros={setAutoStartPomodoros}
        colors={colors} setColors={setColors}
        font={font} setFont={setFont}
        themes={appThemes}
      />
    </div>
  );
}
