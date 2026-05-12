import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'
import { generateMusic, downloadMidi } from './api/musicApi'

const TRACKS = [
  { id:'drums',  icon:'🥁', name:'Drums',  desc:'Rhythm & beat' },
  { id:'bass',   icon:'🎸', name:'Bass',   desc:'Low foundation' },
  { id:'chords', icon:'🎹', name:'Chords', desc:'Harmony' },
  { id:'melody', icon:'🎶', name:'Melody', desc:'Main tune' },
]
const PRESETS = [
  {label:'Full band',    v:[1,1,1,1]},
  {label:'Harmony only', v:[0,0,1,1]},
  {label:'Melody only',  v:[0,0,0,1]},
  {label:'Rhythm only',  v:[1,1,0,0]},
  {label:'No drums',     v:[0,1,1,1]},
]
const CHIPS = [
  {l:'lofi',      p:'lofi hip hop to chill'},
  {l:'cinematic', p:'epic cinematic soundtrack'},
  {l:'study',     p:'soothing music for study'},
  {l:'workout',   p:'pump up workout music'},
  {l:'sad',       p:'sad music for a rainy day'},
  {l:'romantic',  p:'romantic dinner background'},
  {l:'metal',     p:'dark intense metal'},
  {l:'jazz',      p:'soft jazz for coffee shop'},
]
const STEPS=['Encoding prompt...','Generating drums...','Composing bass...','Building chords...','Creating melody...','Synchronizing...','Finalizing...']
const STRIP=['Drums','Bass','Chords','Melody','AI Music','Text to Music','Groove MIDI','POP909']
const getMood=p=>{p=p.toLowerCase();if(/study|lofi|calm|sleep|meditat/.test(p))return'CALM';if(/sad|rain|dark/.test(p))return'SAD';if(/workout|pump|metal/.test(p))return'INTENSE';if(/romantic|love/.test(p))return'ROMANTIC';if(/epic|cinematic/.test(p))return'EPIC';return'NEUTRAL'}

// ── CANVAS ───────────────────────────────────────────────
function useCanvas(ref, mouseRef) {
  useEffect(()=>{
    const c=ref.current;if(!c)return
    const ctx=c.getContext('2d');let raf,t=0
    const resize=()=>{c.width=innerWidth;c.height=innerHeight}
    resize();window.addEventListener('resize',resize)
    const pts=Array.from({length:150},()=>({
      x:Math.random(),y:Math.random(),z:Math.random()*.8+.2,
      vx:(Math.random()-.5)*.00022,vy:-(Math.random()*.0004+.0001),
      s:Math.random()*.9+.3,op:Math.random()*.3+.05
    }))
    const frame=()=>{
      t+=.007
      ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fillRect(0,0,c.width,c.height)
      // grid
      ctx.strokeStyle='rgba(255,255,255,0.018)';ctx.lineWidth=1
      const g=90
      for(let x=0;x<c.width;x+=g){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,c.height);ctx.stroke()}
      for(let y=0;y<c.height;y+=g){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(c.width,y);ctx.stroke()}
      // waves
      [{y:.2,amp:30,freq:.007,spd:.5,a:.03},{y:.4,amp:42,freq:.009,spd:.7,a:.025},
       {y:.6,amp:26,freq:.011,spd:.9,a:.02},{y:.8,amp:22,freq:.006,spd:.6,a:.015}].forEach(({y,amp,freq,spd,a})=>{
        ctx.beginPath();ctx.strokeStyle=`rgba(201,168,76,${a})`;ctx.lineWidth=1
        for(let x=0;x<=c.width;x+=3){
          const dy=Math.sin(x*freq+t*spd)*amp+Math.sin(x*freq*.6+t*spd*.7)*amp*.4
          x===0?ctx.moveTo(x,c.height*y+dy):ctx.lineTo(x,c.height*y+dy)
        }
        ctx.stroke()
      })
      // vortex
      const m=mouseRef.current
      const cx=c.width*.65+(m.x/c.width-.5)*40,cy=c.height*.42+(m.y/c.height-.5)*30
      for(let r=50;r<350;r+=70){
        ctx.beginPath();ctx.arc(cx,cy,r+Math.sin(t*.4+r*.02)*8,0,Math.PI*2)
        ctx.strokeStyle=`rgba(201,168,76,${.04*(1-r/350)})`;ctx.lineWidth=1;ctx.stroke()
      }
      for(let r=20;r<260;r+=18){
        const angle=t*.35+r*.055,drift=(m.x/c.width-.5)*.08
        ctx.beginPath();ctx.arc(cx+Math.cos(angle+drift)*r,cy+Math.sin(angle+drift)*r*.55,1.5,0,Math.PI*2)
        ctx.fillStyle=`rgba(201,168,76,${Math.max(0,(1-r/260)*.07)})`;ctx.fill()
      }
      // particles
      pts.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy
        if(p.y<-.01){p.y=1.01;p.x=Math.random()}
        ctx.beginPath();ctx.arc(p.x*c.width,p.y*c.height,p.s,0,Math.PI*2)
        ctx.fillStyle=`rgba(201,168,76,${p.op*p.z})`;ctx.fill()
      })
      raf=requestAnimationFrame(frame)
    }
    frame()
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize)}
  },[])
}

