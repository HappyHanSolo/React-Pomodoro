import './App.css';
import React, {useEffect, useState} from 'react';
import Soundclips from './components/Themes';
import TimerButton from './components/TimerButton';
import PomodoroButtons from './components/PomodoroButtons';
import Themes from './components/Themes'

function App() {
  let defaultCSS = 'm-auto w-[40vw] items-center flex flex-col bg-slate-500 py-10 rounded-md justify-center h-[60vh]'
  const [timer, setTimer] = useState("00:02");
  const [reset, setNewTimer] = useState("")
  const [SSButton, setSSButton] = useState(true)
  const [timerBGColor, setTimerBGColor] = useState(defaultCSS)
  const [startAudio, setStartAudio] = useState("")

  let startStopButton = (SSButton === true) ? "Start" : "Pause" 

 
 

  return (
    <div className="bg-black w-screen h-screen flex">
      <section>
        <Themes/>
      </section>
      <section className={timerBGColor}>
          <PomodoroButtons timer={timer} timerBGColor={timerBGColor} setTimerBGColor={setTimerBGColor} setNewTimer={setNewTimer} setTimer={setTimer}/>
            <h1 className="text-9xl font-bold text-white m-2">{timer}</h1>
          <TimerButton startStopButton={startStopButton} setSSButton={setSSButton} SSButton={SSButton} setTimer={setTimer} reset={reset} timer={timer}/>
        </section>
     </div>
  );
}

export default App;


