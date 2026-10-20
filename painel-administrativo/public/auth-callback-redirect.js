// Password recovery links from Netlify Identity return to the configured site
// URL (the panel home page). The one-time token lives in the URL hash, so send
// it to the dedicated password form without changing it.
(()=>{
  const callback=new URLSearchParams(location.hash.slice(1));
  if(['recovery_token','invite_token','confirmation_token','email_change_token'].some(key=>callback.has(key)))location.replace('/acesso.html'+location.search+location.hash);
})();
