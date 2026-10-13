import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates the PNG app icons from public/favicon.svg: npm run generate-icons
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#111214' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#111214' } },
  },
  images: ['public/favicon.svg'],
})
