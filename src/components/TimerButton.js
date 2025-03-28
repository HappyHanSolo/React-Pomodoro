import { useRef } from "react";
import Button from "./Button";
import soundfile from '../assests/valorantAssets/PomodoroFinish/Champions/valorant-champions-2024-kill-1.mp3'

function TimerButton ({startStopButton, setSSButton, SSButton,setTimer, reset,setNewTimer, timer, sPlaylist}){
 let buttonCSS = 'py-2 px-3 m-1 rounded-md text-white border-2'
 const timerID = useRef(null);

 function play(){
    const audio = new Audio(sPlaylist[4]);
    audio.play()
   
  }


  function timerRun (countdown,sPlaylist){
    if (timerID.current) return;
    const updateDisplay = (count) =>{
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
        play(sPlaylist)
        clearInterval(timerID.current)
        setSSButton(SSButton =>!SSButton)
        timerID.current = null
        return;
      }  
      return count - 1
    }
    countdown = updateDisplay(countdown)

    timerID.current = setInterval(() => {
    countdown = updateDisplay(countdown)
  }, 1000);
}

  function startTimer (timer, sPlayList){    
    let colon = timer.indexOf(":");
    let minute = Number.parseInt(timer.slice(0,colon));
    let seconds = Number.parseInt(timer.slice(colon+1));
    let countdown = (minute*60 + seconds)

    setNewTimer(timer)
    timerRun(countdown, sPlayList) 
  }

  function pauseTimer (timer){
    if (timerID.current){
      clearInterval(timerID.current)
      timerID.current = null
    }
    setTimer(timer)
  }

  function resetButton(reset){
    if (timerID.current){
      clearInterval(timerID.current)
      setSSButton(SSButton=>!SSButton)
      timerID.current = null
    }
    setTimer(reset)
  };


    return(
        <div>
            <Button buttonCSS={buttonCSS} innerButtonText={startStopButton} onClick={()=>{setSSButton(SSButton=>!SSButton); 
              if(SSButton === true){
                startTimer(timer)
               } else {
                pauseTimer(timer)
              }}}
              />
            <Button buttonCSS={buttonCSS} innerButtonText={'Reset'} onClick={()=>{resetButton(reset)}}/>            
        </div>
    )
}

export default TimerButton