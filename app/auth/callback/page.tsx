'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { afterSignInPath, finishSignIn } from '@/lib/auth-finish'
import { callbackMethod } from '@/lib/auth-user'

export default function AuthCallback(){
 const [error,setError]=useState('')
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search)
  if(params.has('error')){setError('Sign-in was cancelled or could not be completed. Please try again.');return}
  const hadCode=params.has('code')
  let handled=false,active=true
  const timeout=window.setTimeout(()=>{if(active&&!handled)setError('Sign-in is taking longer than expected. Please try again in this browser.')},10000)
  const finish=(session:NonNullable<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>)=>{
    if(!active||handled)return
    handled=true;window.clearTimeout(timeout)
    if(hadCode)finishSignIn(session,callbackMethod(window.location.search))
    else window.location.replace(afterSignInPath())
  }
  // The SDK owns PKCE exchange. Subscribe before reading the session so neither
  // a fast exchange nor an already-consumed callback code leaves this page stuck.
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
    if((event==='SIGNED_IN'||event==='INITIAL_SESSION')&&session)finish(session)
  })
  supabase.auth.getSession().then(({data,error:sessionError})=>{
    if(!active||handled)return
    if(data.session)finish(data.session)
    else if(sessionError||!hadCode)setError('Please start sign-in again in this browser.')
  }).catch(()=>{if(active&&!handled)setError('Could not finish sign-in. Check your connection and try again.')})
  return ()=>{active=false;window.clearTimeout(timeout);subscription.unsubscribe()}
 },[])
 return <main className="uf-app-frame"><div className="uf-app-shell" style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div className="uf-surface" style={{width:'100%',maxWidth:420,padding:32,textAlign:'center'}}><div className="uf-chip" style={{marginBottom:16}}>Secure sign-in</div><h1 style={{margin:0,fontSize:'2rem',letterSpacing:'-.04em'}}>{error?'Let’s try sign-in again':'Signing you in'}</h1>{error?<><p role="alert" style={{margin:'14px 0 24px',color:'var(--uf-ink-2)'}}>{error}</p><Link href="/login" className="uf-primary-button">Try again</Link></>:<p role="status" style={{margin:'14px 0 0',color:'var(--uf-ink-2)'}}>Finishing your sign-in and opening Home.</p>}</div></div></main>
}