function useCursor(dotRef,ringRef,mouseRef){
  useEffect(()=>{
    let rx=0,ry=0,raf2
    const track=e=>{mouseRef.current={x:e.clientX,y:e.clientY}}
    window.addEventListener('mousemove',track)
    const move=()=>{
      const{x,y}=mouseRef.current
      rx+=(x-rx)*.14;ry+=(y-ry)*.14
      if(dotRef.current){dotRef.current.style.left=x+'px';dotRef.current.style.top=y+'px'}
      if(ringRef.current){ringRef.current.style.left=rx+'px';ringRef.current.style.top=ry+'px'}
      raf2=requestAnimationFrame(move)
    }
    move()
    return()=>{window.removeEventListener('mousemove',track);cancelAnimationFrame(raf2)}
  },[])
}

// ── HOME ─────────────────────────────────────────────────
function HomePage({onNavigate}){
  const stripItems=[...STRIP,...STRIP]
  return(
    <div style={{height:'100%',position:'relative'}}>
      <nav className="nav">
        <div className="nav-logo">
          <div className="logo-bars">
            <span className="logo-bar lb1"/>
            <span className="logo-bar lb2"/>
            <span className="logo-bar lb3"/>
            <span className="logo-bar lb4"/>
            <span className="logo-bar lb5"/>
          </div>
          <div className="logo-text-wrap">
            <span className="logo-ap">APSYNTH</span>
            <span className="logo-tagline">compose · create</span>
          </div>
        </div>
        <button className="nav-pill" onClick={onNavigate}>Generate →</button>
      </nav>
      <div className="hero">
        {[{text:'TURN',cls:'hw1',delay:.1},{text:'WORDS',cls:'hw2',delay:.22},{text:'into music.',cls:'hw3',delay:.34}].map(({text,cls,delay})=>(
          <div key={text} className="hero-word">
            <motion.span className={`hero-word-inner ${cls}`} initial={{y:'110%'}} animate={{y:0}} transition={{duration:1.4,delay,ease:[.16,1,.3,1]}}>{text}</motion.span>
          </div>
        ))}
      </div>
      <motion.div className="hero-stats" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1}}>
        {[{v:'4',k:'Models'},{v:'13k',k:'Vocab'},{v:'2',k:'Datasets'},{v:'∞',k:'Genres'}].map(s=>(
          <div key={s.k} className="hstat"><div className="hstat-val">{s.v}</div><div className="hstat-key">{s.k}</div></div>
        ))}
      </motion.div>
      <motion.div className="hero-side" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.2}}>A · P · SYNTH · 2025</motion.div>
      <motion.button className="big-cta" onClick={onNavigate} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.9}}>
        <span className="big-cta-text">Generate →</span>
        <span className="big-cta-sub">compose your world</span>
      </motion.button>
      <div className="strip">
        <div className="strip-inner">
          {stripItems.map((item,i)=><span key={i} className={i%2===1?'sep':''}>{i%2===1?'·':item}</span>)}
        </div>
      </div>
    </div>
  )
}

