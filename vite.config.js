import basicSsl from '@vitejs/plugin-basic-ssl'

// HTTPS é obrigatório para a câmera funcionar no celular (fora de localhost).
export default {
  plugins: [basicSsl()],
  server: { host: true }
}
