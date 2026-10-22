export const chatStickers=[{id:'ok',label:'OK'},{id:'nice',label:'NICE'},{id:'go-it',label:'GO IT'},{id:'please',label:'PLEASE'},{id:'make-sure',label:'MAKE SURE'},{id:'check-it',label:'CHECK IT'},{id:'here',label:'HERE'},{id:'plus-one',label:'+1'}] as const;
export type Sticker=(typeof chatStickers)[number];
export const stickerName=(sticker:Sticker)=>'blueprint-sticker-v1-'+sticker.id+'.png';
export const stickerSrc=(sticker:Sticker,base=import.meta.env?.BASE_URL??'/')=>base+'stickers/v1/'+sticker.id+'.png';
export function messageSticker(message:{attachments?:{name:string}[]}){return message.attachments?.length===1?chatStickers.find(s=>stickerName(s)===message.attachments![0].name):undefined;}
