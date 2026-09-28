import { languageColor } from '../../lib/constants'

export function LanguageBar({ languages, compact }: { languages: {language:string, percentage:number}[], compact?: boolean }){
  if(!languages.length) return <div className="text-xs text-zinc-400">No languages detected</div>
  return (
    <div className="space-y-2">
      <div className={`flex rounded-full overflow-hidden gap-[2px] ${compact?'h-1.5':'h-2'} bg-zinc-100 dark:bg-zinc-800`}>
        {languages.map(l=> (
          <div key={l.language} style={{ width: `${l.percentage}%`, background: languageColor(l.language) }} className="h-full rounded-full transition-all" />
        ))}
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-3">
          {languages.map(l=> (
            <span key={l.language} className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: languageColor(l.language)}} />
              <span className="font-medium">{l.language}</span>
              <span className="text-zinc-500">{l.percentage}%</span>
            </span>
          ))}
        </div>
      )}
      {compact && (
        <div className="flex gap-2 text-[11px] text-zinc-500">
          {languages.slice(0,3).map(l=> <span key={l.language} className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{background:languageColor(l.language)}} />{l.language}</span>)}
          {languages.length>3 && <span>+{languages.length-3}</span>}
        </div>
      )}
    </div>
  )
}

export function InlineLanguageBar({ languages }: {languages:{language:string,percentage:number}[]}){
  if(!languages.length) return null
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 gap-px">
      {languages.map(l=> <div key={l.language} style={{ width:`${l.percentage}%`, background: languageColor(l.language)}} />)}
    </div>
  )
}
