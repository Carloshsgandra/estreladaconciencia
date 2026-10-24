async function call(action,body){
  const response=await fetch('/local/auth/'+action,{method:body?'POST':'GET',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||'Falha no acesso local.'),{status:response.status});return data.user||null;
}
export const signup=(email,password,metadata)=>call('signup',{email,password,name:metadata.full_name});
export const login=(email,password)=>call('login',{email,password});
export const getUser=()=>call('session');
export const refreshSession=getUser;
export const logout=()=>call('logout',{});
export const requestPasswordRecovery=email=>call('recovery',{email});
export const recoverPassword=(token,password)=>call('reset',{token,password});
export const acceptInvite=recoverPassword;
export const updateUser=body=>call('change',body);
export async function handleAuthCallback(){
  const token=new URLSearchParams(location.hash.slice(1)).get('confirmation_token');
  const user=await call('confirm',{token});history.replaceState(null,'',location.pathname+location.search);return user;
}
