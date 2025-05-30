import './Login.css'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginLogo from '../../assets/LoginLogo.png'
import { BACKEND_API_USER_DATA_INTERFACE } from '../../assets/constaints'
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import LoginFailedIcon from '../../assets/LoginFailed.png'
//處理與後端API交互
async function FetchLoginDataAPI(handleOpen, setUserLoginStatus){
    //讀取輸入的帳密
    const UserValue = document.getElementById("UserValue").value
    const PasswordValue = document.getElementById("PasswordValue").value
    if (UserValue == "" || PasswordValue == ""){
        handleOpen()
        return null
    }
    //要傳送到後端的資料(http格式)
    const Send_Data = {
        method: "POST",
        headers: {
            'Content-type': 'application/json'
        },
        body: JSON.stringify({
            "UserValue": UserValue,
            "PasswordValue": PasswordValue
        })
    }
    await fetch(BACKEND_API_USER_DATA_INTERFACE, Send_Data)
    .then(res => res.json())
    .then(data => { //與伺服器交互成功
        if (data["Status"] == "Success"){ //如果帳密正確
            //設定本端Session
            localStorage.clear()
            localStorage.setItem('Access_Token', data["Access_Token"]) //JWT-Access-Token
            localStorage.setItem('Refresh_Token', data["Refresh_Token"]) //JWT-Refresh-Token
            localStorage.setItem('Name', data["Name"]) //使用者真實姓名
            localStorage.setItem('Identity', data["Identity"]) //使用者真實姓名
            setUserLoginStatus({ "Status": "Ok", "Name": data["Name"] }) //紀錄用戶登入狀態
        }else{ //如果帳密不正確
            handleOpen() //彈出視窗
        }
    })
    .catch(() => handleOpen()) //與伺服器交互不成功
}
const Login = ( { setUserLoginStatus, UserLoginStatus } ) => {
    //跳轉頁面元件
    const navigate = useNavigate()
    //按鈕與彈跳視窗用
    const [open, setOpen] = useState(false);
    const handleOpen = () => setOpen(true);
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
        p: 4,
      };
    //若使用者登入狀態改變，則判斷目前是否已登入，若已登入則跳回主頁
    useEffect(()=>{
        if(UserLoginStatus["Status"] == "Ok"){
            navigate("/")
        }
    }, [UserLoginStatus])
    return (<>
        <main id='LoginMain'>
            <section id='LoginSection'>
                <div id="LoginTitle">
                    <img src={LoginLogo} />
                    <p id='LoginTitleTextTitle'>後臺管理系統登入</p>
                    <p id='LoginTitleTextDetail'>*僅限宿舍幹部或其他宿舍管理人員登入</p>
                </div>
                <div id="LoginForm">
                    <div className="InputBlock">
                        <input type="text" name="user" id='UserValue' required />
                        <p>帳號</p>
                        <div className='BottomLine'></div>
                    </div>
                    <div className="InputBlock">
                        <input type="password" name="password" id='PasswordValue' required />
                        <p>密碼</p>
                        <div className='BottomLine'></div>
                    </div>
                    <Button onClick={() => {FetchLoginDataAPI(handleOpen, setUserLoginStatus);}}>
                        <p>登入帳號</p>
                    </Button>
                </div>
            </section>
            {/* 彈跳視窗UI */}
            <Modal
            open={open}
            onClose={handleClose} 
            >
            <Box sx={style}>
                <div id='LoginFailed'>
                    <img src={LoginFailedIcon} />
                    <p>帳密輸入錯誤，或伺服器出現問題！</p>
                </div>
            </Box>
            </Modal>
        </main>
    </>)
}
export default Login