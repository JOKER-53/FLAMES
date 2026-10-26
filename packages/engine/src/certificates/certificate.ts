export const CERTIFICATE_NOTE = 'Not an approved certificate. Valid only for internal college use; not for placements.';
export type CertificateVendor = 'fortigate' | 'paloalto';
export type CertificateField = 'organization' | 'title' | 'name' | 'rollNumber' | 'course' | 'date';
export interface CertificatePosition { x: number; y: number; size: number; }
export interface CertificateTemplate { organization: string; title: string; accent: string; textColor: string; backgroundColor: string; layout: 'classic' | 'modern' | 'custom'; backgroundImage: string; positions: Record<CertificateField, CertificatePosition>; }
export const DEFAULT_CERTIFICATE_TEMPLATE: CertificateTemplate = {
 organization: 'FLAMES · BeyondBug', title: 'Certificate of completion', accent: '#dc2626', textColor: '#172033', backgroundColor: '#ffffff', layout: 'classic', backgroundImage: '',
 positions: { organization:{x:500,y:110,size:22},title:{x:500,y:205,size:40},name:{x:500,y:320,size:36},rollNumber:{x:500,y:370,size:20},course:{x:500,y:440,size:24},date:{x:500,y:530,size:17} }
};
export function validateCertificateTemplate(value: unknown): CertificateTemplate {
 const v=value as CertificateTemplate;
 const fail=()=>{throw new Error('Invalid certificate template. Use supported colors, bounded text positions, and a PNG, JPEG, or WebP image up to 90 KB.');};
 if(!v||typeof v!=='object'||!['classic','modern','custom'].includes(v.layout))return fail();
 for(const key of ['organization','title'] as const)if(typeof v[key]!=='string'||!v[key].trim()||v[key].length>80)return fail();
 for(const key of ['accent','textColor','backgroundColor'] as const)if(typeof v[key]!=='string'||!/^#[0-9a-fA-F]{6}$/.test(v[key]))return fail();
 if(typeof v.backgroundImage!=='string'||v.backgroundImage.length>123000||v.backgroundImage&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(v.backgroundImage))return fail();
 const positions={} as CertificateTemplate['positions'];
 for(const key of Object.keys(DEFAULT_CERTIFICATE_TEMPLATE.positions) as CertificateField[]){const p=v.positions?.[key];if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.size)||p.x<100||p.x>900||p.y<60||p.y>560||p.size<12||p.size>48)return fail();positions[key]={x:p.x,y:p.y,size:p.size};}
 return {organization:v.organization.trim(),title:v.title.trim(),accent:v.accent,textColor:v.textColor,backgroundColor:v.backgroundColor,layout:v.layout,backgroundImage:v.backgroundImage,positions};
}
const xml=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export interface CertificateDetails { id:string; name:string; rollNumber:string; vendor:CertificateVendor; issuedAt:string; }
/** Shared preview/download renderer. No arbitrary SVG, HTML, remote images, or removable disclaimer. */
export function renderCertificate(template:CertificateTemplate, data:CertificateDetails):string {
 const t=validateCertificateTemplate(template);
 const values:Record<CertificateField,string>={organization:t.organization,title:t.title,name:data.name,rollNumber:`Roll number: ${data.rollNumber}`,course:`${data.vendor==='fortigate'?'FortiGate':'Palo Alto'} · All required tasks completed`,date:`Issued ${data.issuedAt.slice(0,10)} · ${data.id}`};
 const text=(Object.keys(values) as CertificateField[]).map(key=>{const p=t.positions[key];return `<text x="${p.x}" y="${p.y}" text-anchor="middle" font-size="${p.size}" textLength="${Math.min(800,values[key].length*p.size*.53)}" lengthAdjust="spacingAndGlyphs" fill="${t.textColor}" font-family="Arial, sans-serif">${xml(values[key])}</text>`;}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700" viewBox="0 0 1000 700" role="img" aria-label="Internal college course completion certificate"><rect width="1000" height="700" fill="${t.backgroundColor}"/>${t.backgroundImage?`<image href="${t.backgroundImage}" width="1000" height="600" preserveAspectRatio="xMidYMid slice"/>`:''}${t.layout==='custom'?'':t.layout==='modern'?`<path d="M0 0H35V600H0Z" fill="${t.accent}"/>`:`<rect x="28" y="28" width="944" height="550" fill="none" stroke="${t.accent}" stroke-width="3"/>`}${text}<rect y="600" width="1000" height="100" fill="#ffffff"/><text x="500" y="638" text-anchor="middle" font-size="14" fill="#334155" font-family="Arial, sans-serif">${CERTIFICATE_NOTE}</text><text x="500" y="665" text-anchor="middle" font-size="13" fill="#334155" font-family="Arial, sans-serif">Practice completion record · No vendor affiliation or professional accreditation</text></svg>`;
}
