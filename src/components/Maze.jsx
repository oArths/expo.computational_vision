// Só posiciona os elementos; o desenho das células vem de src/maze/view.js.
export default function Maze({ containerRef, tableRef, trailRef, tokenRef }) {
  return (
    <div id="maze-container" ref={containerRef}>
      <table ref={tableRef} />
      <svg id="player-trail" ref={trailRef} aria-hidden="true" />
      <svg id="player-token" ref={tokenRef} viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="var(--color-accent-red)" />
      </svg>
    </div>
  )
}
