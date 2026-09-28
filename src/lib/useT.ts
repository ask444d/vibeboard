import { useStore } from '../store/useStore'
import { t as translate } from './i18n'

export function useT(){
  const locale = useStore(s=>s.locale)
  return (key:string)=> translate(locale, key)
}
