import './App.css';
// import soundfile from './audio/valorantAssets/valorant-theme-song.mp3'
import React, {useEffect, useState} from 'react';
import Soundclips from './SoundsClipList';

function App() {
  let buttonCSS="py-2 px-3 m-1 rounded-md text-white border-2";
  let pomodoroCSS = 'm-auto w-[40vw] items-center flex flex-col bg-red-400/80 py-10 rounded-md justify-center h-[60vh]';
  let shortBreakCSS = 'm-auto w-[40vw] items-center flex flex-col bg-teal-400/80 py-10 rounded-md justify-center h-[60vh]';
  let longBreakCSS= 'm-auto w-[40vw] items-center flex flex-col bg-cyan-400/80 py-10 rounded-md justify-center h-[60vh]';
  let defaultCSS = 'm-auto w-[40vw] items-center flex flex-col bg-slate-500 py-10 rounded-md justify-center h-[60vh]'
  const [timer, setTimer] = useState("00:02");
  const [reset, setNewTimer] = useState("")
  const [SSButton, setSSButton] = useState(true)
  const [timerBGColor, setTimerBGColor] = useState(defaultCSS)
  let startStopButton = (SSButton === true) ? "Start" : "Pause" 


  function play(sound){
    new Audio(sound).play()
  }

  function startTimer (timer){
    let colon = timer.indexOf(":");
    let minute = Number.parseInt(timer.slice(0,colon));
    let seconds = Number.parseInt(timer.slice(colon+1));
    let countdown = (minute*60 + seconds)
    timerRun(countdown) 
  }

  function timerRun(countdown){
    const timerID = setInterval(() => {
    let convertedTimeMinutes = Math.floor(countdown/60);
    let displayTimeMinutes = convertedTimeMinutes.toLocaleString('en-US',{
      minimumIntegerDigits:2,
    })
    let remainingSeconds = countdown%60;
    let displayTimeSeconds = remainingSeconds.toLocaleString('en-US',{
      minimumIntegerDigits:2,
    })
    let displayTime = `${displayTimeMinutes}:${displayTimeSeconds}`
    setTimer(displayTime)
    if (countdown===0){
      play()
      clearInterval(timerID)
      setSSButton(SSButton =>!SSButton) 
    }  
    countdown--
  }, 1000);}

  function setTimeValues(value){
    setNewTimer(value)
    setTimer(value)
  }

  function resetButton(){
    clearInterval(timerRun)
    setTimer(reset)
  };

  function changeTimeButton(time, CSS){
    setTimeValues(time);
    setTimerBGColor(CSS)
  }



  return (
    <div className="bg-black w-screen h-screen flex">
      <section className={timerBGColor}>
          {/* <div>
            <button onClick={()=>{changeTimeButton("10:00", pomodoroCSS)}} className={buttonCSS}>Pomodoro</button>
            <button onClick={()=>{changeTimeButton("05:00", shortBreakCSS)}} className={buttonCSS}>Short Break</button>
            <button onClick={()=>{changeTimeButton("03:00", longBreakCSS)}}className={buttonCSS}>Long Break</button>
          </div>
          <h1 className="text-9xl font-bold text-white m-2">{timer}</h1>
          <div>
            <button onClick={()=>{setSSButton(SSButton =>!SSButton); startTimer(timer)}} className={buttonCSS}>{startStopButton}</button>
            <button onClick={()=>{resetButton()}}className={buttonCSS}>Reset</button>
          </div> */}
          <Soundclips/>
        </section>
     </div>
  );
}

export default App;


