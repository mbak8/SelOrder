import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Pozwala na dostęp ze wszystkich kart sieciowych i adresów IP
    proxy: {
      // Wszystkie żądania do /api będą przechwytywane przez Vite
      '/api': {
        target: 'http://localhost:5000', // Adres serwera C#. Jeśli C# działa na tym samym komputerze, zostaw localhost.
        changeOrigin: true,
        secure: false,
      }
    }
  }
})