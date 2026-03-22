import { useState, useRef } from "react";

const LS = { get:(k,fb)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):fb;}catch{return fb;}}, set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}} };

export const FONT_OPTIONS = [
  { label:"Monospace",       value:"monospace",                      preview:"00:00" },
  { label:"Helvetica",       value:"Helvetica, Arial, sans-serif",   preview:"00:00" },
  { label:"Georgia",         value:"Georgia, serif",                 preview:"00:00" },
  { label:"Courier New",     value:"'Courier New', monospace",       preview:"00:00" },
  { label:"Verdana",         value:"Verdana, sans-serif",            preview:"00:00" },
  { label:"Trebuchet MS",    value:"'Trebuchet MS', sans-serif",     preview:"00:00" },
  { label:"Inter",           value:"'Inter', sans-serif",            google:"Inter" },
  { label:"Roboto Mono",     value:"'Roboto Mono', monospace",       google:"Roboto+Mono" },
  { label:"Space Grotesk",   value:"'Space Grotesk', sans-serif",    google:"Space+Grotesk" },
  { label:"DM Sans",         value:"'DM Sans', sans-serif",          google:"DM+Sans" },
  { label:"Outfit",          value:"'Outfit', sans-serif",           google:"Outfit" },
  { label:"Syne",            value:"'Syne', sans-serif",             google:"Syne" },
  { label:"Oxanium",         value:"'Oxanium', sans-serif",          google:"Oxanium" },
];

const COLOR_FIELDS = [
  ["pomodoroColor",   "Pomodoro background"],
  ["shortBreakColor", "Short Break background"],
  ["longBreakColor",  "Long Break background"],
  ["textColor",       "Phase button text"],
  ["bgColor",         "App background"],
  ["timerTextColor",  "Timer digits"],
];

function pad2(n) { return String(Math.max(0,parseInt(n,10)||0)).padStart(2,"0"); }

function parseTimeStr(t){
  if(typeof t==="string"&&t.includes(":")){const[m,s]=t.split(":").map(Number);return{mins:m||0,secs:s||0};}
  return{mins:parseInt(t,10)||0,secs:0};
}
function toTimeStr(mins,secs){ return `${pad2(mins)}:${pad2(secs)}`; }

