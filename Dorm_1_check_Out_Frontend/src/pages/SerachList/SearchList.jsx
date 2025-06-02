import { useState, useEffect } from 'react'
import './SearchList.css'
import SearchIcon from '@mui/icons-material/Search'
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Modal from '@mui/material/Modal';
import { BACKEND_API_SEARCH_APPOINTMENT_INTERFACE, BACKEND_API_CHANGE_APPOINTMENT_STATUS_INTERFACE } from '../../assets/constaints'
import { floors, rooms, beds } from '../Appointment/components/Select_contents'
import SadIcon from '../../assets/sad.png'
import ThinkIcon from '../../assets/think.png'

//轉換英文的狀態至中文
function StatusTextExchanger(Status) {
    switch (Status) {
        case "Unchecked": return "尚未檢查"
        case "Checking": return "正前往檢查"
        case "Qualified": return "檢查合格"
        case "Unqualified": return "檢查不合格"
        default: return "尚未檢查"
    }
}

//按下轉態按鈕後，進行資料變更
async function ButtonsTofetch(Effect, oid, StaffName, setOpen, setStatusofChangeDataStatus, setChangeDataStatusFailed) {
    setOpen(false)
    setStatusofChangeDataStatus(true)
    if (Effect == "Delete") {
        if (!confirm("確定要刪除此預約？")) {
            setStatusofChangeDataStatus(false)
            return null
        }
    } else if (Effect == "Cancel") {
        if (!confirm("確定要取消檢查？")) {
            setStatusofChangeDataStatus(false)
            return null
        }
    } else if (Effect == "Recheck") {
        if (!confirm("確定要重新檢查？")) {
            setStatusofChangeDataStatus(false)
            return null
        }
    }
    let Id = localStorage.getItem('Id') //從session讀取管理者Id
    let Access_Token = localStorage.getItem('Access_Token') //從session讀取管理者Id
    const SendData = {
        method: "POST",
        headers: {
            'Content-type': 'application/json',
            'Authorization': `Bearer ${Access_Token}`
        },
        body: JSON.stringify({
            "Effect": Effect,
            "oid": oid,
            "StaffName": StaffName,
            "Id": Id
        })
    }
    await fetch(BACKEND_API_CHANGE_APPOINTMENT_STATUS_INTERFACE, SendData)
        .then(res => res.json())
        .then(data => {
            if(data["Status"] == "Failed"){
                alert(data["Cause"])
            }
            setStatusofChangeDataStatus(false)
        })
        .catch((err) => {
            alert("伺服器出現錯誤，請聯絡網站管理員！")
            setChangeDataStatusFailed(true)
        })
}

//(管理員專用)依照這個預約的狀態，顯示轉態按鈕
function StatusToButtons(Status, oid, Staff, Myname, setOpen, setStatusofChangeDataStatus, setChangeDataStatusFailed) {
    if (oid !== undefined) {
        oid = oid["$oid"]
        if (Status == "Unchecked") { //還未檢查時
            return (
                <div>
                    <button className='btn checking' onClick={() => { ButtonsTofetch("Checking", oid, Myname, setOpen, setStatusofChangeDataStatus, setChangeDataStatusFailed) }}>前往檢查</button>
                    <button className='btn delete' onClick={() => { ButtonsTofetch("Delete", oid, Myname, setOpen, setStatusofChangeDataStatus, setChangeDataStatusFailed) }}>刪除此預約</button>
                </div>
            )
        } else if (Status == "Checking") { //正在檢查時
            if (Staff == Myname) { //若檢查人是自己
                return (
                    <div>
                        <button className='btn qualified' onClick={() => { ButtonsTofetch("Qualified", oid, Myname, setOpen, setStatusofChangeDataStatus, setChangeDataStatusFailed) }}>檢查合格</button>
                        <button className='btn unqualified' onClick={() => { ButtonsTofetch("Unqualified", oid, Myname, setOpen, setStatusofChangeDataStatus, setChangeDataStatusFailed) }}>檢查不合格</button>
                        <button className='btn cancel' onClick={() => { ButtonsTofetch("Cancel", oid, Myname, setOpen, setStatusofChangeDataStatus, setChangeDataStatusFailed) }}>取消檢查</button>
                        <button className='btn delete' onClick={() => { ButtonsTofetch("Delete", oid, Myname, setOpen, setStatusofChangeDataStatus, setChangeDataStatusFailed) }}>刪除此預約</button>
                    </div>
                )
            } else { //若檢查人不是自己
                return (
                    <div>
                        <button className='btn delete' onClick={() => { ButtonsTofetch("Delete", oid, Myname, setOpen, setStatusofChangeDataStatus, setChangeDataStatusFailed) }}>刪除此預約</button>
                    </div>
                )
            }
        } else if (Status !== undefined) { //其他(檢查合格、檢查不合格)時
            return (
                <div>
                    <button className='btn recheck' onClick={() => { ButtonsTofetch("Recheck", oid, Myname, setOpen, setStatusofChangeDataStatus, setChangeDataStatusFailed) }}>重新檢查</button>
                    <button className='btn delete' onClick={() => { ButtonsTofetch("Delete", oid, Myname, setOpen, setStatusofChangeDataStatus, setChangeDataStatusFailed) }}>刪除此預約</button>
                </div>
            )
        }
    }
    return <></>
}

