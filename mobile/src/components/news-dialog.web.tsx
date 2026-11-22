import {useEffect,useRef,type ReactNode} from 'react';
import {colors,radii,spacing} from '@/ui/tokens';

export function NewsDialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    const element = dialog.current;
    if (!element) return;
    const opener = document.activeElement;
    element.showModal();
    close.current?.focus();
    return ()=>{
      element.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  },[]);
  return <>
    <style>{'.banu-news-dialog::backdrop{background:rgba(12,22,48,.68)}.banu-news-dialog button:focus-visible{outline:2px solid currentColor;outline-offset:3px}'}</style>
    <dialog ref={dialog} className="banu-news-dialog" aria-label={title} data-testid="news-dialog"
      onCancel={event=>{event.preventDefault();onClose();}}
      style={{width:'min(45rem, calc(100% - 24px))',maxHeight:'min(52rem, calc(100dvh - 32px))',
        boxSizing:'border-box',border:0,borderRadius:radii.lg,padding:0,overflow:'auto',
        overscrollBehavior:'contain',background:colors.surface,color:colors.banuNavy}}>
      <div style={{position:'sticky',top:0,zIndex:1,display:'flex',justifyContent:'flex-end',padding:spacing.sm,
        borderBottom:'1px solid '+colors.banuBorder,background:colors.surface}}>
        <button ref={close} onClick={onClose} type="button" style={{minHeight:44,font:'inherit',fontWeight:700,
          color:colors.banuMagentaStrong,border:'1px solid '+colors.banuBorder,borderRadius:radii.sm,
          background:colors.banuSoft,padding:'0 12px',cursor:'pointer'}}>Cerrar publicación</button>
      </div>
      {children}
    </dialog>
  </>;
}
