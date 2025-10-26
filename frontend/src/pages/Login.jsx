import React, {useState} from 'react'
import API from '../api'
export default function Login(){
  const [email,setEmail] = useState('admin@example.com')
  const [password,setPassword] = useState('password')
  async function submit(e){
    e.preventDefault()
    try{
      const r = await API.post('/auth/login',{email,password})
      localStorage.setItem('token', r.data.accessToken)
      alert('Connecté ! Token stocké localement.')
    }catch(e){ alert('Erreur connexion') }
  }
  return (<div className="page"><h2>Connexion</h2><form onSubmit={submit}><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email"/><br/><input value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" type="password"/><br/><button>Se connecter</button></form></div>)
}
