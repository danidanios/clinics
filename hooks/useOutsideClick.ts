import { useEffect, RefObject } from 'react'

export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onOutside: () => void,
) {
  useEffect(() => {
    if (!active) return
    function handle(e: MouseEvent) {
      const el = ref.current
      if (el && !el.contains(e.target as Node)) onOutside()
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onOutside()
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [ref, active, onOutside])
}
