export function Progress({ value, showLabel=true, size='default' }: {value:number, showLabel?:boolean, size?:'sm'|'default'|'lg'}){
  const h = size==='sm'? 'h-1.5' : size==='lg'? 'h-2.5' : 'h-2'
  return (
    <div className="space-y-1">
      <div className={`w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden ${h}`}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width:`${value}%`, background:'linear-gradient(90deg,#7c3aed,#4f46e5,#06b6d4)' }} />
      </div>
      {showLabel && <div className="flex justify-between text-xs"><span className="text-zinc-500">Progress</span><span className="font-medium">{value}%</span></div>}
    </div>
  )
}
export function MiniProgress({ value }: {value:number}){
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-violet-600 rounded-full" style={{width:`${value}%`}} />
      </div>
      <span className="text-xs font-medium text-zinc-500">{value}%</span>
    </div>
  )
}
