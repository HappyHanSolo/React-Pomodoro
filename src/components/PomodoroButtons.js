import Button from "./Button";

function PomodoroButtons ({timer, timerBGColor, setTimeValues, setTimerBGColor, setNewTimer, setTimer}){
    let buttonCSS = 'py-2 px-3 m-1 rounded-md text-white border-2'
    let pomodoroCSS = 'm-auto w-[40vw] items-center flex flex-col bg-red-400/80 py-10 rounded-md justify-center h-[60vh]'
    let shortBreakCSS = 'm-auto w-[40vw] items-center flex flex-col bg-teal-400/80 py-10 rounded-md justify-center h-[60vh]';
    let longBreakCSS= 'm-auto w-[40vw] items-center flex flex-col bg-cyan-400/80 py-10 rounded-md justify-center h-[60vh]';


    function changeTimeButton(time, CSS){
        setTimeValues(time);
        setTimerBGColor(CSS)
    }

    function setTimeValues(value){
        setNewTimer(value)
        setTimer(value)
      }


    return(
        <div>
            <Button buttonCSS={buttonCSS} innerButtonText={'Pomodoro'} onClick={()=>{changeTimeButton("30:00", pomodoroCSS)}}/>
            <Button buttonCSS={buttonCSS} innerButtonText={'Short Break'} onClick={()=>{changeTimeButton("05:00", shortBreakCSS)}}/>
            <Button buttonCSS={buttonCSS} innerButtonText={'Long Break'} onClick={()=>{changeTimeButton("15:00", longBreakCSS)}} />
        </div>
    )
}

export default PomodoroButtons