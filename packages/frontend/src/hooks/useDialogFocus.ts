import {useEffect,type RefObject} from "react";
export function useDialogFocus(open:boolean,ref:RefObject<HTMLElement>,close:()=>void){
 useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null;const root=ref.current;if(!root)return;const blocked=[...document.querySelectorAll<HTMLElement>('[data-course-content]')];const old=blocked.map(node=>node.hasAttribute('inert'));blocked.forEach(node=>node.setAttribute('inert',''));const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
 const nodes=()=>[...root.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(node=>node.getClientRects().length>0);
 (nodes()[0]??root).focus();const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){const list=nodes();const first=list[0],last=list[list.length-1];if(!first){event.preventDefault();root.focus();}else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};root.addEventListener('keydown',key);
 return()=>{root.removeEventListener('keydown',key);blocked.forEach((node,index)=>{if(!old[index])node.removeAttribute('inert');});document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
 },[open,ref,close]);
}
