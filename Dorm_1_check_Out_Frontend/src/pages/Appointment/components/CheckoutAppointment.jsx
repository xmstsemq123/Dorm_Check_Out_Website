import { useState } from 'react'
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import { floors, rooms, beds, contacts } from './Select_contents.jsx'
import { HOME_PAGE, BACKEND_API_ADD_APPOINTMENT_INTERFACE } from '../../../assets/constaints.js'
import LoginFailedIcon from '../../../assets/LoginFailed.png'
import SuccessIcon from '../../../assets/Success.png'
let RoomsOptions = [{ value: "", label: "房號" }]; //房號選項
//依照選取樓層，釋出該樓層有的房號選項，並記錄選取樓層
const FloorValueHandler = (Floor, setFloorValue, setRoomValue) => {
    //房號選項label格式為 "樓層-房號"
    RoomsOptions = rooms.map((room) => (room['value'] == '') ? (room) : ({ "value": room["value"], "label": `${Floor}${room["label"]}` }))
    // //將特例樓層拉出篩選
    // if(Floor >= 2 && Floor <= 13){
    //     RoomsOptions = RoomsOptions.filter((roomData) => Number(roomData["value"]) <= 15)
    // }
    // if (Floor == "1" || Floor == "15") {
    //     RoomsOptions = RoomsOptions.filter((roomData) => Number(roomData["value"]) <= 10)
    // } else { //非特例樓層選項保持不變(指該樓層1~15房都有)
    //     RoomsOptions = RoomsOptions
    // }
    setFloorValue(Floor) //紀錄選取樓層
    setRoomValue("01") //初始化選取房號
}
let BedsOptions = [{ value: "", label: "床號" }]; //房號選項
//依照選取房號，釋出對應床號，並記錄選取房號
const RoomValueHandler = (Room, setRoomValue, setBedValue, Floor) => {
    if (Room == "15" || Floor == "14") { //因15房只有4個床位，所以特殊篩選
        BedsOptions = beds.filter((bedData) => Number(bedData["value"]) <= 4)
    } else { //其他房皆有6個床位
        BedsOptions = beds
    }
    setRoomValue(Room) //紀錄選取房號
    setBedValue("1") //初始化選取床號
}
let ContactOptionLable = "Line ID" //聯絡方式選項
//根據選取聯絡方式，改變輸入格label
const ContactOptionHandler = (contact, setContactOptionValue) => {
    if (contact == "Line") {
        ContactOptionLable = "Line ID"
    } else {
        ContactOptionLable = "電話號碼"
    }
    setContactOptionValue(contact) //紀錄選取的聯絡方式
}
//以下四個為彈出式視窗專用旗標
let CheckAddAppointmentDisplay = false  //是否顯示確定送出資料的畫面
let AlarmDisplay = true //是否顯示提示畫面
let AlarmContent = "不知名的錯誤，請聯絡網站管理人。" //提示畫面提示語
let AlarmIcon = "Failed" //提示畫面Icon，有警告用的"Failed"、成功用的"Success"
//向後端送出預約資料
async function fetchAddAppointmentData(FloorValue, RoomValue, BedValue, NameValue, ContactOptionValue, ContactValue, setOpen, setDisabledButton) {
    //禁止再次送出資料
    setDisabledButton(true)
    //資料本體
    const SendData = {
        method: "POST",
        headers: {
            'Content-type': 'application/json'
        },
        body: JSON.stringify({
            "FloorValue": FloorValue,
            "RoomValue": RoomValue,
            "BedValue": BedValue,
            "NameValue": NameValue,
            "ContactOptionValue": ContactOptionValue,
            "ContactValue": ContactValue
        })
    }
    //送出資料
    await fetch(BACKEND_API_ADD_APPOINTMENT_INTERFACE, SendData)
        .then(res => res.json())
        .then(response => { //此為交互成功
            if (response["Status"] == "Success") { //若預約成功
                AlarmContent = "預約登記成功~請在床位原地等待幹部前往檢查！3秒後將自動跳轉至主頁。"
                AlarmIcon = "Success"
                setOpen(true) //跳出彈出式視窗
                window.setTimeout(() => { //導回主頁
                    window.location.replace(HOME_PAGE)
                }, 3000)
            } else { //若預約失敗
                AlarmContent = response["Cause"] //後端返回的預約失敗原因
                AlarmIcon = "Failed"
                setOpen(true)
                setDisabledButton(false)
            }
        })
        .catch(() => { //此為交互失敗(伺服器端)
            AlarmContent = "伺服器出現錯誤，請聯絡網站管理人！"
            AlarmIcon = "Failed"
            setOpen(true)
        })
}
//處理按下登記按鈕、向後端fetch前的狀態，控制彈出式視窗
function handlePopOut(type, FloorValue, RoomValue, BedValue, NameValue, ContactOptionValue, ContactValue, setOpen, setDisabledButton) {
    CheckAddAppointmentDisplay = false
    //若必填欄位沒完成
    for (let data of [FloorValue, RoomValue, BedValue, NameValue, ContactValue]){
        if (data.replace(/^\s*|\s*$/g, "") == ""){
            AlarmDisplay = true
            AlarmContent = "請完成必填資料！"
            CheckAddAppointmentDisplay = false
            AlarmIcon = "Failed"
            setOpen(true)
            return null
        }
    }
    //確認是否要登記預約
    if (type == "Confirm Add Appointment") {
        //將警報視窗設定回初始值
        AlarmDisplay = false
        AlarmContent = "不知名的錯誤，請聯絡網站管理人。"
        AlarmIcon = "Failed"
        //切換為詢問確認視窗
        CheckAddAppointmentDisplay = true
        setOpen(true)
        //確定登記預約
    } else if (type == "Confirm") {
        //關閉詢問視窗
        CheckAddAppointmentDisplay = false
        //開啟警報視窗，警報內容由fetch函數處理
        AlarmDisplay = true
        setOpen(false)
        fetchAddAppointmentData(FloorValue, RoomValue, BedValue, NameValue, ContactOptionValue, ContactValue, setOpen, setDisabledButton)
    } else { //取消登記預約，或遇到非預期狀況
        setOpen(false)
        CheckAddAppointmentDisplay = false
        AlarmDisplay = true
        AlarmContent = "不知名的錯誤，請聯絡網站管理人。"
        AlarmIcon = "Failed"
    }
}
const CheckoutAppointment = () => {
    //按鈕與彈跳視窗用
    const [open, setOpen] = useState(false);
    const handleClose = () => setOpen(false);
    //彈跳視窗css樣式
    const style = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: "35%",
        bgcolor: 'background.paper',
        border: '2px solid #000',
        boxShadow: 24,
        borderRadius: "15px",
        userSelect: "none",
        p: 4,
    };
    //各輸入框用 
    const [FloorValue, setFloorValue] = useState("") //紀錄選取樓層
    const [RoomValue, setRoomValue] = useState("") //紀錄選取房號
    const [BedValue, setBedValue] = useState("") //紀錄選取床號
    const [NameValue, setNameValue] = useState("") //紀錄姓名
    const [ContactValue, setContactValue] = useState("") //紀錄聯絡資料
    const [ContactOptionValue, setContactOptionValue] = useState("Line") //紀錄聯絡方式
    //送出資料按鈕的禁止狀態
    const [DisabledButton, setDisabledButton] = useState(false)
    return (<>
        <section id='AppointmentSection'>
            <div id='AppointmentForm'>
                <Box
                    id='AppointmentBox'
                    sx={{ '& .MuiTextField-root': { m: 1 } }}
                    noValidate autoComplete="off"
                >
                    {/* 表單上層 */}
                    <div id='FloorInfor'>
                        {/* 樓層選項方塊 */}
                        <TextField
                            required id="" className='col1Input colInput'
                            select label="樓層"
                            onChange={(e) => { FloorValueHandler(e.target.value, setFloorValue, setRoomValue) }}
                            slotProps={{ select: { native: true }, inputLabel: {shrink: true}}}
                        >
                            {floors.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </TextField>
                        {/* 房號選項方塊 */}
                        <TextField
                            required id="" className='col1Input colInput'
                            select label="房號"
                            onChange={(e) => { RoomValueHandler(e.target.value, setRoomValue, setBedValue, FloorValue) }}
                            slotProps={{
                                select: {
                                    native: true
                                },
                                inputLabel: {
                                    shrink: true
                                }
                            }}
                        >
                            {RoomsOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </TextField>
                        {/* 床號選項方塊 */}
                        <TextField
                            required id="" className='col1Input colInput'
                            select label="床號"
                            onChange={(e) => { setBedValue(e.target.value) }}
                            slotProps={{
                                select: {
                                    native: true,
                                },
                                inputLabel: {
                                    shrink: true
                                }
                            }}
                        >
                            {BedsOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </TextField>
                    </div>
                    {/* 表單中層 */}
                    <div>
                        <TextField
                            required id="" label="您的姓名"
                            className='col2Input colInput' onChange={(e) => { setNameValue(e.target.value) }}
                        />
                    </div>
                    {/* 表單下層 */}
                    <div>
                        <TextField
                            id="" className='col3Input colInput' label="聯絡方式"
                            select onChange={(e) => { ContactOptionHandler(e.target.value, setContactOptionValue) }}
                            slotProps={{
                                select: {
                                    native: true,
                                },
                            }}
                        >
                            {contacts.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </TextField>
                        <TextField
                            required className='col3Input colInput' id=""
                            onChange={(e) => { setContactValue(e.target.value) }}
                            label={ContactOptionLable}
                        />
                    </div>
                    {/* 送出預約按鈕 */}
                    <div id='AppintmentSendButton'>
                        <Button
                            disabled={DisabledButton}
                            onClick={() => handlePopOut("Confirm Add Appointment", FloorValue, RoomValue, BedValue, NameValue, ContactOptionValue, ContactValue, setOpen, setDisabledButton)}>
                            <p>登記退宿預約</p>
                            {/* <div className='loader'></div>  Loading字樣 */}
                        </Button>
                    </div>
                </Box>
                {/* 彈出視窗 */}
                <Modal
                    open={open}
                    onClose={handleClose}
                >
                    <Box sx={style} id="PopOut">
                        {/* 詢問視窗 */}
                        {
                            CheckAddAppointmentDisplay ? (
                                <div id='CheckAddAppointment'>
                                    <p>是否確定送出登記退宿預約？</p>
                                    <div>
                                        <button onClick={() => { handlePopOut("", "none", "none", "none", "none", "none", "none", setOpen, setDisabledButton) }}>取消登記</button>
                                        <button onClick={() => { handlePopOut("Confirm", FloorValue, RoomValue, BedValue, NameValue, ContactOptionValue, ContactValue, setOpen, setDisabledButton) }}>確認預約</button>
                                    </div>
                                </div>) : null
                        }
                        {/* 警示視窗 */}
                        {
                            AlarmDisplay ? (
                                <div id='SendAlarm'>
                                    <img src={
                                        (AlarmIcon == "Failed") ? LoginFailedIcon : SuccessIcon
                                    } style={(AlarmIcon == "Failed") ? null : { "width": "35%" }} />
                                    <p>{AlarmContent}</p>
                                </div>
                            ) : null
                        }
                    </Box>
                </Modal>
            </div>
        </section>
    </>)
}
export default CheckoutAppointment