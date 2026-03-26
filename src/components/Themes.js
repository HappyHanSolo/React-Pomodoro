/**
 * Themes.js
 *
 * New in this version:
 *  1. Theme editor has a top-level "📁 Upload folder" button that dumps all
 *     audio files into an "Unsorted" inbox. You drag/assign them to stages.
 *  2. Delete button on every theme in the sidebar (long-press or ✕ badge).
 *     Sub-themes can be deleted from the SubPanel popout.
 *  3. Auto-start wiring uses new onAutoStart imperative handle (no polling).
 */

import { useState, useRef, useEffect } from "react";
import { ASSET_THEMES, getManifestFileMap, getManifestThemeNames } from "../audioManifest";

// ─── Stage definitions ────────────────────────────────────────────────────
export const STAGES = [
  { key:"pomodoroStart",  label:"Pomodoro Start",    emoji:"▶️"  },
  { key:"pomodoroFinish", label:"Pomodoro Finish",   emoji:"🎯"  },
  { key:"pause",          label:"Pause",             emoji:"⏸️"  },
  { key:"resume",         label:"Resume",            emoji:"⏯️"  },
  { key:"breakStart",     label:"Break Start",       emoji:"☕"  },
  { key:"breakFinish",    label:"Break Finish",      emoji:"🔔"  },
  { key:"cycleFinish",    label:"Full Cycle Finish", emoji:"🏆"  },
];

let _n = 0;
const uid = () => `${Date.now()}-${_n++}`;

export const emptyEntry    = () => ({ clips:[], random:false, enabled:true, inherit:false, fiftyFifty:false });
export const emptyStageMap = () => Object.fromEntries(STAGES.map(s => [s.key, emptyEntry()]));

export function stageMapToSoundMap(sm, wildcardClips = []) {
  const out = {};
  for (const s of STAGES) {
    const e = sm[s.key] || emptyEntry();
    // Filter out clips with no url (stripped for export, not yet relinked)
    out[s.key] = { clips: e.clips.filter(c=>c.enabled!==false && c.url).map(c=>c.url), random:e.random, enabled:e.enabled, fiftyFifty:e.fiftyFifty };
  }
  out.__wildcard = wildcardClips.filter(c=>c.enabled!==false && c.url).map(c=>c.url);
  return out;
}

function resolveStageMap(sub, parent) {
  const out = {};
  for (const s of STAGES) {
    const e = sub.stageMap?.[s.key] ?? emptyEntry();
    const parentEntry = parent?.stageMap?.[s.key] ?? emptyEntry();
    out[s.key] = (e.inherit && parent) ? parentEntry : e;
  }
  return out;
}

// ─── Persistence ──────────────────────────────────────────────────────────
const LS_KEY = "pomo_themes_v3";
const lsGet = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// Ensure a theme object always has a complete stageMap (fill missing keys with emptyEntry)
function normaliseTheme(theme) {
  if (!theme) return theme;
  const sm = theme.stageMap || {};
  const fullSm = Object.fromEntries(STAGES.map(s => [s.key, sm[s.key] ?? emptyEntry()]));
  const normSubs = (theme.subThemes || []).map(normaliseTheme);
  return {
    ...theme,
    stageMap: fullSm,
    subThemes: normSubs,
    wildcardClips: theme.wildcardClips || [],
    wildcardInherit: theme.wildcardInherit ?? false,
  };
}

const loadThemes = () => (lsGet(LS_KEY, []) || []).map(normaliseTheme);

// ─── File helpers ─────────────────────────────────────────────────────────
const AUDIO_EXTS = /\.(mp3|wav|ogg|aac|flac|m4a|opus|webm)$/i;
const toDataUrl = file => new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file); });
async function filesToClips(files) {
  const audio = Array.from(files).filter(f => AUDIO_EXTS.test(f.name));
  return Promise.all(audio.map(async f => ({ id:uid(), name:f.name, url:await toDataUrl(f), enabled:true })));
}

// ─── Colours / style constants ────────────────────────────────────────────
const C = { bg:"#080713", surface:"#0f0e1a", card:"#13121f", border:"#1e1d2e", text:"#e0ddf5", muted:"#555", accent:"#7c6af7", green:"#22c55e", amber:"#f59e0b", red:"#ef4444", purple:"#a855f7" };
const OV   = { position:"fixed", inset:0, background:"rgba(0,0,0,.88)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" };
const MB   = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, display:"flex", flexDirection:"column", boxShadow:"0 32px 100px rgba(0,0,0,.95)", fontFamily:"'Segoe UI',system-ui,sans-serif", maxHeight:"90vh" };
const HDR  = { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", borderBottom:`1px solid ${C.border}`, flexShrink:0 };
const FTR  = { display:"flex", gap:8, padding:"12px 18px", borderTop:`1px solid ${C.border}`, flexShrink:0 };
const INP  = { background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", color:C.text, fontSize:13, outline:"none", width:"100%", boxSizing:"border-box" };
const PB   = { flex:1, padding:"9px", borderRadius:9, background:C.accent, border:"none", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" };
const GB   = { padding:"9px 14px", borderRadius:9, background:"transparent", border:`1px solid ${C.border}`, color:C.muted, fontSize:13, cursor:"pointer" };
const SB   = { fontSize:11, padding:"3px 9px", borderRadius:6, border:`1px solid ${C.accent}`, color:C.accent, background:"transparent", cursor:"pointer" };
const TABS = (active) => ({ padding:"5px 12px", borderRadius:"7px 7px 0 0", cursor:"pointer", background:active?C.card:"transparent", border:active?`1px solid ${C.border}`:"1px solid transparent", borderBottom:active?`1px solid ${C.card}`:`1px solid ${C.border}`, color:active?C.text:C.muted, fontSize:12 });

// ─── Micro components ─────────────────────────────────────────────────────
function Toggle({ label, active, color=C.accent, onToggle }) {
  return (
    <label style={{ display:"flex", alignItems:"center", gap:4, cursor:"pointer", userSelect:"none" }}>
      {label && <span style={{ fontSize:10, color:C.muted }}>{label}</span>}
      <div onClick={e=>{e.stopPropagation();onToggle();}} style={{ width:28,height:16,borderRadius:8,position:"relative",background:active?color:"#222",cursor:"pointer",transition:"background .2s",flexShrink:0 }}>
        <div style={{ width:12,height:12,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:active?14:2,transition:"left .2s" }}/>
      </div>
    </label>
  );
}

function InlineEdit({ value, onSave, style }) {
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(value);
  const ref=useRef();
  useEffect(()=>{if(editing)ref.current?.select();},[editing]);
  if(!editing) return <span onDoubleClick={()=>{setDraft(value);setEditing(true);}} style={{cursor:"text",...style}} title="Double-click to rename">{value}</span>;
  return <input ref={ref} value={draft} autoFocus onChange={e=>setDraft(e.target.value)}
    onBlur={()=>{onSave(draft.trim()||value);setEditing(false);}}
    onKeyDown={e=>{if(e.key==="Enter"){onSave(draft.trim()||value);setEditing(false);}if(e.key==="Escape")setEditing(false);}}
    style={{background:"transparent",border:"none",borderBottom:`1px solid ${C.accent}`,color:C.text,fontSize:"inherit",fontWeight:"inherit",outline:"none",width:140,...style}}/>;
}

function UploadIconBox({ icon, size=52, onUpload, active }) {
  const ref=useRef(null);
  async function handle(e){ const f=e.target.files[0];if(!f)return;onUpload(await toDataUrl(f));e.target.value=""; }
  return (
    <div style={{position:"relative",flexShrink:0}}>
      <div onClick={()=>ref.current?.click()} style={{width:size,height:size,borderRadius:Math.round(size*.22),overflow:"hidden",background:C.card,cursor:"pointer",border:`2px solid ${active?C.accent:C.border}`,transition:"border-color .15s,transform .12s",transform:active?"scale(1.07)":"scale(1)"}}>
        {icon?<img src={icon} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
              :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:Math.round(size*.4)}}>🖼</div>}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={handle}/>
    </div>
  );
}

function IconBox({ icon, size=52, active, onClick, onDoubleClick }) {
  return (
    <div onClick={onClick} onDoubleClick={onDoubleClick} style={{width:size,height:size,borderRadius:Math.round(size*.22),overflow:"hidden",background:C.card,cursor:"pointer",flexShrink:0,border:`2px solid ${active?C.accent:"transparent"}`,transform:active?"scale(1.07)":"scale(1)",transition:"border-color .15s,transform .12s"}}>
      {icon?<img src={icon} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
            :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:Math.round(size*.4)}}>🎵</div>}
    </div>
  );
}

