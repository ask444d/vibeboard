import { useEffect, useState } from 'react'

export function PWAInstall(){
  const [deferred, setDeferred]=useState<any>(null)
  const [installed, setInstalled]=useState(false)

  useEffect(()=>{
    const onBefore = (e:any)=>{ e.preventDefault(); setDeferred(e) }
    const onInstalled = ()=> setInstalled(true)
    window.addEventListener('beforeinstallprompt', onBefore)
    window.addEventListener('appinstalled', onInstalled)
    // check display-mode
    if(window.matchMedia('(display-mode: standalone)').matches) setInstalled(true)
    return ()=>{ window.removeEventListener('beforeinstallprompt', onBefore); window.removeEventListener('appinstalled', onInstalled) }
  },[])

  if(installed || !deferred) return null

  return (
    <button
      onClick={async()=>{
        deferred.prompt()
        const choice = await deferred.userChoice
        if(choice.outcome==='accepted') setDeferred(null)
      }}
      className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700"
    >
      ⤓ Install
    </button>
  )
}
