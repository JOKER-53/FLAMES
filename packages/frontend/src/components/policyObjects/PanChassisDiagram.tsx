import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export type PanPortZone = "Trust" | "Untrust" | "DMZ" | "HA" | "Management" | "unassigned";
export interface PanPortAssignment { id: string; zone: PanPortZone; label: string; }
interface Props { ports: PanPortAssignment[]; onChange: (portId: string, zone: PanPortZone) => void; fullHeight?: boolean; referenceMode?: boolean; }

const COLORS: Record<PanPortZone, string> = { Untrust:"#ef4444", Trust:"#22c55e", DMZ:"#f97316", HA:"#3b82f6", Management:"#a855f7", unassigned:"#64748b" };
const INFO: Record<string, {title:string;body:string}> = {
  chassis:{title:"PA-220 — Desktop NGFW",body:"A compact fanless next-generation firewall with dedicated management, console, HA, and eight data interfaces."},
  management:{title:"MGT — Management",body:"Dedicated out-of-band management interface. Keep administrative access isolated from production data-plane traffic."},
  console:{title:"CONSOLE — Serial Management",body:"Local serial recovery and initial configuration interface when network management is unavailable."},
  usb:{title:"USB — Bootstrap & Support",body:"Used for bootstrap configuration and approved support or recovery workflows."},
  data:{title:"Ethernet 1/1–1/8 — Data Plane",body:"Eight Layer 3 capable copper interfaces. Security policy applies after an interface is assigned to a zone."},
  ha:{title:"HA1 / HA2 — High Availability",body:"Control and data synchronization links between firewall peers. Keep these separate from normal traffic zones."},
};

