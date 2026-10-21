import {element} from './designer.ts';
import type {DesignElement,PageDesign} from './model.ts';
export const libraryItems=[
 ['button','Tombol','Dasar'],['input','Input','Form'],['card','Kartu','Dasar'],['table','Tabel','Data'],['image','Gambar','Dasar'],['heading','Judul','Teks'],['text','Paragraf','Teks'],['checkbox','Checkbox','Form'],['select','Dropdown','Form'],['textarea','Catatan','Form'],['icon','Ikon','Dasar'],['rectangle','Persegi','Bentuk'],['ellipse','Lingkaran','Bentuk'],['line','Garis','Bentuk'],['badge','Badge status','Data'],['avatar','Avatar','Data'],['progress','Progress','Data'],['block-login','Form login','Blok'],['block-approval','Panel approval','Blok'],['block-nav','Navigasi atas','Blok'],['block-employees','Tabel karyawan','Blok'],['block-stats','Kartu statistik','Blok'],['block-form','Form karyawan','Blok'],['block-sidebar','Sidebar','Blok']
] as const;
export function libraryElements(key:string,d:PageDesign,point?:{x:number;y:number}):DesignElement[]{
 let items:DesignElement[]=[];const make=(kind:DesignElement['kind'],text:string,x:number,y:number,width:number,height:number)=>({...element(kind),text,x,y,width,height});
 if(key==='block-login')items=[make('heading','Selamat datang',0,0,350,60),make('input','Email kerja',0,90,350,64),make('input','Kode masuk',0,175,350,64),make('button','Masuk',0,270,350,52)];
 else if(key==='block-approval')items=[make('card','Permintaan persetujuan',0,0,420,260),make('badge','Menunggu review',20,70,190,38),make('button','Setujui',20,175,175,48),{...make('button','Tolak',215,175,175,48),background:'#ae4545'}];
 else if(key==='block-nav')items=[make('heading','Workspace',0,0,250,60),make('button','Beranda',270,0,150,48),make('button','Karyawan',435,0,150,48),make('avatar','N',610,0,48,48)];
 else if(key==='block-employees')items=[make('heading','Data karyawan',0,0,500,60),make('table','Nama | Departemen | Status\nNando | Teknologi | Aktif\nHadist | Desain | Aktif\nRyan | HR | Aktif',0,85,700,260)];
 else if(key==='block-stats')items=[make('card','Karyawan aktif\n128',0,0,220,140),make('card','Kontrak diperiksa\n12',240,0,220,140),make('progress','Kelengkapan data',0,165,460,42)];
 else if(key==='block-form')items=[make('heading','Informasi karyawan',0,0,470,60),make('input','Nama lengkap',0,85,330,64),make('select','Departemen',0,175,330,64),make('textarea','Catatan HR',0,265,330,120),make('checkbox','Data telah diperiksa',0,405,330,40),make('button','Simpan data',0,465,330,48)];
 else if(key==='block-sidebar')items=[make('card','PERSONNEL',0,0,240,430),make('button','Beranda',20,85,200,48),make('button','Karyawan',20,150,200,48),make('button','Dokumen',20,215,200,48),make('button','Pengaturan',20,280,200,48)];
 else {const item=libraryItems.find(i=>i[0]===key);if(!item||key.startsWith('block-'))throw new Error('Elemen tidak dikenal.');items=[element(key as DesignElement['kind'])];}
 const maxX=Math.max(...items.map(e=>e.x+e.width)),maxY=Math.max(...items.map(e=>e.y+e.height)),scale=Math.min(1,(d.width-32)/maxX,(d.height-32)/maxY),w=maxX*scale,h=maxY*scale,ox=Math.max(0,Math.min(d.width-w,point?.x??(d.width-w)/2)),oy=Math.max(0,Math.min(d.height-h,point?.y??(d.height-h)/2));
 return items.map(e=>{const width=Math.max(24,Math.floor(e.width*scale)),height=Math.max(24,Math.floor(e.height*scale));return{...e,x:Math.max(0,Math.min(d.width-width,Math.round(ox+e.x*scale))),y:Math.max(0,Math.min(d.height-height,Math.round(oy+e.y*scale))),width,height,fontSize:Math.max(8,Math.round(e.fontSize*scale))};});
}
