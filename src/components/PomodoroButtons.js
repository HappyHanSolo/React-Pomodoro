import Button from "./Button";

function PomodoroButtons ({timer, timerBGColor, setTimerBGColor, setNewTimer, setTimer, pTime, setPTIme, sTime, setSTime, lTime, setLTime}){
    let buttonCSS = 'py-2 px-3 m-1 rounded-md text-white border-2'
    let pomodoroCSS = 'm-auto w-[40vw] items-center flex flex-col bg-red-400/80 py-10 rounded-md justify-center h-[60vh]'
    let shortBreakCSS = 'm-auto w-[40vw] items-center flex flex-col bg-teal-400/80 py-10 rounded-md justify-center h-[60vh]';
    let longBreakCSS= 'm-auto w-[40vw] items-center flex flex-col bg-cyan-400/80 py-10 rounded-md justify-center h-[60vh]';


    function changeTimeButton(time, CSS){
        setNewTimer(time)
        setTimer(time);
        setTimerBGColor(CSS)
    }



    return(
        <div>
            <Button buttonCSS={buttonCSS} innerButtonText={'Pomodoro'} onClick={()=>{changeTimeButton(pTime, pomodoroCSS)}}/>
            <Button buttonCSS={buttonCSS} innerButtonText={'Short Break'} onClick={()=>{changeTimeButton(sTime, shortBreakCSS)}}/>
            <Button buttonCSS={buttonCSS} innerButtonText={'Long Break'} onClick={()=>{changeTimeButton(lTime, longBreakCSS)}} />
        </div>
    )
}

export default PomodoroButtons