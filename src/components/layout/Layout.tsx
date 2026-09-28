import { useState } from 'react'
import { Sidebar, MobileBottomNav } from './Sidebar'
import { Topbar } from './Topbar'

export function Layout({ children }: {children:React.ReactNode}){
  const [mobileOpen, setMobileOpen]=useState(false)
  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 flex">
      <div className="hidden lg:block"><Sidebar /></div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="flex-1 bg-black/30" onClick={()=>setMobileOpen(false)} />
          <Sidebar onClose={()=>setMobileOpen(false)} />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onMenu={()=> setMobileOpen(true)} />
        <main className="flex-1 px-4 lg:px-8 py-6 pb-20 lg:pb-6 max-w-[1280px] w-full mx-auto">{children}</main>
        <MobileBottomNav />
      </div>
    </div>
  )
}
