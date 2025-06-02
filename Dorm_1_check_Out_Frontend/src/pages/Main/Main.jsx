import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Helmet } from 'react-helmet'
import { useState } from 'react'
import CheckUser from '../CheckUser/CheckUser'
import Login from '../Login/Login'
import Home from '../Home/Home'
import NavBar from '../PublicComponents/NavBar'
import NoFound from '../NoFound/NoFound'
import Logout from '../Logout/Logout'
import Appointment from '../Appointment/Appointment'
import SearchList from '../SerachList/SearchList'
import WebLogo from '../../assets/WebLogo.png'
const Main = () =>{
  const [UserLoginStatus, setUserLoginStatus] = useState({ "Status": "No", "Name": "", "Identity": "", "Id": "" })
  const [NavbarStatus, setNavbarStatus] = useState("/")
    return (<>
    <CheckUser setUserLoginStatus={setUserLoginStatus} NavbarStatus={NavbarStatus} UserLoginStatus={UserLoginStatus} />
    <BrowserRouter>
    {/* 導覽列 */}
    <NavBar UserLoginStatus={UserLoginStatus} setNavbarStatus={setNavbarStatus} />
      {/* 路由設定 */}
      <Routes>
        {/* 主頁元件 */}
        <Route path='/' element={<Home />} />
        <Route path='/Appointment' element={<Appointment />} />
        <Route path='/SearchList' element={<SearchList UserLoginStatus={UserLoginStatus} />} />
        <Route path='/AdminLogin' element={<Login setUserLoginStatus={setUserLoginStatus} UserLoginStatus={UserLoginStatus} />} />
        <Route path='/AdminLogout' element={<Logout setUserLoginStatus={setUserLoginStatus} setNavbarStatus={setNavbarStatus} />} />
        <Route path='*' element={<NoFound />} />
      </Routes>
      {/* header更改 */}
      <Helmet>
        <title>一宿退宿預約系統</title>
        <link rel="icon" type="image/png" href={WebLogo} />
      </Helmet>
    </BrowserRouter>
    </>)
}
export default Main