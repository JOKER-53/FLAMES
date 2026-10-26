import {describe,it,expect} from 'vitest';
import {revisionChanges} from '../src/pages/admin/RevisionHistory';
describe('revision comparison',()=>{
 it('reports changed, added and removed fields without mutating either snapshot',()=>{const before={title:'Old',lessons:[{body:'original',tasks:['one','two']}]},after={title:'New',lessons:[{body:'updated',tasks:['one']}],summary:'Added'};const copy=JSON.stringify(before);const changes=revisionChanges(before,after);expect(changes).toContainEqual({path:'lessons.0.body',before:'original',after:'updated'});expect(changes).toContainEqual({path:'lessons.0.tasks.1',before:'two',after:'(absent)'});expect(changes).toContainEqual({path:'summary',before:'(absent)',after:'Added'});expect(JSON.stringify(before)).toBe(copy);expect(revisionChanges(after,structuredClone(after))).toEqual([]);});
});