// ─── ClipRow ──────────────────────────────────────────────────────────────
function ClipRow({ clip, index, draggable:isDrag, onDragStart, onDragOver, onDragEnd, onRemove, onToggle, onRename, isOver, audioRef }) {
  function preview(){ try{audioRef.current?.pause();}catch{}const a=new Audio(clip.url);audioRef.current=a;a.play().catch(()=>{}); }
  return (
    <div draggable={isDrag} onDragStart={onDragStart} onDragOver={e=>{e.preventDefault();onDragOver?.();}} onDragEnd={onDragEnd}
      style={{display:"flex",alignItems:"center",gap:6,background:isOver?`${C.accent}22`:C.card,borderRadius:7,padding:"5px 8px",border:`1px solid ${isOver?C.accent:C.border}`,cursor:isDrag?"grab":"default",userSelect:"none",opacity:clip.enabled!==false?1:.4,transition:"border-color .1s,background .1s"}}>
      {isDrag&&<span style={{fontSize:12,color:"#333",flexShrink:0}}>⠿</span>}
      <span style={{fontSize:10,color:C.accent,width:16,textAlign:"right",flexShrink:0}}>{index+1}</span>
      <InlineEdit value={clip.name} onSave={onRename} style={{fontSize:11,color:"#bbb",flex:1}}/>
      <button onClick={preview} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.muted,padding:"0 2px"}}>▶</button>
      <Toggle active={clip.enabled!==false} onToggle={onToggle} color={C.green}/>
      {onRemove&&<button onClick={onRemove} title="Remove" style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:C.red,padding:"0 3px",fontWeight:700}}>✕</button>}
    </div>
  );
}

