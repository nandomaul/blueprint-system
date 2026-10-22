export function chatDateKey(iso:string){const d=new Date(iso);return Number.isNaN(d.getTime())?'unknown':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function chatDayLabel(iso:string,now=new Date(),locale='id-ID'){
 const d=new Date(iso);if(Number.isNaN(d.getTime()))return locale.startsWith('en')?'Unknown date':'Tanggal tidak diketahui';
 if(chatDateKey(iso)===chatDateKey(now.toISOString()))return locale.startsWith('en')?'Today':'Hari ini';
 return new Intl.DateTimeFormat(locale,{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d);
}
