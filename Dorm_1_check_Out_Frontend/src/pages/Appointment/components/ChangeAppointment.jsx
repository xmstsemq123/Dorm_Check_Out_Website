import { useState } from 'react'
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import { floors, rooms, beds, contacts, ReasonForChange } from './Select_contents.jsx'
import { HOME_PAGE, BACKEND_API_ADD_APPOINTMENT_INTERFACE } from '../../../assets/constaints.js'
import LoginFailedIcon from '../../../assets/LoginFailed.png'
import SuccessIcon from '../../../assets/Success.png'
let RoomsOptions = [{ value: "", label: "房號" }];
const FloorValueHandler = (Floor, setFloorValue, setRoomValue) => {
    RoomsOptions = rooms.map((room) => ({ "value": room["value"], "label": `${Floor}${room["label"]}` }))
    if (Floor == "1" || Floor == "14" || Floor == "15") {
        RoomsOptions = RoomsOptions.filter((roomData) => Number(roomData["value"]) <= 10)
    } else {
        RoomsOptions = RoomsOptions
    }
    setFloorValue(Floor)
    setRoomValue("01")
}
let BedsOptions = [{ value: "", label: "床號" }];
const RoomValueHandler = (Room, setRoomValue, setBedValue) => {
    if (Room == "15") {
        BedsOptions = beds.filter((bedData) => Number(bedData["value"]) <= 4)
    } else {
        BedsOptions = beds
    }
    setRoomValue(Room)
    setBedValue("1")
}
let ContactOptionLable = "Line ID"
const ContactOptionHandler = (contact, setContactOptionValue) => {
    if (contact == "Line") {
        ContactOptionLable = "Line ID"
    } else {
        ContactOptionLable = "電話號碼"
    }
    setContactOptionValue(contact)
}
let CheckAddAppointmentDisplay = false
let AlarmDisplay = true
let AlarmContent = "不知名的錯誤，請聯絡網站管理人。"
let AlarmIcon = "Failed"
async function fetchAddAppointmentData(FloorValue, RoomValue, BedValue, NameValue, ContactOptionValue, ContactValue, setOpen){
    const SendData = {
        method: "POST",
        headers: {
            'Context-type': 'application/json'
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
    await fetch(BACKEND_API_ADD_APPOINTMENT_INTERFACE, SendData)
    .then( res => res.json() )
    .then( response => {
        if (response["Status"] == "Success"){
            AlarmContent = "預約登記成功~請在床位原地等待幹部前往檢查！3秒後將自動跳轉至主頁。"
            AlarmIcon = "Success"
            setOpen(true)
            window.setTimeout(()=>{
                window.location.replace(HOME_PAGE)
            }, 3000)
        }else{
            AlarmContent = response["Cause"]
            AlarmIcon = "Failed"
            setOpen(true)
        }
    } )
    .catch( () => {
        AlarmContent = "伺服器出現錯誤，請聯絡網站管理人！"
        AlarmIcon = "Failed"
        setOpen(true)
    } )
}
function handlePopOut(type, FloorValue, RoomValue, BedValue, NameValue, ContactOptionValue, ContactValue, setOpen){
    CheckAddAppointmentDisplay = false
    if (FloorValue == "" || RoomValue == "" || BedValue == "" || NameValue == "" || ContactValue == "") {
        AlarmDisplay = true
        AlarmContent = "請完成必填資料！"
        CheckAddAppointmentDisplay = false
        AlarmIcon = "Failed"
        setOpen(true)
    }
    else if (type == "Confirm Add Appointment"){
        AlarmDisplay = false
        AlarmContent = "不知名的錯誤，請聯絡網站管理人。"
        CheckAddAppointmentDisplay = true
        AlarmIcon = "Failed"
        setOpen(true)
    } else if (type == "Confirm"){
        CheckAddAppointmentDisplay = false
        AlarmDisplay = true
        setOpen(false)
        fetchAddAppointmentData(FloorValue, RoomValue, BedValue, NameValue, ContactOptionValue, ContactValue, setOpen)
    } else {
        setOpen(false)
        CheckAddAppointmentDisplay = false
        AlarmDisplay = true
        AlarmContent = "不知名的錯誤，請聯絡網站管理人。"
        AlarmIcon = "Failed"
    }
}
const ChangeAppointment = () => {
    //按鈕與彈跳視窗用
    const [open, setOpen] = useState(false);
    const handleClose = () => setOpen(false);
    const style = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: "35%",
        height: "45%",
        bgcolor: 'background.paper',
        border: '2px solid #000',
        boxShadow: 24,
        borderRadius: "15px",
        userSelect: "none",
        p: 4,
    };
    //各輸入框用
    const [FloorValue, setFloorValue] = useState("")
    const [RoomValue, setRoomValue] = useState("")
    const [BedValue, setBedValue] = useState("")
    const [NameValue, setNameValue] = useState("")
    const [ContactValue, setContactValue] = useState("")
    const [ContactOptionValue, setContactOptionValue] = useState("Line")
    const [ReasonForChangeState, setReasonForChangeState] = useState("")
    return (<>
        <section id='AppointmentSection'>
            <div id='AppointmentForm'>
                <Box
                    component="form" id='AppointmentBox'
                    sx={{ '& .MuiTextField-root': { m: 1 } }}
                    noValidate autoComplete="off"
                >
                    <div>
                        {/* 預約更改選項*/}
                        <TextField
                            required id="" className='col2Input co2Input'
                            select label="預約更改選項"
                            // onChange={(e) => { FloorValueHandler(e.target.value, setFloorValue, setRoomValue) }}
                            slotProps={{ select: { native: true } }}
                        >
                            {ReasonForChange.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </TextField>
                    </div>
                    <div id='FloorInfor'>
                        {/* 樓層選項方塊 */}
                        <TextField
                            required id="" className='col1Input colInput'
                            select label="樓層"
                            onChange={(e) => { FloorValueHandler(e.target.value, setFloorValue, setRoomValue) }}
                            slotProps={{ select: { native: true } }}
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
                            onChange={(e) => { RoomValueHandler(e.target.value, setRoomValue, setBedValue) }}
                            slotProps={{
                                select: {
                                    native: true
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
                            }}
                        >
                            {BedsOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </TextField>
                    </div>
                    <div>
                        <TextField
                            required id="" label="您的姓名"
                            className='col2Input colInput' onChange={(e) => { setNameValue(e.target.value) }}
                        />
                    </div>
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
                    <div id='AppintmentSendButton'>
                        <Button onClick={() => handlePopOut("Confirm Add Appointment", FloorValue, RoomValue, BedValue, NameValue, ContactOptionValue, ContactValue, setOpen)}>
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
                    <Box sx={style}>
                        {
                            CheckAddAppointmentDisplay ? (
                            <div id='CheckAddAppointment'>
                                <p>是否確定送出登記退宿預約？</p>
                                <div>
                                    <button onClick={() => {handlePopOut("", "none", "none", "none", "none", "none", "none", setOpen)}}>取消登記</button>
                                    <button onClick={() => {handlePopOut("Confirm", FloorValue, RoomValue, BedValue, NameValue, ContactOptionValue, ContactValue, setOpen)}}>確認預約</button>
                                </div>
                            </div>) : null
                        }
                        {
                            AlarmDisplay ? (
                            <div id='SendAlarm'>
                                <img src={
                                    (AlarmIcon == "Failed") ? LoginFailedIcon : SuccessIcon
                                } />
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
export default ChangeAppointment