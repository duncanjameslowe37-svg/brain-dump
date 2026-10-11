'use strict';
// Calendar helpers: .ics files and Google/Outlook web deep links.
window.Cal=(()=>{
const z=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
const ymd=d=>`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
const esc=s=>String(s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
function span(i){const s=new Date(i.due);if(i.hasTime===false){const e=new Date(s);e.setDate(e.getDate()+1);return{s,e,allDay:true}}return{s,e:new Date(s.getTime()+30*6e4),allDay:false}}
function vevent(i){const{s,e,allDay}=span(i);return['BEGIN:VEVENT',`UID:${i.id}@brain-dump`,`DTSTAMP:${z(new Date())}`,allDay?`DTSTART;VALUE=DATE:${ymd(s)}`:`DTSTART:${z(s)}`,allDay?`DTEND;VALUE=DATE:${ymd(e)}`:`DTEND:${z(e)}`,`SUMMARY:${esc(i.title)}`,i.text!==i.title?`DESCRIPTION:${esc(i.text)}`:'',
 ...(allDay?[]:['BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${esc(i.title)}`,'TRIGGER:-PT0M','END:VALARM']),'END:VEVENT'].filter(Boolean).join('\r\n')}
function ics(list){return['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Brain Dump//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Brain Dump',...list.map(vevent),'END:VCALENDAR'].join('\r\n')+'\r\n'}
function google(i){const{s,e,allDay}=span(i);const d=allDay?`${ymd(s)}/${ymd(e)}`:`${z(s)}/${z(e)}`;return`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(i.title)}&dates=${d}&details=${encodeURIComponent(i.text)}&ctz=Europe/London`}
function outlook(i){const{s,e,allDay}=span(i);return`https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(i.title)}&startdt=${encodeURIComponent(s.toISOString())}&enddt=${encodeURIComponent(e.toISOString())}${allDay?'&allday=true':''}&body=${encodeURIComponent(i.text)}`}
function download(name,text){const b=new Blob([text],{type:'text/calendar'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
return{ics,google,outlook,download}})();
