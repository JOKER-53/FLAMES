/** No rendering while hidden/offscreen; on-demand while idle, at most 30 fps while animating. */
export function renderScheduler(mount:HTMLElement,render:()=>void,continuous:()=>boolean){
 let frame=0,visible=true,disposed=false,last=-Infinity;const queue=()=>{if(!frame&&!disposed&&visible&&!document.hidden)frame=requestAnimationFrame(tick);};
 const tick=(now:number)=>{frame=0;if(disposed||!visible||document.hidden)return;if(now-last<1000/30){queue();return;}last=now;render();if(continuous())queue();};
 const observer=typeof IntersectionObserver!=="undefined"?new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);if(visible)queue();else{cancelAnimationFrame(frame);frame=0;}}):null;observer?.observe(mount);
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else queue();};document.addEventListener("visibilitychange",visibility);
 const events=['pointerdown','pointermove','pointerup','wheel','touchmove','keydown'] as const;events.forEach(event=>mount.addEventListener(event,queue,{passive:true}));queue();
 return{invalidate:queue,dispose:()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();document.removeEventListener('visibilitychange',visibility);events.forEach(event=>mount.removeEventListener(event,queue));}};
}