// ── GENERATE PAGE — FULLSCREEN STEPS ─────────────────────
function GeneratePage({onBack}){
  const TOTAL_STEPS = 4 // prompt, instruments, settings, generate
  const [step,setStep]     = useState(0)
  const [prompt,setPrompt] = useState('')
  const [tracks,setTracks] = useState({drums:true,bass:true,chords:true,melody:true})
  const [bars,setBars]     = useState(8)
  const [creat,setCreat]   = useState(1.0)
  const [tempo,setTempo]   = useState(120)
  const [tokens,setTokens] = useState(256)
  const [status,setStatus] = useState('Ready')
  const [active,setActive] = useState(false)
  const [prog,setProg]     = useState(0)
  const [loading,setLoading]=useState(false)
  const [output,setOutput] = useState(null)
  const [blob,setBlob]     = useState(null)
  const inpRef = useRef(null)

  useEffect(()=>{ if(step===0) setTimeout(()=>inpRef.current?.focus(),500) },[step])

  const next=()=>setStep(s=>Math.min(s+1,TOTAL_STEPS-1))
  const prev=()=>setStep(s=>Math.max(s-1,0))

  const toggleTrack=id=>setTracks(p=>({...p,[id]:!p[id]}))
  const applyPreset=vals=>{const ids=['drums','bass','chords','melody'];const n={};ids.forEach((id,i)=>n[id]=!!vals[i]);setTracks(n)}

  const doGenerate=useCallback(async()=>{
    const sel=Object.entries(tracks).filter(([,v])=>v).map(([k])=>k)
    if(!sel.length) return
    setLoading(true);setOutput(null);setBlob(null)
    setActive(true);setProg(0);setStatus(STEPS[0])
    let i=0
    const iv=setInterval(()=>{i=Math.min(i+1,STEPS.length-1);setStatus(STEPS[i]);setProg((i+1)/STEPS.length*100)},700)
    try{
      const b=await generateMusic({prompt,tracks:sel,bars,creativity:creat,tempo,maxTokens:tokens})
      clearInterval(iv);setBlob(b);setStatus('Ready to download');setProg(100);setActive(false)
      setOutput({prompt,bpm:tempo,mood:getMood(prompt),tracks:sel.length,dur:bars*2,list:sel})
    }catch(e){clearInterval(iv);setStatus(`Error: ${e.message}`);setActive(false);setProg(0)}
    setLoading(false)
  },[prompt,tracks,bars,creat,tempo,tokens])

  // keyboard nav
  useEffect(()=>{
    const h=e=>{
      if(e.key==='ArrowDown'||e.key==='Tab'){e.preventDefault();next()}
      if(e.key==='ArrowUp'){e.preventDefault();prev()}
      if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){if(step===TOTAL_STEPS-1)doGenerate();else next()}
      if(e.key==='Enter'&&step===0&&prompt.trim())next()
    }
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)
  },[step,prompt,doGenerate])

  const variants={
    enter:(dir)=>({y:dir>0?'100%':'-100%',opacity:0}),
    center:{y:0,opacity:1},
    exit:(dir)=>({y:dir<0?'100%':'-100%',opacity:0}),
  }

  const stepRef = useRef(0)
  const dir = step > stepRef.current ? 1 : -1
  useEffect(()=>{ stepRef.current=step },[step])

  return(
    <div className="gen-page-root">
      {/* NAV */}
      <nav className="nav" style={{zIndex:300}}>
        <button className="nav-back" onClick={onBack}>← Back</button>
        <div className="nav-logo">
          <div className="logo-bars">
            <span className="logo-bar lb1"/>
            <span className="logo-bar lb2"/>
            <span className="logo-bar lb3"/>
            <span className="logo-bar lb4"/>
            <span className="logo-bar lb5"/>
          </div>
          <div className="logo-text-wrap">
            <span className="logo-ap">APSYNTH</span>
            <span className="logo-tagline">compose · create</span>
          </div>
        </div>
        <div className="step-dots">
          {Array.from({length:TOTAL_STEPS}).map((_,i)=>(
            <button key={i} className={`step-dot ${i===step?'active':''} ${i<step?'done':''}`} onClick={()=>setStep(i)}/>
          ))}
        </div>
      </nav>

      {/* FULLSCREEN STEPS */}
      <AnimatePresence custom={dir} mode="wait">
        {/* STEP 0 — PROMPT */}
        {step===0 && (
          <motion.div key="step0" className="fs-step"
            custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{duration:.7,ease:[.16,1,.3,1]}}>
            <div className="fs-step-inner">
              <motion.div className="fs-step-num" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:.2}}>01</motion.div>
              <motion.div className="fs-step-label" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.25}}>Describe your music</motion.div>
              <motion.div className="fs-big-question" initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{delay:.3,duration:.8}}>
                What do you<br/>want to hear?
              </motion.div>
              <motion.div className="fs-input-wrap" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.45}}>
                <input ref={inpRef} className="fs-input" value={prompt}
                  onChange={e=>setPrompt(e.target.value)}
                  placeholder="e.g. lofi hip hop to chill..."/>
                <div className="fs-input-line"/>
              </motion.div>
              <motion.div className="fs-chips" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.6}}>
                {CHIPS.map(({l,p})=>(
                  <button key={l} className="chip" onClick={()=>setPrompt(p)}><span>{l}</span></button>
                ))}
              </motion.div>
              <motion.button className="fs-next-btn" onClick={next}
                initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.7}}
                disabled={!prompt.trim()}>
                Next — Choose instruments →
              </motion.button>
              <motion.div className="fs-hint" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.9}}>Press Enter or ↓ to continue</motion.div>
            </div>
          </motion.div>
        )}

        {/* STEP 1 — INSTRUMENTS */}
        {step===1 && (
          <motion.div key="step1" className="fs-step"
            custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{duration:.7,ease:[.16,1,.3,1]}}>
            <div className="fs-step-inner">
              <motion.div className="fs-step-num" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:.2}}>02</motion.div>
              <motion.div className="fs-step-label" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.25}}>Select instruments</motion.div>
              <motion.div className="fs-big-question" initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{delay:.3,duration:.8}}>
                What should<br/>be playing?
              </motion.div>
              <motion.div className="fs-track-grid" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.45}}>
                {TRACKS.map((t,i)=>(
                  <motion.div key={t.id} className={`fs-tcard ${tracks[t.id]?'on':''}`}
                    onClick={()=>toggleTrack(t.id)}
                    initial={{opacity:0,y:30}} animate={{opacity:1,y:0}}
                    transition={{delay:.35+i*.08}}>
                    <span className="fs-tcard-chk">{tracks[t.id]?'✓':'○'}</span>
                    <span className="fs-tcard-icon">{t.icon}</span>
                    <div className="fs-tcard-name">{t.name}</div>
                    <div className="fs-tcard-desc">{t.desc}</div>
                  </motion.div>
                ))}
              </motion.div>
              <motion.div className="presets" style={{marginTop:20}} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.7}}>
                {PRESETS.map(p=>(
                  <button key={p.label} className="preset" onClick={()=>applyPreset(p.v)}>{p.label}</button>
                ))}
              </motion.div>
              <div className="fs-nav-row">
                <button className="fs-prev-btn" onClick={prev}>← Back</button>
                <motion.button className="fs-next-btn" onClick={next}
                  initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.8}}>
                  Next — Fine-tune settings →
                </motion.button>
              </div>
              <motion.div className="fs-hint" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.9}}>Use ↓ to continue</motion.div>
            </div>
          </motion.div>
        )}

        {/* STEP 2 — SETTINGS */}
        {step===2 && (
          <motion.div key="step2" className="fs-step"
            custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{duration:.7,ease:[.16,1,.3,1]}}>
            <div className="fs-step-inner">
              <motion.div className="fs-step-num" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:.2}}>03</motion.div>
              <motion.div className="fs-step-label" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.25}}>Fine-tune</motion.div>
              <motion.div className="fs-big-question" initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{delay:.3,duration:.8}}>
                Shape your<br/>sound.
              </motion.div>
              <motion.div className="fs-ctrl-grid" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.45}}>
                {[
                  {lbl:'Duration',  unit:'bars', val:bars,  min:4,  max:16,  step:4,   set:v=>setBars(parseInt(v)),   fmt:v=>v},
                  {lbl:'Creativity',unit:'',     val:creat, min:0.5,max:1.5, step:0.1, set:v=>setCreat(parseFloat(v)),fmt:v=>parseFloat(v).toFixed(1)},
                  {lbl:'Tempo',     unit:'BPM',  val:tempo, min:50, max:200, step:5,   set:v=>setTempo(parseInt(v)),  fmt:v=>v},
                  {lbl:'Tokens',    unit:'max',  val:tokens,min:64, max:512, step:64,  set:v=>setTokens(parseInt(v)), fmt:v=>v},
                ].map((c,i)=>(
                  <motion.div key={c.lbl} className="fs-ctrl"
                    initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:.35+i*.1}}>
                    <div className="fs-ctrl-top">
                      <span>{c.lbl}</span>
                      <em>{c.fmt(c.val)} {c.unit}</em>
                    </div>
                    <input type="range" min={c.min} max={c.max} step={c.step} value={c.val} onChange={e=>c.set(e.target.value)}/>
                  </motion.div>
                ))}
              </motion.div>
              <div className="fs-nav-row">
                <button className="fs-prev-btn" onClick={prev}>← Back</button>
                <motion.button className="fs-next-btn" onClick={next}
                  initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.8}}>
                  Ready — Generate music →
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3 — GENERATE */}
        {step===3 && (
          <motion.div key="step3" className="fs-step"
            custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{duration:.7,ease:[.16,1,.3,1]}}>
            <div className="fs-step-inner" style={{textAlign:'center',alignItems:'center'}}>
              <motion.div className="fs-step-num" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:.2}}>04</motion.div>
              <motion.div className="fs-step-label" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.25}}>Generate</motion.div>

              {/* Summary */}
              <motion.div className="gen-summary" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.3}}>
                <div className="gen-summary-prompt">"{prompt||'no prompt entered'}"</div>
                <div className="gen-summary-meta">
                  {Object.entries(tracks).filter(([,v])=>v).map(([k])=>TRACKS.find(t=>t.id===k)?.icon).join(' ')}
                  &nbsp;·&nbsp;{bars} bars&nbsp;·&nbsp;{tempo} BPM&nbsp;·&nbsp;Creativity {parseFloat(creat).toFixed(1)}
                </div>
              </motion.div>

              {/* THE BIG BUTTON */}
              <motion.button
                className={`the-btn ${loading?'loading':''}`}
                onClick={doGenerate}
                disabled={loading||!prompt.trim()}
                initial={{opacity:0,scale:.8}} animate={{opacity:1,scale:1}}
                transition={{delay:.4,type:'spring',stiffness:200,damping:20}}
                whileHover={{scale:1.05}} whileTap={{scale:.97}}>
                <span className="the-btn-icon">{loading?'◌':'↗'}</span>
                <span className="the-btn-label">{loading?'Composing...':'Generate'}</span>
              </motion.button>

              {/* Status */}
              <motion.div className="gen-status" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.6}}>
                <div className={`sdot2 ${active?'on':''}`}/>
                <span className="stxt2">{status}</span>
                <div className="sbar2"><div className="sfill2" style={{width:`${prog}%`}}/></div>
              </motion.div>

              {/* Output */}
              <AnimatePresence>
                {output && (
                  <motion.div className="fs-output"
                    initial={{opacity:0,y:32}} animate={{opacity:1,y:0}}
                    transition={{duration:.8,ease:[.16,1,.3,1]}}>
                    <div className="fs-out-stats">
                      {[{v:output.bpm,k:'BPM'},{v:output.mood,k:'Mood'},{v:output.tracks,k:'Tracks'},{v:`${output.dur}s`,k:'Duration'}].map((s,i)=>(
                        <motion.div key={s.k} className="fs-ostat"
                          initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*.1}}>
                          <div className="fs-oval">{s.v}</div>
                          <div className="fs-okey">{s.k}</div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="fs-trows">
                      {output.list.map((t,i)=>{
                        const tr=TRACKS.find(x=>x.id===t)
                        return(
                          <motion.div key={t} className="fs-trow"
                            initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:i*.08+.3}}>
                            <span>{tr?.icon}</span>
                            <span className="fs-trow-name">{t}</span>
                            <div className="fs-trow-bar">
                              <motion.div className="fs-trow-fill"
                                initial={{width:0}} animate={{width:`${40+Math.floor(Math.random()*55)}%`}}
                                transition={{duration:2,ease:[.16,1,.3,1],delay:i*.1+.5}}/>
                            </div>
                            <span className="fs-trow-n">{70+Math.floor(Math.random()*50)} notes</span>
                          </motion.div>
                        )
                      })}
                    </div>
                    {blob&&(
                      <motion.button className="fs-dl" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.8}}
                        onClick={()=>downloadMidi(blob,`${prompt.slice(0,20).replace(/\s/g,'_')}.mid`)}>
                        ↓ Download MIDI
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="fs-nav-row" style={{justifyContent:'center',marginTop:24}}>
                <button className="fs-prev-btn" onClick={prev}>← Edit settings</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCROLL HINT ARROW */}
      {step < TOTAL_STEPS-1 && (
        <button className="scroll-arrow" onClick={next}>↓</button>
      )}
    </div>
  )
}

