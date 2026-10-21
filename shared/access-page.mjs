export function safeReturn(value, origin, fallback) {
  try {
    const url=new URL(value||fallback,origin);
    if(url.origin!==origin||url.pathname==='/acesso.html'||url.pathname.startsWith('/.netlify/')||url.pathname.startsWith('/api/'))return fallback;
    return url.pathname+url.search+url.hash;
  } catch { return fallback; }
}
export function authMessage(error) {
  const text=String(error?.message||'');
  if(error?.status===429||/rate limit|too many/i.test(text))return 'Muitas tentativas. Aguarde antes de solicitar novamente; o prazo é definido pelo serviço de acesso.';
  if(/invalid.*token|expired|token.*(invalid|expired)/i.test(text))return 'Este link expirou ou já foi utilizado. Solicite um novo link de recuperação ou convite.';
  if(/invalid.*(password|credentials)|email.*password|invalid_grant/i.test(text))return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
  if(/not confirmed|confirm.*email/i.test(text))return 'Confirme seu e-mail pelo link recebido antes de entrar.';
  if(/already.*(registered|exists)/i.test(text))return 'Esta conta já existe. Entre ou use “Esqueci minha senha”.';
  if(/fetch|network|timeout/i.test(text))return 'Não foi possível conectar ao serviço de acesso. Tente novamente.';
  return text||'Não foi possível concluir o acesso. Tente novamente.';
}
export async function verifySession(fetcher=fetch) {
  const response=await fetcher('/api/session',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  let data;
  try { data=await response.json(); } catch { throw Error('O servidor não confirmou sua sessão. Tente novamente após a publicação terminar.'); }
  if(!response.ok||!data.user)throw Object.assign(Error(data.error||'Não foi possível manter sua sessão. Permita cookies neste site e entre novamente.'),{status:response.status,code:data.code});
  return data.user;
}
export async function startAccessPage(identity, env=globalThis) {
  const {document,location,history}=env;
  const $=selector=>document.querySelector(selector);
  const form=$('#auth-form'),submit=$('#auth-submit'),message=$('#auth-message');
  const admin=document.body.dataset.mode==='admin',fallback=admin?'/#admin':'/#client';
  const params=new URLSearchParams(location.search);
  const destination=safeReturn(params.get('return_to'),location.origin,fallback);
  const hash=new URLSearchParams(location.hash.slice(1));
  let mode='login',token='',busy=false,cooldownUntil=0;
  const input=name=>document.querySelector('#auth-'+name);
  function show(text,error=false){message.textContent=text;message.className=error?'notice auth-error':'notice';}
  function render(){
    const signup=mode==='signup',recover=mode==='recovery',setPassword=['invite','reset','change'].includes(mode);
    $('#auth-title').textContent=mode==='invite'?'Ativar conta':setPassword?'Definir nova senha':recover?'Recuperar senha':signup?'Criar minha conta':admin?'Entrar no painel':'Abrir meu caderno';
    $('#auth-intro').textContent=setPassword?'Crie e confirme uma senha com pelo menos oito caracteres.':recover?'Informe seu e-mail para receber o link. Não envie pedidos repetidos.':admin?'Use a conta administrativa autorizada.':'Entre ou crie sua conta para acessar seu caderno.';
    $('#email-field').hidden=setPassword;input('email').required=!setPassword;input('email').disabled=setPassword;
    $('#password-field').hidden=recover;input('password').required=!recover;input('password').disabled=recover;
    input('password').minLength=(setPassword||signup)?8:1;
    input('password').autocomplete=(setPassword||signup)?'new-password':'current-password';
    $('#password-label').textContent=setPassword?'Nova senha':'Senha';
    $('#confirm-field').hidden=!(setPassword||signup);input('confirm').required=setPassword||signup;input('confirm').disabled=!(setPassword||signup);
    if($('#name-field')){$('#name-field').hidden=!signup;input('name').required=signup;input('name').disabled=!signup;}
    if($('#auth-toggle'))$('#auth-toggle').hidden=recover||setPassword;
    $('#auth-recovery').hidden=recover||setPassword;
    $('#auth-back').hidden=mode==='login';
    submit.textContent=recover?'Enviar link →':mode==='invite'?'Ativar conta →':setPassword?'Salvar nova senha →':signup?'Criar conta →':'Entrar →';
    submit.disabled=busy;show('');
  }
  function clearCallback(){history.replaceState(null,'',location.pathname+location.search);token='';}
  async function enter(){await identity.getUser();await identity.refreshSession();await verifySession(env.fetch.bind(env));location.replace(destination);}
  async function init(){
    busy=true;render();
    try{
      if(params.get('action')==='logout'){await identity.logout();location.replace('/acesso.html');return;}
      // Defer one-time token exchange until the password is submitted. Reloading
      // this form must not consume the link or accidentally log into the home page.
      if(hash.get('invite_token')){mode='invite';token=hash.get('invite_token');}
      else if(hash.get('recovery_token')){mode='reset';token=hash.get('recovery_token');}
      else if(hash.get('confirmation_token')||hash.get('email_change_token')||hash.get('access_token')){await identity.handleAuthCallback();await enter();return;}
      else if(params.get('action')==='change-password'){
        if(!await identity.getUser())throw Error('Entre novamente antes de alterar a senha.');
        await identity.refreshSession();await verifySession(env.fetch.bind(env));mode='change';
      }
      // An existing browser cookie alone is NOT reason to redirect: failed server
      // authorization must remain actionable here, without a login/home loop.
      busy=false;render();
    }catch(error){busy=false;render();show(authMessage(error),true);}
    finally{busy=false;submit.disabled=false;}
  }
  $('#auth-toggle')?.addEventListener('click',()=>{if(busy)return;mode=mode==='signup'?'login':'signup';render();});
  $('#auth-recovery').addEventListener('click',()=>{if(busy)return;mode='recovery';render();});
  $('#auth-back').addEventListener('click',()=>{if(busy)return;clearCallback();mode='login';render();});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    if(!form.reportValidity())return;
    busy=true;submit.disabled=true;
    const email=input('email').value.trim().toLowerCase(),password=input('password').value;
    try{
      if(['signup','invite','reset','change'].includes(mode)&&(password.length<8||password!==input('confirm').value))throw Error('Use pelo menos oito caracteres e confirme a mesma senha nos dois campos.');
      if(mode==='recovery'){
        if(Date.now()<cooldownUntil)throw Error('Aguarde antes de enviar outro pedido de recuperação.');
        cooldownUntil=Date.now()+60000;
        await identity.requestPasswordRecovery(email);show('Se o e-mail estiver cadastrado, enviaremos um link. Confira também o spam.');
      }else if(mode==='signup'){
        const name=input('name').value.trim();if(name.length<2)throw Error('Informe seu nome com pelo menos duas letras.');
        await identity.signup(email,password,{full_name:name});mode='login';render();show('Cadastro recebido. Confirme seu e-mail pelo link enviado e depois entre.');
      }else if(mode==='invite'||mode==='reset'){
        const user=mode==='invite'?await identity.acceptInvite(token,password):await identity.recoverPassword(token,password);
        clearCallback();mode='login';
        // These SDK methods do not write nf_jwt in the installed version.
        // A normal login synchronizes the browser session and server cookie.
        if(!user?.email)throw Error('Senha salva. Entre com seu e-mail e a nova senha.');
        input('email').value=user.email;await identity.login(user.email,password);await enter();
      }else if(mode==='change'){await identity.updateUser({password});mode='login';render();show('Senha atualizada. Entre novamente para continuar.');await identity.logout();}
      else{await identity.login(email,password);await enter();}
    }catch(error){render();show(authMessage(error),true);}
    finally{busy=false;submit.disabled=false;}
  });
  await init();
}
