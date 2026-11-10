import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
const DeviceCheck=React.lazy(()=>import('./components/DeviceCheck'));
import './styles.css';

class RootErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error:unknown){console.error('Application error boundary:',error);}
 render(){if(this.state.failed)return <main style={{padding:'3rem',fontFamily:'sans-serif',background:'#0b1728',color:'#eaf3fc',minHeight:'100vh'}}><h1>Oman Earth Intelligence</h1><p>Something went wrong while rendering the application. Reload the page or check your connection. / حدث خطأ في عرض التطبيق. حدّث الصفحة.</p><button onClick={()=>location.reload()} style={{padding:'1rem',borderRadius:12}}>Reload / تحديث</button></main>;return this.props.children;}
}
const root=document.getElementById('root');if(root)createRoot(root).render(<React.StrictMode><RootErrorBoundary>{new URLSearchParams(location.search).has('device-check')?<React.Suspense fallback={<p>Loading device check…</p>}><DeviceCheck/></React.Suspense>:<App/>}</RootErrorBoundary></React.StrictMode>);
