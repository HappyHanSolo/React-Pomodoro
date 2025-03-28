import './App.css';
import React, {useEffect, useState} from 'react';
import TimerButton from './components/TimerButton';
import PomodoroButtons from './components/PomodoroButtons';
import Themes from './components/Themes'
import Settings from './components/Settings';

function App() {
  let defaultCSS = 'm-auto w-[500px] items-center flex flex-col bg-red-400/80 py-10 rounded-md justify-center h-[60vh]'
  const [SSButton, setSSButton] = useState(true)
  const [timerBGColor, setTimerBGColor] = useState(defaultCSS)
  const [pTime, setPTime] = useState("00:05")
  const [sTime, setSTime] = useState("05:00")
  const [lTime, setLTime] = useState("15:00")
  const [reset, setNewTimer] = useState(pTime)
  const [timer, setTimer] = useState(pTime);
  const [sPlaylist, setSPlaylist] = useState([])
  const [pFPlaylist, setPFPlaylist]= useState([])
  const [bSPlaylist, setBSPlaylist]= useState([])
  const [bFPlaylist,setBFPlaylist]= useState([])
  const [prPlaylist, setPRPlaylist]= useState([])
  const [cPPlaylist, setCPPlaylsit]= useState([])
  const [frPlaylist, setfrPlaylist]= useState([])

  let startStopButton = (SSButton === true) ? "Start" : "Pause"  

 
  return (
    <div className="bg-black w-screen h-screen flex">
      <section>
        <Themes sPlaylist={sPlaylist} setSPlaylist={setSPlaylist}/>
      </section>
      <section className={timerBGColor}>
          <PomodoroButtons timer={timer} timerBGColor={timerBGColor} setTimerBGColor={setTimerBGColor} setNewTimer={setNewTimer} setTimer={setTimer} pTime={pTime} setPTime={setPTime} sTime={sTime} setSTime={setSTime} lTime={lTime} setLTime={setLTime}/>
            <h1 className="text-9xl font-bold text-white m-2">{timer}</h1>
          <TimerButton startStopButton={startStopButton} setSSButton={setSSButton} SSButton={SSButton} setTimer={setTimer} reset={reset} setNewTimer={setNewTimer} timer={timer} sPlaylist={sPlaylist}/>
        </section>
        <section>
          <Settings pTime={pTime} sTime={sTime} lTime={lTime} setPTime={setPTime} setSTime={setSTime} setLTime={setLTime}/>
        </section>
     </div>
  );

}

export default App;


