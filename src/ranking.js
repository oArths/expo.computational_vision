import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabaseConfigurado = Boolean(url && key)
const supabase = supabaseConfigurado ? createClient(url, key) : null

// Menos gestos e menos tempo = score maior. Só é enviado ao completar os 10 níveis.
export function calcularScore(movimentos, segundos) {
  return Math.round(
    1_000_000 / (1 + (movimentos * Math.max(1, segundos)) / 20_000)
  )
}

export async function enviarResultado({ nickname, segundos, score }) {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('Users')
    .insert({ nickname, time: segundos, score })
    .select('id')
    .single()

  if (error) throw error
  return data
}

export async function nicknameEmUso(nickname) {
  if (!supabase) return false

  // % e _ são curingas no ilike; sem escapar, "a_b" barraria nomes alheios.
  const padrao = nickname.replace(/[\\%_]/g, '\\$&')

  const { data, error } = await supabase
    .from('Users')
    .select('id')
    .ilike('nickname', padrao)
    .limit(1)

  if (error) throw error

  return (data ?? []).length > 0
}

export async function listarRanking() {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('Users')
    .select('nickname, score, time, created_at')
    .order('score', { ascending: false })
    .order('time', { ascending: true })
    .limit(100)

  if (error) throw error
  return data ?? []
}

export async function buscarRanking({ score, segundos }) {
  if (!supabase) return { top: [], posicao: null }

  const top = (await listarRanking()).slice(0, 10)

  const { count } = await supabase
    .from('Users')
    .select('id', { count: 'exact', head: true })
    .or(`score.gt.${score},and(score.eq.${score},time.lt.${segundos})`)

  return { top, posicao: (count ?? 0) + 1 }
}
