'use strict';
// Paperwork extraction from OCR text (pure, testable) + lazy on-device OCR with tesseract.js.
(function(root){
const MON='jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec';
function amounts(line){const out=[];const re=/(?:£|GBP\s?)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)|\b(\d{1,3}(?:,\d{3})*\.\d{2})\b/gi;let m;while((m=re.exec(line)))out.push({v:parseFloat((m[1]||m[2]).replace(/,/g,'')),sym:!!m[1]});return out.filter(a=>a.v>0&&a.v<1e6)}
function dates(line,now){const out=[];let m;const re1=/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/g;while((m=re1.exec(line))){let y=+m[3];if(y<100)y+=2000;const d=new Date(y,+m[2]-1,+m[1],9);if(+m[2]<=12&&+m[1]<=31)out.push(d)}
 const re2=new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MON})[a-z]*\\.?,?\\s*(\\d{4})?\\b`,'gi');while((m=re2.exec(line))){const mi=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[2].toLowerCase().slice(0,3));const y=m[3]?+m[3]:now.getFullYear();out.push(new Date(y,mi,+m[1],9))}
 return out.filter(d=>!isNaN(d))}
function extract(text,now=new Date()){const lines=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
 let amount=null,best=-1;lines.forEach((l,i)=>{const a=amounts(l);if(!a.length)return;const score=(/total|amount due|balance due|to pay|amount payable|due now|please pay/i.test(l)?10:0)+(a.some(x=>x.sym)?2:0)+(/sub ?total|vat|tax|previous/i.test(l)?-6:0);
  const v=Math.max(...a.map(x=>x.v));if(score>best||(score===best&&v>amount)){best=score;amount=v}});
 let due=null,dbest=-1;lines.forEach(l=>{const ds=dates(l,now);if(!ds.length)return;const score=/due|pay by|payment date|by|before|deadline|expires|renew|appointment/i.test(l)?5:/invoice date|issued|date of issue|statement date/i.test(l)?-3:0;
  for(const d of ds){const s=score+(d>=new Date(now.getFullYear(),now.getMonth(),now.getDate())?2:0);if(s>dbest){dbest=s;due=d}}});
 const skip=/^(invoice|bill|statement|receipt|tax invoice|page|date|account|customer|reference|ref|to|dear|total|amount|vat)\b/i;
 let payee=null;const hint=lines.find(l=>/\b(payable to|pay to|from|merchant|supplier)\b[:\s]/i.test(l));
 if(hint){const m=hint.match(/\b(?:payable to|pay to|from|merchant|supplier)\b[:\s]+(.{3,40})/i);if(m)payee=m[1].trim()}
 if(!payee)payee=(lines.slice(0,6).find(l=>/(ltd|limited|plc|council|energy|water|gas|electric|insurance|bank|dvla|hmrc|nhs|telecom|broadband)\b/i.test(l))||lines.slice(0,5).find(l=>/[A-Za-z]{3}/.test(l)&&!skip.test(l)&&!amounts(l).length&&!dates(l,now).length&&l.length<=40))||null;
 if(payee)payee=payee.replace(/[^\w&'.\- ]/g,'').replace(/\s+/g,' ').trim().replace(/\b(\w)(\w*)/g,(m,a,b)=>m===m.toUpperCase()&&m.length>=3&&!/^(DVLA|HMRC|NHS|BT|EE|TV|UK|VAT|DVSA|HSBC|RAC|AA)$/.test(m)?a+b.toLowerCase():m);
 const GBP=amount!=null?' £'+amount.toFixed(2):'';
 const kind=due?'reminder':amount!=null?'money':'note';
 const title=kind==='reminder'?(amount!=null?`Pay ${payee||'bill'}${GBP}`:(payee||'Paperwork')):kind==='money'?`${payee||'Bill'}${GBP}`:(payee||lines[0]||'Scanned document');
 return{amount,due:due?due.toISOString():null,payee,kind,title}}
const api={extract};
let loading=null;
api.ocr=async(blob,onProgress)=>{if(!loading)loading=new Promise((res,rej)=>{if(root.Tesseract)return res();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';s.onload=res;s.onerror=()=>{loading=null;rej(new Error('Could not load the text reader — are you online?'))};document.head.append(s)});
 await loading;const r=await root.Tesseract.recognize(blob,'eng',{logger:m=>{if(m.status==='recognizing text')onProgress?.(m.progress)}});return r.data.text};
if(typeof module!=='undefined')module.exports=api;else root.Snap=api;
})(typeof window!=='undefined'?window:globalThis);
