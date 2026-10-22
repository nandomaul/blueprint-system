import { createRoot } from 'react-dom/client';
import {restoreDeepLink} from './services/browserNavigation.ts';
import {SampleDemo} from './components/SampleDemo.tsx';
import { App } from './App.tsx';
import './styles/app.css';
import './styles/workspace.css';
import './styles/clean.css';
import './styles/management.css';
import './styles/designWorkspace.css';
import './styles/team.css';
restoreDeepLink();
const element=document.getElementById('root');if(!element)throw new Error('Root tidak ditemukan.');
createRoot(element).render(new URLSearchParams(window.location.search).get('demo')==='personnel'?<SampleDemo/>:<App/>);

import "./styles/editorInteractions.css";

import './styles/assistantDemo.css';
