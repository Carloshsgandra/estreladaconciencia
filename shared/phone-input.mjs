// Presentation only. The server remains responsible for validating the number.
export function formatPhone(value){
 let digits=String(value??'').replace(/\D/g,'');
 if(digits.length===13&&digits.startsWith('55'))digits=digits.slice(2);
 if(digits.length>11)return digits; // Never silently discard an invalid pasted number.
 if(digits.length<=2)return digits;
 const rest=digits.slice(2),split=rest.length>8?5:4;
 return digits.slice(0,2)+' '+rest.slice(0,split)+(rest.length>split?'-'+rest.slice(split):'');
}
export function installPhoneInputs(doc){
 function format(event){
  const input=event.target;
  if(!input?.matches?.('input[type="tel"],input[inputmode="tel"]'))return;
  const old=input.value,caret=input.selectionStart??old.length;
  const digitsBefore=old.slice(0,caret).replace(/\D/g,'').length;
  input.value=formatPhone(old);
  let pos=0,count=0;
  while(pos<input.value.length&&count<digitsBefore){if(/\d/.test(input.value[pos]))count++;pos++;}
  if(input.setSelectionRange)input.setSelectionRange(pos,pos);
 }
 doc.addEventListener('input',format);
 doc.addEventListener('focusin',format);
}
