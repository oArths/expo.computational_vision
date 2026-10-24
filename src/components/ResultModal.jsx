import { useEffect, useRef, useState } from 'react'
import { formatarPontos } from '../format.js'
import Modal from './Modal.jsx'
import Skeleton from './Skeleton.jsx'

export default function ResultModal({ resultado, onSalvar, onReiniciar }) {
  const [novoNome, setNovoNome] = useState('')
  const [salvando, setSalvando] = useState(false)
  const inputRef = useRef(null)

  // Um novo desafio zera o campo; o nome repetido abre o campo para renomear.
  useEffect(() => {
    setNovoNome('')
    if (resultado?.renomear) inputRef.current?.focus()
  }, [resultado])

  if (!resultado) return null

  async function salvar() {
    if (!novoNome.trim()) {
      inputRef.current?.focus()
      return
    }

    setSalvando(true)
    await onSalvar(novoNome.trim())
    setSalvando(false)
  }

  return (
    <Modal aberto rotulo="Desafio completo">
      <h2 className="text-2xl text-primary-purple">Desafio completo</h2>
      <p className="result-line">
        Movimentos: <strong>{resultado.movimentos}</strong>
      </p>
      <p className="result-line">
        Tempo: <strong>{resultado.segundos}</strong>s
      </p>
      <p className="result-line">
        Score: <strong>{formatarPontos(resultado.score)}</strong>
      </p>
      <p className="result-line">
        Posição:{' '}
        {resultado.enviando ? <Skeleton className="h-4 w-10" /> : <strong>{resultado.posicao}</strong>}
      </p>

      <table className="rank">
        <thead>
          <tr>
            <th>#</th>
            <th>Nome</th>
            <th>Score</th>
            <th>Tempo</th>
          </tr>
        </thead>
        <tbody>
          {resultado.enviando &&
            resultado.top.length === 0 &&
            Array.from({ length: 4 }, (_, index) => (
              <tr key={`skeleton-${index}`}>
                <td>
                  <Skeleton className="h-3 w-4" />
                </td>
                <td>
                  <Skeleton className="h-3 w-24" />
                </td>
                <td>
                  <Skeleton className="h-3 w-14" />
                </td>
                <td>
                  <Skeleton className="h-3 w-8" />
                </td>
              </tr>
            ))}

          {resultado.top.map((linha, index) => (
            <tr key={`${linha.nickname}-${index}`}>
              <td>{index + 1}</td>
              <td>{linha.nickname}</td>
              <td>{formatarPontos(linha.score)}</td>
              <td>{linha.time}s</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="min-h-[18px] text-xs text-ui-muted">{resultado.status}</p>

      {resultado.renomear && (
        <div className="flex flex-col gap-2">
          <label htmlFor="result-nickname">
            Esse nome já foi usado. Escolha outro para salvar:
          </label>
          <input
            id="result-nickname"
            ref={inputRef}
            className="field"
            maxLength={20}
            autoComplete="off"
            placeholder="até 20 caracteres"
            value={novoNome}
            onChange={event => setNovoNome(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !salvando) salvar()
            }}
          />
          <button className="btn" disabled={salvando} onClick={salvar}>
            Salvar
          </button>
        </div>
      )}

      <button className="btn" onClick={onReiniciar}>
        Jogar novamente
      </button>
    </Modal>
  )
}
