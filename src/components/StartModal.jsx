import { useEffect, useState } from 'react'
import Modal, { useFoco } from './Modal.jsx'

export default function StartModal({ aberto, nickname, onNickname, erro, enviando, onComecar }) {
  const inputRef = useFoco(aberto)
  const [etapa, setEtapa] = useState('nome')

  useEffect(() => {
    if (aberto) setEtapa('nome')
  }, [aberto])

  // Nome repetido é descoberto no "Começar"; volta para a etapa do nome.
  useEffect(() => {
    if (erro) {
      setEtapa('nome')
      inputRef.current?.focus()
    }
  }, [erro, inputRef])

  function avancar() {
    if (!nickname.trim()) {
      inputRef.current?.focus()
      return
    }

    setEtapa('instrucoes')
  }

  return (
    <Modal aberto={aberto} rotulo="Começar desafio">
      <h2 className="text-2xl text-primary-purple">Expo Golf</h2>

      {etapa === 'nome' ? (
        <>
          <label className="text-lg" htmlFor="nickname">
            Seu nome
          </label>
          <input
            id="nickname"
            ref={inputRef}
            className="field"
            maxLength={20}
            autoComplete="off"
            placeholder="até 20 caracteres"
            value={nickname}
            onChange={event => onNickname(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') avancar()
            }}
          />
          <p className="min-h-[18px] text-xs text-accent-red">{erro}</p>
          <button className="btn" onClick={avancar}>
            Avançar
          </button>
        </>
      ) : (
        <>
          <div className="flex w-full items-center justify-center">
            <img className="w-40" src="/imgs/dedo-indicador.png" alt="Dedo indicador apontando" />
          </div>
          <p>Aponte o dedo indicador para o lado que quer ir e segure por um instante.</p>
          <p className="rounded-md bg-primary-yellow/40 p-3 text-sm">
            Para pausar, é só colocar as duas mãos para o alto.
          </p>
          <button className="btn" disabled={enviando} onClick={onComecar}>
            Começar
          </button>
          <button className="link-button mx-auto" onClick={() => setEtapa('nome')}>
            Voltar
          </button>
        </>
      )}
    </Modal>
  )
}
