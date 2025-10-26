import React, {useEffect, useState} from 'react'
import API from '../api'
export default function Dashboard(){
  const [propsList,setPropsList] = useState([])
  useEffect(()=>{ const t = async ()=>{ try{ const token = localStorage.getItem('token'); const r = await API.get('/properties',{ headers: { Authorization: 'Bearer '+token } }); setPropsList(r.data);}catch(e){console.log(e)} }; t(); },[])
  return (<div className="page"><h2>Tableau de bord</h2><div>Propriétés:</div><ul>{propsList.map(p=> <li key={p.id}>{p.title} - {p.address}</li>)}</ul></div>)
}
