import Button from "./Button";
import soundfile from '../assests/valorantAssets/PomodoroFinish/Champions/valorant-champions-2024-kill-1.mp3'


function TimerButton ({startStopButton, setSSButton, SSButton,setTimer, reset, timer}){
 let buttonCSS = 'py-2 px-3 m-1 rounded-md text-white border-2'

 function play(sound){
    new Audio(sound).play()
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
      play(soundfile)
      clearInterval(timerID)
      setSSButton(SSButton =>!SSButton) 
    }  
    countdown--
  }, 1000);}

  function startTimer (timer){
    let colon = timer.indexOf(":");
    let minute = Number.parseInt(timer.slice(0,colon));
    let seconds = Number.parseInt(timer.slice(colon+1));
    let countdown = (minute*60 + seconds)
    timerRun(countdown) 
  }

  function resetButton(reset){
    clearInterval(timerRun)
    setTimer(reset)
  };


    return(
        <div>
            <Button buttonCSS={buttonCSS} innerButtonText={startStopButton} onClick={()=>{setSSButton(SSButton=>!SSButton); startTimer(timer)}}/>
            <Button buttonCSS={buttonCSS} innerButtonText={'Reset'} onClick={()=>{resetButton(reset)}}/>
        </div>
    )
}

export default TimerButton