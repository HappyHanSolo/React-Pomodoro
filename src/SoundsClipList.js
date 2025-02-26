import vReaverK1 from './assests/valorantAssets/PomodoroFinish/Reaver/reaverkill1.mp3'
import vReaverK2 from './assests//valorantAssets/PomodoroFinish/Reaver/reaverkill2.mp3'
import vReaverK3 from './assests//valorantAssets/PomodoroFinish/Reaver/reaverkill3.mp3'
import vReaverK4 from './assests//valorantAssets/PomodoroFinish/Reaver/reaverkill4.mp3'
import vReaverK5 from './assests//valorantAssets/PomodoroFinish/Reaver/reaverkill5.mp3'
import vDefaultK1 from './assests/valorantAssets/PomodoroFinish/Default/valorant-1-kill.mp3'
import vDefaultK2 from './assests/valorantAssets/PomodoroFinish/Default/valorant-2-kills.mp3'
import vDefaultK3 from './assests/valorantAssets/PomodoroFinish/Default/valorant-3-kills.mp3'
import vDefaultK4 from './assests/valorantAssets/PomodoroFinish/Default/valorant-4-kills.mp3'
import vDefaultK5 from './assests/valorantAssets/PomodoroFinish/Default/valorant-5-kills.mp3'
import vChampionsK1 from './assests/valorantAssets/PomodoroFinish/Champions/valorant-champions-2024-kill-1.mp3'
import vChampionsK2 from './assests/valorantAssets/PomodoroFinish/Champions/valorant-champions-2024-kill-2.mp3'
import vChampionsK3 from './assests/valorantAssets/PomodoroFinish/Champions/valorant-champions-2024-kill-3.mp3'
import vChampionsK4 from './assests/valorantAssets/PomodoroFinish/Champions/valorant-champions-2024-kill-4.mp3'
import vChampionsK5 from './assests/valorantAssets/PomodoroFinish/Champions/valorant-champions-2024-kill-5.mp3'
import OmenBoo from './assests/valorantAssets/RandomFun/boo_Tys98sK.mp3'
import PheonixForever from './assests/valorantAssets/RandomFun/phoenix-forever.mp3'
import ChamberOhNo from './assests/valorantAssets/Start/valorant-oh-no-invaders.mp3'
import ChamberPlay from './assests/valorantAssets/Start/valorant-chamber-enemy-ult.mp3'
import Defuse from './assests/valorantAssets/Start/valorant-defuse.mp3'
import ThemeSong from './assests/valorantAssets/PomodoroFinish/ThemeSong/valorant-theme-song.mp3'
import ValorantIcon from './assests/valorantAssets/hd-valorant-official-symbol-sign-logo-png-701751694788082d3btqfskcj.png'


function SoundClipList(){
    let themes =   
        {"Valorant":{
                "Logo": ValorantIcon,
                "Start":{
                    "Chamber-Oh-No": ChamberOhNo,
                    "ChamberPlay": ChamberPlay,
                    "Defuse":Defuse
                },
                "Pomodoro Finish":{
                    "Reaver":[vReaverK1,vReaverK2,vReaverK3, vReaverK4,vReaverK5],
                    "Default": [vDefaultK1,vDefaultK2,vDefaultK3, vDefaultK4, vDefaultK5],
                    "Champions": [vChampionsK1,vChampionsK2,vChampionsK3,vChampionsK4,vChampionsK5],
                    "Theme Song": ThemeSong
                },
                "Break Start":{},
                "Break Finish": {},
                "Pause/Resume":{},
                "Completed Pomodor Cycle":{},
                "Fun/Random":{
                    "PheonixForever": PheonixForever,
                    "OmenBoo": OmenBoo
                }

            }
        };


    return(
       <div>
        <img className='bg-black-400' src={themes["Valorant"]["Logo"]} alt="" />
        <audio controls src={themes["Valorant"]["Pomodoro Finish"]["Reaver"][0]}></audio>
       </div>
    )
}

export default SoundClipList

