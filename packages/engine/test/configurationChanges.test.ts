import { expect, it } from 'vitest';
import { compareConfigurations } from '../src/learning/configurationChanges';
it('compares settings by row identity and reports rule ordering separately',()=>{
 const before=[{id:1,name:'Allow',action:'ACCEPT'},{id:2,name:'Block',action:'DENY'}];
 const result=compareConfigurations(before,[{id:2,name:'Block',action:'DENY'},{id:1,name:'Allow',action:'DENY'},{id:3,name:'New',action:'DENY'}]);
 expect(result.changes.filter(c=>c.type==='moved')).toHaveLength(2);expect(result.changes.find(c=>c.path.endsWith('.action'))).toMatchObject({before:'ACCEPT',after:'DENY'});expect(result.changes.filter(c=>c.type==='added')).toHaveLength(1);
});
it('handles removed objects, primitive lists, null and starter configurations',()=>{
 expect(compareConfigurations({policies:[{id:'a',enabled:true}]},{policies:[]}).changes[0].type).toBe('removed');
 expect(compareConfigurations({admin:['PING']},{admin:['HTTPS']}).changes[0]).toMatchObject({type:'changed',before:['PING'],after:['HTTPS']});
 expect(compareConfigurations(null,[]).changes).toHaveLength(1);expect(compareConfigurations({b:2,a:1},{a:1,b:2}).changes).toEqual([]);
});
it('bounds large output and treats text as inert values',()=>{
 const a=Object.fromEntries(Array.from({length:300},(_,i)=>['f'+i,0])),b=Object.fromEntries(Array.from({length:300},(_,i)=>['f'+i,'<script>bad</script>']));const r=compareConfigurations(a,b);expect(r.changes).toHaveLength(200);expect(r.truncated).toBe(true);
});
