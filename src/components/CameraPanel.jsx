const DIRECOES = ['LEFT', 'RIGHT', 'TOP', 'BOTTOM']

export default function CameraPanel({ videoRef, overlayRef, status, zona, debugGesto, debugRef }) {
  return (
    <aside className="absolute right-4 top-4 flex w-[min(320px,26vw)] flex-col gap-1">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-soft">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
        />
        <canvas
          ref={overlayRef}
          className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
        />
        <div className="camera-zonas" aria-hidden="true">
          {DIRECOES.map(dir => (
            <span key={dir} data-dir={dir} className={dir === zona ? 'ativa' : ''} />
          ))}
        </div>
      </div>
      <p className="min-h-5 text-center text-xs text-ui-muted">{status}</p>
      {debugGesto && <p ref={debugRef} className="text-center font-mono text-xs text-ui-fg" />}
    </aside>
  )
}