let PopOutDetail = {}; //每個單獨預約的詳細資料
//按下每個SingleBox後彈出視窗並顯示詳細資料
function AppointmentBoxClickHandler(data, setOpen) {
    PopOutDetail = data
    setOpen(true)
}

//分類fetch來的預約資料
function ClassificationDatas(data, searchType, searchFilter, setFilteredAppointmentData, setIsAppointmentDataZero) {
    function AsideFilter(searchFilter) { //利用Status分類，並決定順序
        //先透過指定的Status分類
        data = data.filter(e => {
            if (searchFilter == "All") {
                return true
            } else if (e["Status"] == searchFilter) {
                return true
            } else {
                return false
            }
        })
        //再依Status和時間決定順序
        //依Status順序由高到低為 Unchecking -> Checking -> Unqualified -> Qualified
        const StatusOrder = {
            "Unchecked": 1,
            "Checking": 2,
            "Unqualified": 3,
            "Qualified": 4
        }
        if (searchFilter == "All") { //時間順序為登記預約時間由新至舊
            data = data.sort((a, b) => {
                return new Date(b["AppointmentTimestamp"]) - new Date(a["AppointmentTimestamp"])
            })
            data = data.sort((a, b) => {
                return StatusOrder[a["Status"]] - StatusOrder[b["Status"]]
            })
            //時間順序為檢查時間由新至舊
        } else if (searchFilter == "Checking" || searchFilter == "Qualified" || searchFilter == "Unqualified") {
            data = data.sort((a, b) => {
                return new Date(b["CheckedTimestamp"]) - new Date(a["CheckedTimestamp"])
            })
        }
    }
    if (searchType == "Aside") { //僅根據Status分類
        AsideFilter(searchFilter)
        if (data.length == 0) {
            setIsAppointmentDataZero(true)
        } else {
            setIsAppointmentDataZero(false)
        }
        setFilteredAppointmentData(data)
        return null
    } else if (searchType == "Nav") { //根據Status和NavBar的條件分類
        AsideFilter(searchFilter["searchFilter"])
        let NavFloorValue = searchFilter["FloorValue"]
        let NavRoomValue = searchFilter["RoomValue"]
        let NavBedValue = searchFilter["BedValue"]
        let MatchedData = data.filter(e => {
            if (e["FloorValue"] == NavFloorValue && e["RoomValue"] == NavRoomValue && e["BedValue"] == NavBedValue) {
                return true
            }
        })
        if (MatchedData.length == 0) {
            MatchedData = data.filter(e => {
                if (e["FloorValue"] == NavFloorValue && e["RoomValue"] == NavRoomValue) {
                    return true
                }
            })
        } else {
            setFilteredAppointmentData(MatchedData)
            return null
        }
        if (MatchedData.length == 0) {
            MatchedData = data.filter(e => {
                if (e["FloorValue"] == NavFloorValue) {
                    return true
                }
            })
        }
        if (MatchedData.length == 0) {
            setIsAppointmentDataZero(true)
        } else {
            setIsAppointmentDataZero(false)
        }
        setFilteredAppointmentData(MatchedData)
        return null
    }
}

