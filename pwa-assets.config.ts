import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates the PNG app icons from public/favicon.svg: npm run generate-icons. Padding around the
// icon (maskable and Apple) takes the icon's amber, so it reads as one square.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#E8B04B' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#E8B04B' } },
  },
  images: ['public/favicon.svg'],
})
