import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/workspace.css'
import '@/components/IPhonePreview.css'
import { isIPhonePreview } from '@/lib/iphonePreview'
if (isIPhonePreview()) document.documentElement.classList.add('cs-preview-preview-app')

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
