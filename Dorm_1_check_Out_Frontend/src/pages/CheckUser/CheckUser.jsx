import { useEffect } from 'react'
import { BACKEND_API_AUTHORIZATION_INTERFACE, BACKEND_API_REFRESH_AUTHORIZATION_INTERFACE } from '../../assets/constaints'

//向後端驗證access token
async function access_token_fetch(Access_Token, Name, setUserLoginStatus, Identity) {
  const SendData = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Access_Token}`
    }
  }
  const res = await fetch(BACKEND_API_AUTHORIZATION_INTERFACE, SendData).catch(err => console.log("error", err))
  const data = await res.json()
  if (data["msg"] == "Ok") { //如果驗證成功
    setUserLoginStatus({ "Status": "Ok", "Name": Name, "Identity": Identity })
    return { "Status": "NotRefresh" }
  } else { //如果驗證不成功，代表可能access token過期，將使用refresh token取得新access token
    return { "Status": "Refresh" }
  }
}

//驗證refresh token，使用fresh token取得新access token
async function refresh_token_fetch(Refresh_Token, setUserLoginStatus) {
  const SendData = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Refresh_Token}`
    }
  }
  await fetch(BACKEND_API_REFRESH_AUTHORIZATION_INTERFACE, SendData)
    .then(res => res.json())
    .then((data) => {
      if (data["msg"] == "Ok") { //代表refresh token驗證成功，並取得新access token
        localStorage.setItem('Access_Token', data["Access_Token"]) //存在session
      } else { //代表refresh token驗證失敗，可能已登出或未嘗試登入、未成功登入過
        localStorage.clear();
        setUserLoginStatus({ "Status": "No", "Name": "" })
      }
    })
    .catch(err => console.log("error", err))
}

const CheckUser = ({ setUserLoginStatus, NavbarStatus, UserLoginStatus }) => {
  let Access_Token = localStorage.getItem('Access_Token') //從session讀取access token
  let Refresh_Token = localStorage.getItem('Refresh_Token') //從session讀取refresh token
  let Name = localStorage.getItem('Name') //從session讀取管理者姓名
  let Identity = localStorage.getItem('Identity') //從session讀取管理者姓名
  //在第一次渲染或從導覽列切換至不同路由時，至後端驗證身分
  useEffect(() => async function fetchAPI() {
    if (Refresh_Token !== null) { //只有曾經登入過，且登入成功或未登出過，才會進行驗證身分
      let fetchStatus = await access_token_fetch(Access_Token, Name, setUserLoginStatus, Identity) //先驗證access token
      if (fetchStatus["Status"] == "Refresh") { //若access token失效，則使用refresh token
        await refresh_token_fetch(Refresh_Token, setUserLoginStatus)
      }
    }
  }, [NavbarStatus])
}
export default CheckUser