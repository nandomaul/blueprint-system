// Clipboard fallback is private to this browser tab; document persistence remains in Supabase.
let value='';
export const canvasClipboard={read:()=>value,write:(next:string)=>{value=next;}};
