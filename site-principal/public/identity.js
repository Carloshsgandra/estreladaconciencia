(()=>{
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const whatsapp='https://wa.me/5511945915395';
  let queued=false;

  const emblem=()=>`<div class="cosmos" aria-hidden="true"><span class="orbit orbit-a"></span><span class="orbit orbit-b"></span><span class="star-dust dust-a"></span><span class="star-dust dust-b"></span><img src="/iec-mark.svg" alt=""><span class="moon-label">CADA JORNADA É ÚNICA</span></div>`;

  function intentionRitual(){
    const section=document.createElement('section');
    section.className='intention-ritual wrap reveal';
    section.id='intention';
    section.innerHTML=`<div class="intention-copy"><div class="eyebrow">UM PRIMEIRO GESTO</div><h2>O que você busca<br><em>neste momento?</em></h2><p>Escolha um ponto da constelação para conhecer o atendimento que mais combina com sua intenção.</p></div><div class="intention-compass" role="group" aria-label="Escolha sua intenção"><span class="compass-line" aria-hidden="true"></span><button data-intention="clareza" data-service="avulsa">Clareza</button><button data-intention="equilíbrio" data-service="mentoria">Equilíbrio</button><button data-intention="ritual" data-service="whatsapp">Ritual</button><button data-intention="conversar" data-service="whatsapp">Quero conversar</button><div class="compass-core" aria-hidden="true">✦</div></div><div class="intention-result" aria-live="polite"><span>Escolha um ponto da constelação.</span><a class="text-link" href="#services">Ver todos os atendimentos ↓</a></div>`;
    section.querySelectorAll('[data-intention]').forEach(button=>button.addEventListener('click',()=>{
      section.querySelectorAll('[data-intention]').forEach(item=>item.setAttribute('aria-pressed','false'));
      button.setAttribute('aria-pressed','true');
      const labels={clareza:'O Jogo de Tarô ajuda a iluminar perguntas, padrões e possibilidades.',equilíbrio:'O Reiki oferece um tempo de cuidado, presença e equilíbrio energético.',ritual:'O ritual de Ayahuasca começa com uma conversa individual pelo WhatsApp.',conversar:'Se ainda não sabe qual caminho escolher, podemos conversar primeiro.'};
      const isWhatsApp=button.dataset.service==='whatsapp';
      const target=isWhatsApp?`${whatsapp}?text=${encodeURIComponent('Olá! Vim pelo site do Instituto Estrela da Consciência e gostaria de conversar sobre '+(button.dataset.intention==='ritual'?'o ritual de Ayahuasca.':'os atendimentos.'))}`:`#book/${button.dataset.service}`;
      section.querySelector('.intention-result').innerHTML=`<span>${labels[button.dataset.intention]}</span><a class="btn small" href="${target}" ${isWhatsApp?'target="_blank" rel="noopener noreferrer"':''}>${isWhatsApp?'Conversar no WhatsApp':'Agendar atendimento'} →</a>`;
    }));
    return section;
  }

  function enhance(){
    queued=false;
    const main=document.querySelector('#main');
    if(!main)return;
    const hero=main.querySelector('.hero');
    if(hero&&!hero.dataset.iec){
      hero.dataset.iec='true';
      const copy=hero.querySelector('.hero-copy');
      copy.innerHTML=`<div class="eyebrow">INSTITUTO ESTRELA DA CONSCIÊNCIA</div><h1>Um espaço para<br><em>escutar o que<br>já se move em você.</em></h1><p>Jogo de Tarô, Reiki e ritual de Ayahuasca conduzidos com presença, clareza e cuidado. Cada atendimento respeita seu momento e sua história.</p><div class="hero-actions"><a class="btn" href="#book">Agendar minha sessão <span aria-hidden="true">↗</span></a><a class="text-link" href="#intention">Escolher uma intenção <span aria-hidden="true">↓</span></a></div><div class="hero-foot"><span></span> Presença <span></span> Acolhimento <span></span> Autoconhecimento</div>`;
      hero.querySelector('.hero-art').innerHTML=emblem();
      const services=main.querySelector('#services');
      if(services){
        services.before(intentionRitual());
        const grid=services.querySelector('.services');
        const cards=[...grid.querySelectorAll('.service')];
        const tarot=cards.find(card=>card.querySelector('h3')?.textContent.includes('Tarô'));
        if(tarot){
          const promoActive=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date())<'2027-01-01';
          tarot.querySelector('h3').insertAdjacentHTML('beforebegin',`<span class="promo-seal">${promoActive?'VALOR PROMOCIONAL':'VALOR ATUAL'}</span>`);
          if(promoActive)tarot.querySelector('.service-meta').insertAdjacentHTML('afterend','<p class="price-note">A partir de janeiro de 2027: <strong>R$ 137,00</strong></p>');
        }
        const ritual=document.createElement('article');
        ritual.className='service ritual-service';
        ritual.innerHTML=`<div class="service-art"><span class="number">03</span><img src="/iec-mark.svg" alt="" loading="lazy"></div><span class="promo-seal">CONVERSA PRÉVIA</span><h3>Ritual de Ayahuasca</h3><p>Uma experiência ritualística que começa com acolhimento, orientações e uma conversa individual.</p><div class="service-meta"><span>Informações pelo WhatsApp</span><strong>Valor conversado</strong></div><a class="text-link" href="${whatsapp}?text=${encodeURIComponent('Olá! Vim pelo site do Instituto Estrela da Consciência e gostaria de conversar sobre o ritual de Ayahuasca.')}" target="_blank" rel="noopener noreferrer">Conversar no WhatsApp <span aria-hidden="true">↗</span></a>`;
        grid.append(ritual);
        grid.classList.add('catalog-three');
      }
    }

    main.querySelectorAll('.service,.step-row,.faq-layout,.about-grid,.panel,.appointment').forEach(el=>el.classList.add('reveal'));
    if('IntersectionObserver' in window&&!reduce.matches){
      const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');io.unobserve(entry.target)}}),{threshold:.12});
      main.querySelectorAll('.reveal:not(.is-visible)').forEach(el=>io.observe(el));
    }else main.querySelectorAll('.reveal').forEach(el=>el.classList.add('is-visible'));

    if(!reduce.matches)main.querySelectorAll('.service:not([data-tilt])').forEach(card=>{
      card.dataset.tilt='true';
      card.addEventListener('pointermove',event=>{const r=card.getBoundingClientRect();card.style.setProperty('--rx',`${((event.clientY-r.top)/r.height-.5)*-5}deg`);card.style.setProperty('--ry',`${((event.clientX-r.left)/r.width-.5)*7}deg`)});
      card.addEventListener('pointerleave',()=>{card.style.removeProperty('--rx');card.style.removeProperty('--ry')});
    });
  }

  new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(enhance)}}).observe(document.getElementById('main'),{childList:true,subtree:true});
  addEventListener('DOMContentLoaded',enhance);
})();