// ─── Stage row ────────────────────────────────────────────────────────────
function StageRow({ stage, entry, onUpdate, parentEntry, audioRef }) {
  const fileRef=useRef(null),folderRef=useRef(null);
  const dragIdx=useRef(null);
  const isInternalDrag=useRef(false);
  const [dragOverIdx,setDragOverIdx]=useState(null);

  async function addFiles(files){ const added=await filesToClips(files);if(added.length)onUpdate({...entry,clips:[...entry.clips,...added]}); }
  function removeClip(id){ onUpdate({...entry,clips:entry.clips.filter(c=>c.id!==id)}); }
  function renameClip(id,name){ onUpdate({...entry,clips:entry.clips.map(c=>c.id===id?{...c,name}:c)}); }
  function toggleClip(id){ onUpdate({...entry,clips:entry.clips.map(c=>c.id===id?{...c,enabled:c.enabled===false}:c)}); }
  function reorder(i){ if(dragIdx.current===null||dragIdx.current===i)return;const next=[...entry.clips];const[m]=next.splice(dragIdx.current,1);next.splice(i,0,m);dragIdx.current=i;onUpdate({...entry,clips:next}); }
  // Only process external drops — ignore when the drag started inside this stage
  function onDrop(e){ e.preventDefault();setDragOverIdx(null);if(isInternalDrag.current)return;const raw=e.dataTransfer.getData("application/x-pomo-clip");if(!raw)return;try{const c=JSON.parse(raw);onUpdate({...entry,clips:[...entry.clips,{...c,id:uid()}]});}catch{} }

  const eff=entry.inherit&&parentEntry?parentEntry:entry;
  const single=eff.clips.length<=1;

  return (
    <div onDragOver={e=>e.preventDefault()} onDrop={onDrop}
      style={{borderBottom:`1px solid ${C.border}`,paddingBottom:12,marginBottom:12,opacity:entry.enabled?1:.38,transition:"opacity .2s"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,flexWrap:"wrap"}}>
        <span style={{fontSize:14}}>{stage.emoji}</span>
        <span style={{fontSize:13,fontWeight:700,color:C.text,flex:1}}>{stage.label}</span>
        {parentEntry!==undefined&&<Toggle label="Use parent" active={entry.inherit} onToggle={()=>onUpdate({...entry,inherit:!entry.inherit})}/>}
        <Toggle label="On" active={entry.enabled} onToggle={()=>onUpdate({...entry,enabled:!entry.enabled})}/>
        {!single&&!entry.inherit&&<Toggle label="Random" active={entry.random} color={C.green} onToggle={()=>onUpdate({...entry,random:!entry.random})}/>}
        {single&&!entry.inherit&&eff.clips.length===1&&<Toggle label="50/50" active={entry.fiftyFifty} color={C.amber} onToggle={()=>onUpdate({...entry,fiftyFifty:!entry.fiftyFifty})}/>}
        {!entry.inherit&&<>
          <button onClick={()=>fileRef.current?.click()} style={SB}>+ Files</button>
          <button onClick={()=>folderRef.current?.click()} style={{...SB,borderColor:C.green,color:C.green}}>📁 Folder</button>
          <input ref={fileRef} type="file" accept="audio/*" multiple style={{display:"none"}} onChange={e=>{addFiles(e.target.files);e.target.value="";}}/>
          <input ref={folderRef} type="file" accept="audio/*" multiple webkitdirectory="true" style={{display:"none"}} onChange={e=>{addFiles(e.target.files);e.target.value="";}}/>
        </>}
      </div>
      {entry.inherit&&parentEntry&&<p style={{fontSize:11,color:C.accent,fontStyle:"italic",marginBottom:4}}>↑ Inheriting {eff.clips.length} clip{eff.clips.length!==1?"s":""} from parent</p>}
      {!entry.inherit&&(eff.clips.length===0
        ?<p style={{fontSize:11,color:"#444",fontStyle:"italic"}}>Drop clips here, click + Files, or 📁 Folder</p>
        :<div style={{display:"flex",flexDirection:"column",gap:3}}>
          {!single&&<p style={{fontSize:10,color:entry.random?C.green:C.muted,marginBottom:3}}>{entry.random?"🎲 Random":"↕ Drag to reorder"}</p>}
          {single&&entry.fiftyFifty&&<p style={{fontSize:10,color:C.amber,marginBottom:3}}>🎲 50/50 — may skip</p>}
          {eff.clips.map((clip,i)=>(
            <ClipRow key={clip.id} clip={clip} index={i} draggable={!entry.random}
              onDragStart={()=>{ isInternalDrag.current=true; dragIdx.current=i; }}
              onDragOver={()=>{reorder(i);setDragOverIdx(i);}}
              onDragEnd={()=>{ isInternalDrag.current=false; dragIdx.current=null;setDragOverIdx(null); }}
              isOver={dragOverIdx===i}
              onRemove={()=>removeClip(clip.id)} onToggle={()=>toggleClip(clip.id)} onRename={n=>renameClip(clip.id,n)}
              audioRef={audioRef}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Wildcard section ─────────────────────────────────────────────────────
function WildcardSection({ clips, onUpdate, audioRef, parentClips, inherit, onToggleInherit }) {
  const fileRef=useRef(null),folderRef=useRef(null);
  const hasParent = parentClips && parentClips.length > 0;
  const effectiveClips = inherit && hasParent ? parentClips : clips;

  async function addFiles(files){ const added=await filesToClips(files);if(added.length)onUpdate([...clips,...added]); }
  function onDrop(e){
    e.preventDefault();
    if (inherit) return; // don't accept drops while inheriting
    const raw=e.dataTransfer.getData("application/x-pomo-clip");
    if(!raw)return;
    try{const c=JSON.parse(raw);onUpdate([...clips,{...c,id:uid()}]);}catch{}
  }
  return (
    <div onDragOver={e=>e.preventDefault()} onDrop={onDrop}
      style={{background:`${C.purple}11`,border:`1px solid ${C.purple}${inherit?"88":"44"}`,borderRadius:12,padding:"14px 16px",marginBottom:14,opacity:inherit?0.85:1}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        <span style={{fontSize:16}}>🎲</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:C.purple}}>Wildcard Sounds</div>
          <div style={{fontSize:10,color:C.muted,marginTop:2}}>Random chance — fires at a random stage event.</div>
        </div>
        {/* Inherit toggle — only shown when a parent with wildcard clips exists */}
        {onToggleInherit && hasParent && (
          <Toggle label="Use parent" active={inherit} color={C.accent} onToggle={onToggleInherit}/>
        )}
        {!inherit && <><button onClick={()=>fileRef.current?.click()} style={{...SB,borderColor:C.purple,color:C.purple}}>+ Files</button>
        <button onClick={()=>folderRef.current?.click()} style={{...SB,borderColor:C.purple,color:C.purple}}>📁 Folder</button>
        <input ref={fileRef} type="file" accept="audio/*" multiple style={{display:"none"}} onChange={e=>{addFiles(e.target.files);e.target.value="";}}/>
        <input ref={folderRef} type="file" accept="audio/*" multiple webkitdirectory="true" style={{display:"none"}} onChange={e=>{addFiles(e.target.files);e.target.value="";}} /></>}
      </div>
      {inherit && hasParent && (
        <p style={{fontSize:11,color:C.accent,fontStyle:"italic",marginBottom:4}}>↑ Inheriting {parentClips.length} wildcard clip{parentClips.length!==1?"s":""} from parent</p>
      )}
      {!inherit && (effectiveClips.length===0
        ? <p style={{fontSize:11,color:"#444",fontStyle:"italic"}}>Drop clips here or click + Files</p>
        : <div style={{display:"flex",flexDirection:"column",gap:3}}>
            {effectiveClips.map((c,i)=>(
              <ClipRow key={c.id} clip={c} index={i} draggable={false}
                onRemove={()=>onUpdate(clips.filter(x=>x.id!==c.id))}
                onToggle={()=>onUpdate(clips.map(x=>x.id===c.id?{...x,enabled:x.enabled===false}:x))}
                onRename={n=>onUpdate(clips.map(x=>x.id===c.id?{...x,name:n}:x))}
                audioRef={audioRef}/>
            ))}
          </div>
      )}
    </div>
  );
}

// ─── Unsorted inbox (folder dump) ─────────────────────────────────────────
// Shows when clips have been uploaded at the theme level without a stage.
// Each clip has a "Move to stage" dropdown.
function UnsortedInbox({ clips, onAssign, onRemove, onClear, audioRef }) {
  if (clips.length === 0) return null;
  return (
    <div style={{background:`${C.amber}11`,border:`1px solid ${C.amber}44`,borderRadius:12,padding:"12px 16px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <span style={{fontSize:16}}>📥</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:C.amber}}>Unsorted Clips ({clips.length})</div>
          <div style={{fontSize:10,color:C.muted,marginTop:2}}>Assign each clip to a stage, or drag it there directly.</div>
        </div>
        <button onClick={onClear} style={{fontSize:11,color:C.red,background:"none",border:"none",cursor:"pointer"}}>Clear all</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {clips.map(clip=>(
          <div key={clip.id} draggable
            onDragStart={e=>e.dataTransfer.setData("application/x-pomo-clip",JSON.stringify(clip))}
            style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",background:C.card,borderRadius:7,border:`1px solid ${C.border}`,cursor:"grab",userSelect:"none"}}>
            <button onClick={()=>{try{audioRef.current?.pause();}catch{}const a=new Audio(clip.url);audioRef.current=a;a.play().catch(()=>{});}}
              style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.muted,padding:"0 2px",flexShrink:0}}>▶</button>
            <span style={{flex:1,fontSize:11,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{clip.name}</span>
            <select defaultValue="" onChange={e=>{if(e.target.value)onAssign(clip,e.target.value);e.target.value="";}}
              style={{...INP,width:"auto",fontSize:11,padding:"2px 6px",color:C.text}}>
              <option value="" disabled>→ Stage</option>
              {STAGES.map(s=><option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
              <option value="__wildcard">🎲 Wildcard</option>
            </select>
            <button onClick={()=>onRemove(clip.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:C.red,fontWeight:700,padding:"0 3px",flexShrink:0}}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── THEME EDITOR MODAL ───────────────────────────────────────────────────
// Read-only clip row shown in the parent reference panel.
// Draggable so clips can be dropped into the sub's stage rows.
function ParentClipRow({ clip, audioRef }) {
  function preview(){ try{audioRef.current?.pause();}catch{} const a=new Audio(clip.url);audioRef.current=a;a.play().catch(()=>{}); }
  return (
    <div draggable
      onDragStart={e=>e.dataTransfer.setData("application/x-pomo-clip",JSON.stringify(clip))}
      style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:C.card,borderRadius:6,marginBottom:3,fontSize:11,cursor:"grab",userSelect:"none",border:`1px solid ${C.border}`}}>
      <span style={{fontSize:10,color:"#444",flexShrink:0}}>⠿</span>
      <button onClick={preview} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:C.muted,padding:"0 2px",flexShrink:0}}>▶</button>
      <span style={{flex:1,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{clip.name}</span>
    </div>
  );
}

function ThemeEditorModal({ theme, parentTheme, onSave, onActivate, onDelete, onClose }) {
  // Normalise on init and strip subThemes — the editor only manages sounds/name/icon,
  // not sub-themes. Keeping subThemes out of the draft prevents saving from overwriting
  // sub-themes that were created or edited after this editor was opened.
  const [draft,setDraft] = useState(() => {
    const base = normaliseTheme(JSON.parse(JSON.stringify(theme)));
    const {subThemes: _dropped, ...rest} = base; // eslint-disable-line no-unused-vars
    return rest;
  });
  const [unsorted,setUnsorted]     = useState([]);
  const audioRef                   = useRef(null);
  const folderRef                  = useRef(null);

  useEffect(()=>()=>{try{audioRef.current?.pause();}catch{}},[]);

  function updateStage(key,entry){ setDraft(p=>({...p,stageMap:{...p.stageMap,[key]:entry}})); }
  function updateWildcard(clips){ setDraft(p=>({...p,wildcardClips:clips})); }
  function toggleWildcardInherit(){ setDraft(p=>({...p,wildcardInherit:!p.wildcardInherit})); }

  // ── Load from manifest ────────────────────────────────────────────────────
  const [manifestLoaded, setManifestLoaded] = useState(false);
  function loadFromManifest() {
    const names = getManifestThemeNames();
    const match = names.find(n => n === draft.name)
      || names.find(n => n.toLowerCase() === draft.name.toLowerCase())
      || names.find(n => draft.name.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(draft.name.toLowerCase()));

    if (!match) {
      alert(`No bundled audio found for theme "${draft.name}".\n\nAvailable manifest themes:\n${names.join(", ") || "(none — run generateManifest.js first)"}\n\nMake sure your folder name in src/assests/ matches your theme name, then run generateManifest.js and redeploy.`);
      return;
    }
    const files = ASSET_THEMES[match] || [];
    if (!files.length) { alert(`Manifest folder "${match}" is empty.`); return; }

    const allAssigned = new Set([
      ...Object.values(draft.stageMap||{}).flatMap(e=>(e.clips||[]).map(c=>c.name)),
      ...(draft.wildcardClips||[]).map(c=>c.name),
    ]);
    const toAdd = files
      .filter(f => !allAssigned.has(f.name))
      .map(f => ({ id: uid(), name: f.name, url: f.url, enabled: true }));

    if (!toAdd.length) { alert(`All files from "${match}" are already assigned to stages.`); return; }
    setUnsorted(p => [...p, ...toAdd]);
    setManifestLoaded(true);
  }

  // Folder dump → unsorted inbox
  async function handleFolderDump(e){
    const added=await filesToClips(e.target.files);
    setUnsorted(p=>[...p,...added]);
    e.target.value="";
  }

  function assignUnsorted(clip, stageKey){
    const newClip={...clip,id:uid()};
    if(stageKey==="__wildcard"){
      setDraft(p=>({...p,wildcardClips:[...(p.wildcardClips||[]),newClip]}));
    }else{
      setDraft(p=>({...p,stageMap:{...p.stageMap,[stageKey]:{...p.stageMap[stageKey],clips:[...p.stageMap[stageKey].clips,newClip]}}}));
    }
    setUnsorted(p=>p.filter(c=>c.id!==clip.id));
  }

  function removeUnsorted(id){ setUnsorted(p=>p.filter(c=>c.id!==id)); }

  // Accept drag-drops from unsorted into stage rows
  // (StageRow handles its own drops via application/x-pomo-clip)

  // Modal is wider + side-by-side when editing a sub (parentTheme is set)
  const hasSplit = !!parentTheme;

  return (
    <div style={OV} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{...MB, width: hasSplit ? "min(960px,96vw)" : "min(620px,96vw)", flexDirection:"row", maxHeight:"90vh"}}>

        {/* ── LEFT: parent reference panel (sub-theme editor only) ──────── */}
        {hasSplit&&(
          <div style={{width:270,flexShrink:0,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",background:C.bg}}>
            <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                <IconBox icon={parentTheme.icon} size={28} active={false}/>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.text}}>{parentTheme.name}</div>
                  <div style={{fontSize:10,color:C.muted}}>Parent · drag clips into sub →</div>
                </div>
              </div>
            </div>
            <div style={{overflowY:"auto",flex:1,padding:"10px 12px"}}>
              {/* Parent wildcard */}
              {(parentTheme.wildcardClips||[]).length>0&&(
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.purple,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>🎲 Wildcard</div>
                  {parentTheme.wildcardClips.map(c=>(
                    <ParentClipRow key={c.id} clip={c} audioRef={audioRef}/>
                  ))}
                </div>
              )}
              {/* Parent stages */}
              {STAGES.map(stage=>{
                const clips=(parentTheme.stageMap?.[stage.key]?.clips||[]);
                if(!clips.length) return null;
                return (
                  <div key={stage.key} style={{marginBottom:10}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>
                      {stage.emoji} {stage.label}
                    </div>
                    {clips.map(c=>(
                      <ParentClipRow key={c.id} clip={c} audioRef={audioRef}/>
                    ))}
                  </div>
                );
              })}
              {/* Empty state */}
              {!(parentTheme.wildcardClips||[]).length&&STAGES.every(s=>!(parentTheme.stageMap?.[s.key]?.clips||[]).length)&&(
                <p style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>Parent has no sounds yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ── RIGHT: editable panel ─────────────────────────────────────── */}
        <div style={{display:"flex",flexDirection:"column",flex:1,minWidth:0}}>
          <div style={HDR}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <UploadIconBox icon={draft.icon} size={40} onUpload={url=>setDraft(p=>({...p,icon:url}))} active={false}/>
              <div>
                <InlineEdit value={draft.name} onSave={n=>setDraft(p=>({...p,name:n}))} style={{fontSize:15,fontWeight:800,color:C.text}}/>
                <div style={{fontSize:10,color:C.muted}}>Double-click name · click icon to change</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <button onClick={loadFromManifest}
                style={{...SB,borderColor:manifestLoaded?"#22c55e":C.accent,color:manifestLoaded?"#22c55e":C.accent,display:"flex",alignItems:"center",gap:4}}
                title={`Load bundled audio files for "${draft.name}" into the unsorted inbox`}>
                {manifestLoaded ? "✓ Loaded" : "⬇ Load from manifest"}
              </button>
              <button onClick={()=>folderRef.current?.click()}
                style={{...SB,borderColor:C.amber,color:C.amber,display:"flex",alignItems:"center",gap:4}}
                title="Upload an entire folder — clips land in the Unsorted inbox">
                📁 Dump folder
              </button>
              <input ref={folderRef} type="file" accept="audio/*" multiple webkitdirectory="true" style={{display:"none"}} onChange={handleFolderDump}/>
              {onDelete&&(
                <button onClick={()=>{ if(window.confirm(`Delete theme "${draft.name}"?`))onDelete(); }}
                  style={{...SB,borderColor:C.red,color:C.red}}>🗑 Delete</button>
              )}
              <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
          </div>

          <div style={{overflowY:"auto",padding:"14px 18px",flex:1}}>
            <UnsortedInbox clips={unsorted} onAssign={assignUnsorted} onRemove={removeUnsorted} onClear={()=>setUnsorted([])} audioRef={audioRef}/>
            <WildcardSection clips={draft.wildcardClips||[]} onUpdate={updateWildcard} audioRef={audioRef}
              parentClips={parentTheme?.wildcardClips||[]}
              inherit={!!draft.wildcardInherit}
              onToggleInherit={parentTheme?toggleWildcardInherit:undefined}/>
            {STAGES.map(stage=>(
              <StageRow key={stage.key} stage={stage}
                entry={draft.stageMap[stage.key]}
                parentEntry={parentTheme?parentTheme.stageMap?.[stage.key]:undefined}
                onUpdate={e=>updateStage(stage.key,e)}
                audioRef={audioRef}/>
            ))}
          </div>

          <div style={FTR}>
            <button onClick={()=>{onSave(draft);onActivate(draft,parentTheme);onClose();}} style={PB}>Save &amp; Activate</button>
            <button onClick={()=>{onSave(draft);onClose();}} style={GB}>Save only</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MiniStagePanel (used in New Theme modal) ─────────────────────────────
// MiniStagePanel — Sounds tab inside NewThemeModal
// Features: OS file drops, library clip drops, drag-to-reorder, folder upload, unsorted inbox
function MiniStagePanel({ stageMap, setStageMap, wildcardClips, setWildcardClips, audioRef, unsorted, setUnsorted }) {
  const dragIdxRef     = useRef({});   // { [stageKey]: fromIndex }
  const internalDragKey = useRef(null); // which stageKey is currently being reordered internally

  function addClipsToStage(stageKey, clips) {
    if (!clips.length) return;
    setStageMap(p => ({...p, [stageKey]: {...p[stageKey], clips: [...p[stageKey].clips, ...clips]}}));
  }
  function removeFromStage(stageKey, id) {
    setStageMap(p => ({...p, [stageKey]: {...p[stageKey], clips: p[stageKey].clips.filter(c => c.id !== id)}}));
  }
  function reorderStage(stageKey, fromIdx, toIdx) {
    if (fromIdx == null || fromIdx === toIdx) return;
    setStageMap(p => {
      const clips = [...p[stageKey].clips];
      const [m] = clips.splice(fromIdx, 1);
      clips.splice(toIdx, 0, m);
      dragIdxRef.current[stageKey] = toIdx;
      return {...p, [stageKey]: {...p[stageKey], clips}};
    });
  }

  // Only add on drop if the drag came from OUTSIDE this stage (not a reorder)
  async function handleStageDrop(e, stageKey) {
    e.preventDefault();
    // If this was an internal reorder drag, ignore — reorder already handled via onDragOver
    if (internalDragKey.current === stageKey) return;
    const raw = e.dataTransfer.getData("application/x-pomo-clip");
    if (raw) { try { const c=JSON.parse(raw);addClipsToStage(stageKey,[{...c,id:uid()}]);return; }catch{} }
    if (e.dataTransfer.files?.length) { const c=await filesToClips(e.dataTransfer.files);addClipsToStage(stageKey,c); }
  }
  async function handleWildcardDrop(e) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-pomo-clip");
    if (raw) { try { const c=JSON.parse(raw);setWildcardClips(p=>[...p,{...c,id:uid()}]);return; }catch{} }
    if (e.dataTransfer.files?.length) { const c=await filesToClips(e.dataTransfer.files);if(c.length)setWildcardClips(p=>[...p,...c]); }
  }
  async function handleUnsortedDrop(e) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-pomo-clip");
    if (raw) { try { const c=JSON.parse(raw);setUnsorted(p=>[...p,{...c,id:uid()}]);return; }catch{} }
    if (e.dataTransfer.files?.length) { const c=await filesToClips(e.dataTransfer.files);if(c.length)setUnsorted(p=>[...p,...c]); }
  }
  function assignUnsorted(clip, stageKey) {
    const nc={...clip,id:uid()};
    if (stageKey==="__wildcard") setWildcardClips(p=>[...p,nc]);
    else addClipsToStage(stageKey,[nc]);
    setUnsorted(p=>p.filter(c=>c.id!==clip.id));
  }
  function preview(url) { try{audioRef.current?.pause();}catch{} const a=new Audio(url);audioRef.current=a;a.play().catch(()=>{}); }

  const clipRow = (c, i, stageKey) => (
    <div key={c.id} draggable
      onDragStart={e=>{
        // Mark as internal reorder — do NOT propagate as a library clip drop
        internalDragKey.current = stageKey;
        dragIdxRef.current[stageKey] = i;
        // Still set drag data so the clip can be dragged OUT to other zones
        e.dataTransfer.setData("application/x-pomo-clip", JSON.stringify(c));
      }}
      onDragOver={e=>{e.preventDefault();reorderStage(stageKey,dragIdxRef.current[stageKey],i);}}
      onDragEnd={()=>{
        internalDragKey.current = null;
        dragIdxRef.current[stageKey] = null;
      }}
      style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:C.card,borderRadius:6,marginTop:3,fontSize:11,cursor:"grab",userSelect:"none",border:`1px solid ${C.border}`}}>
      <span style={{color:"#444",flexShrink:0,fontSize:11}}>⠿</span>
      <span style={{fontSize:10,color:C.accent,width:14,textAlign:"right",flexShrink:0}}>{i+1}</span>
      <button onClick={()=>preview(c.url)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:C.muted,padding:"0 2px"}}>▶</button>
      <span style={{flex:1,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
      <button onClick={()=>removeFromStage(stageKey,c.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:12,fontWeight:700}}>✕</button>
    </div>
  );

  return (
    <div>
      {/* Unsorted inbox */}
      <div onDragOver={e=>e.preventDefault()} onDrop={handleUnsortedDrop}
        style={{background:`${C.amber}11`,border:`1px solid ${C.amber}${unsorted?.length?"88":"33"}`,borderRadius:10,padding:"10px 12px",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:unsorted?.length?8:0,flexWrap:"wrap"}}>
          <span>📥</span>
          <span style={{fontSize:12,fontWeight:700,color:C.amber,flex:1}}>
            Unsorted inbox {unsorted?.length?`(${unsorted.length})`:""}
          </span>
          <label style={{...SB,borderColor:C.amber,color:C.amber,display:"inline-flex",cursor:"pointer"}}>
            + Files<input type="file" accept="audio/*" multiple style={{display:"none"}}
              onChange={e=>{filesToClips(e.target.files).then(c=>{if(c.length)setUnsorted(p=>[...p,...c]);});e.target.value="";}}/>
          </label>
          <label style={{...SB,borderColor:C.amber,color:C.amber,display:"inline-flex",cursor:"pointer"}}>
            📁 Folder<input type="file" accept="audio/*" multiple webkitdirectory="true" style={{display:"none"}}
              onChange={e=>{filesToClips(e.target.files).then(c=>{if(c.length)setUnsorted(p=>[...p,...c]);});e.target.value="";}}/>
          </label>
          {unsorted?.length>0&&<button onClick={()=>setUnsorted([])} style={{fontSize:11,color:C.red,background:"none",border:"none",cursor:"pointer"}}>Clear</button>}
        </div>
        {!unsorted?.length
          ? <p style={{fontSize:10,color:"#444",fontStyle:"italic"}}>Drop a folder or files here — assign them to stages below</p>
          : unsorted.map(c=>(
              <div key={c.id} draggable
                onDragStart={e=>e.dataTransfer.setData("application/x-pomo-clip",JSON.stringify(c))}
                style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:C.card,borderRadius:6,marginTop:3,fontSize:11,cursor:"grab",userSelect:"none",border:`1px solid ${C.border}`}}>
                <span style={{color:"#444",flexShrink:0}}>⠿</span>
                <button onClick={()=>preview(c.url)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:C.muted}}>▶</button>
                <span style={{flex:1,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
                <select defaultValue="" onChange={e=>{if(e.target.value){assignUnsorted(c,e.target.value);e.target.value="";}}}
                  style={{...INP,width:"auto",fontSize:10,padding:"2px 4px",color:C.text,flexShrink:0}}>
                  <option value="" disabled>→ Stage</option>
                  {STAGES.map(s=><option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
                  <option value="__wildcard">🎲 Wildcard</option>
                </select>
                <button onClick={()=>setUnsorted(p=>p.filter(x=>x.id!==c.id))} style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:12,fontWeight:700}}>✕</button>
              </div>
            ))
        }
      </div>

      {/* Wildcard */}
      <div onDragOver={e=>e.preventDefault()} onDrop={handleWildcardDrop}
        style={{background:`${C.purple}11`,border:`1px solid ${C.purple}44`,borderRadius:10,padding:"10px 12px",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:wildcardClips.length?6:0}}>
          <span>🎲</span>
          <span style={{fontSize:12,fontWeight:700,color:C.purple,flex:1}}>Wildcard</span>
          <label style={{...SB,borderColor:C.purple,color:C.purple,display:"inline-flex",cursor:"pointer"}}>+ Files<input type="file" accept="audio/*" multiple style={{display:"none"}} onChange={e=>{filesToClips(e.target.files).then(c=>{if(c.length)setWildcardClips(p=>[...p,...c]);});e.target.value="";}} /></label>
          <label style={{...SB,borderColor:C.purple,color:C.purple,display:"inline-flex",cursor:"pointer"}}>📁<input type="file" accept="audio/*" multiple webkitdirectory="true" style={{display:"none"}} onChange={e=>{filesToClips(e.target.files).then(c=>{if(c.length)setWildcardClips(p=>[...p,...c]);});e.target.value="";}} /></label>
        </div>
        {wildcardClips.length===0
          ? <p style={{fontSize:10,color:"#444",fontStyle:"italic"}}>Drop files/clips here or click + Files</p>
          : wildcardClips.map(c=>(
              <div key={c.id} draggable onDragStart={e=>e.dataTransfer.setData("application/x-pomo-clip",JSON.stringify(c))}
                style={{display:"flex",alignItems:"center",gap:6,padding:"3px 8px",background:C.card,borderRadius:6,marginTop:3,fontSize:11,cursor:"grab",userSelect:"none"}}>
                <button onClick={()=>preview(c.url)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:C.muted}}>▶</button>
                <span style={{flex:1,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
                <button onClick={()=>setWildcardClips(p=>p.filter(x=>x.id!==c.id))} style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:12,fontWeight:700}}>✕</button>
              </div>
            ))
        }
      </div>

      {/* Per-stage rows */}
      {STAGES.map(stage=>{
        const clips=stageMap[stage.key]?.clips||[];
        return (
          <div key={stage.key} onDragOver={e=>e.preventDefault()} onDrop={e=>handleStageDrop(e,stage.key)}
            style={{borderBottom:`1px solid ${C.border}`,paddingBottom:8,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:clips.length?5:0,flexWrap:"wrap"}}>
              <span style={{fontSize:12}}>{stage.emoji}</span>
              <span style={{fontSize:12,fontWeight:700,color:C.text,flex:1}}>{stage.label}</span>
              <label style={{...SB,display:"inline-flex",cursor:"pointer"}}>+ Files<input type="file" accept="audio/*" multiple style={{display:"none"}} onChange={e=>{filesToClips(e.target.files).then(c=>addClipsToStage(stage.key,c));e.target.value="";}} /></label>
              <label style={{...SB,borderColor:C.green,color:C.green,display:"inline-flex",cursor:"pointer"}}>📁<input type="file" accept="audio/*" multiple webkitdirectory="true" style={{display:"none"}} onChange={e=>{filesToClips(e.target.files).then(c=>addClipsToStage(stage.key,c));e.target.value="";}} /></label>
            </div>
            {clips.length===0
              ? <p style={{fontSize:10,color:"#444",fontStyle:"italic"}}>Drop files or clips here · drag handle ⠿ to reorder</p>
              : clips.map((c,i)=>clipRow(c,i,stage.key))
            }
          </div>
        );
      })}
    </div>
  );
}

// ─── NEW THEME MODAL ──────────────────────────────────────────────────────
function NewThemeModal({ parentThemeName, existingThemes, onCreate, onClose }) {
  const [tab,setTab]=useState("basic");
  const [name,setName]=useState("");
  const [iconUrl,setIconUrl]=useState(null);
  const [makeChild,setMakeChild]=useState(!!parentThemeName);
  const [parentId,setParentId]=useState("");
  const [stageMap,setStageMap]=useState(emptyStageMap);
  const [wildcardClips,setWildcardClips]=useState([]);
  const [unsorted,setUnsorted]=useState([]);
  const [subDrafts,setSubDrafts]=useState([]);
  const [activeSubIdx,setActiveSubIdx]=useState(null);
  const audioRef=useRef(null);
  useEffect(()=>()=>{try{audioRef.current?.pause();}catch{}},[]);

  function addSubDraft(){ const d={id:uid(),name:`Sub-theme ${subDrafts.length+1}`,icon:null,stageMap:emptyStageMap(),wildcardClips:[],unsorted:[]};setSubDrafts(p=>[...p,d]);setActiveSubIdx(subDrafts.length); }
  function updateSub(idx,patch){ setSubDrafts(p=>p.map((s,i)=>i===idx?{...s,...patch}:s)); }

  function create(){
    if(!name.trim())return;
    const pid=parentThemeName?"__implicit":(makeChild?parentId:null);
    onCreate({id:uid(),name:name.trim(),icon:iconUrl,stageMap,wildcardClips,subThemes:subDrafts},pid&&pid!=="__implicit"?pid:null);
    onClose();
  }

  const activeSub=activeSubIdx!==null?subDrafts[activeSubIdx]:null;

  return (
    <div style={OV} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{...MB,width:"min(680px,96vw)"}}>
        <div style={HDR}>
          <span style={{fontSize:15,fontWeight:800,color:C.text}}>{parentThemeName?`New sub-theme under "${parentThemeName}"`:"New Theme"}</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{display:"flex",padding:"10px 18px 0",gap:4,borderBottom:`1px solid ${C.border}`}}>
          {[["basic","📋 Basic"],["audio","🔊 Sounds"],!parentThemeName&&["subs","🗂 Sub-themes"]].filter(Boolean).map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={TABS(tab===k)}>{l}</button>
          ))}
        </div>
        <div style={{overflowY:"auto",padding:"16px 18px",flex:1}}>
          {tab==="basic"&&<>
            <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:16}}>
              <UploadIconBox icon={iconUrl} size={72} onUpload={setIconUrl}/>
              <div style={{flex:1}}>
                <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>Theme name *</label>
                <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&setTab("audio")} placeholder="e.g. Valorant, Lo-fi…" style={INP}/>
              </div>
            </div>
            {!parentThemeName&&(
              <div style={{background:C.card,borderRadius:10,padding:"12px 14px",border:`1px solid ${C.border}`}}>
                <Toggle label="Create as sub-theme" active={makeChild} onToggle={()=>setMakeChild(p=>!p)}/>
                {makeChild&&(existingThemes?.length>0
                  ?<select value={parentId} onChange={e=>setParentId(e.target.value)} style={{...INP,marginTop:10,width:"auto"}}>
                    <option value="">— Select parent —</option>
                    {existingThemes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  :<p style={{fontSize:11,color:C.muted,marginTop:8}}>No themes yet.</p>)}
              </div>
            )}
          </>}
          {tab==="audio"&&<MiniStagePanel stageMap={stageMap} setStageMap={setStageMap} wildcardClips={wildcardClips} setWildcardClips={setWildcardClips} unsorted={unsorted} setUnsorted={setUnsorted} audioRef={audioRef}/>}
          {tab==="subs"&&!parentThemeName&&<>
            <p style={{fontSize:11,color:C.muted,marginBottom:12}}>Define sub-themes now (optional). Stages left empty inherit from parent.</p>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
              {subDrafts.map((sub,i)=>(
                <div key={sub.id} onClick={()=>setActiveSubIdx(activeSubIdx===i?null:i)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer"}}>
                  <UploadIconBox icon={sub.icon||iconUrl} size={48} active={activeSubIdx===i} onUpload={url=>updateSub(i,{icon:url})}/>
                  <input value={sub.name} onClick={e=>e.stopPropagation()} onChange={e=>updateSub(i,{name:e.target.value})} style={{...INP,width:80,padding:"3px 6px",fontSize:11,textAlign:"center"}}/>
                  <button onClick={e=>{e.stopPropagation();setSubDrafts(p=>p.filter((_,x)=>x!==i));if(activeSubIdx===i)setActiveSubIdx(null);}} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:11}}>remove</button>
                </div>
              ))}
              <button onClick={addSubDraft} style={{width:48,height:48,borderRadius:12,border:`2px dashed ${C.border}`,background:"transparent",cursor:"pointer",fontSize:22,color:"#333",display:"flex",alignItems:"center",justifyContent:"center",alignSelf:"flex-start"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color="#333";}}>+</button>
            </div>
            {activeSub&&(
              <div style={{background:C.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:10}}>Sounds for "{activeSub.name}" <span style={{fontSize:10,color:C.muted,marginLeft:6}}>empty = inherit parent</span></div>
                <MiniStagePanel stageMap={activeSub.stageMap} setStageMap={sm=>updateSub(activeSubIdx,{stageMap:sm})} wildcardClips={activeSub.wildcardClips} setWildcardClips={wc=>updateSub(activeSubIdx,{wildcardClips:wc})} unsorted={activeSub.unsorted||[]} setUnsorted={u=>updateSub(activeSubIdx,{unsorted:u})} audioRef={audioRef}/>
              </div>
            )}
          </>}
        </div>
        <div style={FTR}>
          <button onClick={onClose} style={GB}>Cancel</button>
          <button onClick={create} disabled={!name.trim()} style={{...PB,opacity:name.trim()?1:.5}}>Create Theme</button>
        </div>
      </div>
    </div>
  );
}

// ─── Asset Library ────────────────────────────────────────────────────────
function collectAllClips(themes) {
  const out=[];
  function walk(theme,label){
    // Guard: stageMap may be missing on themes loaded from older localStorage data
    if(theme.stageMap){
      for(const s of STAGES) for(const c of (theme.stageMap[s.key]?.clips||[]))
        out.push({clip:c,stageKey:s.key,stageLabel:STAGES.find(x=>x.key===s.key)?.label,themeId:theme.id,themeLabel:label});
    }
    for(const c of (theme.wildcardClips||[]))
      out.push({clip:c,stageKey:"__wildcard",stageLabel:"Wildcard",themeId:theme.id,themeLabel:label});
    for(const sub of (theme.subThemes||[])) walk(sub,`${label} › ${sub.name}`);
  }
  for(const t of themes) walk(t,t.name);
  return out;
}

function AssetLibraryModal({ themes, onRemoveClip, onClose, audioRef }) {
  const [search,setSearch]=useState("");
  const all=collectAllClips(themes);
  const filtered=all.filter(({clip})=>clip.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={OV} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{...MB,width:"min(600px,96vw)"}}>
        <div style={HDR}>
          <div><div style={{fontSize:15,fontWeight:800,color:C.text}}>📚 Asset Library</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>All uploaded sounds. Preview, drag, toggle, or remove.</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{padding:"10px 18px",flexShrink:0}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={INP}/></div>
        <div style={{overflowY:"auto",flex:1,padding:"0 18px 14px"}}>
          {filtered.length===0&&<p style={{color:C.muted,fontSize:13,fontStyle:"italic"}}>No clips found.</p>}
          {filtered.map(({clip,stageLabel,themeLabel,themeId,stageKey},i)=>(
            <div key={`${clip.id}-${i}`} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
              <button onClick={()=>{try{audioRef.current?.pause();}catch{}const a=new Audio(clip.url);audioRef.current=a;a.play().catch(()=>{});}} style={{background:"none",border:"none",cursor:"pointer",fontSize:15,color:C.muted,flexShrink:0}}>▶</button>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{clip.name}</div>
                <div style={{fontSize:10,color:C.muted}}>{themeLabel} · {stageLabel}</div>
              </div>
              <div draggable onDragStart={e=>e.dataTransfer.setData("application/x-pomo-clip",JSON.stringify(clip))} style={{fontSize:11,color:C.accent,cursor:"grab",padding:"2px 7px",borderRadius:6,border:`1px solid ${C.accent}`,userSelect:"none",flexShrink:0}}>⠿</div>
              <Toggle active={clip.enabled!==false} onToggle={()=>onRemoveClip(themeId,stageKey,clip.id,"toggle")} color={C.green}/>
              <button onClick={()=>{if(window.confirm(`Remove "${clip.name}"?`))onRemoveClip(themeId,stageKey,clip.id,"remove");}} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:C.red,fontWeight:700,padding:"0 3px",flexShrink:0}}>✕</button>
            </div>
          ))}
        </div>
        <div style={FTR}><button onClick={onClose} style={{...GB,flex:1}}>Close</button></div>
      </div>
    </div>
  );
}

// ─── Playlist builder ─────────────────────────────────────────────────────
function PlaylistBuilder({ themes, onCreate, onClose }) {
  const [name,setName]=useState("My Playlist");
  const [stageMap,setStageMap]=useState(emptyStageMap);
  const [wildcardClips,setWildcardClips]=useState([]);
  const [search,setSearch]=useState("");
  const audioRef=useRef(null);
  const all=collectAllClips(themes);
  const filtered=all.filter(({clip})=>clip.name.toLowerCase().includes(search.toLowerCase()));
  useEffect(()=>()=>{try{audioRef.current?.pause();}catch{}},[]);

  function drop(e,key){ e.preventDefault();const raw=e.dataTransfer.getData("application/x-pomo-clip");if(!raw)return;try{const c=JSON.parse(raw);if(key==="__wildcard")setWildcardClips(p=>[...p,{...c,id:uid()}]);else setStageMap(p=>({...p,[key]:{...p[key],clips:[...(p[key]?.clips||[]),{...c,id:uid()}]}}));}catch{} }
  function remove(key,id){ if(key==="__wildcard")setWildcardClips(p=>p.filter(c=>c.id!==id));else setStageMap(p=>({...p,[key]:{...p[key],clips:p[key].clips.filter(c=>c.id!==id)}})); }
  const allSlots=[...STAGES.map(s=>({key:s.key,label:s.label,emoji:s.emoji})),{key:"__wildcard",label:"Wildcard",emoji:"🎲"}];

  return (
    <div style={OV} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{...MB,width:"min(900px,96vw)",flexDirection:"row",maxHeight:"88vh"}}>
        <div style={{width:280,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:8}}>📚 Library</div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={INP}/>
          </div>
          <div style={{overflowY:"auto",flex:1,padding:"8px 12px"}}>
            {filtered.length===0&&<p style={{color:C.muted,fontSize:12,fontStyle:"italic"}}>No clips yet.</p>}
            {filtered.map(({clip,themeLabel},i)=>(
              <div key={`${clip.id}-${i}`} draggable onDragStart={e=>e.dataTransfer.setData("application/x-pomo-clip",JSON.stringify(clip))}
                style={{display:"flex",alignItems:"center",gap:6,padding:"6px 4px",borderBottom:`1px solid ${C.border}`,cursor:"grab",userSelect:"none"}}>
                <button onClick={()=>{try{audioRef.current?.pause();}catch{}const a=new Audio(clip.url);audioRef.current=a;a.play().catch(()=>{});}} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.muted,flexShrink:0}}>▶</button>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{clip.name}</div>
                  <div style={{fontSize:9,color:C.muted}}>{themeLabel}</div>
                </div>
                <span style={{fontSize:11,color:"#333"}}>⠿</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,flexShrink:0,display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontSize:14,fontWeight:800,color:C.text}}>Build Playlist</div>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name…" style={{...INP,flex:1}}/>
          </div>
          <div style={{overflowY:"auto",flex:1,padding:"10px 16px"}}>
            <p style={{fontSize:11,color:C.muted,marginBottom:10}}>Drag clips from the library into stage slots.</p>
            {allSlots.map(slot=>{
              const clips=slot.key==="__wildcard"?wildcardClips:(stageMap[slot.key]?.clips||[]);
              return (
                <div key={slot.key} onDragOver={e=>e.preventDefault()} onDrop={e=>drop(e,slot.key)}
                  style={{marginBottom:8,padding:"8px 10px",borderRadius:10,border:`1px dashed ${slot.key==="__wildcard"?C.purple:C.border}`,background:slot.key==="__wildcard"?`${C.purple}0a`:C.card,minHeight:46}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:clips.length?5:0}}>
                    <span style={{fontSize:13}}>{slot.emoji}</span>
                    <span style={{fontSize:12,fontWeight:700,color:slot.key==="__wildcard"?C.purple:C.text,flex:1}}>{slot.label}</span>
                    <span style={{fontSize:10,color:C.muted}}>{clips.length} clip{clips.length!==1?"s":""}</span>
                  </div>
                  {clips.length===0&&<p style={{fontSize:10,color:"#333",fontStyle:"italic"}}>Drop here</p>}
                  {clips.map(c=>(
                    <div key={c.id} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 6px",background:C.surface,borderRadius:6,marginTop:3,fontSize:11,color:C.text}}>
                      <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
                      <button onClick={()=>remove(slot.key,c.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:13,fontWeight:700}}>✕</button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div style={FTR}>
            <button onClick={onClose} style={GB}>Cancel</button>
            <button onClick={()=>{if(!name.trim())return;onCreate({id:uid(),name:name.trim(),icon:null,stageMap,wildcardClips,subThemes:[]});onClose();}} disabled={!name.trim()} style={{...PB,opacity:name.trim()?1:.5}}>Create Theme</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-theme popout ─────────────────────────────────────────────────────
function SubPanel({ theme, activeSubId, anchorY, onActivateSub, onEditSub, onAddSub, onUpdateSubIcon, onDeleteSub, onClose }) {
  const isParentActive = !activeSubId; // parent itself is active (no sub selected)
  return (
    <div style={{position:"fixed",left:80,top:Math.max(8,anchorY-40),zIndex:300,background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",boxShadow:"6px 6px 32px rgba(0,0,0,.8)",minWidth:260}}
      onMouseLeave={onClose}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <span style={{fontSize:13,fontWeight:800,color:C.text}}>{theme.name}</span>
        <button onClick={onAddSub} style={SB}>+ Sub</button>
      </div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>

        {/* Main theme as first selectable option */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
          <div style={{position:"relative"}}>
            <UploadIconBox icon={theme.icon} size={44} active={isParentActive} onUpload={()=>{}}/>
            <div onClick={()=>{onActivateSub(theme,null);onClose();}} style={{position:"absolute",inset:0,cursor:"pointer",zIndex:1}}/>
            <button onClick={e=>{e.stopPropagation();onEditSub(theme,null);onClose();}} style={{position:"absolute",bottom:-4,right:-4,width:16,height:16,borderRadius:"50%",background:C.accent,border:`2px solid ${C.surface}`,cursor:"pointer",fontSize:8,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:0,zIndex:2}}>✏</button>
          </div>
          <span style={{fontSize:10,color:isParentActive?C.accent:C.muted,textAlign:"center",maxWidth:56,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:isParentActive?700:400}}>{theme.name}</span>
        </div>

        {/* Divider */}
        {(theme.subThemes||[]).length>0&&(
          <div style={{width:1,background:C.border,alignSelf:"stretch",margin:"0 2px"}}/>
        )}

        {/* Sub-themes */}
        {(theme.subThemes||[]).map(sub=>{
          const isActive=activeSubId===sub.id;
          return (
            <div key={sub.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{position:"relative"}}>
                <UploadIconBox icon={sub.icon||theme.icon} size={44} active={isActive} onUpload={url=>onUpdateSubIcon(theme.id,sub.id,url)}/>
                <div onClick={()=>{onActivateSub(sub,theme);onClose();}} style={{position:"absolute",inset:0,cursor:"pointer",zIndex:1}}/>
                <button onClick={e=>{e.stopPropagation();onEditSub(sub,theme);onClose();}} style={{position:"absolute",bottom:-4,right:-4,width:16,height:16,borderRadius:"50%",background:C.accent,border:`2px solid ${C.surface}`,cursor:"pointer",fontSize:8,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:0,zIndex:2}}>✏</button>
                <button onClick={e=>{e.stopPropagation();if(window.confirm(`Delete sub-theme "${sub.name}"?`))onDeleteSub(theme.id,sub.id);}} style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:C.red,border:`2px solid ${C.surface}`,cursor:"pointer",fontSize:9,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:0,zIndex:2}}>✕</button>
              </div>
              <span style={{fontSize:10,color:isActive?C.accent:C.muted,textAlign:"center",maxWidth:56,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:isActive?700:400}}>{sub.name}</span>
            </div>
          );
        })}
        {!theme.subThemes?.length&&<p style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>No sub-themes yet</p>}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────
const ICON_SIZE = 52;

export default function Themes({ setSoundMap, onThemesChange }) {
  const [themes,       setThemes]      = useState(loadThemes);
  const [activeId,     setActiveId]    = useState(null);
  const [activeSubId,  setActiveSubId] = useState(null);
  const [subPanel,     setSubPanel]    = useState(null);
  const [editing,      setEditing]     = useState(null);
  const [showNew,      setShowNew]     = useState(null);
  const [showLibrary,  setShowLibrary] = useState(false);
  const [showPlaylist, setShowPlaylist]= useState(false);
  // Show delete-confirm ✕ on hover
  const [hoverThemeId, setHoverThemeId] = useState(null);
  const audioRef = useRef(null);

  useEffect(()=>{ lsSet(LS_KEY,themes); if(onThemesChange) onThemesChange(themes); },[themes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-relink audio from manifest on startup ───────────────────────────
  // For any theme/sub-theme whose name matches a folder in the manifest,
  // fill in missing .url fields automatically. This means audio bundled
  // in src/assests/ is always available without any manual upload step.
  useEffect(() => {
    const manifestNames = getManifestThemeNames();
    if (!manifestNames.length) return;

    let changed = false;

    function relinkClip(clip) {
      if (clip.url) return clip; // already has audio
      // Try each manifest theme to find a file matching this clip name
      for (const themeName of manifestNames) {
        const fileMap = getManifestFileMap(themeName);
        const url = fileMap[clip.name] || fileMap[clip.name.toLowerCase()];
        if (url) { changed = true; return { ...clip, url }; }
      }
      return clip;
    }

    function relinkTheme(t) {
      const sm = {};
      for (const [k, v] of Object.entries(t.stageMap || {})) {
        sm[k] = { ...v, clips: (v.clips || []).map(relinkClip) };
      }
      return {
        ...t,
        stageMap: sm,
        wildcardClips: (t.wildcardClips || []).map(relinkClip),
        subThemes: (t.subThemes || []).map(relinkTheme),
      };
    }

    const relinked = themes.map(relinkTheme);
    if (changed) {
      setThemes(relinked);
      // Re-activate the current theme so soundMap uses the newly linked URLs
      if (activeId) {
        const activeTheme = relinked.find(t => t.id === activeId);
        if (activeTheme) {
          if (activeSubId) {
            const activeSub = (activeTheme.subThemes || []).find(s => s.id === activeSubId);
            if (activeSub) {
              const resolved = resolveStageMap(activeSub, activeTheme);
              const resolvedWildcard = activeSub.wildcardInherit
                ? (activeTheme.wildcardClips || [])
                : (activeSub.wildcardClips || []);
              setSoundMap(stageMapToSoundMap(resolved, resolvedWildcard));
            }
          } else {
            setSoundMap(stageMapToSoundMap(activeTheme.stageMap, activeTheme.wildcardClips || []));
          }
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function stopAudio(){ try{audioRef.current?.pause();audioRef.current=null;}catch{} }

  function activate(theme,parentTheme){
    setActiveId(parentTheme?parentTheme.id:theme.id);
    setActiveSubId(parentTheme?theme.id:null);
    const resolved=parentTheme?resolveStageMap(theme,parentTheme):theme.stageMap;
    // Resolve wildcard: if sub inherits wildcards from parent, use parent's clips
    const resolvedWildcard = parentTheme && theme.wildcardInherit
      ? (parentTheme.wildcardClips||[])
      : (theme.wildcardClips||[]);
    setSoundMap(stageMapToSoundMap(resolved, resolvedWildcard));
  }

  function saveTheme(updated,parentTheme){
    const norm = normaliseTheme(updated);
    setThemes(prev=>{
      if(parentTheme){
        // Saving a sub-theme: update it inside its parent, preserve all other subs
        return prev.map(t=>t.id===parentTheme.id
          ? {...t, subThemes:t.subThemes.map(s=>s.id===norm.id?norm:s)}
          : t);
      }
      // Saving a parent theme: merge norm into existing entry but KEEP the live
      // subThemes from state — the editor draft is a snapshot from open-time and
      // must not overwrite sub-themes created/edited since the editor was opened.
      return prev.map(t=>t.id===norm.id
        ? {...norm, subThemes: t.subThemes}   // norm has latest sounds/name/icon; state has latest subs
        : t);
    });
    if(parentTheme){
      if(activeId===parentTheme.id&&activeSubId===norm.id){
        const resolvedWildcard = norm.wildcardInherit
          ? (parentTheme.wildcardClips||[])
          : (norm.wildcardClips||[]);
        setSoundMap(stageMapToSoundMap(resolveStageMap(norm,parentTheme),resolvedWildcard));
      }
    } else {
      if(activeId===norm.id&&!activeSubId) setSoundMap(stageMapToSoundMap(norm.stageMap,norm.wildcardClips||[]));
    }
  }

  function deleteTheme(themeId){
    setThemes(prev=>prev.filter(t=>t.id!==themeId));
    if(activeId===themeId){ setActiveId(null); setActiveSubId(null); }
  }

  function deleteSubTheme(parentId,subId){
    setThemes(prev=>prev.map(t=>t.id===parentId?{...t,subThemes:t.subThemes.filter(s=>s.id!==subId)}:t));
    if(activeId===parentId&&activeSubId===subId){ setActiveSubId(null); }
    setSubPanel(null);
  }

  function addTheme(newTheme,parentId){
    const norm = normaliseTheme(newTheme);
    if(parentId) setThemes(prev=>prev.map(t=>t.id===parentId?{...t,subThemes:[...(t.subThemes||[]),norm,...(norm.subThemes||[])]}:t));
    else setThemes(prev=>[...prev,norm]);
  }

  function updateSubIcon(parentId,subId,url){
    setThemes(prev=>prev.map(t=>t.id===parentId?{...t,subThemes:t.subThemes.map(s=>s.id===subId?{...s,icon:url}:s)}:t));
  }

  function handleLibraryClipAction(themeId,stageKey,clipId,action){
    setThemes(prev=>prev.map(t=>{
      function processTheme(theme){
        if(theme.id!==themeId) return {...theme,subThemes:(theme.subThemes||[]).map(processTheme)};
        if(stageKey==="__wildcard"){
          const wc=action==="remove"?theme.wildcardClips.filter(c=>c.id!==clipId):theme.wildcardClips.map(c=>c.id===clipId?{...c,enabled:c.enabled===false}:c);
          return {...theme,wildcardClips:wc};
        }
        const upd={...theme.stageMap[stageKey]};
        if(action==="remove")upd.clips=upd.clips.filter(c=>c.id!==clipId);
        else upd.clips=upd.clips.map(c=>c.id===clipId?{...c,enabled:c.enabled===false}:c);
        return {...theme,stageMap:{...theme.stageMap,[stageKey]:upd}};
      }
      return processTheme(t);
    }));
  }

  return (
    <>
      {/* ── Sidebar ── */}
      <div style={{width:72,minHeight:"100vh",background:C.bg,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",alignItems:"center",padding:"12px 0",gap:6,overflowY:"auto",position:"relative",zIndex:10}}>
        {themes.map(theme=>{
          const isActive=activeId===theme.id;
          const hasSubs=(theme.subThemes||[]).length>0;
          const hovering=hoverThemeId===theme.id;
          const activeSub=isActive&&activeSubId?(theme.subThemes||[]).find(s=>s.id===activeSubId):null;
          const displayIcon=activeSub?(activeSub.icon||theme.icon):theme.icon;
          return (
            <div key={theme.id} style={{position:"relative",width:"100%",display:"flex",justifyContent:"center",flexShrink:0}}
              onMouseEnter={()=>setHoverThemeId(theme.id)} onMouseLeave={()=>setHoverThemeId(null)}>
              {isActive&&<div style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:34,borderRadius:2,background:C.accent}}/>}
              <div style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                {/* When a sub is active, show the parent icon small above as a "breadcrumb" */}
                {activeSub&&(
                  <div style={{width:22,height:22,borderRadius:6,overflow:"hidden",border:`1px solid ${C.border}`,flexShrink:0,opacity:.7,cursor:"pointer"}}
                    onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();setSubPanel(p=>p?.theme?.id===theme.id?null:{theme,anchorY:rect.top});}}
                    title={`${theme.name} (parent)`}>
                    {theme.icon
                      ?<img src={theme.icon} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                      :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,background:C.card}}>🎵</div>}
                  </div>
                )}
                {/* Main icon slot */}
                <IconBox icon={displayIcon} size={ICON_SIZE} active={isActive}
                  onClick={e=>{ if(hasSubs){const rect=e.currentTarget.getBoundingClientRect();setSubPanel(p=>p?.theme?.id===theme.id?null:{theme,anchorY:rect.top});}else activate(theme,null); }}
                  onDoubleClick={()=>{
                    if(activeSub) setEditing({theme:activeSub,parentTheme:theme});
                    else setEditing({theme,parentTheme:null});
                  }}/>
                {/* Edit badge — opens active sub editor if a sub is selected, else parent */}
                <button onClick={e=>{
                  e.stopPropagation();
                  if(activeSub) setEditing({theme:activeSub,parentTheme:theme});
                  else setEditing({theme,parentTheme:null});
                }} style={{position:"absolute",bottom:-4,right:-4,width:17,height:17,borderRadius:"50%",background:C.accent,border:`2px solid ${C.bg}`,cursor:"pointer",fontSize:8,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>✏</button>
                {/* Sub badge */}
                {hasSubs&&<div style={{position:"absolute",top:activeSub?22:-4,right:-4,width:16,height:16,borderRadius:"50%",background:subPanel?.theme?.id===theme.id?C.accent:activeSub?"#22c55e":"#333",border:`2px solid ${C.bg}`,fontSize:9,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}} title={activeSub?`Active: ${activeSub.name}`:undefined}>{activeSub?"✓":theme.subThemes.length}</div>}
                {/* Delete badge */}
                {hovering&&!hasSubs&&(
                  <button onClick={e=>{e.stopPropagation();if(window.confirm(`Delete "${theme.name}"?`))deleteTheme(theme.id);}}
                    style={{position:"absolute",top:activeSub?22:-4,left:-4,width:17,height:17,borderRadius:"50%",background:C.red,border:`2px solid ${C.bg}`,cursor:"pointer",fontSize:9,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:0,zIndex:5}}>✕</button>
                )}
              </div>
            </div>
          );
        })}

        <div style={{width:36,height:1,background:C.border,flexShrink:0,margin:"4px 0"}}/>

        {[{t:"New theme",i:"➕",c:C.accent,fn:()=>setShowNew({parentTheme:null})},
          {t:"Asset Library",i:"📚",c:C.amber,fn:()=>setShowLibrary(true)},
          {t:"Build playlist",i:"🎛",c:C.green,fn:()=>setShowPlaylist(true)},
        ].map(({t,i,c,fn})=>(
          <button key={t} title={t} onClick={fn}
            style={{width:ICON_SIZE,height:ICON_SIZE,borderRadius:12,border:`2px dashed ${C.border}`,background:"transparent",cursor:"pointer",fontSize:20,color:"#333",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"border-color .15s,color .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=c;e.currentTarget.style.color=c;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color="#333";}}>
            {i}
          </button>
        ))}
      </div>

      {/* ── Sub-theme popout ── */}
      {subPanel&&(()=>{
        // Always look up the live theme from state — subPanel.theme is a stale snapshot
        const liveTheme = themes.find(t=>t.id===subPanel.theme.id) || subPanel.theme;
        return (
          <SubPanel theme={liveTheme} activeSubId={activeSubId} anchorY={subPanel.anchorY}
            onActivateSub={activate}
            onEditSub={(sub,p)=>{setEditing({theme:sub,parentTheme:p});setSubPanel(null);}}
            onAddSub={()=>{setShowNew({parentTheme:liveTheme});setSubPanel(null);}}
            onUpdateSubIcon={updateSubIcon}
            onDeleteSub={deleteSubTheme}
            onClose={()=>setSubPanel(null)}/>
        );
      })()}

      {/* ── Theme editor ── */}
      {editing&&(()=>{
        // Always resolve the live versions from state to avoid stale snapshots
        const liveParent = editing.parentTheme
          ? themes.find(t=>t.id===editing.parentTheme.id) || editing.parentTheme
          : null;
        const liveSub = liveParent
          ? (liveParent.subThemes||[]).find(s=>s.id===editing.theme.id) || editing.theme
          : themes.find(t=>t.id===editing.theme.id) || editing.theme;
        return (
          <ThemeEditorModal theme={liveSub} parentTheme={liveParent}
            onSave={u=>saveTheme(u,liveParent)}
            onActivate={activate}
            onDelete={liveParent
              ? ()=>{ deleteSubTheme(liveParent.id,liveSub.id); setEditing(null); }
              : ()=>{ deleteTheme(liveSub.id); setEditing(null); }
            }
            onClose={()=>{stopAudio();setEditing(null);}}/>
        );
      })()}

      {showNew&&<NewThemeModal parentThemeName={showNew.parentTheme?.name} existingThemes={themes}
        onCreate={(t,pid)=>addTheme(t,showNew.parentTheme?.id||pid)}
        onClose={()=>setShowNew(null)}/>}

      {showLibrary&&<AssetLibraryModal themes={themes} audioRef={audioRef}
        onRemoveClip={handleLibraryClipAction}
        onClose={()=>{stopAudio();setShowLibrary(false);}}/>}

      {showPlaylist&&<PlaylistBuilder themes={themes}
        onCreate={t=>setThemes(prev=>[...prev,t])}
        onClose={()=>{stopAudio();setShowPlaylist(false);}}/>}
    </>
  );
}
