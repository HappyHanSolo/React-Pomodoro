import { useState } from "react"
import Button from "./Button"


function Settings({timer, pTime, sTime, lTime, setPTime, setSTime, setLTime, setTimer, interval, setInterval}){
    let buttonCSS = 'py-2 px-3 m-1 rounded-md text-white border-2 relative'
    const [menuToggle, setMenuToggle] = useState(false)
    let menuVCSS = "p-3 border-4 visible w-[500px] h-[500px] rounded-md absolute top-[50%] left-[49.7%] -translate-x-1/2 translate-y-[-50%] bg-white z-10"
    let menuIVCSS = "text-white border-4 invisible w-[40vw] rounded-md absolute inset-[30%]"
    let menuVisibility = (menuToggle === true) ?  menuIVCSS : menuVCSS   
    let currentTimers = [pTime, sTime, lTime]
    let newTimes = []
    let newInterval = interval ;
    function newStringTime(){
        for (let i=0; i<currentTimers.length; i++){
            let colon = currentTimers[i].indexOf(":");
            let minute = Number.parseInt(currentTimers[i].slice(0,colon))
            currentTimers[i] = (minute===0) ? 1 : minute
        }
    }
    newStringTime()
    function changeValue(event){
        let value = event.target.value
        let id = event.target.id 
        return id === "PQuantity" ? newTimes[0]=value
            : id === "SQuantity" ? newTimes[1]=value
            : id === "LQuantity" ? newTimes[2]=value
            : id === "Interval" ? newInterval= parseInt(value)
            : null;
        }

    function closeMenu(){
        setMenuToggle(!menuToggle)
        document.getElementById("PQuantity").value = currentTimers[0]
        document.getElementById("SQuantity").value = currentTimers[1]
        document.getElementById("LQuantity").value = currentTimers[2]
    }
        

    function updateSettings(){
        if (newTimes.length === 0){
            if (newInterval !== interval){
                setInterval(newInterval)
            }
            setMenuToggle(!menuToggle)
        } else {
            let finalTimeUpdate = []
            for (let t = 0; t<currentTimers.length;t++){            
                    let minute = "0"
                    let seconds =":00"
                    if (newTimes[t] !== undefined){
                        let newStringTime = (newTimes[t].length===1) ? minute.concat(newTimes[t], seconds)
                            : (newTimes[t].length === 2) ? newTimes[t].concat(seconds)
                            : null;
                        finalTimeUpdate[t] = newStringTime
                    } else {
                        let timeToString = currentTimers[t].toString()
                        let originalStringTime = (timeToString.length === 1) ? minute.concat(timeToString,seconds) 
                        : (timeToString.length === 2) ? timeToString.concat(seconds)
                        : null;
                        finalTimeUpdate[t] = originalStringTime
                    }
                    if (t === 0){
                        setPTime(finalTimeUpdate[t])
                        if (timer === pTime){
                            setTimer(finalTimeUpdate[t])
                        }
                    } else if (t === 1) {
                        setSTime(finalTimeUpdate[t])
                        if (timer === sTime){
                            setTimer(finalTimeUpdate[t])
                        }
                    } else if (t === 2){
                        setLTime(finalTimeUpdate[t])
                        if (timer === lTime){
                            setTimer(finalTimeUpdate[t])
                        }
                    }
                    
                }
            if (newInterval !== interval){
                setInterval(newInterval)
            }
            setMenuToggle(!menuToggle)
        }
    }
    
    function displaySettings() {
        return (
            <div className={menuVisibility}>
                <h1 className="text-lg py-[20px]">Timer(Minutes)</h1>
                <form className="grid grid-cols-3 gap-2 relative">
                    <label htmlFor="Pomodoro">Pomodoro</label>
                    <input className="border-black rounded-md border-2 col-start-1 px-1" type="number" name="Pomodoro" id="PQuantity" min="1" defaultValue={currentTimers[0]} onChange={changeValue}/>
                    <label className="row-start-1 col-start-2" htmlFor="Short Break">Short Break</label>
                    <input className="border-black rounded-md border-2 col-start-2 px-1" type="number" name="Short Break" id="SQuantity" min="1" defaultValue={currentTimers[1]} onChange={changeValue}/>
                    <label className="row-start-1 col-start-3" htmlFor="Long Break">Long Break</label>
                    <input className="border-black rounded-md border-2 row-start-2 px-1 col-start-3" type="number" name="Long Break" min="1" id="LQuantity" defaultValue={currentTimers[2]} onChange={changeValue}/>
                    <label htmlFor="Interval">Interval</label>
                    <input className="border-black rounded-md border-2 col-start-1 px-1" type="number" name="Interval" min="1" id="Interval" defaultValue={interval} onChange={changeValue}/>
                </form>
                <section>
                    <h1 className="py-3">Auto Start Breaks</h1>
                    <h1 className="py-3">Auto Start Pomodoros</h1>
                </section>
                    <Button buttonCSS={'py-2 px-3 m-1 rounded-md text-black border-2 absolute bottom-[5px] right-[5px]'} innerButtonText={"OK"} onClick={()=>{updateSettings()}}/>
                   <Button buttonCSS={'py-1 px-2 m-1 rounded-md text-black border-2 absolute top-[5px] right-[5px]'} innerButtonText={'X'} onClick={()=>{closeMenu()}}/>     
                        
            </div>
        )
    }

    
    return(
        <div>
            <Button buttonCSS={buttonCSS} innerButtonText={'Settings'} onClick={()=>{closeMenu()}}></Button>
            {displaySettings()}
        </div>
        
    )
}

export default Settings