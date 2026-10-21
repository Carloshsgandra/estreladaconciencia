// Run before application initialization; otherwise a 401 redirect can erase
// the one-time token while the next navigation is still pending.
(()=>{
  const callback=new URLSearchParams(location.hash.slice(1));
  if(['recovery_token','invite_token','confirmation_token','email_change_token','access_token'].some(key=>callback.has(key))){
    window.iecAuthRedirect=true;
    location.replace('/acesso.html'+location.search+location.hash);
  }
})();
