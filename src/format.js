export function formatarPontos(valor) {
  return valor.toLocaleString('pt-BR')
}

export function formatarData(iso) {
  return iso.slice(0, 10).split('-').reverse().join('/')
}
