import { useEffect, useRef } from 'react'

// Modal fixo com transição; o cartão é o mesmo nos dois modais.
export default function Modal({ aberto, rotulo, children }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={rotulo}
      className={`fixed inset-0 z-[70] flex items-center justify-center bg-ui-fg/60 p-4 transition-opacity duration-200 ${
        aberto ? 'visible opacity-100' : 'invisible opacity-0'
      }`}
    >
      <div className="card">{children}</div>
    </div>
  )
}

// Mantém o foco no campo quando o modal abre (e no renomear, no modal final).
export function useFoco(aberto) {
  const ref = useRef(null)
  useEffect(() => {
    if (aberto) ref.current?.focus()
  }, [aberto])
  return ref
}