// ── APP ROOT ─────────────────────────────────────────────
export default function App(){
  const [page,setPage]   = useState('home') // 'home' | 'generate'
  const canvRef  = useRef(null)
  const dotRef   = useRef(null)
  const ringRef  = useRef(null)
  const mouseRef = useRef({x:0,y:0})

  useCanvas(canvRef,mouseRef)
  useCursor(dotRef,ringRef,mouseRef)

  const stripItems=[...STRIP,...STRIP]

  return(
    <div style={{height:'100%',position:'relative',overflow:'hidden'}}>
      <canvas className="bg-canvas" ref={canvRef}/>
      <div className="noise"/>
      <div className="cur-dot" ref={dotRef}/>
      <div className="cur-ring" ref={ringRef}/>

      <AnimatePresence mode="wait">
        {page==='home'?(
          <motion.div key="home" style={{height:'100%'}}
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0,y:-40}}
            transition={{duration:.6}}>
            <HomePage onNavigate={()=>setPage('generate')}/>
          </motion.div>
        ):(
          <motion.div key="gen" style={{height:'100%'}}
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            transition={{duration:.4}}>
            <GeneratePage onBack={()=>setPage('home')}/>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Always-on strip on home only */}
      {page==='home' && (
        <div className="strip">
          <div className="strip-inner">
            {stripItems.map((item,i)=><span key={i} className={i%2===1?'sep':''}>{i%2===1?'·':item}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}