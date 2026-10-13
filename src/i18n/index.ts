import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import el from './el'

void i18n.use(initReactI18next).init({
  resources: { el: { translation: el } },
  lng: 'el',
  fallbackLng: 'el',
  interpolation: { escapeValue: false }, // React already escapes
})

export default i18n
