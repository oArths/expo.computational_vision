import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import levels from './levels.json'

// Estado da tela: some ao recarregar.
export const useUi = create(() => ({
  tela: 'home',
  hud: {
    nivel: 1,
    total: levels.length,
    dificuldade: levels[0].difficulty,
    movimentos: 0,
    segundos: 0
  },
  ranking: { linhas: [], status: '' },
  erroInicio: '',
  conferindoNome: false,
  startAberto: false,
  pausado: false,
  resultado: null,
  statusCamera: 'Iniciando câmera...',
  zona: null,
  rastreado: false,
  segurando: false
}))

// Partida em andamento: sobrevive ao reload via localStorage.
export const corridaVazia = {
  iniciado: false,
  nivel: 0,
  row: 0,
  col: 0,
  movimentos: 0,
  decorridoMs: 0,
  salvoEm: 0,
  nickname: ''
}

export const useCorrida = create(
  persist(() => ({ ...corridaVazia }), { name: 'expo-golf-corrida' })
)
