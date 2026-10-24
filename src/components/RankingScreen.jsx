import { formatarData, formatarPontos } from '../format.js'

export default function RankingScreen({ aberto, linhas, status, onVoltar }) {
  return (
    <section
      id="screen-ranking"
      className={`screen ${aberto ? 'active' : ''} flex-col items-center gap-4 overflow-y-auto p-8`}
    >
      <div className="flex w-[90%] flex-row items-center justify-between px-10">
        <h2 className="text-[32px] font-black text-primary-green">Ranking</h2>
        <button className="btn-secondary" onClick={onVoltar}>
          Voltar
        </button>
      </div>

      <ol className="flex w-[90%] flex-col gap-2 md:w-[70%]">
        {linhas.map((linha, index) => (
          <li key={`${linha.nickname}-${index}`} className={`rank-row ${index < 3 ? `top${index + 1}` : ''}`}>
            <span className="rank-pos">{index + 1}º</span>
            <span className="rank-name">{linha.nickname}</span>
            <span className="rank-value max-xl:text-right">{formatarPontos(linha.score)} pts</span>
            <span className="rank-value max-xl:text-center">{linha.time}s</span>
            <span className="rank-value max-xl:text-right">{formatarData(linha.created_at)}</span>
          </li>
        ))}
      </ol>

      <p className="min-h-[18px] text-xs text-ui-muted">{status}</p>
    </section>
  )
}
