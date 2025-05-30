import './NavBar.css'
import { NavLink } from 'react-router-dom'
import NavLogo from '../../assets/NavLogo.png'
const NavBar = ({ UserLoginStatus, setNavbarStatus }) => {
    const { Status, Name } = UserLoginStatus
    return (<>
        <style>
            {
                (Status == "Ok") ? '#TopNav{ grid-template-areas: " Title User " " Link Link "; }' : '#TopNav{ grid-template-areas: " Title Title " " Link Link "; }'
            }
        </style>

        <nav id='TopNav'>
            <div id='TopNavTitle'>
                <img src={NavLogo} />
                <p>台科大第一學生宿舍退宿檢查預約系統</p>
            </div>
            <div id='TopNavLinkBlock'>
                <NavLink className='TopNavLink' to='/' onClick={() => setNavbarStatus("/")}>
                    主頁
                </NavLink>
                <NavLink className='TopNavLink' to='/Appointment' onClick={() => setNavbarStatus("/Appointment")}>
                    預約檢查
                </NavLink>
                <NavLink className='TopNavLink' to='/SearchList' onClick={() => setNavbarStatus("/SearchList")}>
                    查詢申請
                </NavLink>
                {
                    (Status == "Ok") ?
                        <NavLink className='TopNavLink' to='/AdminLogout' onClick={() => setNavbarStatus("/AdminLogout")}>
                            帳號登出
                        </NavLink> :
                        <NavLink className='TopNavLink' to='/AdminLogin' onClick={() => setNavbarStatus("/AdminLogin")}>
                            後臺登入
                        </NavLink>
                }
            </div>
            <div id='TopNavUserProfile'>
                {
                    (Status == "Ok") ? <p>{Name}，值班辛苦了{"><"}</p> : null
                }
            </div>
        </nav>
    </>)
}
export default NavBar