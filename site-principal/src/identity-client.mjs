import { getUser, handleAuthCallback, login, logout, signup } from '@netlify/identity';

const form = document.querySelector('#auth-form');
const message = document.querySelector('#auth-message');
const title = document.querySelector('#auth-title');
const intro = document.querySelector('#auth-intro');
const nameField = document.querySelector('#name-field');
const toggle = document.querySelector('#auth-toggle');
const submit = document.querySelector('#auth-submit');
const params = new URLSearchParams(location.search);
const returnTo = params.get('return_to') || '/#client';
let mode = document.body.dataset.mode === 'admin' ? 'login' : 'login';

function safeReturn(value) {
  try {
    const url = new URL(value, location.origin);
    return url.origin === location.origin ? url.pathname + url.search + url.hash : '/';
  } catch { return '/'; }
}

function show(text, error = false) {
  message.textContent = text;
  message.className = error ? 'notice auth-error' : 'notice';
}

function renderMode() {
  const admin = document.body.dataset.mode === 'admin';
  const signupMode = mode === 'signup' && !admin;
  title.textContent = signupMode ? 'Criar meu caderno' : admin ? 'Entrar no painel' : 'Abrir meu caderno';
  intro.textContent = signupMode ? 'Crie uma conta para guardar seus agendamentos e acompanhar suas leituras.' : 'Use seu e-mail e senha para continuar com segurança.';
  nameField.hidden = !signupMode;
  submit.textContent = signupMode ? 'Criar conta →' : 'Entrar →';
  if (toggle) toggle.textContent = signupMode ? 'Já tenho uma conta' : 'Criar uma conta';
  message.textContent = '';
}

async function start() {
  try {
    if (params.get('action') === 'logout') {
      await logout();
      location.replace('/');
      return;
    }
    const callback = await handleAuthCallback();
    const user = callback?.user || await getUser();
    if (user) location.replace(safeReturn(returnTo));
  } catch (error) {
    show(error?.message || 'Não foi possível concluir o acesso.', true);
  }
}

toggle?.addEventListener('click', () => {
  mode = mode === 'login' ? 'signup' : 'login';
  renderMode();
});

form?.addEventListener('submit', async event => {
  event.preventDefault();
  submit.disabled = true;
  const data = new FormData(form);
  const email = String(data.get('email') || '').trim().toLowerCase();
  const password = String(data.get('password') || '');
  try {
    if (mode === 'signup' && document.body.dataset.mode !== 'admin') {
      const name = String(data.get('name') || '').trim();
      if (name.length < 2) throw new Error('Informe como você gosta de ser chamada(o).');
      await signup(email, password, { full_name: name });
      mode = 'login';
      renderMode();
      show('Conta criada. Confira seu e-mail para confirmar o cadastro e depois volte para entrar.');
    } else {
      await login(email, password);
      location.replace(safeReturn(returnTo));
    }
  } catch (error) {
    show(error?.message || 'Confira seus dados e tente novamente.', true);
  } finally {
    submit.disabled = false;
  }
});

renderMode();
start();
