import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/** Render locally: no document content is sent to a PDF service. */
export async function downloadDocumentPdf(html: string, filename: string) {
 const frame = document.createElement('iframe');
 frame.setAttribute('sandbox', 'allow-same-origin');
 frame.setAttribute('aria-hidden', 'true');
 frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;pointer-events:none';
 try {
  await new Promise<void>((resolve, reject) => {
   const timer = window.setTimeout(() => reject(new Error('Tải chứng từ quá lâu. Vui lòng thử lại.')), 20000);
   frame.onload = () => { clearTimeout(timer); resolve(); };
   frame.srcdoc = html; document.body.appendChild(frame);
  });
  const doc = frame.contentDocument;
  if (!doc?.body) throw new Error('Không đọc được nội dung chứng từ.');
  await doc.fonts.ready;
  const canvas = await html2canvas(doc.body, {scale:2, backgroundColor:'#ffffff', logging:false, windowWidth:794, useCORS:true});
  const pdf = new jsPDF({unit:'mm',format:'a4'});
  const width = 186, height = 273;
  const pagePixels = Math.floor(height * canvas.width / width);
  // Prefer a break before a table row or paragraph instead of cutting its text.
  const blocks = Array.from(doc.body.querySelectorAll('tr,p,h1,h2,h3')).map(el => {
   const rect=el.getBoundingClientRect(); return {top:Math.floor((rect.top-doc.body.getBoundingClientRect().top)*2),bottom:Math.ceil((rect.bottom-doc.body.getBoundingClientRect().top)*2)};
  });
  for (let top=0, page=0; top<canvas.height; page++) {
   let end=Math.min(top+pagePixels,canvas.height);
   if(end<canvas.height){const crossing=blocks.filter(b=>b.top<end&&b.bottom>end&&b.top>top+pagePixels/2);if(crossing.length)end=Math.min(...crossing.map(b=>b.top));}
   const slice=document.createElement('canvas');slice.width=canvas.width;slice.height=end-top;
   const context=slice.getContext('2d');if(!context)throw new Error('Trình duyệt không hỗ trợ tạo PDF.');
   context.drawImage(canvas,0,top,canvas.width,end-top,0,0,canvas.width,end-top);
   if(page)pdf.addPage();
   pdf.addImage(slice.toDataURL('image/png'),'PNG',12,12,width,(end-top)*width/canvas.width);
   top=end;
  }
  pdf.save(`${filename.replace(/[^a-zA-Z0-9_-]/g,'-')}.pdf`);
 } finally { frame.remove(); }
}
