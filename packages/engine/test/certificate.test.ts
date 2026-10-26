import {describe,it,expect} from 'vitest';
import {DEFAULT_CERTIFICATE_TEMPLATE as template,validateCertificateTemplate,renderCertificate,CERTIFICATE_NOTE} from '../src/certificates/certificate';
describe('internal certificate layout',()=>{
 it('escapes all identity fields and preserves a readable fixed disclaimer',()=>{const svg=renderCertificate(template,{id:'ID',name:'<script>alert(1)</script>',rollNumber:'" onload="alert(1)',vendor:'fortigate',issuedAt:'2026-10-26'});expect(svg).toContain('&lt;script&gt;');expect(svg).not.toContain('<script>');expect(svg).toContain(CERTIFICATE_NOTE);expect(svg).toContain('fill="#ffffff"');});
 it('rejects remote/executable templates and bounds every text position',()=>{for(const patch of [{backgroundImage:'<svg onload="alert(1)"/>'},{backgroundImage:'data:image/svg+xml;base64,AA=='},{textColor:'red'},{positions:{...template.positions,name:{x:0,y:700,size:100}}},{organization:''}])expect(()=>validateCertificateTemplate({...template,...patch})).toThrow();});
});
