import {Component} from 'react';
import type {ReactNode} from 'react';
import {t} from '../i18n.ts';
// Isolate rendering failures so the editor and unsaved draft stay mounted.
export class PreviewBoundary extends Component<{children:ReactNode;resetKey:string},{error:string|null}>{
 state:{error:string|null}={error:null};
 static getDerivedStateFromError(error:unknown){return {error:error instanceof Error?error.message:'Preview belum dapat ditampilkan.'};}
 componentDidUpdate(previous:Readonly<{children:ReactNode;resetKey:string}>){if(previous.resetKey!==this.props.resetKey&&this.state.error)this.setState({error:null});}
 render(){return this.state.error?<section className="preview-recovery" role="alert"><strong>{t('Preview belum dapat ditampilkan.')}</strong><p>{t('Editor tetap terbuka. Pilih halaman lain atau coba lagi.')}</p><button className="button outline small" onClick={()=>this.setState({error:null})}>{t('Coba lagi')}</button><details><summary>{t('Detail error')}</summary><pre>{this.state.error.slice(0,800)}</pre></details></section>:this.props.children;}
}
