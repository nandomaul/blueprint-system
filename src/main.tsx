import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles/app.css';
const element=document.getElementById('root');if(!element)throw new Error('Root tidak ditemukan.');
createRoot(element).render(<App/>);
