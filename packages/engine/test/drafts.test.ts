import {expect,it} from 'vitest';
import {isSimulatorConfiguration} from '../src/drafts';
it('rejects duplicate or empty simulator row identities before restoration',()=>{
 const route={id:'same',destination:'',gateway:'',interfaceName:'port1',distance:10};
 expect(isSimulatorConfiguration('routing',[route])).toBe(true);
 expect(isSimulatorConfiguration('routing',[route,route])).toBe(false);
 expect(isSimulatorConfiguration('routing',[{...route,id:''}])).toBe(false);
 const iface={name:'port1',role:'WAN',ip:'',subnet:'',adminAccess:[]};
 expect(isSimulatorConfiguration('interfaces',[iface])).toBe(true);expect(isSimulatorConfiguration('interfaces',[iface,iface])).toBe(false);
 const port={portId:'port1',zone:'unassigned'};expect(isSimulatorConfiguration('ports',[port])).toBe(true);expect(isSimulatorConfiguration('ports',[port,port])).toBe(false);
 const pan={id:1,name:'Rule',type:'source',srcZone:'Trust',dstZone:'Untrust',dstAddr:'any',translated:'interface'};
 expect(isSimulatorConfiguration('pan-nat',[pan,pan])).toBe(false);
 expect(isSimulatorConfiguration('unknown' as any,[])).toBe(false);
});
