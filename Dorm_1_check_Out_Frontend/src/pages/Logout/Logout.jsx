import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
const Logout = ({ setUserLoginStatus, setNavbarStatus }) => {
    const Navigate = useNavigate()
    useEffect(() => {
        localStorage.clear();
        setUserLoginStatus({ "Status": "No", "Name": "", "Identity": "" })
        setNavbarStatus("/")
        Navigate("/")
    }, [])
    return (<>
    </>)
}
export default Logout