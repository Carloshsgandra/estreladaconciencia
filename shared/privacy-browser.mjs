// Uses the app's existing dialog/focus management. Password never enters app state or storage.
export function privacyAction({type,title,warning,confirmation,downloadName,requestExtra={}},env){
  const {modal,requestApi,download,refresh,document}=env;
  modal(title,`<p>${warning}</p><form id="privacy-action"><div class="field"><label for="privacy-password">Confirme sua senha atual</label><input id="privacy-password" type="password" autocomplete="current-password" required maxlength="256"></div>${confirmation?'<label class="check"><input id="privacy-confirm" type="checkbox" required> Li e confirmo a operação descrita acima.</label>':''}<div id="privacy-result" role="status" aria-live="polite"></div><button class="btn" type="submit">Confirmar</button></form>`);
  const form=document.querySelector('#privacy-action');
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!form.reportValidity())return;
    const input=document.querySelector('#privacy-password'),button=form.querySelector('button'),result=document.querySelector('#privacy-result');
    if(button.disabled)return;
    button.disabled=true;
    const password=input.value;input.value='';
    try{
      const data=await requestApi('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...requestExtra,type,password,confirmation})});
      if(downloadName)download(downloadName,JSON.stringify(data,null,2),'application/json');
      result.textContent=downloadName?'Arquivo gerado. Guarde-o em local privado e protegido.':`Operação concluída: ${data.removed} ficha(s) removida(s). A conta e a reserva básica permanecem.`;
      if(type==='privacy:retention'){
        result.textContent=`Lote: ${data.scanned} registros examinados; ${data.eligible} fichas vencidas; ${data.removed} removidas; ${data.needsReview} sem data confiável. ${data.nextCursor?'Confirme a senha novamente para o próximo lote.':'Fim da varredura.'}`;
        if(data.nextCursor)requestExtra.cursor=data.nextCursor;else delete requestExtra.cursor;
      }
      if(!downloadName)await refresh();
    }catch(error){result.textContent=error.message;}
    finally{button.disabled=false;}
  });
}
