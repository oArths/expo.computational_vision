import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'

// HTTPS é obrigatório para a câmera funcionar no celular (fora de localhost).
export default {
  plugins: [basicSsl(), tailwindcss()],
  server: { host: true }
}
