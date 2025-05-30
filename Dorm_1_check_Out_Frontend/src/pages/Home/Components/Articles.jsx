import { useState, useEffect } from 'react'
import { BACKEND_API_HOME_BULLETIN_CONTENT } from '../../../assets/constaints'

const Articles = ({ ArticlesOption, ArticlesMode, setArticlesMode }) => {
    const [Content, setContent] = useState("")
    useEffect(()=>{
        const sendData = {
            method: "POST",
            headers: {
                "Content-type": "application/json"
            },
            body: JSON.stringify({
                "ArticlesOption": ArticlesOption
            })
        }
        fetch(BACKEND_API_HOME_BULLETIN_CONTENT, sendData)
        .then(res => res.json())
        .then((data) => {
            console.log("data: ", data)
            setContent(data["Content"])
        })
        .catch((err)=>{

        })
    })
    return (<>
        { Content }
    </>)
}
export default Articles