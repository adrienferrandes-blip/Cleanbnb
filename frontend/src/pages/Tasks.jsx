import React, {useEffect, useState} from 'react'
import API from '../api'
export default function Tasks(){
  const [tasks,setTasks] = useState([])
  useEffect(()=>{ const t = async ()=>{ try{ const token = localStorage.getItem('token'); const r = await API.get('/tasks',{ headers: { Authorization: 'Bearer '+token } }); setTasks(r.data);}catch(e){console.log(e)} }; t(); },[])
  return (<div className="page"><h2>Tâches</h2><ul>{tasks.map(t=> <li key={t.id}>{t.id} - {t.status} - {t.scheduled_start}</li>)}</ul></div>)
}
