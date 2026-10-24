import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// HTTPS é obrigatório para a câmera funcionar no celular (fora de localhost).
export default {
  plugins: [react(), basicSsl(), tailwindcss()],
  server: { host: true }
}
