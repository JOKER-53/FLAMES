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
    const camera=new THREE.PerspectiveCamera(34,w/h,.1,100);camera.position.set(2.7,2.15,7.7);cameraRef.current=camera;
    const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(w,h);renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;mount.appendChild(renderer.domElement);
    const controls=new OrbitControls(camera,renderer.domElement);controlsRef.current=controls;controls.enableDamping=true;controls.enablePan=false;controls.minDistance=6;controls.maxDistance=18;controls.minAzimuthAngle=-.72;controls.maxAzimuthAngle=.72;controls.minPolarAngle=.82;controls.maxPolarAngle=1.43;controls.autoRotate=referenceMode;controls.autoRotateSpeed=.42;
    renderer.domElement.addEventListener("pointerdown",()=>{controls.autoRotate=false},{once:true});
    scene.add(new THREE.HemisphereLight(0xc8dcf0,0x101827,1.3));const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(5,8,8);scene.add(key);const rim=new THREE.DirectionalLight(0x4f9cff,1.1);rim.position.set(-7,3,-5);scene.add(rim);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(28,20),new THREE.MeshStandardMaterial({color:0x111a25,roughness:.94,metalness:.05}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.25;scene.add(floor);
    const group=new THREE.Group();group.rotation.x=-.04;scene.add(group);
    const applianceBlue=0x397fa5, faceBlue=0x277398;
    const body=new THREE.Mesh(new THREE.BoxGeometry(7.8,1.72,4.65),new THREE.MeshStandardMaterial({color:applianceBlue,roughness:.48,metalness:.56}));body.userData.part="chassis";group.add(body);
    const top=new THREE.Mesh(new THREE.BoxGeometry(7.52,.055,4.3),new THREE.MeshStandardMaterial({color:0x5ba0c4,roughness:.38,metalness:.62}));top.position.y=.88;group.add(top);
    const front=new THREE.Mesh(new THREE.BoxGeometry(7.62,1.42,.12),new THREE.MeshStandardMaterial({color:faceBlue,roughness:.54,metalness:.48}));front.position.set(0,-.04,2.33);group.add(front);
    const lip=new THREE.Mesh(new THREE.BoxGeometry(7.72,.07,.13),new THREE.MeshStandardMaterial({color:0x163d53,metalness:.75,roughness:.3}));lip.position.set(0,.69,2.4);group.add(lip);
    // Faceplate markings are real planes, not camera-facing sprites, so they stay attached while rotating.
    const label=(text:string,color:string,size:number,scale:number,x:number,y=.27)=>{const c=document.createElement("canvas");c.width=768;c.height=128;const ctx=c.getContext("2d")!;ctx.clearRect(0,0,c.width,c.height);ctx.font=`600 ${size}px Arial`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle=color;ctx.fillText(text,c.width/2,c.height/2);const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();const plate=new THREE.Mesh(new THREE.PlaneGeometry(scale,.5),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.FrontSide}));plate.position.set(x,y,2.69);group.add(plate)};
    label("paloalto","#ffffff",54,1.75,2.63,.24);label("NETWORKS","#d6e7ef",25,.72,3.15,.02);label("PA-220","#ffffff",48,.92,2.95,-.26);
    const clickable:THREE.Object3D[]=[body];
    const addPort=(id:string,x:number,y:number,part:string,width=.43)=>{const bezel=new THREE.Mesh(new THREE.BoxGeometry(width+.1,.48,.18),new THREE.MeshStandardMaterial({color:0xd9dedd,roughness:.35,metalness:.7}));bezel.position.set(x,y,2.43);group.add(bezel);const mat=new THREE.MeshStandardMaterial({color:0x080b0d,emissive:0x000000,roughness:.76,metalness:.22});const socket=new THREE.Mesh(new THREE.BoxGeometry(width,.34,.21),mat);socket.position.set(x,y,2.54);socket.userData={id,part};group.add(socket);clickable.push(socket);materials.current[id]=mat;const recess=new THREE.Mesh(new THREE.BoxGeometry(width*.7,.17,.025),new THREE.MeshBasicMaterial({color:0x010203}));recess.position.set(x,y+.045,2.66);group.add(recess);for(let pin=-3;pin<=3;pin++){const p=new THREE.Mesh(new THREE.BoxGeometry(.025,.07,.012),new THREE.MeshBasicMaterial({color:0xd7b65c}));p.position.set(x+pin*width*.085,y-.09,2.677);group.add(p)}for(const side of[-1,1]){const led=new THREE.Mesh(new THREE.BoxGeometry(.055,.04,.018),new THREE.MeshBasicMaterial({color:0x7bea91}));led.position.set(x+side*width*.36,y+.19,2.67);group.add(led)}};
    // Accurate PA-220-style front layout: eight data ports in two banks, then management and console/USB.
    const bank=new THREE.Mesh(new THREE.BoxGeometry(2.34,1.14,.08),new THREE.MeshStandardMaterial({color:0xcbd2d2,metalness:.72,roughness:.3}));bank.position.set(-1.7,-.06,2.43);group.add(bank);
    const xs=[-2.48,-1.96,-1.44,-.92];
    xs.forEach((x,i)=>{addPort(`ethernet1/${i*2+1}`,x,.18,"data",.38);label(String(i*2+1),"#eff8fb",38,.2,x,.5)});
    xs.forEach((x,i)=>{addPort(`ethernet1/${i*2+2}`,x,-.35,"data",.38);label(String(i*2+2),"#eff8fb",38,.2,x,-.67)});
    const mgmtBank=new THREE.Mesh(new THREE.BoxGeometry(.68,1.14,.08),new THREE.MeshStandardMaterial({color:0xcbd2d2,metalness:.72,roughness:.3}));mgmtBank.position.set(-.38,-.06,2.43);group.add(mgmtBank);
    addPort("management",-.38,.18,"management",.48);label("MGT","#eff8fb",33,.42,-.38,.5);
    addPort("console",-.38,-.35,"console",.48);label("CONSOLE","#eff8fb",25,.62,-.38,-.67);
    // Separate micro-USB console and full-size USB 3 connector.
    const addUtility=(id:string,x:number,width:number,color:number,part:string)=>{const shell=new THREE.Mesh(new THREE.BoxGeometry(width,.27,.16),new THREE.MeshStandardMaterial({color:0x10232e,metalness:.7,roughness:.28}));shell.position.set(x,-.31,2.53);shell.userData={id,part};group.add(shell);clickable.push(shell);const insert=new THREE.Mesh(new THREE.BoxGeometry(width*.78,.13,.03),new THREE.MeshBasicMaterial({color}));insert.position.set(x,-.31,2.625);group.add(insert)};
    addUtility("micro-console",.35,.34,0x111111,"console");label("CONSOLE","#eff8fb",23,.6,.35,-.63);
    addUtility("usb",.98,.48,0x168bd2,"usb");label("USB","#eff8fb",28,.3,.98,-.63);
    // Five labeled status LEDs.
    ["HA","STAT","ALM","TEMP","PWR"].forEach((name,i)=>{const x=1.38+i*.31;const led=new THREE.Mesh(new THREE.CircleGeometry(.047,16),new THREE.MeshStandardMaterial({color:i===1||i===4?0x76e393:0x9a7766,emissive:i===1||i===4?0x1f8f48:0x26130d,emissiveIntensity:.9}));led.position.set(x,-.22,2.62);led.userData.part="ha";group.add(led);clickable.push(led);label(name,"#eff8fb",21,.29,x,-.5)});
    // Honeycomb ventilation, faceplate screws, and top cooling slots.
    for(const side of[-1,1])for(let row=0;row<6;row++)for(let col=0;col<5;col++){const hole=new THREE.Mesh(new THREE.CircleGeometry(.075,6),new THREE.MeshBasicMaterial({color:0x071820}));hole.position.set(side*(3.12+col*.145)+(row%2?side*.07:0),-.51+row*.19,2.62);group.add(hole)}
    [[-3.68,.56],[3.68,.56],[-3.68,-.62],[3.68,-.62]].forEach(([x,y])=>{const screw=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.018,16),new THREE.MeshStandardMaterial({color:0xa9bac5,metalness:.9,roughness:.2}));screw.rotation.x=Math.PI/2;screw.position.set(x,y,2.62);group.add(screw)});
    for(let row=0;row<3;row++)for(let x=-3.15;x<=3.15;x+=.22){const slot=new THREE.Mesh(new THREE.BoxGeometry(.13,.012,.08),new THREE.MeshBasicMaterial({color:0x1b5875}));slot.position.set(x,.915,-1.25+row*.24);group.add(slot)}
    const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();const point=(e:MouseEvent)=>{const r=renderer.domElement.getBoundingClientRect();mouse.x=((e.clientX-r.left)/r.width)*2-1;mouse.y=-((e.clientY-r.top)/r.height)*2+1;ray.setFromCamera(mouse,camera)};
    const click=(e:MouseEvent)=>{point(e);const hit=ray.intersectObjects(clickable)[0]?.object;if(!hit)return;setSelected(INFO[hit.userData.part]??INFO.chassis);const id=hit.userData.id as string|undefined;if(!referenceMode&&id&&zoneRef.current)changeRef.current(id,zoneRef.current)};
    const hover=(e:MouseEvent)=>{point(e);renderer.domElement.style.cursor=ray.intersectObjects(clickable).length?"pointer":"grab"};renderer.domElement.addEventListener("click",click);renderer.domElement.addEventListener("mousemove",hover);
    let frame=0;const animate=()=>{frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)};animate();const resize=()=>{const nw=mount.clientWidth,nh=mount.clientHeight;camera.aspect=nw/nh;camera.updateProjectionMatrix();renderer.setSize(nw,nh)};window.addEventListener("resize",resize);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener("resize",resize);renderer.domElement.removeEventListener("click",click);renderer.domElement.removeEventListener("mousemove",hover);controls.dispose();renderer.dispose();materials.current={};if(mount.contains(renderer.domElement))mount.removeChild(renderer.domElement)};
  },[referenceMode]);

  useEffect(()=>{for(const p of ports){const m=materials.current[p.id];if(!m)continue;const c=new THREE.Color(COLORS[p.zone]);m.emissive.copy(c);m.emissiveIntensity=p.zone==="unassigned"?.04:.28;m.color.set("#080b0d")}},[ports]);
  const zoom=(factor:number)=>cameraRef.current?.position.multiplyScalar(factor);const reset=()=>{cameraRef.current?.position.set(2.7,2.15,7.7);controlsRef.current?.target.set(0,0,0);if(controlsRef.current)controlsRef.current.autoRotate=referenceMode;controlsRef.current?.update()};
  return <div style={{display:"flex",flexDirection:"column",height:fullHeight?"100%":500,minHeight:420,gap:8}}>
    <div style={{position:"relative",flex:1,minHeight:300,borderRadius:8,overflow:"hidden",border:"1px solid #1e2d45",background:"#0b111b"}}><div ref={mountRef} style={{width:"100%",height:"100%"}}/><div style={{position:"absolute",top:10,left:12,color:"#607089",fontSize:11,pointerEvents:"none"}}>drag · scroll to zoom · click ports to learn</div><div style={{position:"absolute",right:12,bottom:12,display:"flex",flexDirection:"column",gap:4}}>{[{l:"+",f:()=>zoom(.84)},{l:"−",f:()=>zoom(1.18)},{l:"⟳",f:reset}].map(x=><button key={x.l} onClick={x.f} style={{width:32,height:32,borderRadius:6,border:"1px solid #334155",background:"#0b111bdd",color:"#cbd5e1",cursor:"pointer",fontSize:16}}>{x.l}</button>)}</div></div>
    {!referenceMode&&<div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}><span style={{fontSize:11,color:"#64748b",marginRight:3}}>Assign zone, then click a port:</span>{(["Trust","Untrust","DMZ","HA","unassigned"] as PanPortZone[]).map(z=><button key={z} onClick={()=>setZone(z)} style={{padding:"4px 9px",fontSize:11,borderRadius:14,cursor:"pointer",border:`1px solid ${zone===z?COLORS[z]:"#cbd5e1"}`,background:zone===z?COLORS[z]+"20":"#fff",color:zone===z?COLORS[z]:"#64748b"}}>{z}</button>)}</div>}
    <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:7,padding:"10px 13px",minHeight:62}}><div style={{fontSize:13,fontWeight:650,color:"#1e293b",marginBottom:3}}>{selected.title}</div><div style={{fontSize:12,color:"#64748b",lineHeight:1.5}}>{selected.body}</div></div>
  </div>;
}
