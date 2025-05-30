import { useState, useEffect } from 'react'
import Announcement from './Components/Announcement'
import CheckOutRules from './Components/CheckOutRules'
import { BACKEND_API_HOME_BULLETIN } from '../../assets/constaints'
import Articles from './Components/Articles'
import { workingHours } from './Components/WorkingHours'
import './Home.css'
function ChangeArticles(Status, setArticlesOption) {
    setArticlesOption(Status)
}
function EditBulletin(setArticlesMode){
    const Refresh_Token = localStorage.getItem("Refresh_Token")
    const Identity = localStorage.getItem("Identity")
    if (Refresh_Token != "" && Identity == "Admin"){
        if(confirm("確認是否要編輯？")){
            setArticlesMode("Edit")
        }
    } else{
        return null
    }
}
function checkIfInTime(){
    let date = new Date()
    if(workingHours["alltime"]) return true
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
    const currentMinutes = date.getHours() * 60 + date.getMinutes();
    if (!(dateStr in workingHours)) {
        return false
    }
    const { start, end } = workingHours[dateStr];
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const inside = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    return inside
}
const Home = () => {
    const [ArticlesOption, setArticlesOption] = useState("CheckOutRules")
    const [ArticlesMode, setArticlesMode] = useState("Read")
    const [TodayAmount, setTodayAmount] = useState(0)
    const [WatingAmount, setWatingAmount] = useState(0)
    const [WorkingInTime, setWorkingInTime] = useState(true)
    useEffect(() => {
        const SendData = {
            method: "POST",
            header: {
                'Content-type': 'application/json'
            },
            body: ""
        }
        fetch(BACKEND_API_HOME_BULLETIN, SendData)
        .then (res => res.json())
        .then (data => {
            setTodayAmount(data["TodayAmount"])
            setWatingAmount(data["WatingAmount"])
        })
    }, [ArticlesOption])
    useEffect(() => {
        setWorkingInTime(checkIfInTime())
    }, [])
    return (
        <main id="HomeMain">
            {
                WorkingInTime ? <></> : (
                    <section id='NotInTime' className='HomeBox'>
                        <div>
                            <p>⚠️目前非宿舍幹部值班時間，請至一樓宿管中心，向宿管提出退宿要求！</p>
                        </div>
                    </section>
                )
            }
            {/* 顯示目前預約排隊人數 */}
            <section id="CurrentAppointment" className='HomeBox'>
                {/* 今日總退宿人數 */}
                <div>
                    <p>今日總退宿人數</p>
                    <p className='AmountNumber'>{TodayAmount}</p>
                </div>
                {/* 目前預約等待人數 */}
                <div>
                    <p>目前預約等待人數</p>
                    <p className='AmountNumber'>{WatingAmount}</p>
                </div>
            </section>
            {/* 其他項目 */}
            <section id="HomeOthers" className='HomeBox'>
                {/* 選取標題按鈕 */}
                <div id='OptionButtonsBlock'>
                    <div id='OptionButtons'>
                        <button onClick={() => ChangeArticles("CheckOutRules", setArticlesOption)}>退宿預約規則</button>
                        <button onClick={() => ChangeArticles("Announcement", setArticlesOption)}>網站公告</button>
                    </div>
                </div>
                {/* 該標題內容 */}
                <div id='OptionContent'>
                    {/* <div id='OptionContentPs' onClick={()=>EditBulletin(setArticlesMode)}>
                        <Articles ArticlesOption={ArticlesOption} ArticlesMode={ArticlesMode} setArticlesMode={setArticlesMode} />
                    </div> */}
                    <div id='OptionContentPs'>
                        {
                            (ArticlesOption == "CheckOutRules") ? <CheckOutRules /> : <Announcement />
                        }
                    </div>
                </div>
            </section>
        </main>
    )
}
export default Home