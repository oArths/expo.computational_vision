import { useCallback, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { criarJogo } from "./game.js";
import {
  atualizarGesto,
  atualizarPausa,
  criarGesto,
  criarPausa,
  maoPrincipal,
  progressoGesto,
  quadranteDoPonto,
} from "./gesture.js";
import { abrirCamera, criarDetector, iniciarLoop } from "./hands.js";
import { desenharOverlay, redimensionarOverlay } from "./overlay.js";
import {
  buscarRanking,
  calcularScore,
  enviarResultado,
  listarRanking,
  nicknameEmUso,
  supabaseConfigurado,
} from "./ranking.js";
import { corridaVazia, useCorrida, useUi } from "./store.js";
import CameraPanel from "./components/CameraPanel.jsx";
import Maze from "./components/Maze.jsx";
import RankingScreen from "./components/RankingScreen.jsx";
import ResultModal from "./components/ResultModal.jsx";
import StartModal from "./components/StartModal.jsx";

const TECLAS = {
  ArrowUp: "TOP",
  ArrowDown: "BOTTOM",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
};

const DEBUG_GESTO = new URLSearchParams(location.search).has("debug");

export default function App() {
  const tela = useUi((state) => state.tela);
  const hud = useUi((state) => state.hud);
  const ranking = useUi((state) => state.ranking);
  const erroInicio = useUi((state) => state.erroInicio);
  const conferindoNome = useUi((state) => state.conferindoNome);
  const startAberto = useUi((state) => state.startAberto);
  const pausado = useUi((state) => state.pausado);
  const resultado = useUi((state) => state.resultado);
  const statusCamera = useUi((state) => state.statusCamera);
  const zona = useUi((state) => state.zona);
  const rastreado = useUi((state) => state.rastreado);
  const segurando = useUi((state) => state.segurando);
  const cameraTentativa = useUi((state) => state.cameraTentativa);
  const nickname = useCorrida((state) => state.nickname);

  const containerRef = useRef(null);
  const tableRef = useRef(null);
  const tokenRef = useRef(null);
  const trailRef = useRef(null);
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const debugRef = useRef(null);
  const pauseProgressRef = useRef(null);

  const jogoRef = useRef(null);
  const rodandoRef = useRef(false);
  const gestoRef = useRef(criarGesto());
  const pausaRef = useRef(criarPausa());
  const nicknameRef = useRef("");
  const resultadoRef = useRef(null);
  const reinicioRef = useRef(null);
  const ultimoRastreadoRef = useRef(0);
  const statusRef = useRef("");
  const zonaRef = useRef(null);
  const rastreadoRef = useRef(false);
  const segurandoRef = useRef(false);

  const irParaHome = useCallback(() => {
    clearTimeout(reinicioRef.current);
    rodandoRef.current = false;
    segurandoRef.current = false;
    // Sair descarta a partida; só o reload mantém o que está salvo.
    jogoRef.current?.pausar();
    useCorrida.setState(corridaVazia);
    useUi.setState({
      tela: "home",
      startAberto: false,
      pausado: false,
      resultado: null,
      segurando: false,
    });
  }, []);

  const agendarVolta = useCallback(() => {
    clearTimeout(reinicioRef.current);
    reinicioRef.current = setTimeout(irParaHome, 30000);
  }, [irParaHome]);

  const enviarScore = useCallback(
    async (nome) => {
      const dados = resultadoRef.current;
      if (!dados) return;

      const { score, segundos } = dados;

      try {
        await enviarResultado({ nickname: nome, segundos, score });
        const { top, posicao } = await buscarRanking({ score, segundos });

        nicknameRef.current = nome;
        useUi.setState((state) => ({
          resultado: {
            ...state.resultado,
            posicao: `${posicao}º`,
            status: "",
            top,
            renomear: false,
            enviando: false,
          },
        }));
        agendarVolta();
      } catch (erro) {
        console.error(erro);

        // 23505 = nome repetido (índice único no banco). Alguém pode ter usado
        // durante a partida, depois da checagem inicial.
        if (erro?.code === "23505") {
          clearTimeout(reinicioRef.current);
          useUi.setState((state) => ({
            resultado: {
              ...state.resultado,
              posicao: "-",
              status:
                "Esse nome já foi usado. Escolha outro para salvar o score.",
              renomear: true,
              enviando: false,
            },
          }));
          return;
        }

        useUi.setState((state) => ({
          resultado: {
            ...state.resultado,
            posicao: "-",
            status:
              "Não foi possível enviar para o ranking. O resultado local acima é válido.",
            enviando: false,
          },
        }));
      }
    },
    [agendarVolta],
  );

  const finalizarDesafio = useCallback(
    async ({ movimentos, segundos }) => {
      rodandoRef.current = false;
      const score = calcularScore(movimentos, segundos);
      resultadoRef.current = { score, segundos };

      // A partida acabou: nada para retomar no próximo reload.
      useCorrida.setState(corridaVazia);
      useUi.setState({
        resultado: {
          movimentos,
          segundos,
          score,
          posicao: supabaseConfigurado ? "..." : "-",
          status: supabaseConfigurado
            ? "Enviando resultado..."
            : "Ranking desativado (sem configuração).",
          top: [],
          renomear: false,
          enviando: supabaseConfigurado,
        },
      });
      agendarVolta();

      if (supabaseConfigurado)
        await enviarScore(nicknameRef.current.trim() || "Anônimo");
    },
    [agendarVolta, enviarScore],
  );

  const salvarNovoNome = useCallback(
    async (nome) => {
      useUi.setState((state) =>
        state.resultado
          ? {
              resultado: {
                ...state.resultado,
                status: "Enviando...",
                enviando: true,
              },
            }
          : {},
      );
      await enviarScore(nome);
    },
    [enviarScore],
  );

  const alternarPausa = useCallback(() => {
    const jogo = jogoRef.current;
    if (!jogo) return;

    if (jogo.estaPausado()) {
      jogo.retomar();
      useUi.setState({ pausado: false });
    } else {
      jogo.pausar();
      useUi.setState({ pausado: true });
    }
  }, []);

  // Motor do jogo: criado uma vez, sobre as refs do React.
  useEffect(() => {
    const salva = useCorrida.getState();

    const jogo = criarJogo({
      table: tableRef.current,
      container: containerRef.current,
      token: tokenRef.current,
      trail: trailRef.current,
      aoAtualizarHud(dados) {
        useUi.setState({
          hud: {
            nivel: dados.nivel,
            total: dados.total,
            dificuldade: dados.dificuldade,
            movimentos: dados.movimentos,
            segundos: dados.segundos,
          },
        });

        if (!dados.iniciado || !rodandoRef.current) return;

        useCorrida.setState({
          iniciado: true,
          nivel: dados.indice,
          row: dados.row,
          col: dados.col,
          movimentos: dados.movimentos,
          decorridoMs: dados.decorridoMs,
          salvoEm: Date.now(),
        });
      },
      aoPassarNivel: () =>
        confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 } }),
      aoTerminar: finalizarDesafio,
    });

    jogoRef.current = jogo;

    if (salva.iniciado) {
      jogo.restaurar(salva);
      nicknameRef.current = salva.nickname;
      rodandoRef.current = true;
      useUi.setState({ tela: "jogo", startAberto: false });
    }

    return () => jogo.destruir();
  }, [finalizarDesafio]);

  // Mostra o nível 1 atrás do modal inicial; o reiniciar só mede o tabuleiro
  // depois que a tela do jogo sai do display: none.
  useEffect(() => {
    if (startAberto) jogoRef.current?.reiniciar();
  }, [startAberto]);

  // A tela do jogo fica escondida no primeiro render; ao retomar uma partida
  // salva o token só pode ser medido depois que ela aparece.
  useEffect(() => {
    if (tela === "jogo") jogoRef.current?.reposicionar();
  }, [tela]);

  const abrirJogo = useCallback(() => {
    clearTimeout(reinicioRef.current);
    rodandoRef.current = false;
    segurandoRef.current = false;
    useCorrida.setState(corridaVazia);
    useUi.setState({
      tela: "jogo",
      startAberto: true,
      pausado: false,
      resultado: null,
      erroInicio: "",
      conferindoNome: false,
      segurando: false,
    });
  }, []);

  // Chamada no "Avançar" da primeira etapa do modal.
  const validarNome = useCallback(async () => {
    const nome = nickname.trim();
    useUi.setState({ erroInicio: "" });

    if (!nome) return false;
    if (!supabaseConfigurado) return true;

    useUi.setState({ conferindoNome: true });

    try {
      if (await nicknameEmUso(nome)) {
        useUi.setState({
          erroInicio: "Esse nome já está no ranking. Escolha outro.",
        });
        return false;
      }

      return true;
    } catch (erro) {
      // Sem rede a checagem falha; o banco ainda barra o nome repetido no final.
      console.warn("Não foi possível checar o nome.", erro);
      return true;
    } finally {
      useUi.setState({ conferindoNome: false });
    }
  }, [nickname]);

  const iniciarDesafio = useCallback(() => {
    const nomeFinal = nickname.trim().slice(0, 20);
    nicknameRef.current = nomeFinal;
    useCorrida.setState({ nickname: nomeFinal });
    clearTimeout(reinicioRef.current);
    useUi.setState({ startAberto: false });
    rodandoRef.current = true;
    Object.assign(gestoRef.current, criarGesto());
    pausaRef.current.desde = null;
    pausaRef.current.armada = true;

    jogoRef.current?.reiniciar();
  }, [nickname]);

  const abrirRanking = useCallback(async () => {
    useUi.setState({
      tela: "ranking",
      ranking: {
        linhas: [],
        status: supabaseConfigurado
          ? ""
          : "Ranking desativado (sem configuração).",
        carregando: supabaseConfigurado,
      },
    });

    if (!supabaseConfigurado) return;

    try {
      const linhas = await listarRanking();
      useUi.setState({
        ranking: {
          linhas,
          status: linhas.length ? "" : "Nenhum resultado ainda.",
          carregando: false,
        },
      });
    } catch (erro) {
      console.error(erro);
      useUi.setState({
        ranking: {
          linhas: [],
          status: "Não foi possível carregar o ranking.",
          carregando: false,
        },
      });
    }
  }, []);

  // Câmera + MediaPipe + gestos. Roda desde o início, como no app original.
  useEffect(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    let ativo = true;
    let stream = null;
    let cancelarLoop = () => {};
    let ultimoFrameEm = 0;
    let fps = 0;

    async function iniciar() {
      try {
        stream = await abrirCamera(video);
        if (!ativo) return;

        const { detector, delegado } = await criarDetector();
        if (!ativo) return;

        statusRef.current = `Câmera ativa · ${delegado}`;
        useUi.setState({ statusCamera: statusRef.current });

        cancelarLoop = iniciarLoop({
          video,
          detector,
          onResultado(deteccao, agora) {
            if (ultimoFrameEm) {
              const instantaneo = 1000 / (agora - ultimoFrameEm);
              fps = fps ? fps * 0.9 + instantaneo * 0.1 : instantaneo;
            }
            ultimoFrameEm = agora;

            const hands = deteccao.landmarks ?? [];
            const primaria = maoPrincipal(hands);

            redimensionarOverlay(overlay, video);

            if (primaria >= 0) ultimoRastreadoRef.current = agora;
            const seguindo = agora - ultimoRastreadoRef.current < 400;
            if (seguindo !== rastreadoRef.current) {
              rastreadoRef.current = seguindo;
              useUi.setState({ rastreado: seguindo });
            }

            const aspecto = video.videoWidth / video.videoHeight || 1;
            const zonaAtiva =
              primaria >= 0
                ? quadranteDoPonto(hands[primaria][8], aspecto)
                : null;

            if (zonaAtiva !== zonaRef.current) {
              zonaRef.current = zonaAtiva;
              useUi.setState({ zona: zonaAtiva });
            }

            if (rodandoRef.current) {
              const direcao = atualizarGesto(
                gestoRef.current,
                primaria >= 0 ? hands[primaria] : null,
                agora,
                aspecto,
              );
              if (direcao) jogoRef.current?.mover(direcao);
            }

            desenharOverlay(overlay, {
              hands,
              primaria,
              progresso: rodandoRef.current
                ? progressoGesto(gestoRef.current, agora)
                : 0,
            });

            if (
              rodandoRef.current &&
              atualizarPausa(pausaRef.current, hands, agora)
            ) {
              alternarPausa();
            }

            const segurandoAgora =
              rodandoRef.current && pausaRef.current.desde !== null;
            if (segurandoAgora !== segurandoRef.current) {
              segurandoRef.current = segurandoAgora;
              useUi.setState({ segurando: segurandoAgora });
            }

            if (pauseProgressRef.current) {
              pauseProgressRef.current.style.width = segurandoAgora
                ? `${Math.min(1, (agora - pausaRef.current.desde) / 1000) * 100}%`
                : "0%";
            }

            const maos = hands.length >= 2 ? " · 2 mãos" : "";
            const texto = `Câmera ativa · ${Math.round(fps)} fps${maos} · ${delegado}`;
            if (texto !== statusRef.current) {
              statusRef.current = texto;
              useUi.setState({ statusCamera: texto });
            }

            if (DEBUG_GESTO && debugRef.current) {
              debugRef.current.textContent = `Z ${zonaAtiva ?? "-"} · ${Math.round(
                progressoGesto(gestoRef.current, agora) * 100,
              )}%`;
            }
          },
        });
      } catch (erro) {
        console.error(erro);
        useUi.setState({
          statusCamera:
            "Câmera indisponível: use HTTPS ou localhost e libere o acesso.",
        });
      }
    }

    iniciar();

    return () => {
      ativo = false;
      cancelarLoop();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [alternarPausa, cameraTentativa]);

  useEffect(() => {
    function aoTeclar(event) {
      const direcao = TECLAS[event.key];
      if (!direcao) return;

      event.preventDefault();
      if (rodandoRef.current) jogoRef.current?.mover(direcao);
    }

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, []);

  useEffect(() => {
    const aoRedimensionar = () => jogoRef.current?.reposicionar();
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, []);

  return (
    <>
      <div
        className={`tracker-ring pointer-events-none fixed inset-0 z-50 border-[3px] border-transparent transition-colors duration-300 ${
          rastreado
            ? "border-primary-blue/60 shadow-[inset_0_0_18px_rgba(79,172,254,0.15)]"
            : ""
        }`}
        aria-hidden="true"
      />

      <section
        id="screen-home"
        className={`screen ${tela === "home" ? "active" : ""} flex-col items-center justify-center gap-6`}
      >
        <h1 className="text-center select-none text-[clamp(56px,13vw,180px)] font-black leading-none tracking-[-0.04em] text-primary-green">
          Expo Golf
        </h1>
        <button className="btn-primary" onClick={abrirJogo}>
          Iniciar
        </button>
        <button className="link-button" onClick={abrirRanking}>
          Ver ranking
        </button>
      </section>

      <RankingScreen
        aberto={tela === "ranking"}
        linhas={ranking.linhas}
        status={ranking.status}
        carregando={ranking.carregando}
        onVoltar={irParaHome}
      />

      <section
        id="screen-game"
        className={`screen ${tela === "jogo" ? "active" : ""} flex-col items-center justify-center`}
      >
        <h1 className="absolute  select-none left-8 top-6 text-[32px] font-black text-primary-green">
          Expo Golf
        </h1>

        <CameraPanel
          videoRef={videoRef}
          overlayRef={overlayRef}
          status={statusCamera}
          zona={zona}
          debugGesto={DEBUG_GESTO}
          debugRef={debugRef}
          onTentar={() =>
            useUi.setState(state => ({
              cameraTentativa: state.cameraTentativa + 1,
              statusCamera: 'Iniciando câmera...'
            }))
          }
        />

        <div className="mb-3 flex items-center gap-6 rounded-[10px] bg-white px-4 py-2 text-sm shadow-soft">
          <span className="text-lg">
            Nível{" "}
            <strong className="font-extrabold">
              {hud.nivel}/{hud.total}
            </strong>{" "}
            <small className="text-lg uppercase tracking-[1px] text-ui-muted">
              {hud.dificuldade}
            </small>
          </span>
          <span className="text-lg">
            Movimentos{" "}
            <strong className="font-extrabold">{hud.movimentos}</strong>
          </span>
          <span className="text-lg">
            Tempo{" "}
            <strong className="font-extrabold text-primary-blue">
              {hud.segundos}
            </strong>
            s
          </span>
          <button className="link-button bg-red-600/80 px-3 py-1.5  text-lg text-white rounded-md" onClick={irParaHome}>
            Sair
          </button>
        </div>

        <Maze
          containerRef={containerRef}
          tableRef={tableRef}
          trailRef={trailRef}
          tokenRef={tokenRef}
        />
      </section>

      <div
        role="status"
        className={`fixed inset-0 z-[70] flex items-center justify-center bg-ui-fg/60 p-4 transition-opacity duration-200 ${
          pausado ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div className="card">
          <h2 className="text-2xl text-primary-purple">Pausado</h2>
          <p>Levante as duas mãos para continuar.</p>
        </div>
      </div>

      <div
        className={`pointer-events-none fixed bottom-7 left-1/2 z-[55] flex -translate-x-1/2 flex-col items-center gap-2 rounded-[10px] bg-ui-fg/85 px-4 py-3 text-xs text-white transition-opacity duration-150 ${
          segurando ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <span>Segure as duas mãos para pausar</span>
        <div className="h-2 w-56 overflow-hidden rounded-full bg-white/20">
          <div
            ref={pauseProgressRef}
            className="h-full w-0 bg-primary-blue transition-[width] duration-100"
          />
        </div>
      </div>

      <StartModal
        aberto={startAberto}
        nickname={nickname}
        onNickname={(valor) => {
          useCorrida.setState({ nickname: valor });
          useUi.setState({ erroInicio: "" });
        }}
        erro={erroInicio}
        enviando={conferindoNome}
        onValidar={validarNome}
        onComecar={iniciarDesafio}
      />

      <ResultModal
        resultado={resultado}
        onSalvar={salvarNovoNome}
        onReiniciar={abrirJogo}
      />
    </>
  );
}
