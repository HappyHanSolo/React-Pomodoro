import { PHASES } from "../App";

export default function PomodoroButtons({ phase, switchPhase, colors, font }) {
  const textColor = colors?.textColor || "#fff";
  return (
    <div style={{ display:"flex", gap:4, marginBottom:8 }}>
      {[["Pomodoro",PHASES.POMODORO],["Short Break",PHASES.SHORT_BREAK],["Long Break",PHASES.LONG_BREAK]].map(([label,p])=>{
        const active=phase===p;
        return (
          <button key={p} onClick={()=>switchPhase(p)} style={{
            padding:"6px 14px",borderRadius:8,
            border:`2px solid ${active?textColor:"transparent"}`,
            background:active?`${textColor}22`:"transparent",
            color:textColor,fontWeight:active?700:500,fontSize:13,
            cursor:"pointer",transition:"all .15s",fontFamily:font||"inherit",
          }}>{label}</button>
        );
      })}
    </div>
  );
}
