import './App.css';
import React, {useState} from 'react';



function App() {
  let buttonCSS="py-2 px-3 m-1 rounded-md text-white border-2";
  const [timer, setTimer] = useState("00:05");
  const [reset, setNewTimer] = useState("")
  const [SSButton, setSSButton] = useState(true)
  let startStopButton = (SSButton === true) ? "Start" : "Pause" 

  function startTimer (timer){
    let colon = timer.indexOf(":");
    let minute = Number.parseInt(timer.slice(0,colon));
    let seconds = Number.parseInt(timer.slice(colon+1));
    let countdown = (minute*60 + seconds)
    timerRun(countdown)
    if (countdown===0){
      clearInterval(timerRun)
      setSSButton(SSButton =>!SSButton)
    }
    
  }
  function timerRun(countdown){setInterval(() => {
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
    countdown--
    if (countdown===0){
      clearInterval(timerRun)
      setSSButton(SSButton =>!SSButton)
    }
  }, 1000);}

  function setTimeValues(value){
    setNewTimer(value)
    setTimer(value)
  }

  function resetButton(){
    clearInterval(timerRun)
    setTimer(reset)
  };



  return (
    <div className="bg-black w-screen h-screen flex">
      <section className="m-auto w-[40vw] items-center flex flex-col bg-slate-500 py-10 rounded-md justify-center h-[60vh]">
          <div>
            <button onClick={()=>{setTimeValues("10:00")}} className={buttonCSS}>Pomodoro</button>
            <button onClick={()=>{setTimeValues("5:00")}} className={buttonCSS}>Short Break</button>
            <button onClick={()=>{(setTimeValues("03:00"))}}className={buttonCSS}>Long Break</button>
          </div>
          <h1 className="text-9xl font-bold text-white m-2">{timer}</h1>
          <div>
            <button onClick={()=>{setSSButton(SSButton =>!SSButton); startTimer(timer)}} className={buttonCSS}>{startStopButton}</button>
            <button onClick={()=>{resetButton()}}className={buttonCSS}>Reset</button>
          </div>
        </section>
     </div>
  );
}

export default App;
