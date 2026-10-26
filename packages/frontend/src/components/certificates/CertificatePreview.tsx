import { renderCertificate, type CertificateDetails, type CertificateTemplate } from '@fortisim/engine';
export function CertificatePreview({template,details}:{template:CertificateTemplate;details:CertificateDetails}) {
 try{return <img className="w-full border border-line bg-white" alt={`Certificate preview for ${details.name}, ${details.rollNumber}`} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderCertificate(template,details))}`} />;}catch{return <p role="status">Complete the layout fields to preview this certificate.</p>;}
}
