(function(root){
const DAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const MONTHS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
function parseTime(s){
  let m=s.match(/\b(?:at\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/i);
  if(m){let h=+m[1]%12;if(m[3].toLowerCase()==='pm')h+=12;return{h,mi:+(m[2]||0),txt:m[0]};}
  m=s.match(/\b(?:at\s+)(\d{1,2})[:.](\d{2})\b/i)||s.match(/\b(\d{1,2}):(\d{2})\b/);
  if(m&&+m[1]<24)return{h:+m[1],mi:+m[2],txt:m[0]};
  m=s.match(/\bat\s+(\d{1,2})\b(?!\s*(?:%|£|\$|items?|people))/i);
  if(m&&+m[1]<=12){let h=+m[1];if(h<8)h+=12;return{h,mi:0,txt:m[0]};}
  if(/\bnoon|midday\b/i.test(s))return{h:12,mi:0,txt:(s.match(/\b(at\s+)?(noon|midday)\b/i)||[''])[0]};
  if(/\btonight\b/i.test(s))return{h:20,mi:0,txt:''};
  if(/\bthis morning|in the morning\b/i.test(s))return{h:9,mi:0,txt:(s.match(/\b(this|in the) morning\b/i))[0]};
  if(/\b(this )?afternoon\b/i.test(s))return{h:15,mi:0,txt:(s.match(/\b(this )?afternoon\b/i))[0]};
  if(/\b(this )?evening\b/i.test(s))return{h:19,mi:0,txt:(s.match(/\b(this )?evening\b/i))[0]};
  return null;
}
function parseDate(text,now){
  now=now||new Date();const s=text.toLowerCase();let d=null,hit=[],m;
  if(m=s.match(/\bin\s+(an?|\d+|half an)\s*(min(?:ute)?s?|hours?|hrs?|days?|weeks?)\b/)){
    let n=m[1]==='a'||m[1]==='an'?1:m[1]==='half an'?0.5:+m[1];const u=m[2][0];
    d=new Date(now.getTime()+n*(u==='m'?6e4:u==='h'?36e5:u==='d'?864e5:6048e5));hit.push(m[0]);
    if(u==='m'||u==='h')return{date:d,matched:hit,hasTime:true};
  }
  if(!d&&(m=s.match(/\b(today|tonight)\b/))){d=new Date(now);hit.push(m[0]==='today'?m[0]:'');}
  if(!d&&(m=s.match(/\b(tomorrow|tmrw|tmr)\b/))){d=new Date(now);d.setDate(d.getDate()+1);hit.push(m[0]);}
  if(!d&&(m=s.match(/\b(?:on\s+)?(next\s+|this\s+)?(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|nesday|sday|urday)?\b/))){
    const idx=DAYS.findIndex(x=>x.startsWith(m[2]));d=new Date(now);let diff=(idx-now.getDay()+7)%7;
    if(diff===0)diff=7; if(m[1]&&m[1].trim()==='next'&&diff<7&&false)diff+=7;
    d.setDate(d.getDate()+diff);hit.push(m[0]);
  }
  if(!d&&(m=s.match(/\bnext week\b/))){d=new Date(now);d.setDate(d.getDate()+7);hit.push(m[0]);}
  if(!d&&(m=s.match(/\b(?:on\s+)?(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/))&&+m[2]<=12&&+m[1]<=31){
    let y=m[3]?+m[3]:now.getFullYear();if(y<100)y+=2000;d=new Date(y,+m[2]-1,+m[1]);if(!m[3]&&d<now)d.setFullYear(y+1);hit.push(m[0]);
  }
  if(!d&&(m=s.match(/\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/)||
          (m=s.match(/\b(?:on\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/)))){
    let day,mon;if(isNaN(+m[1])){mon=m[1];day=+m[2];}else{day=+m[1];mon=m[2];}
    d=new Date(now.getFullYear(),MONTHS.indexOf(mon),day);if(d<new Date(now.getFullYear(),now.getMonth(),now.getDate()))d.setFullYear(d.getFullYear()+1);hit.push(m[0]);
  }
  const t=parseTime(text);
  if(t){if(!d){d=new Date(now);d.setHours(t.h,t.mi,0,0);if(d<now)d.setDate(d.getDate()+1);}else d.setHours(t.h,t.mi,0,0);hit.push(t.txt);return{date:d,matched:hit,hasTime:true};}
  if(d){d.setHours(9,0,0,0);return{date:d,matched:hit,hasTime:false};}
  return null;
}
const R={
  money:/(£|\$|€)\s?\d|\b\d+(\.\d{2})?\s?(quid|pounds|p\b|gbp)|\b(owe[sd]?|paid|pay(ing)? back|lent|borrowed|spent|invoice|refund|budget|salary|bill|rent|direct debit|bank|transfer)\b/i,
  shopping:/^(buy|get|pick up|grab|need)\b|\b(shopping|groceries|grocery|supermarket|tesco|sainsbury'?s|asda|aldi|lidl|waitrose|m&s|morrisons|co-?op|ocado|we'?re out of|ran out of|run out of|running low on)\b/i,
  food:/\b(milk|bread|eggs|butter|cheese|bananas?|apples?|tea ?bags|coffee|loo roll|toilet roll|pasta|rice|beans|chicken|tomatoes|onions|potatoes|yoghurt|cereal|washing up liquid|bin bags|shampoo|toothpaste|nappies|wine|beer|crisps|biscuits)\b/i,
  idea:/^(idea|what if|maybe we|maybe i|could|wouldn'?t it be|app idea|business idea|concept)\b|\b(idea|brainstorm|invent|startup|side project)\b/i,
  contact:/\b(\+?44\s?7\d{3}|07\d{3})\s?\d{3}\s?\d{3}\b|[\w.+-]+@[\w-]+\.[\w.]+|\b(phone number|number is|email is|birthday|met .* at|lives in|works at|'s (wife|husband|partner|kids?|son|daughter))\b/i,
  task:/^(call|ring|phone|email|text|message|book|fix|clean|finish|send|write|sort|check|cancel|renew|post|reply|tidy|pay|order|submit|prepare|organise|arrange|update|ask|tell|remember to|don'?t forget|must|need to|have to|todo|to do)\b|\b(need to|have to|must|got to|gotta|should)\b/i,
  remind:/\b(remind( me)?|don'?t forget|remember|reminder|appointment|meeting|dentist|doctor|gp|deadline|due)\b/i,
  note:/^(note|fyi|wifi|password|code|recipe|quote)\b/i,
};
function splitItems(t){
  let s=t.replace(/^(buy|get|pick up|grab|need( to (buy|get))?)\s+/i,'').replace(/\b(from|at)\s+(the\s+)?(shop|shops|tesco|sainsbury'?s|asda|aldi|lidl|waitrose|m&s|morrisons|co-?op|supermarket)\b.*$/i,'')
   .replace(/^(we'?re|i'?m)?\s*(out of|ran out of|run out of|running low on)\s+/i,'').replace(/^shopping( list)?:?\s*/i,'');
  return s.split(/\s*(?:,|\band\b|&|\+|\n)\s*/i).map(x=>x.trim().replace(/^(some|a|an)\s+/i,'').replace(/[.!]$/,'')).filter(Boolean);
}
function classify(text,now){
  const t=text.trim();const out={text:t,category:'note',due:null,items:null,amount:null,title:t};
  const dt=parseDate(t,now);
  const money=t.match(/(?:£|\$|€)\s?(\d+(?:[.,]\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s?(?:quid|pounds|gbp)\b/i);
  if(R.note.test(t)&&!R.remind.test(t)){out.category='note';}
  else if(R.contact.test(t)&&!/^(call|ring|text|email|phone)\b/i.test(t)){out.category='contact';}
  else if(R.idea.test(t)&&!/^(buy|call|remind)/i.test(t)){out.category='idea';}
  else if(/^(remind|reminder)/i.test(t)||(dt&&(R.remind.test(t)||dt.hasTime))){out.category='reminder';}
  else if(R.money.test(t)&&!/^(buy|get|pick up)\b/i.test(t)){out.category='money';}
  else if(R.shopping.test(t)&&(R.food.test(t)||/,| and /.test(t)||/\b(shopping|tesco|sainsbury|asda|aldi|lidl|waitrose|out of|low on)\b/i.test(t))&&!/^need to (?!buy|get)/i.test(t)){out.category='shopping';}
  else if(R.food.test(t)&&t.split(/\s+/).length<=6&&!R.task.test(t)){out.category='shopping';}
  else if(dt){out.category='reminder';}
  else if(R.task.test(t)){out.category='task';}
  else if(R.remind.test(t)){out.category='reminder';}
  if(out.category==='shopping')out.items=splitItems(t);
  if(money)out.amount=parseFloat((money[1]||money[2]).replace(',','.'));
  if(dt&&['reminder','task','money'].includes(out.category)){out.due=dt.date.toISOString();out.hasTime=dt.hasTime;
    let ti=t;dt.matched.filter(Boolean).forEach(x=>{ti=ti.replace(new RegExp('\\s*\\b'+x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i'),'');});
    out.title=ti.replace(/^(remind me to|remind me|reminder:?|don'?t forget to|remember to)\s*/i,'').replace(/\s+(on|at|by)$/i,'').trim()||t;
    out.title=out.title.charAt(0).toUpperCase()+out.title.slice(1);}
  return out;
}
const api={classify,parseDate,splitItems};
if(typeof module!=='undefined')module.exports=api;else root.BD=api;
})(this);