export function PanChassisDiagram({ports,onChange,fullHeight,referenceMode=false}:Props){
  const mountRef=useRef<HTMLDivElement>(null), cameraRef=useRef<THREE.PerspectiveCamera|null>(null), controlsRef=useRef<OrbitControls|null>(null);
  const materials=useRef<Record<string,THREE.MeshStandardMaterial>>({});
  const [zone,setZone]=useState<PanPortZone|null>(null), [selected,setSelected]=useState(INFO.chassis);
  const zoneRef=useRef<PanPortZone|null>(null), changeRef=useRef(onChange);
  useEffect(()=>{zoneRef.current=zone},[zone]);
  useEffect(()=>{changeRef.current=onChange},[onChange]);

  useEffect(()=>{
    const mount=mountRef.current;if(!mount)return;
    const w=mount.clientWidth||800,h=mount.clientHeight||420;
    const scene=new THREE.Scene();scene.background=new THREE.Color("#0b111b");scene.fog=new THREE.Fog("#0b111b",13,24);
    const camera=new THREE.PerspectiveCamera(38,w/h,.1,100);camera.position.set(4.8,2.5,6.3);cameraRef.current=camera;
    const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(w,h);renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;mount.appendChild(renderer.domElement);
    const controls=new OrbitControls(camera,renderer.domElement);controlsRef.current=controls;controls.enableDamping=true;controls.enablePan=false;controls.minDistance=6;controls.maxDistance=18;controls.autoRotate=referenceMode;controls.autoRotateSpeed=.65;
    renderer.domElement.addEventListener("pointerdown",()=>{controls.autoRotate=false},{once:true});
    scene.add(new THREE.HemisphereLight(0xc8dcf0,0x101827,1.3));const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(5,8,8);scene.add(key);const rim=new THREE.DirectionalLight(0x4f9cff,1.1);rim.position.set(-7,3,-5);scene.add(rim);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(28,20),new THREE.MeshStandardMaterial({color:0x101925,roughness:.9}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.25;scene.add(floor);
    const group=new THREE.Group();group.rotation.x=-.04;scene.add(group);
    const body=new THREE.Mesh(new THREE.BoxGeometry(7.4,1.65,4.5),new THREE.MeshStandardMaterial({color:0x34495c,roughness:.58,metalness:.5}));body.userData.part="chassis";group.add(body);
    const top=new THREE.Mesh(new THREE.BoxGeometry(7.08,.05,4.12),new THREE.MeshStandardMaterial({color:0x4b6073,roughness:.42,metalness:.65}));top.position.y=.84;group.add(top);
    const front=new THREE.Mesh(new THREE.BoxGeometry(7.18,1.35,.12),new THREE.MeshStandardMaterial({color:0x263b4d,roughness:.62,metalness:.42}));front.position.set(0,-.03,2.25);group.add(front);
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(7.2,.075,.08),new THREE.MeshBasicMaterial({color:0xfa4616}));stripe.position.set(0,.68,2.33);group.add(stripe);
    const label=(text:string,color:string,size:number,scale:number,x:number,y=.27)=>{const c=document.createElement("canvas");c.width=768;c.height=128;const ctx=c.getContext("2d")!;ctx.font=`600 ${size}px Arial`;ctx.fillStyle=color;ctx.fillText(text,18,82);const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.scale.set(scale,.5,1);s.position.set(x,y,2.59);group.add(s)};
    label("paloalto networks","#eef5fa",46,2.2,2.32,.28);label("PA-220","#fa6b32",58,1.1,3.02,-.03);
    const clickable:THREE.Object3D[]=[body];
    const addPort=(id:string,x:number,y:number,part:string,width=.43)=>{const bezel=new THREE.Mesh(new THREE.BoxGeometry(width+.1,.48,.18),new THREE.MeshStandardMaterial({color:0x101820,roughness:.9,metalness:.25}));bezel.position.set(x,y,2.35);group.add(bezel);const mat=new THREE.MeshStandardMaterial({color:0x0b1015,emissive:0x000000,roughness:.72,metalness:.28});const socket=new THREE.Mesh(new THREE.BoxGeometry(width,.34,.2),mat);socket.position.set(x,y,2.47);socket.userData={id,part};group.add(socket);clickable.push(socket);materials.current[id]=mat;const recess=new THREE.Mesh(new THREE.BoxGeometry(width*.7,.18,.025),new THREE.MeshBasicMaterial({color:0x020304}));recess.position.set(x,y+.045,2.585);group.add(recess);for(let pin=-3;pin<=3;pin++){const p=new THREE.Mesh(new THREE.BoxGeometry(.025,.075,.012),new THREE.MeshBasicMaterial({color:0xd2ad55}));p.position.set(x+pin*width*.085,y-.09,2.602);group.add(p)}};
    // Accurate PA-220-style front layout: eight data ports in two banks, then management and console/USB.
    const xs=[-2.05,-1.5,-.95,-.4];
    xs.forEach((x,i)=>{addPort(`ethernet1/${i+1}`,x,.16,"data",.39);label(String(i+1),"#c9d5df",42,.22,x,.48)});
    xs.forEach((x,i)=>{addPort(`ethernet1/${i+5}`,x,-.4,"data",.39);label(String(i+5),"#c9d5df",42,.22,x,-.72)});
    addPort("management",.35,.16,"management",.48);label("MGT","#dbe5ec",34,.48,.35,.49);
    addPort("console",.35,-.4,"console",.38);label("CONSOLE","#dbe5ec",27,.72,.35,-.72);
    addPort("usb",1.03,-.4,"usb",.42);label("USB","#dbe5ec",32,.38,1.03,-.72);
    // Five labeled status LEDs.
    ["HA","STAT","ALM","TEMP","PWR"].forEach((name,i)=>{const y=.43-i*.2;const led=new THREE.Mesh(new THREE.CircleGeometry(.045,16),new THREE.MeshBasicMaterial({color:i===1||i===4?0x54e58b:0x607080}));led.position.set(1.36,y,2.59);led.userData.part="ha";group.add(led);clickable.push(led);label(name,"#cbd8e2",25,.42,1.68,y-.04)});
    // Honeycomb ventilation, faceplate screws, and top cooling slots.
    for(const side of[-1,1])for(let row=0;row<4;row++)for(let col=0;col<4;col++){const hole=new THREE.Mesh(new THREE.CircleGeometry(.045,6),new THREE.MeshBasicMaterial({color:0x0b141c}));hole.position.set(side*(2.62+col*.16),-.43+row*.18,2.585);group.add(hole)}
    [[-3.46,.55],[3.46,.55],[-3.46,-.58],[3.46,-.58]].forEach(([x,y])=>{const screw=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.018,16),new THREE.MeshStandardMaterial({color:0x93a4b1,metalness:.9,roughness:.2}));screw.rotation.x=Math.PI/2;screw.position.set(x,y,2.59);group.add(screw)});
    for(let x=-2.8;x<=2.8;x+=.22){const slot=new THREE.Mesh(new THREE.BoxGeometry(.12,.012,1.25),new THREE.MeshBasicMaterial({color:0x172633}));slot.position.set(x,.88,-.45);group.add(slot)}
    const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();const point=(e:MouseEvent)=>{const r=renderer.domElement.getBoundingClientRect();mouse.x=((e.clientX-r.left)/r.width)*2-1;mouse.y=-((e.clientY-r.top)/r.height)*2+1;ray.setFromCamera(mouse,camera)};
    const click=(e:MouseEvent)=>{point(e);const hit=ray.intersectObjects(clickable)[0]?.object;if(!hit)return;setSelected(INFO[hit.userData.part]??INFO.chassis);const id=hit.userData.id as string|undefined;if(!referenceMode&&id&&zoneRef.current)changeRef.current(id,zoneRef.current)};
    const hover=(e:MouseEvent)=>{point(e);renderer.domElement.style.cursor=ray.intersectObjects(clickable).length?"pointer":"grab"};renderer.domElement.addEventListener("click",click);renderer.domElement.addEventListener("mousemove",hover);
    let frame=0;const animate=()=>{frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)};animate();const resize=()=>{const nw=mount.clientWidth,nh=mount.clientHeight;camera.aspect=nw/nh;camera.updateProjectionMatrix();renderer.setSize(nw,nh)};window.addEventListener("resize",resize);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener("resize",resize);renderer.domElement.removeEventListener("click",click);renderer.domElement.removeEventListener("mousemove",hover);controls.dispose();renderer.dispose();materials.current={};if(mount.contains(renderer.domElement))mount.removeChild(renderer.domElement)};
  },[referenceMode]);

  useEffect(()=>{for(const p of ports){const m=materials.current[p.id];if(!m)continue;const c=new THREE.Color(COLORS[p.zone]);m.emissive.copy(c);m.emissiveIntensity=p.zone==="unassigned"?.1:1.15;m.color.set(p.zone==="unassigned"?"#15191e":c.clone().multiplyScalar(.38))}},[ports]);
  const zoom=(factor:number)=>cameraRef.current?.position.multiplyScalar(factor);const reset=()=>{cameraRef.current?.position.set(4.8,2.5,6.3);controlsRef.current?.target.set(0,0,0);controlsRef.current?.update()};
  return <div style={{display:"flex",flexDirection:"column",height:fullHeight?"100%":500,minHeight:420,gap:8}}>
    <div style={{position:"relative",flex:1,minHeight:300,borderRadius:8,overflow:"hidden",border:"1px solid #1e2d45",background:"#0b111b"}}><div ref={mountRef} style={{width:"100%",height:"100%"}}/><div style={{position:"absolute",top:10,left:12,color:"#607089",fontSize:11,pointerEvents:"none"}}>drag · scroll to zoom · click ports to learn</div><div style={{position:"absolute",right:12,bottom:12,display:"flex",flexDirection:"column",gap:4}}>{[{l:"+",f:()=>zoom(.84)},{l:"−",f:()=>zoom(1.18)},{l:"⟳",f:reset}].map(x=><button key={x.l} onClick={x.f} style={{width:32,height:32,borderRadius:6,border:"1px solid #334155",background:"#0b111bdd",color:"#cbd5e1",cursor:"pointer",fontSize:16}}>{x.l}</button>)}</div></div>
    {!referenceMode&&<div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}><span style={{fontSize:11,color:"#64748b",marginRight:3}}>Assign zone, then click a port:</span>{(["Trust","Untrust","DMZ","HA","unassigned"] as PanPortZone[]).map(z=><button key={z} onClick={()=>setZone(z)} style={{padding:"4px 9px",fontSize:11,borderRadius:14,cursor:"pointer",border:`1px solid ${zone===z?COLORS[z]:"#cbd5e1"}`,background:zone===z?COLORS[z]+"20":"#fff",color:zone===z?COLORS[z]:"#64748b"}}>{z}</button>)}</div>}
    <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:7,padding:"10px 13px",minHeight:62}}><div style={{fontSize:13,fontWeight:650,color:"#1e293b",marginBottom:3}}>{selected.title}</div><div style={{fontSize:12,color:"#64748b",lineHeight:1.5}}>{selected.body}</div></div>
  </div>;
}
