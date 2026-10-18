// UI bridge only. No identity, role, or server authorization is inferred from Telegram data.
export function initTelegram(back){
  let web=null;
  function connect(){web=window.Telegram?.WebApp;if(!web||web.platform==='unknown'&&!web.initData)return;document.body.dataset.telegram='connected';const print=document.querySelector('[data-action="print-report"]');if(print)print.textContent='Открыть для печати';
    const sync=()=>{const root=document.documentElement;for(const side of ['top','bottom']){const n=Number(web.safeAreaInset?.[side]||0)+Number(web.contentSafeAreaInset?.[side]||0);root.style.setProperty('--app-tg-safe-'+side,Math.max(0,n)+'px');}if(web.viewportStableHeight)root.style.setProperty('--app-viewport-height',web.viewportStableHeight+'px');};
    const route=()=>{if(!web.BackButton)return;if(!location.hash||location.hash==='#game')web.BackButton.hide();else web.BackButton.show();};
    web.ready?.();web.expand?.();web.BackButton?.onClick(back);web.onEvent?.('viewportChanged',sync);if(web.isVersionAtLeast?.('8.0')){web.onEvent?.('safeAreaChanged',sync);web.onEvent?.('contentSafeAreaChanged',sync);}window.addEventListener('hashchange',route);sync();route();
  }
  if(window.Telegram?.WebApp){connect();return;}
  if(/tgWebApp(Data|Platform|Version)/.test(location.hash+location.search)||window.TelegramWebviewProxy){const sdk=document.createElement('script');sdk.src='https://telegram.org/js/telegram-web-app.js?64';sdk.onload=connect;sdk.onerror=()=>{document.body.dataset.telegram='unavailable';};document.head.append(sdk);}
}
