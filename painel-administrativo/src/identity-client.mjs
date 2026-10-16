import { getUser, handleAuthCallback, login, logout } from '@netlify/identity';

const form = document.querySelector('#auth-form');
const message = document.querySelector('#auth-message');
const submit = document.querySelector('#auth-submit');
const params = new URLSearchParams(location.search);
const returnTo = params.get('return_to') || '/#admin';

function safeReturn(value) {
  try { const url = new URL(value, location.origin); return url.origin === location.origin ? url.pathname + url.search + url.hash : '/'; }
  catch { return '/'; }
}

function show(text, error = false) {
  message.textContent = text;
  message.className = error ? 'notice auth-error' : 'notice';
}

async function start() {
  try {
    if (params.get('action') === 'logout') { await logout(); location.replace('/acesso.html'); return; }
    const callback = await handleAuthCallback();
    const user = callback?.user || await getUser();
    if (user) location.replace(safeReturn(returnTo));
  } catch (error) { show(error?.message || 'Não foi possível concluir o acesso.', true); }
}

form?.addEventListener('submit', async event => {
  event.preventDefault();
  submit.disabled = true;
  const data = new FormData(form);
  try {
    await login(String(data.get('email') || '').trim().toLowerCase(), String(data.get('password') || ''));
    location.replace(safeReturn(returnTo));
  } catch (error) { show(error?.message || 'Confira seus dados e tente novamente.', true); }
  finally { submit.disabled = false; }
});

start();
