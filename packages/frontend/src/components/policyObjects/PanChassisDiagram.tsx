// ============================================================================
// PA-220 cable/zone diagram built on pa-220-firewall.glb. Socket positions come
// from the model's named housings, so cables always land in the real sockets.
// The parent's `ports` array is the only state: cables are redrawn from it.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { buildSocketCable, disposeObject, labelSprite, measureSockets, type MeasuredSocket } from "../../hardware/cableMesh";
import { PAN_SOCKETS } from "../../hardware/panCables";

export type PanPortZone = "Trust" | "Untrust" | "DMZ" | "HA" | "Management" | "unassigned";
export interface PanPortAssignment { id: string; zone: PanPortZone; label: string; locked?: boolean; }
interface Props { ports: PanPortAssignment[]; onChange: (portId: string, zone: PanPortZone) => void; fullHeight?: boolean; referenceMode?: boolean; }

export const PAN_ZONE_COLORS: Record<PanPortZone, string> = { Untrust:"#ef4444", Trust:"#22c55e", DMZ:"#f97316", HA:"#3b82f6", Management:"#a855f7", unassigned:"#64748b" };
const ASSIGNABLE_ZONES: PanPortZone[] = ["Trust", "Untrust", "DMZ", "HA", "unassigned"];

// Network-facing sockets only; power inputs live on the rear and belong to the hardware reference.
const SOCKETS = Object.fromEntries(PAN_SOCKETS.filter(x => x.part !== "power").map(x => [x.id, x]));

const INFO: Record<string, {title:string;body:string}> = {
  chassis:{title:"PA-220 — Desktop NGFW",body:"A compact fanless next-generation firewall with dedicated management, console, and eight data interfaces."},
  management:{title:"MGT — Management",body:"Dedicated out-of-band management interface. It never joins a security zone, which keeps administrative access separate from production traffic."},
  console:{title:"CONSOLE — Serial Management",body:"RJ-45 and micro-USB serial console for local recovery and initial setup. Console ports carry no network traffic and cannot join a zone."},
  usb:{title:"USB — Bootstrap & Support",body:"Used for bootstrap configuration and approved support or recovery workflows. Not a network interface."},
  data:{title:"Ethernet 1/1–1/8 — Data Plane",body:"Eight Layer 3 capable copper interfaces. Security policy applies after an interface is assigned to a zone; HA can also run over data ports on the PA-220."},
};

interface SceneState { group: THREE.Group; overlay: THREE.Group; sockets: Record<string, MeasuredSocket>; targets: Record<string, THREE.Mesh>; }

INFO["micro-usb"]=INFO.console;