const SearchList = ({ UserLoginStatus }) => {
    //檢查狀態分四種: Unchecked(尚未檢查), Checking(正前往檢查), Qualified(合格床位), Unqualified(不合格床位)
    const [searchFilter, setSearchFilter] = useState("Unchecked")
    //所有預約資料及過濾後的資料
    const [AllAppointmentData, setAllAppointmentData] = useState([])
    const [FilteredAppointmentData, setFilteredAppointmentData] = useState([])
    //判斷預約資料是否為0
    const [IsAppointmentDataZero, setIsAppointmentDataZero] = useState(false)
    //各輸入框用
    const [FloorValue, setFloorValue] = useState("1") //紀錄選取樓層
    const [RoomValue, setRoomValue] = useState("01") //紀錄選取房號
    const [BedValue, setBedValue] = useState("1") //紀錄選取床號
    //判斷資料加載狀態
    const [LoadingDataStatus, setLoadingDataStatus] = useState(false)
    //判斷是否加載失敗
    const [LoadingDataFailed, setLoadingDataFailed] = useState(false)
    //判斷資料轉態是否正在進行
    const [StatusofChangeDataStatus, setStatusofChangeDataStatus] = useState(false)
    //判斷資料轉態是否失敗
    const [ChangeDataStatusFailed, setChangeDataStatusFailed] = useState(false)
    //按鈕與彈跳視窗用
    const [open, setOpen] = useState(false);
    const handleClose = () => setOpen(false);
    const style = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        minWidth: "25%",
        bgcolor: 'background.paper',
        boxShadow: 24,
        borderRadius: "15px",
        p: 4,
    };
    //第一次渲染或開啟/關閉彈跳視窗(管理員變更狀態)時Fetch資料
    useEffect(() => {
        setLoadingDataStatus(false)
        const SendData = {
            method: "POST",
            headers: {
                'Content-type': 'application/json'
            },
            body: JSON.stringify({
                "Status": searchFilter
            })
        }
        fetch(BACKEND_API_SEARCH_APPOINTMENT_INTERFACE, SendData)
            .then(res => res.json())
            .then(data => {
                setAllAppointmentData(data)
                ClassificationDatas(data, "Aside", searchFilter, setFilteredAppointmentData, setIsAppointmentDataZero)
                setLoadingDataStatus(true)
            })
            .catch(() => {
                setLoadingDataFailed(true)
            })
    }, [StatusofChangeDataStatus])

    //按下左側過濾器按鈕後用上次fetch的資料，來進行過濾
    useEffect(() => {
        ClassificationDatas(AllAppointmentData, "Aside", searchFilter, setFilteredAppointmentData, setIsAppointmentDataZero)
    }, [searchFilter])

    //根據進階搜尋條件，過濾掉上次左側過濾後的資料
    useEffect(() => {
        let Filter = {
            "FloorValue": FloorValue,
            "RoomValue": RoomValue,
            "BedValue": BedValue,
            "searchFilter": searchFilter
        }
        ClassificationDatas(AllAppointmentData, "Nav", Filter, setFilteredAppointmentData, setIsAppointmentDataZero)
    }, [FloorValue, RoomValue, BedValue])
    return (<>
        <main id='SearchListMain'>
            {/* 關鍵字搜尋 */}
            <nav className='SearchListNav'>
                <div id='SearchListNavBox'>
                    <div id='SerachListNavBoxTitle'>
                        <SearchIcon />
                        <p>進階搜尋條件</p>
                    </div>
                    <Box
                        id='SearchListFormBox'
                        sx={{ '& .MuiTextField-root': { m: 1 } }}
                        noValidate autoComplete="off"
                    >
                        <TextField
                            required id="" className='SearchListFilterSelect'

                            select label="樓層" onChange={(e) => { setFloorValue(e.target.value) }}
                            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
                        >
                            {floors.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </TextField>
                        <TextField
                            required id="" className='SearchListFilterSelect'
                            select label="房號" onChange={(e) => { setRoomValue(e.target.value) }}
                            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
                        >
                            {rooms.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </TextField>
                        <TextField
                            required id="" className='SearchListFilterSelect'
                            select label="床號" onChange={(e) => { setBedValue(e.target.value) }}
                            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
                        >
                            {beds.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </TextField>
                    </Box>
                </div>
            </nav>
            {/* 旁側狀態按鈕 */}
            <aside className='SearchListAside'>
                <div>
                    <button onClick={() => { setSearchFilter("All") }}>所有預約</button>
                    <button onClick={() => { setSearchFilter("Unchecked") }}>尚未檢查</button>
                    <button onClick={() => { setSearchFilter("Checking") }}>正前往檢查</button>
                    <button onClick={() => { setSearchFilter("Qualified") }}>合格床位</button>
                    <button onClick={() => { setSearchFilter("Unqualified") }}>不合格床位</button>
                </div>
            </aside>
            {/* 預約內容 */}
            <section className='SearchListSection'>
                <div id='SearchListContentBox'>
                    {
                        // 是否毫無預約資料
                        (IsAppointmentDataZero) ? (
                            <div className='SingleAppointmentBox'>
                                <p className='SAB-FRB SAB-table'>
                                    <img src={ThinkIcon} />
                                </p>
                                <p className='SAB-Status'>看來還沒有任何預約呢！</p>
                            </div>
                        ) : null
                    }
                    {
                        // 轉態進行中提示方塊
                        (StatusofChangeDataStatus) ? (
                            <div className='SingleAppointmentBox'>
                                <p className='SAB-FRB SAB-table CSloader'> </p>
                                <p className='SAB-Status'>處理需求中</p>
                            </div>
                        ) : null
                    }
                    {
                        // 轉態失敗
                        (ChangeDataStatusFailed) ? (
                            <div className='SingleAppointmentBox'>
                                <p className='SAB-FRB SAB-table'>
                                    <img src={SadIcon} />
                                </p>
                                <p className='SAB-Status'>伺服器發生錯誤，無法執行您的需求！請聯絡網站管理員！</p>
                            </div>
                        ) : null
                    }
                    {
                        // 伺服器加載失敗提示方塊
                        (LoadingDataFailed) ? (
                            <div className='SingleAppointmentBox'>
                                <p className='SAB-FRB SAB-table'>
                                    <img src={SadIcon} />
                                </p>
                                <p className='SAB-Status'>加載失敗，伺服器發生錯誤！請聯絡網站管理員！</p>
                            </div>
                        ) : null
                    }
                    {
                        // 各預約資料方塊
                        FilteredAppointmentData.map(data => (
                            <div className={`SingleAppointmentBox ${
                                (data["Status"] == "Checking") ? (
                                    (data["Staff"] == UserLoginStatus["Name"]) ? "MyCheckingBox" : null
                                ) : null
                            }`} key={data["_id"]["$oid"]} onClick={() => { AppointmentBoxClickHandler(data, setOpen) }}>
                                <p className='SAB-FRB SAB-table'>{`${data["FloorValue"]}${data["RoomValue"]}-${data["BedValue"]}`}</p>
                                <p className={`SAB-Status ${data["Status"]}`}>{(StatusTextExchanger(data["Status"]))}</p>
                            </div>
                        ))
                    }
                    {
                        // 加載資料提示方塊
                        (!LoadingDataStatus) ? (
                            <div className='SingleAppointmentBox'>
                                <p className='SAB-FRB SAB-table loader'> </p>
                                <p className='SAB-Status'>加載中</p>
                            </div>
                        ) : null
                    }
                </div>
            </section>
        </main>
        {/* 每個資訊卡的彈跳視窗 */}
        <Modal
            open={open}
            onClose={handleClose}
        >
            <Box sx={style} id='AppoinementDetailPopOutBox'>
                <div id='AppoinementDetailPopOut'>
                    <p>檢查床位：{`${PopOutDetail["FloorValue"]}${PopOutDetail["RoomValue"]}-${PopOutDetail["BedValue"]}`}</p>
                    <p>檢查狀態：{StatusTextExchanger(PopOutDetail["Status"])}</p>
                    <p className='bottomLine'>預約時間：{PopOutDetail["AppointmentTimestamp"]}</p>
                    {
                        (UserLoginStatus["Status"] == "Ok") ? (<>
                            <p>登記人姓名/稱呼：{`${PopOutDetail["NameValue"]}`}</p>
                            <p className='bottomLine'>登記人聯絡資料：<br />{`[${PopOutDetail["ContactOptionValue"]}] ${PopOutDetail["ContactValue"]}`}</p>
                        </>) : null
                    }
                    {
                        (PopOutDetail["Status"] !== "Unchecked") ? (<>
                            <p>檢查人：{PopOutDetail["Staff"]}</p>
                            <p>檢查時間：{PopOutDetail["CheckedTimestamp"]}</p>
                        </>) : null
                    }
                    {
                        (UserLoginStatus["Status"] == "Ok") ? StatusToButtons(PopOutDetail["Status"], PopOutDetail["_id"], PopOutDetail["Staff"], UserLoginStatus["Name"], setOpen, setStatusofChangeDataStatus, setChangeDataStatusFailed) : null
                    }
                </div>
            </Box>
        </Modal>
    </>)
}
export default SearchList