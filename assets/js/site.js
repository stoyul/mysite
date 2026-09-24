/* ============================================================
   Общий движок сайта: i18n, шапка/подвал, меню, фильтры, страницы.
   ============================================================ */
(function(){
  var LS_KEY='ys_lang';
  var qp=new URLSearchParams(location.search);
  var lang=qp.get('lang')||localStorage.getItem(LS_KEY)||'ru';
  if(lang!=='ru'&&lang!=='en') lang='ru';

  var YS=window.YS={lang:lang, onLang:[]};
  function dict(){return (window.I18N&&window.I18N[YS.lang])||{};}
  function t(k){var d=dict(); if(k in d) return d[k]; var r=window.I18N&&window.I18N.ru; return (r&&r[k])||k;}
  YS.t=t;

  var ARROW='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  /* ---------- navigation model ---------- */
  var NAV=[
    {page:'home',href:'index.html',key:'nav.home'},
    {page:'self',href:'index.html#self',key:'nav.self'},
    {page:'experts',href:'experts.html',key:'nav.experts'},
    {page:'products',href:'catalog.html',key:'nav.products'},
    {page:'about',href:'about.html',key:'nav.about'},
    {page:'contact',href:'consultation.html',key:'nav.contact'}
  ];
  var current=document.body.getAttribute('data-page')||'home';

  /* ---------- build header ---------- */
  function navLinks(){
    return NAV.map(function(n){
      return '<a href="'+n.href+'" data-i18n="'+n.key+'"'+(n.page===current?' class="active"':'')+'>'+t(n.key)+'</a>';
    }).join('');
  }
  function langToggle(){
    return '<div class="lang" role="group" aria-label="Language">'+
      '<button data-lang="ru" class="'+(YS.lang==='ru'?'active':'')+'">RU</button>'+
      '<button data-lang="en" class="'+(YS.lang==='en'?'active':'')+'">EN</button></div>';
  }
  function buildHeader(){
    var h=document.createElement('header');
    h.className='header'+(current==='home'?'':' solid');
    h.innerHTML=
      '<div class="header-inner">'+
        '<a class="brand" href="index.html" aria-label="Yulia Stoyanova">'+
          '<span class="mono">YS</span>'+
          '<span class="word">Юлия Стоянова<small>психология · символы</small></span>'+
        '</a>'+
        '<nav class="nav" aria-label="nav">'+navLinks()+'</nav>'+
        '<div class="header-actions">'+
          langToggle()+
          '<a class="header-cta" href="consultation.html" data-i18n="cta.book">'+t('cta.book')+'</a>'+
          '<button class="burger" aria-label="menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>'+
        '</div>'+
      '</div>';
    document.body.insertBefore(h,document.body.firstChild);

    var d=document.createElement('div');
    d.className='drawer';
    d.innerHTML=
      '<div class="drawer-top">'+
        '<span class="brand"><span class="mono">YS</span></span>'+
        '<button class="icon-btn" data-close aria-label="close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'+
      '</div>'+
      '<nav>'+navLinks()+'</nav>'+
      langToggle()+
      '<a class="btn btn-magenta" href="consultation.html" data-i18n="cta.book">'+t('cta.book')+'</a>';
    document.body.appendChild(d);

    var burger=h.querySelector('.burger');
    burger.addEventListener('click',function(){d.classList.add('open');});
    d.querySelector('[data-close]').addEventListener('click',function(){d.classList.remove('open');});
    d.querySelectorAll('nav a').forEach(function(a){a.addEventListener('click',function(){d.classList.remove('open');});});

    // scroll state (home only transparent)
    if(current==='home'){
      var onScroll=function(){h.classList.toggle('scrolled',window.scrollY>30);};
      onScroll(); window.addEventListener('scroll',onScroll,{passive:true});
    }
    // lang buttons
    document.querySelectorAll('.lang button').forEach(function(b){
      b.addEventListener('click',function(){setLang(b.getAttribute('data-lang'));});
    });
  }

  /* ---------- build footer ---------- */
  function buildFooter(){
    var f=document.createElement('footer');
    f.className='footer';
    f.innerHTML=
      '<div class="wrap"><div class="footer-grid">'+
        '<div class="col">'+
          '<a class="brand" href="index.html"><span class="mono">YS</span><span class="word">Юлия Стоянова</span></a>'+
          '<p class="tagline" data-i18n="footer.tagline" style="margin-top:16px">'+t('footer.tagline')+'</p>'+
        '</div>'+
        '<div class="col"><h4 data-i18n="footer.directions">'+t('footer.directions')+'</h4><nav>'+
          '<a href="index.html#self" data-i18n="nav.self">'+t('nav.self')+'</a>'+
          '<a href="experts.html" data-i18n="nav.experts">'+t('nav.experts')+'</a>'+
          '<a href="avtorskaya-sistema.html" data-i18n="feat.eyebrow">'+t('feat.eyebrow')+'</a>'+
          '<a href="about.html" data-i18n="nav.about">'+t('nav.about')+'</a>'+
        '</nav></div>'+
        '<div class="col"><h4 data-i18n="footer.products">'+t('footer.products')+'</h4><nav>'+
          '<a href="catalog.html?cat=game" data-i18n="f.game">'+t('f.game')+'</a>'+
          '<a href="catalog.html?cat=deck" data-i18n="f.deck">'+t('f.deck')+'</a>'+
          '<a href="catalog.html?cat=course" data-i18n="f.course">'+t('f.course')+'</a>'+
          '<a href="catalog.html" data-i18n="cta.back_catalog">'+t('cta.back_catalog')+'</a>'+
        '</nav></div>'+
        '<div class="col"><h4 data-i18n="footer.contact_h">'+t('footer.contact_h')+'</h4>'+
          '<p data-i18n="footer.contact_text">'+t('footer.contact_text')+'</p>'+
          '<p style="margin-top:14px"><a class="btn btn-ghost" href="consultation.html" data-i18n="cta.book">'+t('cta.book')+'</a></p>'+
        '</div>'+
      '</div>'+
      '<div class="footer-bottom"><span data-i18n="footer.rights">'+t('footer.rights')+'</span><span data-i18n="footer.tag">'+t('footer.tag')+'</span></div>'+
      '</div>';
    document.body.appendChild(f);
  }

  /* ---------- i18n apply + safety nets ---------- */
  function applyI18n(root){
    root=root||document;
    root.querySelectorAll('[data-i18n]').forEach(function(el){el.textContent=t(el.getAttribute('data-i18n'));});
    root.querySelectorAll('[data-i18n-html]').forEach(function(el){el.innerHTML=t(el.getAttribute('data-i18n-html'));});
    root.querySelectorAll('[data-i18n-ph]').forEach(function(el){el.setAttribute('placeholder',t(el.getAttribute('data-i18n-ph')));});
    stripYo(root); stripHeadingDots(root);
  }
  function stripYo(root){
    var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
      var p=n.parentNode; if(!p) return NodeFilter.FILTER_REJECT;
      var tag=p.nodeName; if(tag==='SCRIPT'||tag==='STYLE'||tag==='TEXTAREA') return NodeFilter.FILTER_REJECT;
      return (n.nodeValue.indexOf('ё')>=0||n.nodeValue.indexOf('Ё')>=0)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
    }});
    var nodes=[],n; while(n=walker.nextNode()) nodes.push(n);
    nodes.forEach(function(x){x.nodeValue=x.nodeValue.replace(/ё/g,'е').replace(/Ё/g,'Е');});
  }
  function stripHeadingDots(root){
    root.querySelectorAll('h1,h2,h3,.no-dot').forEach(function(h){
      if(h.children.length===0){
        h.textContent=h.textContent.replace(/[\.。]\s*$/,'');
      }
    });
  }

  /* ---------- language switch ---------- */
  function setLang(l){
    if(l===YS.lang) return;
    YS.lang=l; localStorage.setItem(LS_KEY,l); document.documentElement.lang=l;
    document.querySelectorAll('.lang button').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-lang')===l);});
    applyI18n(document);
    YS.onLang.forEach(function(fn){try{fn();}catch(e){}});
  }

  /* ---------- reveal ---------- */
  function initReveal(){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12,rootMargin:'0px 0px -8% 0px'});
    document.querySelectorAll('.reveal').forEach(function(el){io.observe(el);});
  }

  /* ---------- product cards ---------- */
  function productCard(p){
    return '<a class="prod-card reveal" href="product.html?slug='+p.slug+'">'+
      '<div class="prod-media"><span class="prod-tag">'+p.type[YS.lang]+'</span>'+
        '<img src="'+p.img+'" alt="'+p.title[YS.lang]+'" loading="lazy"></div>'+
      '<div class="prod-body"><h3>'+p.title[YS.lang]+'</h3><p>'+p.desc[YS.lang]+'</p>'+
        '<div class="prod-foot"><span class="prod-link">'+t('cta.open')+' '+ARROW+'</span></div>'+
      '</div></a>';
  }
  function renderGrid(grid,cat){
    var items=(window.PRODUCTS||[]).filter(function(p){return cat==='all'||!cat?true:p.cat===cat;});
    if(!items.length){grid.innerHTML='<p class="prod-empty" data-i18n="prod.empty">'+t('prod.empty')+'</p>';return;}
    grid.innerHTML=items.map(productCard).join('');
    initReveal();
  }
  function initFilter(scope){
    var grid=scope.querySelector('.prod-grid'); if(!grid) return;
    var chips=scope.querySelectorAll('.chip');
    var startCat=grid.getAttribute('data-cat')||'all';
    function paint(cat){
      chips.forEach(function(c){c.classList.toggle('active',c.getAttribute('data-cat')===cat);});
      renderGrid(grid,cat);
    }
    chips.forEach(function(c){c.addEventListener('click',function(){paint(c.getAttribute('data-cat'));});});
    paint(startCat);
    YS.onLang.push(function(){var active=scope.querySelector('.chip.active');paint(active?active.getAttribute('data-cat'):'all');});
  }

  /* ---------- page inits ---------- */
  function initHome(){var s=document.querySelector('#products');if(s)initFilter(s);}
  function initCatalog(){
    var s=document.querySelector('#catalog-section');if(!s)return;
    var grid=s.querySelector('.prod-grid');
    var cat=qp.get('cat'); if(cat) grid.setAttribute('data-cat',cat);
    initFilter(s);
  }
  function initProduct(){
    var host=document.querySelector('#product-host');if(!host)return;
    var slug=qp.get('slug');
    var p=(window.PRODUCTS||[]).find(function(x){return x.slug===slug;});
    function render(){
      if(!p){host.innerHTML='<div class="wrap" style="padding-top:150px;padding-bottom:100px"><a href="catalog.html">&larr; '+t('cta.back_catalog')+'</a><h1 style="margin-top:20px">404</h1></div>';return;}
      document.title=p.title[YS.lang]+' — '+t('hero.name');
      host.innerHTML=
      '<section class="page-hero"><div class="wrap"><div class="breadcrumb">'+
        '<a href="index.html" data-i18n="bc.home">'+t('bc.home')+'</a><span>/</span>'+
        '<a href="catalog.html" data-i18n="nav.products">'+t('nav.products')+'</a><span>/</span>'+p.title[YS.lang]+
      '</div></div></section>'+
      '<section class="section" style="padding-top:20px"><div class="wrap pd">'+
        '<div class="pd-media reveal"><img src="'+p.img+'" alt="'+p.title[YS.lang]+'"></div>'+
        '<div class="reveal"><span class="pd-tag">'+p.type[YS.lang]+'</span><h1>'+p.title[YS.lang]+'</h1>'+
          '<p class="lead">'+(p.long?p.long[YS.lang]:p.desc[YS.lang])+'</p>'+
          '<div class="stub"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg><p>'+t('pd.more_soon')+'</p></div>'+
          '<div class="cta-row"><a class="btn btn-magenta" href="consultation.html">'+t('pd.book')+' '+ARROW+'</a>'+
          '<a class="btn btn-ghost" href="catalog.html">'+t('cta.back_catalog')+'</a></div>'+
        '</div>'+
      '</div></section>';
      applyI18n(host); initReveal();
    }
    render(); YS.onLang.push(render);
  }
  function initExpertService(){
    var host=document.querySelector('#service-host');if(!host)return;
    var type=qp.get('type')||'product';
    var map={game:'svc.game',deck:'svc.deck',course:'svc.course',product:'svc.product',method:'svc.method'};
    var base=map[type]||'svc.product';
    function render(){
      document.title=t(base+'.t')+' — '+t('hero.name');
      var steps='';for(var i=1;i<=6;i++){steps+='<div class="process-step"><div class="num">0'+i+'</div><h3>'+t('svc.st'+i)+'</h3></div>';}
      host.innerHTML=
      '<section class="page-hero"><div class="wrap page-hero-inner"><div class="breadcrumb">'+
        '<a href="index.html">'+t('bc.home')+'</a><span>/</span><a href="experts.html">'+t('nav.experts')+'</a><span>/</span>'+t(base+'.t')+
      '</div><span class="eyebrow" data-i18n="exp.eyebrow">'+t('exp.eyebrow')+'</span>'+
      '<h1>'+t(base+'.t')+'</h1><p class="lead">'+t(base+'.l')+'</p>'+
      '<div class="cta-row"><a class="btn btn-magenta" href="consultation.html">'+t('cta.ask')+' '+ARROW+'</a></div></div></section>'+
      '<section class="section"><div class="wrap"><div class="section-head" style="margin-bottom:40px"><h2 data-i18n="svc.stages">'+t('svc.stages')+'</h2></div>'+
        '<div class="process-grid">'+steps+'</div>'+
        '<div class="stub" style="margin-inline:auto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg><p data-i18n="stub.text">'+t('stub.text')+'</p></div>'+
        '<div class="center" style="margin-top:40px"><a class="btn btn-magenta btn-lg" href="consultation.html">'+t('cta.book')+' '+ARROW+'</a></div>'+
      '</div></section>';
      applyI18n(host); initReveal();
    }
    render(); YS.onLang.push(render);
  }
  function initDirection(){
    var host=document.querySelector('#direction-host');if(!host)return;
    var topic=qp.get('topic')||'understand';
    var map={understand:'dir.understand',desire:'dir.desire',energy:'dir.energy',relations:'dir.relations',symbols:'dir.symbols'};
    var base=map[topic]||'dir.understand';
    // recommend a few products
    function render(){
      document.title=t(base+'.t')+' — '+t('hero.name');
      var recs=(window.PRODUCTS||[]).slice(0,3).map(productCard).join('');
      host.innerHTML=
      '<section class="page-hero"><div class="wrap page-hero-inner"><div class="breadcrumb">'+
        '<a href="index.html">'+t('bc.home')+'</a><span>/</span><a href="index.html#self">'+t('nav.self')+'</a><span>/</span>'+t(base+'.t')+
      '</div><span class="eyebrow" data-i18n="nav.self">'+t('nav.self')+'</span>'+
      '<h1>'+t(base+'.t')+'</h1><p class="lead">'+t(base+'.l')+'</p>'+
      '<div class="cta-row"><a class="btn btn-magenta" href="consultation.html">'+t('dir.cta')+' '+ARROW+'</a></div></div></section>'+
      '<section class="section ivory"><div class="wrap"><div class="section-head"><span class="eyebrow on-ivory" data-i18n="dir.rec">'+t('dir.rec')+'</span></div>'+
        '<div class="prod-grid">'+recs+'</div></div></section>';
      applyI18n(host); initReveal();
    }
    render(); YS.onLang.push(render);
  }
  function initConsultation(){
    var form=document.querySelector('#consult-form');if(!form)return;
    form.addEventListener('submit',function(e){
      e.preventDefault();
      form.classList.add('hidden');
      var ok=document.querySelector('#consult-success'); if(ok) ok.classList.add('show');
      window.scrollTo({top:ok?ok.getBoundingClientRect().top+window.scrollY-140:0,behavior:'smooth'});
    });
  }

  /* ---------- boot ---------- */
  document.documentElement.lang=YS.lang;
  buildHeader(); buildFooter();
  applyI18n(document);
  initReveal();
  initHome(); initCatalog(); initProduct(); initExpertService(); initDirection(); initConsultation();
})();
