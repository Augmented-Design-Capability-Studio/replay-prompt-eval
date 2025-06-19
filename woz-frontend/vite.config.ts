import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/woz/', // Set the base URL for assets
  plugins: [react()],
})