export function PanChassisDiagram({ports,onChange,fullHeight,referenceMode=false}:Props){
  const mountRef=useRef<HTMLDivElement>(null), cameraRef=useRef<THREE.PerspectiveCamera|null>(null), controlsRef=useRef<OrbitControls|null>(null);
  const sceneRef=useRef<SceneState|null>(null), homeRef=useRef(new THREE.Vector3(0,1.6,9));
  const [zone,setZone]=useState<PanPortZone|null>(null), [selected,setSelected]=useState(INFO.chassis);
  const [ready,setReady]=useState(false), [loadErr,setLoadErr]=useState<string|null>(null);
  const [feedback,setFeedback]=useState<{msg:string;ok:boolean}|null>(null);
  const zoneRef=useRef<PanPortZone|null>(null), changeRef=useRef(onChange), portsRef=useRef(ports);
  const feedbackTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{zoneRef.current=zone},[zone]);
  useEffect(()=>{changeRef.current=onChange},[onChange]);
  useEffect(()=>{portsRef.current=ports},[ports]);
  useEffect(()=>()=>{if(feedbackTimer.current)clearTimeout(feedbackTimer.current)},[]);

  function showFeedback(msg:string,ok:boolean){
    setFeedback({msg,ok});
    if(feedbackTimer.current)clearTimeout(feedbackTimer.current);
    feedbackTimer.current=setTimeout(()=>setFeedback(null),2500);
  }

  function clickPort(id:string){
    const meta=SOCKETS[id];
    setSelected(INFO[meta.part]??INFO.chassis);
    if(referenceMode)return;
    const port=portsRef.current.find(p=>p.id===id);
    if(!port){ if(zoneRef.current) showFeedback(`${meta.label} is not a network interface and cannot join a zone.`,false); return; }
    if(port.locked){ showFeedback(`${port.label} is a dedicated ${port.zone} port.`,false); return; }
    const next=zoneRef.current ?? (port.zone!=="unassigned" ? "unassigned" : null);
    if(!next){ showFeedback("Select a zone first.",false); return; }
    changeRef.current(id,next);
    showFeedback(next==="unassigned" ? `Unplugged ${port.label}.` : `✓ ${next} cable → ${port.label}`,true);
  }
  const clickRef=useRef(clickPort); clickRef.current=clickPort;

  useEffect(()=>{
    const mount=mountRef.current;if(!mount)return;
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{setLoadErr("3D rendering is unavailable. Use the zone list instead.");return;}
    const w=mount.clientWidth||800,h=mount.clientHeight||420;
    const scene=new THREE.Scene();scene.background=new THREE.Color("#0b111b");
    const camera=new THREE.PerspectiveCamera(32,w/h,.05,200);cameraRef.current=camera;
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(w,h);renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;mount.appendChild(renderer.domElement);
    const controls=new OrbitControls(camera,renderer.domElement);controlsRef.current=controls;controls.enableDamping=true;controls.enablePan=false;controls.minAzimuthAngle=-.9;controls.maxAzimuthAngle=.9;controls.minPolarAngle=.6;controls.maxPolarAngle=1.6;controls.autoRotate=referenceMode;controls.autoRotateSpeed=.42;
    renderer.domElement.addEventListener("pointerdown",()=>{controls.autoRotate=false},{once:true});
    scene.add(new THREE.HemisphereLight(0xc8dcf0,0x101827,1.3));const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(5,8,8);scene.add(key);const rim=new THREE.DirectionalLight(0x4f9cff,1.1);rim.position.set(-7,3,-5);scene.add(rim);
    const group=new THREE.Group();scene.add(group);
    let disposed=false;

    new GLTFLoader().load("/pa-220-firewall.glb",gltf=>{
      if(disposed){disposeObject(gltf.scene);return;}
      const model=gltf.scene;
      const raw=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
      model.scale.setScalar(8/Math.max(raw.x,raw.y,raw.z));model.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(model);model.position.sub(box.getCenter(new THREE.Vector3()));
      group.add(model);group.updateMatrixWorld(true);
      const size=box.getSize(new THREE.Vector3());

      const sockets=measureSockets(model,group,Object.values(SOCKETS)),targets:Record<string,THREE.Mesh>={};
      for(const [id,socket] of Object.entries(sockets)){
        // A thin hit plate flush with the opening; deeper boxes overlap the neighbouring row when viewed from above.
        const target=new THREE.Mesh(new THREE.BoxGeometry(socket.width,socket.height,socket.width*.05),new THREE.MeshBasicMaterial({visible:false}));
        target.position.copy(socket.center);target.userData.portId=id;group.add(target);targets[id]=target;
      }
      const overlay=new THREE.Group();group.add(overlay);
      sceneRef.current={group,overlay,sockets,targets};

      // Frame the front panel from slightly above.
      const fov=camera.fov*Math.PI/180,dist=(size.x/2)*1.12/(Math.tan(fov/2)*camera.aspect)+size.z/2;
      homeRef.current.set(0,dist*.32,dist);camera.position.copy(homeRef.current);
      controls.target.set(0,-size.y*.15,size.z*.15);controls.minDistance=dist*.35;controls.maxDistance=dist*1.8;controls.update();
      setReady(true);
    },undefined,()=>{if(!disposed)setLoadErr("Could not load the PA-220 model. Use the zone list instead.");});

    const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
    const pick=(e:PointerEvent)=>{const s=sceneRef.current;if(!s)return null;const r=renderer.domElement.getBoundingClientRect();mouse.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(mouse,camera);return (ray.intersectObjects(Object.values(s.targets))[0]?.object.userData.portId as string)??null};
    let down:{x:number;y:number}|null=null;
    const onDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY}};
    const onUp=(e:PointerEvent)=>{if(!down)return;const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(moved>5)return;const id=pick(e);if(id)clickRef.current(id);else setSelected(INFO.chassis)};
    const onHover=(e:PointerEvent)=>{renderer.domElement.style.cursor=pick(e)?"pointer":"grab"};
    renderer.domElement.addEventListener("pointerdown",onDown);renderer.domElement.addEventListener("pointerup",onUp);renderer.domElement.addEventListener("pointermove",onHover);

    let frame=0;
    const animate=()=>{
      frame=requestAnimationFrame(animate);controls.update();
      const s=sceneRef.current,z=zoneRef.current;
      if(s){const pulse=.65+Math.sin(Date.now()*.006)*.35;s.overlay.children.forEach(child=>{if(!child.userData.dot)return;const m=(child as THREE.Mesh).material as THREE.MeshBasicMaterial;const active=z&&z!=="unassigned";m.color.set(active?PAN_ZONE_COLORS[z]:"#94a3b8");m.opacity=active?pulse:.7})}
      renderer.render(scene,camera);
    };
    animate();
    const resize=new ResizeObserver(()=>{const nw=mount.clientWidth,nh=mount.clientHeight;if(!nw||!nh)return;camera.aspect=nw/nh;camera.updateProjectionMatrix();renderer.setSize(nw,nh)});resize.observe(mount);
    return()=>{disposed=true;cancelAnimationFrame(frame);resize.disconnect();renderer.domElement.removeEventListener("pointerdown",onDown);renderer.domElement.removeEventListener("pointerup",onUp);renderer.domElement.removeEventListener("pointermove",onHover);controls.dispose();disposeObject(group);sceneRef.current=null;renderer.dispose();if(mount.contains(renderer.domElement))mount.removeChild(renderer.domElement)};
  },[referenceMode]);

  // Redraw labels, empty-socket markers, and cables from the parent's assignments.
  useEffect(()=>{
    const s=sceneRef.current;if(!s||!ready)return;
    for(const child of [...s.overlay.children]){s.overlay.remove(child);disposeObject(child)}
    for(const port of ports){
      const socket=s.sockets[port.id];if(!socket)continue;
      const upper=SOCKETS[port.id].upper;
      const label=labelSprite(SOCKETS[port.id].short,socket.width*1.05,"rgba(11,17,27,0.85)");
      label.position.set(socket.center.x,socket.center.y+socket.height*(upper?.95:-.95),socket.center.z+socket.width*.3);
      s.overlay.add(label);
      if(port.zone!=="unassigned"){s.overlay.add(buildSocketCable(socket,PAN_ZONE_COLORS[port.zone],"rj45",[...port.id].reduce((n,c)=>n+c.charCodeAt(0),0),upper?"up":"down"));continue}
      if(referenceMode||port.locked)continue;
      const dot=new THREE.Mesh(new THREE.SphereGeometry(socket.width*.22,16,16),new THREE.MeshBasicMaterial({color:"#94a3b8",transparent:true,opacity:.8}));
      dot.position.copy(socket.center);dot.position.z+=socket.width*.15;dot.userData.dot=true;s.overlay.add(dot);
    }
  },[ports,ready,referenceMode]);

  const zoom=(factor:number)=>{const c=cameraRef.current,t=controlsRef.current;if(!c||!t)return;c.position.sub(t.target).multiplyScalar(factor).add(t.target);t.update()};
  const reset=()=>{const c=cameraRef.current,t=controlsRef.current;if(!c||!t)return;c.position.copy(homeRef.current);t.autoRotate=referenceMode;t.update()};
  // The viewport has a fixed height so toasts and info text never resize the canvas mid-interaction.
  return <div style={{display:"flex",flexDirection:"column",height:fullHeight?"100%":undefined,gap:8}}>
    {!referenceMode&&<div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
      <span style={{fontSize:11,color:"rgb(var(--muted))",marginRight:3}}>1. Pick a zone cable → 2. click a socket:</span>
      {ASSIGNABLE_ZONES.map(z=><button key={z} aria-pressed={zone===z} onClick={()=>setZone(zone===z?null:z)} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",fontSize:11,borderRadius:14,cursor:"pointer",border:`1.5px solid ${zone===z?PAN_ZONE_COLORS[z]:"#cbd5e1"}`,background:zone===z?PAN_ZONE_COLORS[z]+"20":"#fff",color:zone===z?PAN_ZONE_COLORS[z]:"#475569",fontWeight:zone===z?600:400}}><span style={{width:8,height:8,borderRadius:"50%",background:PAN_ZONE_COLORS[z]}}/>{z==="unassigned"?"Unplug":z}</button>)}
    </div>}
    <div style={{position:"relative",flex:fullHeight?1:undefined,height:fullHeight?undefined:400,minHeight:300,borderRadius:8,overflow:"hidden",border:"1px solid #1e2d45",background:"#0b111b"}}>
      <div ref={mountRef} style={{width:"100%",height:"100%",touchAction:"none"}}/>
      {!ready&&!loadErr&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"rgb(var(--muted))",fontSize:12}}>Loading PA-220 model…</div>}
      {loadErr&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#f87171",fontSize:12,padding:20,textAlign:"center"}}>{loadErr}</div>}
      <div style={{position:"absolute",top:10,left:12,color:"#607089",fontSize:11,pointerEvents:"none"}}>{zone?(zone==="unassigned"?"click a cabled socket to unplug it":`click a socket to connect a ${zone} cable`):"drag · scroll to zoom · click a socket to learn or unplug"}</div>
      {feedback&&<div role="status" style={{position:"absolute",left:12,bottom:12,padding:"6px 12px",borderRadius:4,fontSize:12,fontWeight:500,background:feedback.ok?"#052e16ee":"#450a0aee",color:feedback.ok?"#4ade80":"#f87171",border:`1px solid ${feedback.ok?"#166534":"#991b1b"}`}}>{feedback.msg}</div>}
      <div style={{position:"absolute",right:12,bottom:12,display:"flex",flexDirection:"column",gap:4}}>{[{l:"+",t:"Zoom in",f:()=>zoom(.84)},{l:"−",t:"Zoom out",f:()=>zoom(1.18)},{l:"⟳",t:"Reset view",f:reset}].map(x=><button key={x.l} onClick={x.f} title={x.t} aria-label={x.t} style={{width:32,height:32,borderRadius:6,border:"1px solid #334155",background:"#0b111bdd",color:"#cbd5e1",cursor:"pointer",fontSize:16}}>{x.l}</button>)}</div>
    </div>
    <div style={{background:"rgb(var(--surface))",border:"1px solid rgb(var(--line-strong))",borderRadius:7,padding:"10px 13px",minHeight:78}}><div style={{fontSize:13,fontWeight:650,color:"rgb(var(--ink))",marginBottom:3}}>{selected.title}</div><div style={{fontSize:12,color:"rgb(var(--muted))",lineHeight:1.5}}>{selected.body}</div></div>
  </div>;
}
