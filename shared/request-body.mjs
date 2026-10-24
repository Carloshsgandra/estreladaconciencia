export class RequestBodyError extends Error {
  constructor(message,status){super(message);this.status=status;}
}
// Enforce the limit while reading, including requests without Content-Length.
export async function limitedText(request,limit=65536){
  const declared=request.headers.get('content-length');
  if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>limit))throw new RequestBodyError('Conteúdo maior que o permitido.',413);
  if(!request.body)return '';
  const reader=request.body.getReader(),chunks=[];let total=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();throw new RequestBodyError('Conteúdo maior que o permitido.',413);}chunks.push(value);}
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new RequestBodyError('Texto inválido na solicitação.',400);}
}
