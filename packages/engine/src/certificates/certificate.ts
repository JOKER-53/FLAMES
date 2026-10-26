export const CERTIFICATE_NOTE = 'Not an approved certificate. Valid only for internal college use; not for placements.';
export type CertificateVendor = 'fortigate' | 'paloalto';
export type CertificateField = 'organization' | 'title' | 'name' | 'rollNumber' | 'course' | 'date';
export interface CertificatePosition { x: number; y: number; size: number; }
export interface CertificateTemplate { organization: string; title: string; accent: string; textColor: string; backgroundColor: string; layout: 'formal' | 'classic' | 'modern' | 'custom'; backgroundImage: string; positions: Record<CertificateField, CertificatePosition>; }
export const DEFAULT_CERTIFICATE_TEMPLATE: CertificateTemplate = {
 organization: 'FLAMES · BeyondBug', title: 'Certificate of completion', accent: '#a17b38', textColor: '#162b46', backgroundColor: '#ffffff', layout: 'formal', backgroundImage: '',
 positions: { organization:{x:500,y:152,size:20},title:{x:500,y:230,size:44},name:{x:500,y:345,size:38},rollNumber:{x:500,y:390,size:17},course:{x:500,y:450,size:22},date:{x:500,y:535,size:13} }
};
export function validateCertificateTemplate(value: unknown): CertificateTemplate {
 const v=value as CertificateTemplate;
 const fail=()=>{throw new Error('Invalid certificate template. Use supported colors, bounded text positions, and a PNG, JPEG, or WebP image up to 90 KB.');};
 if(!v||typeof v!=='object'||!['formal','classic','modern','custom'].includes(v.layout))return fail();
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
 const text=(Object.keys(values) as CertificateField[]).map(key=>{
  const p=t.positions[key];
  const formal=t.layout==='formal';
  const display=formal&&(key==='name'||key==='title');
  const estimatedWidth=values[key].length*p.size*.53;
  const fit=formal?(estimatedWidth>800?' textLength="800" lengthAdjust="spacingAndGlyphs"':''):` textLength="${Math.min(800,estimatedWidth)}" lengthAdjust="spacingAndGlyphs"`;
  return `<text x="${p.x}" y="${p.y}" text-anchor="middle" font-size="${p.size}"${fit} fill="${t.textColor}" font-family="${display?'Georgia, Times New Roman, serif':'Arial, sans-serif'}"${formal&&key==='organization'?' letter-spacing="2"':''}>${xml(values[key])}</text>`;
 }).join('');
 const formalFrame = `<path d="M0 0H1000V16H0Z M0 584H1000V600H0Z" fill="#162b46"/>
  <rect x="30" y="34" width="940" height="532" rx="2" fill="none" stroke="${t.accent}" stroke-width="1.5"/>
  <rect x="40" y="44" width="920" height="512" fill="none" stroke="${t.accent}" stroke-opacity="0.35"/>
  <path d="M30 100V34H96 M904 34H970V100 M30 500V566H96 M904 566H970V500" fill="none" stroke="${t.accent}" stroke-width="4"/>
  <path d="M500 64L523 73V94Q523 109 500 120Q477 109 477 94V73Z" fill="#162b46" stroke="${t.accent}" stroke-width="1.5"/>
  <path d="M490 83H510M490 91H504M490 99H500" fill="none" stroke="#ffffff" stroke-width="2.5"/>
  <path d="M415 174H482 M518 174H585 M496 174L500 170L504 174L500 178Z" fill="none" stroke="${t.accent}" stroke-width="1.5"/>
  <path d="M300 365H700" fill="none" stroke="${t.accent}" stroke-opacity="0.5"/>
  <text x="500" y="290" text-anchor="middle" font-size="14" fill="#526278" font-family="Arial, sans-serif" letter-spacing="1">Presented to</text>
  <path d="M444 488H492 M508 488H556" stroke="${t.accent}"/>
  <circle cx="500" cy="488" r="3" fill="${t.accent}"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700" viewBox="0 0 1000 700" role="img" aria-label="Internal college course completion certificate"><rect width="1000" height="700" fill="${t.backgroundColor}"/>${t.backgroundImage?`<image href="${t.backgroundImage}" width="1000" height="600" preserveAspectRatio="xMidYMid slice"/>`:''}${t.layout==='formal'?formalFrame:t.layout==='custom'?'':t.layout==='modern'?`<path d="M0 0H35V600H0Z" fill="${t.accent}"/>`:`<rect x="28" y="28" width="944" height="550" fill="none" stroke="${t.accent}" stroke-width="3"/>`}${text}<rect y="600" width="1000" height="100" fill="#ffffff"/><text x="500" y="638" text-anchor="middle" font-size="14" fill="#334155" font-family="Arial, sans-serif">${CERTIFICATE_NOTE}</text><text x="500" y="665" text-anchor="middle" font-size="13" fill="#334155" font-family="Arial, sans-serif">Practice completion record · No vendor affiliation or professional accreditation</text></svg>`;
}