export default function Settings({
  pTime,sTime,lTime,setPTime,setSTime,setLTime,
  interval,setInterval,
  showSeconds,setShowSeconds,
  autoStartBreaks,setAutoStartBreaks,
  autoStartPomodoros,setAutoStartPomodoros,
  colors,setColors,
  font,setFont,
}) {
  const [open, setOpen] = useState(false);
  const [tab,  setTab]  = useState("timer");

  // Drafts
  const pP=parseTimeStr(pTime),sP=parseTimeStr(sTime),lP=parseTimeStr(lTime);
  const [draft, setDraft] = useState({pMins:pP.mins,pSecs:pP.secs,sMins:sP.mins,sSecs:sP.secs,lMins:lP.mins,lSecs:lP.secs,interval});
  const [draftColors, setDraftColors] = useState(colors);
  const [draftFont,   setDraftFont]   = useState(font);
  const [customFonts, setCustomFonts] = useState(()=>LS.get("pomo_customFonts",[])); // [{label,value,dataUrl}]

  const fontFileRef = useRef(null);

  function openPanel(){
    const pp=parseTimeStr(pTime),sp=parseTimeStr(sTime),lp=parseTimeStr(lTime);
    setDraft({pMins:pp.mins,pSecs:pp.secs,sMins:sp.mins,sSecs:sp.secs,lMins:lp.mins,lSecs:lp.secs,interval});
    setDraftColors({...colors});
    setDraftFont(font);
    setOpen(true);
  }

  async function handleFontUpload(e){
    const f=e.target.files[0]; if(!f)return;
    const name=f.name.replace(/\.[^.]+$/,"");
    const dataUrl=await new Promise(res=>{const r=new FileReader();r.onload=ev=>res(ev.target.result);r.readAsDataURL(f);});
    // Inject @font-face
    const fontName=`CustomFont_${Date.now()}`;
    const style=document.createElement("style");
    style.textContent=`@font-face{font-family:'${fontName}';src:url('${dataUrl}');}`;
    document.head.appendChild(style);
    const entry={label:`Custom: ${name}`,value:`'${fontName}',monospace`,dataUrl};
    const next=[...customFonts,entry];
    setCustomFonts(next);
    LS.set("pomo_customFonts",next);
    setDraftFont(entry.value);
    e.target.value="";
  }

  function applyAll(){
    const newP=toTimeStr(draft.pMins,draft.pSecs);
    const newS=toTimeStr(draft.sMins,draft.sSecs);
    const newL=toTimeStr(draft.lMins,draft.lSecs);
    const newI=Math.max(1,parseInt(draft.interval,10)||1);

    // Load Google Font if needed
    const chosen=[...FONT_OPTIONS,...customFonts].find(f=>f.value===draftFont);
    if(chosen?.google){
      const id=`gf-${chosen.google}`;
      if(!document.getElementById(id)){
        const link=document.createElement("link");
        link.id=id;link.rel="stylesheet";
        link.href=`https://fonts.googleapis.com/css2?family=${chosen.google}:wght@400;700;900&display=swap`;
        document.head.appendChild(link);
      }
    }
    // Re-inject custom fonts (survive refresh via LS)
    customFonts.forEach(cf=>{
      const cfName=cf.value.replace(/['"]/g,"").split(",")[0];
      if(!document.querySelector(`style[data-font="${cfName}"]`)){
        const s=document.createElement("style");
        s.setAttribute("data-font",cfName);
        s.textContent=`@font-face{font-family:'${cfName}';src:url('${cf.dataUrl}');}`;
        document.head.appendChild(s);
      }
    });

    setPTime(newP);setSTime(newS);setLTime(newL);
    setInterval(newI);
    setColors(draftColors);
    setFont(draftFont);
    setOpen(false);
  }

  const d=(k,v)=>setDraft(p=>({...p,[k]:Math.max(0,parseInt(v,10)||0)}));

  const C2={bg:"#0f0e1a",border:"#1e1d2e",text:"#e0ddf5",muted:"#555",accent:"#7c6af7",card:"#13121f"};
  const inp2={background:C2.card,border:`1px solid ${C2.border}`,borderRadius:8,padding:"7px 10px",color:C2.text,fontSize:13,outline:"none",boxSizing:"border-box"};
  const numInp={...inp2,width:58,textAlign:"center",fontFamily:"monospace",fontWeight:700};
  const tBtn=(active)=>({padding:"5px 12px",borderRadius:"7px 7px 0 0",cursor:"pointer",background:active?C2.card:"transparent",border:active?`1px solid ${C2.border}`:"1px solid transparent",borderBottom:active?`1px solid ${C2.bg}`:`1px solid ${C2.border}`,color:active?C2.text:C2.muted,fontSize:12});

  const allFonts=[...FONT_OPTIONS,...customFonts];

  return (
    <>
      <button onClick={openPanel} style={{ padding:"8px 14px",margin:4,borderRadius:8,background:"transparent",border:"1px solid rgba(255,255,255,.25)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",alignSelf:"flex-start",marginTop:12 }}>
        ⚙ Settings
      </button>

      {open&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center" }}
          onClick={e=>e.target===e.currentTarget&&setOpen(false)}>
          <div style={{ background:C2.bg,border:`1px solid ${C2.border}`,borderRadius:16,width:"min(500px,96vw)",maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 32px 100px rgba(0,0,0,.9)",fontFamily:"'Segoe UI',system-ui,sans-serif" }}>

            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:`1px solid ${C2.border}` }}>
              <span style={{ fontSize:16,fontWeight:800,color:C2.text }}>Settings</span>
              <button onClick={()=>setOpen(false)} style={{ background:"none",border:"none",color:C2.muted,fontSize:20,cursor:"pointer" }}>✕</button>
            </div>

            <div style={{ display:"flex",padding:"10px 20px 0",gap:4,borderBottom:`1px solid ${C2.border}` }}>
              {[["timer","⏱ Timer"],["appearance","🎨 Colors"],["font","🔤 Font"]].map(([k,l])=>(
                <button key={k} onClick={()=>setTab(k)} style={tBtn(tab===k)}>{l}</button>
              ))}
            </div>

            <div style={{ overflowY:"auto",padding:"18px 20px",flex:1 }}>

              {/* ── Timer ── */}
              {tab==="timer"&&<>
                <p style={{ fontSize:11,fontWeight:700,color:C2.muted,textTransform:"uppercase",letterSpacing:.8,marginBottom:12 }}>Duration (MM : SS)</p>
                {[["Pomodoro","pMins","pSecs"],["Short Break","sMins","sSecs"],["Long Break","lMins","lSecs"]].map(([label,mk,sk])=>(
                  <div key={mk} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
                    <label style={{ fontSize:13,color:C2.text }}>{label}</label>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <input type="number" min="0" max="99" style={numInp}
                        value={pad2(draft[mk])}
                        onChange={e=>d(mk,e.target.value)}/>
                      <span style={{ color:C2.muted,fontSize:18,fontWeight:700 }}>:</span>
                      <input type="number" min="0" max="59" style={numInp}
                        value={pad2(draft[sk])}
                        onChange={e=>d(sk,Math.min(59,parseInt(e.target.value,10)||0))}/>
                    </div>
                  </div>
                ))}
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
                  <label style={{ fontSize:13,color:C2.text }}>Pomodoros per cycle</label>
                  <input type="number" min="1" max="12" style={numInp} value={pad2(draft.interval)} onChange={e=>d("interval",e.target.value)}/>
                </div>

                <hr style={{ border:"none",borderTop:`1px solid ${C2.border}`,margin:"16px 0" }}/>
                <p style={{ fontSize:11,fontWeight:700,color:C2.muted,textTransform:"uppercase",letterSpacing:.8,marginBottom:12 }}>Display &amp; Auto-start</p>
                {[
                  ["Show seconds on timer",            showSeconds,        setShowSeconds],
                  ["Auto-start break after pomodoro",  autoStartBreaks,    setAutoStartBreaks],
                  ["Auto-start pomodoro after break",  autoStartPomodoros, setAutoStartPomodoros],
                ].map(([label,val,setter])=>(
                  <div key={label} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
                    <span style={{ fontSize:13,color:C2.text }}>{label}</span>
                    <div onClick={()=>setter(p=>!p)} style={{ width:34,height:18,borderRadius:9,position:"relative",background:val?"#7c6af7":"#222",cursor:"pointer",transition:"background .2s" }}>
                      <div style={{ width:14,height:14,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:val?18:2,transition:"left .2s" }}/>
                    </div>
                  </div>
                ))}
              </>}

              {/* ── Colors ── */}
              {tab==="appearance"&&<>
                <p style={{ fontSize:11,fontWeight:700,color:C2.muted,textTransform:"uppercase",letterSpacing:.8,marginBottom:14 }}>UI Colors</p>
                {COLOR_FIELDS.map(([key,label])=>(
                  <div key={key} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
                    <span style={{ fontSize:13,color:C2.text }}>{label}</span>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <div style={{ width:28,height:28,borderRadius:7,background:draftColors[key],border:`1px solid ${C2.border}` }}/>
                      <input type="color" value={draftColors[key]} onChange={e=>setDraftColors(p=>({...p,[key]:e.target.value}))}
                        style={{ width:36,height:28,borderRadius:7,border:`1px solid ${C2.border}`,background:"transparent",cursor:"pointer",padding:0 }}/>
                      <span style={{ fontSize:11,color:"#444",fontFamily:"monospace",width:70 }}>{draftColors[key]}</span>
                    </div>
                  </div>
                ))}
                <button onClick={()=>setDraftColors({pomodoroColor:"#f87171",shortBreakColor:"#34d399",longBreakColor:"#22d3ee",textColor:"#ffffff",bgColor:"#000000",timerTextColor:"#ffffff"})}
                  style={{ fontSize:11,color:C2.muted,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",marginTop:4 }}>Reset to defaults</button>
              </>}

              {/* ── Font ── */}
              {tab==="font"&&<>
                <p style={{ fontSize:11,fontWeight:700,color:C2.muted,textTransform:"uppercase",letterSpacing:.8,marginBottom:14 }}>Timer Font</p>

                {/* Upload custom font */}
                <div style={{ background:C2.card,borderRadius:10,padding:"12px 14px",border:`1px solid ${C2.border}`,marginBottom:16 }}>
                  <div style={{ fontSize:12,fontWeight:700,color:C2.text,marginBottom:6 }}>Upload custom font</div>
                  <p style={{ fontSize:11,color:C2.muted,marginBottom:8 }}>Upload any .ttf, .otf, or .woff2 file.</p>
                  <label style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:`1px solid ${C2.accent}`,color:C2.accent,fontSize:12,cursor:"pointer" }}>
                    📂 Choose font file
                    <input ref={fontFileRef} type="file" accept=".ttf,.otf,.woff,.woff2" style={{ display:"none" }} onChange={handleFontUpload}/>
                  </label>
                </div>

                {/* Font list */}
                <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                  {allFonts.map(f=>(
                    <div key={f.value} onClick={()=>setDraftFont(f.value)}
                      style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:10,cursor:"pointer",border:`1px solid ${draftFont===f.value?C2.accent:C2.border}`,background:draftFont===f.value?`${C2.accent}18`:C2.card,transition:"border-color .15s" }}>
                      <span style={{ fontSize:13,color:C2.text }}>{f.label}</span>
                      <span style={{ fontSize:22,fontFamily:f.value,fontWeight:700,color:draftFont===f.value?C2.accent:C2.muted }}>
                        00:00
                      </span>
                    </div>
                  ))}
                </div>
              </>}

            </div>

            <div style={{ display:"flex",gap:8,padding:"14px 20px",borderTop:`1px solid ${C2.border}` }}>
              <button onClick={()=>setOpen(false)} style={{ padding:"10px 16px",borderRadius:9,background:"transparent",border:`1px solid ${C2.border}`,color:C2.muted,cursor:"pointer",fontSize:13 }}>Cancel</button>
              <button onClick={applyAll} style={{ flex:1,padding:"10px",borderRadius:9,background:"#7c6af7",border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer" }}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
