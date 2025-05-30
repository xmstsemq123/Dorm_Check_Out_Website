import { useState } from 'react'
import './Appointment.css'
import CheckoutAppointment from './components/CheckoutAppointment.jsx'
import ChangeAppointment from './components/ChangeAppointment.jsx'
const Appointment = () =>{
    const [PageStatus, setPageStatus] = useState("CheckOutAppointment")
    return (<>
        <main id='AppointmentMain'>
            {/* <aside id='AppointmentAside'>
                <div id='AsideButtons'>
                    <button onClick={()=>{setPageStatus("CheckOutAppointment")}}>退宿預約</button>
                    <button onClick={()=>{setPageStatus("ChangeAppointment")}}>預約更改</button>
                </div>
            </aside>
            {
                (PageStatus == "CheckOutAppointment") ? <CheckoutAppointment /> : <ChangeAppointment />
            } */}
            <CheckoutAppointment />
        </main>
        </>)
}
export default Appointment