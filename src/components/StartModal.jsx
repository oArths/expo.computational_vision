import Modal, { useFoco } from './Modal.jsx'

export default function StartModal({ aberto, nickname, onNickname, erro, enviando, onComecar }) {
  const inputRef = useFoco(aberto)

  return (
    <Modal aberto={aberto} rotulo="Começar desafio">
      <h2 className="text-2xl text-primary-purple">Expo Golf</h2>
      <div>
        <div className="flex w-full items-center justify-center">
          <img className="w-40" src="/imgs/dedo-indicador.png" alt="Dedo indicador apontando" />
        </div>
        <p>Aponte o dedo indicador para o lado que quer ir e segure por um instante.</p>
      </div>
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
          if (event.key === 'Enter' && !enviando) onComecar()
        }}
      />
      <p className="min-h-[18px] text-xs text-accent-red">{erro}</p>
      <button className="btn" disabled={enviando} onClick={onComecar}>
        Começar
      </button>
    </Modal>
  )
}
