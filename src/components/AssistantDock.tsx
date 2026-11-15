import {lazy, Suspense, useEffect, useRef, useState, type ComponentProps} from 'react';
import {MessageCircle, X} from 'lucide-react';
import './AssistantDock.css';

const ScientificAssistant = lazy(() => import('./ScientificAssistant'));

type Props = ComponentProps<typeof ScientificAssistant> & {enabled: boolean; home: boolean};

export default function AssistantDock({enabled, home, ...props}: Props) {
 const [open, setOpen] = useState(false);
 const trigger = useRef<HTMLButtonElement>(null);
 const panel = useRef<HTMLElement>(null);
 const ar = props.lang === 'ar';
 const title = ar ? 'اسأل الذكاء الاصطناعي' : 'Ask AI';

 useEffect(() => { if (!enabled) setOpen(false); }, [enabled]);
 useEffect(() => { if (open) panel.current?.focus(); }, [open]);

 const close = () => {
  setOpen(false);
  trigger.current?.focus();
 };

 if (!enabled) return null;
 return <div className={`ask-ai-dock ${home ? 'ask-ai-home' : ''}`}>
  <button ref={trigger} type="button" className="ask-ai-trigger" aria-expanded={open}
   aria-controls={open ? 'ask-ai-panel' : undefined} onClick={() => open ? close() : setOpen(true)}>
   <MessageCircle size={20}/>{title}
  </button>
  {open && <aside ref={panel} id="ask-ai-panel" className="ask-ai-panel" aria-label={title} tabIndex={-1}
   onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
   <header className="ask-ai-bar"><strong><MessageCircle size={18}/>{title}</strong>
    <button type="button" onClick={close} aria-label={ar ? 'إغلاق المساعد' : 'Close Ask AI'}><X size={20}/></button>
   </header>
   <Suspense fallback={<p role="status">{ar ? 'جار فتح المساعد…' : 'Opening assistant…'}</p>}>
    <ScientificAssistant {...props} compact onAnalysis={(plan,study)=>{close();props.onAnalysis(plan,study);}} onChart={(plan,study)=>{close();props.onChart(plan,study);}} onVerify={plan=>{close();props.onVerify(plan);}}/>
   </Suspense>
  </aside>}
 </div>;
}
