"use strict";var VikingUI=(()=>{var ze=Object.defineProperty;var Gt=Object.getOwnPropertyDescriptor;var Ft=Object.getOwnPropertyNames;var jt=Object.prototype.hasOwnProperty;var Yt=(t,e)=>{for(var i in e)ze(t,i,{get:e[i],enumerable:!0})},Xt=(t,e,i,r)=>{if(e&&typeof e=="object"||typeof e=="function")for(let a of Ft(e))!jt.call(t,a)&&a!==i&&ze(t,a,{get:()=>e[a],enumerable:!(r=Gt(e,a))||r.enumerable});return t};var Jt=t=>Xt(ze({},"__esModule",{value:!0}),t);var Wi={};Yt(Wi,{ALGOLIA_DEFAULT_INDEXES:()=>$t,DEFAULT_RECENT_LIMIT:()=>yt,DEFAULT_RECENT_STORAGE_KEY:()=>V,VikingBadgeWc:()=>I,VikingButtonWc:()=>U,VikingCalloutWc:()=>M,VikingCardWc:()=>T,VikingFieldWc:()=>C,VikingInputWc:()=>L,VikingModalWc:()=>H,VikingReactiveElement:()=>Y,VikingSearchPaletteWc:()=>S,VikingSelectWc:()=>O,VikingSiteFooterWc:()=>D,VikingSiteNavbarWc:()=>R,VikingStatusCardWc:()=>N,VikingStatusPillWc:()=>$,VikingSuiteHeaderWc:()=>Z,VikingSuiteSearchPaletteWc:()=>E,VikingThemeToggleWc:()=>J,bindCommandHistoryShortcuts:()=>Ge,clearRecentSearches:()=>te,createCommandHistory:()=>Ue,getDefaultCommandHistory:()=>ye,parseBoolean:()=>Mt,parseJson:()=>Tt,parseNumber:()=>Le,parseSelect:()=>He,pushRecentSearch:()=>Se,rankSearchItems:()=>xe,readRecentSearches:()=>P,recentSearchesAsItems:()=>Ee,registerVikingBadgeWc:()=>he,registerVikingButtonWc:()=>ue,registerVikingCalloutWc:()=>ve,registerVikingCardWc:()=>pe,registerVikingElements:()=>Oe,registerVikingFieldWc:()=>ke,registerVikingInputWc:()=>me,registerVikingModalWc:()=>be,registerVikingSearchPaletteWc:()=>G,registerVikingSelectWc:()=>Re,registerVikingSiteFooterWc:()=>ie,registerVikingSiteNavbarWc:()=>Ve,registerVikingStatusCardWc:()=>_e,registerVikingStatusPillWc:()=>Ae,registerVikingSuiteHeaderWc:()=>De,registerVikingSuiteSearchPaletteWc:()=>X,registerVikingThemeToggleWc:()=>Q,restoreRecentSearches:()=>we,scoreSearchItem:()=>Fe,searchAlgoliaPages:()=>Ne});var k=(t,e)=>{if("adoptedStyleSheets"in Document.prototype&&"replaceSync"in CSSStyleSheet.prototype){let r=new CSSStyleSheet;r.replaceSync(e),t.adoptedStyleSheets=[r];return}let i=document.createElement("style");i.textContent=e,t.append(i)},b=(t,e)=>t.hasAttribute(e)&&t.getAttribute(e)!=="false",se=(t,e)=>{t&&typeof t.setFormValue=="function"&&t.setFormValue(e)},le=t=>{let e=t.attachInternals;return typeof e=="function"?e.call(t):null},ce=t=>{t&&typeof t.showModal=="function"&&!t.open&&t.showModal()},B=t=>{t&&typeof t.close=="function"&&t.open&&t.close()};var Qt=class{},u=typeof HTMLElement>"u"?Qt:HTMLElement,_=t=>`${t}-${Math.random().toString(36).slice(2,9)}`,l=t=>{let e={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};return t.replace(/[&<>"']/g,i=>e[i]??i)},de=()=>typeof navigator<"u"&&/Mac|iPhone|iPad/i.test(navigator.platform)?"\u2318":"Ctrl",g=(t,e)=>{typeof customElements>"u"||customElements.get(t)||customElements.define(t,e)},v=(t,e)=>{typeof customElements>"u"||customElements.get(t)||customElements.define(t,class extends e{})};var Ke={"alert-circle":'<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',"alert-triangle":'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',"arrow-left":'<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',"arrow-right":'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',"arrow-up-right":'<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',"bar-chart":'<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',bell:'<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',bold:'<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/>',bolt:'<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',brain:'<path d="M12 18V5"/><path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"/><path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"/><path d="M18 18a4 4 0 0 0 2-7.464"/><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/><path d="M6 18a4 4 0 0 1-2-7.464"/><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"/>',bug:'<path d="M12 20v-9"/><path d="M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z"/><path d="M14.12 3.88 16 2"/><path d="M21 21a4 4 0 0 0-3.81-4"/><path d="M21 5a4 4 0 0 1-3.55 3.97"/><path d="M22 13h-4"/><path d="M3 21a4 4 0 0 1 3.81-4"/><path d="M3 5a4 4 0 0 0 3.55 3.97"/><path d="M6 13H2"/><path d="m8 2 1.88 1.88"/><path d="M9 7.13V6a3 3 0 1 1 6 0v1.13"/>',building:'<path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M12 6h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/><path d="M8 6h.01"/><path d="M9 22v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/><rect x="4" y="2" width="16" height="20" rx="2"/>',calendar:'<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',check:'<path d="M20 6 9 17l-5-5"/>',"check-circle":'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',"chevron-down":'<path d="m6 9 6 6 6-6"/>',"chevron-left":'<path d="m15 18-6-6 6-6"/>',"chevron-right":'<path d="m9 18 6-6-6-6"/>',"chevron-up":'<path d="m18 15-6-6-6 6"/>',chip:'<path d="M12 20v2"/><path d="M12 2v2"/><path d="M17 20v2"/><path d="M17 2v2"/><path d="M2 12h2"/><path d="M2 17h2"/><path d="M2 7h2"/><path d="M20 12h2"/><path d="M20 17h2"/><path d="M20 7h2"/><path d="M7 20v2"/><path d="M7 2v2"/><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="8" y="8" width="8" height="8" rx="1"/>',clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',cloud:'<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',cookie:'<path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/>',copy:'<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',"dots-horizontal":'<circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/>',"dots-vertical":'<circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>',download:'<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',external:'<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',eye:'<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',"eye-off":'<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',file:'<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/>',filter:'<path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"/>',fingerprint:'<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>',folder:'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',globe:'<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',"grip-vertical":'<circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="19" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="19" r="1" fill="currentColor" stroke="none"/>',heart:'<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/>',home:'<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',image:'<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',insights:'<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',italic:'<line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/>',key:'<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>',link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',list:'<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>',"list-ordered":'<path d="M11 5h10"/><path d="M11 12h10"/><path d="M11 19h10"/><path d="M4 4h1v5"/><path d="M4 9h2"/><path d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02"/>',loader:'<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',lock:'<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',"log-in":'<path d="m10 17 5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>',"log-out":'<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>',mail:'<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>',menu:'<path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/>',minus:'<path d="M5 12h14"/>',moon:'<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',network:'<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',paperclip:'<path d="m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551"/>',pencil:'<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',phone:'<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/>',play:'<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" fill="currentColor" stroke="none"/>',plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',policy:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',refresh:'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',rocket:'<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"/><path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05"/>',search:'<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',"search-off":'<path d="m13.5 8.5-5 5"/><path d="m8.5 8.5 5 5"/><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',send:'<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',server:'<rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>',settings:'<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>',shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',ship:'<path d="M12 10.189V14"/><path d="M12 2v3"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76"/><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',sparkle:'<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',speed:'<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',star:'<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',terminal:'<path d="M12 19h8"/><path d="m4 17 6-6-6-6"/>',trash:'<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',"trending-up":'<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',underline:'<path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" x2="20" y1="20" y2="20"/>',upload:'<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',"user-shield":'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M6.376 18.91a6 6 0 0 1 11.249.003"/><circle cx="12" cy="11" r="4"/>',x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'};var qe={deml:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 17V13M12 17V8M16 17V11"/>',"deml-compact":'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 16V12M12 16V9M15 16V13"/>',"deml-lockup":'<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 17V13M12 17V8M16 17V11"/><path d="M3 20h18"/>'},Be={drakkar:'<path d="M12 10.189V14"/><path d="M12 2v3"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76"/><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',"drakkar-compact":'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 10.189V14"/><path d="M12 2v3"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76"/><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',"drakkar-lockup":'<path d="M12 10.189V14"/><path d="M12 2v3"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76"/><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M3 21h18"/>'},rt={deml:'<path d="M5 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4zM8 13h2.5v4H8v-4zM12 8h2.5v9H12V8zM16 11h2.5v6H16v-6z"/>',"deml-compact":'<path d="M6 5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5zM9 12h1.5v4H9v-4zM12 9h1.5v7H12V9zM15 11h1.5v5H15v-5z"/>',"deml-lockup":'<path d="M4 4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4zM8 13h2.5v4H8v-4zM12 8h2.5v9H12V8zM16 11h2.5v6H16v-6z"/><rect x="3" y="19" width="18" height="2" rx="1"/>'},nt={drakkar:'<path d="M7 5h10a2 2 0 0 1 2 2v3.5L20.8 14.2l-7.8-3.5a1.8 1.8 0 0 0-1.4 0L3.2 14.2a10.5 10.5 0 0 0 2.6 7.2L5.2 13V7a2 2 0 0 0-2-2z"/><rect x="10.85" y="2" width="2.3" height="12" rx="0.4"/>',"drakkar-compact":'<path d="M3 3h18a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7.5 12.5 12 9.8l4.5 2.7v2.2c0 .8-.5 1.4-1.2 1.7L12 17.8l-3.3-1.6c-.7-.3-1.2-.9-1.2-1.7v-2.2z"/><rect x="11" y="6" width="2" height="5.5" rx="0.35"/>',"drakkar-lockup":'<path d="M7 5h10a2 2 0 0 1 2 2v3.5L20.8 14.2l-7.8-3.5a1.8 1.8 0 0 0-1.4 0L3.2 14.2a10.5 10.5 0 0 0 2.6 7.2L5.2 13V7a2 2 0 0 0-2-2z"/><rect x="10.85" y="2" width="2.3" height="12" rx="0.4"/><rect x="3" y="20" width="18" height="2" rx="1"/>'},at=Object.keys(qe),Qi=Object.keys(Be);var ot={kubernetes:"#326CE5",tensorflow:"#FF6F00",pytorch:"#EE4C2C","apache-spark":"#E25A1C",databricks:"#FF3621","aws-redshift":"#8C4FFF"},er=Object.keys(ot);var st={kubernetes:"M10.204 14.35l.007.01-.999 2.413a5.171 5.171 0 0 1-2.075-2.597l2.578-.437.004.005a.44.44 0 0 1 .484.606zm-.833-2.129a.44.44 0 0 0 .173-.756l.002-.011L7.585 9.7a5.143 5.143 0 0 0-.73 3.255l2.514-.725.002-.009zm1.145-1.98a.44.44 0 0 0 .699-.337l.01-.005.15-2.62a5.144 5.144 0 0 0-3.01 1.442l2.147 1.523.004-.002zm.76 2.75l.723.349.722-.347.18-.78-.5-.623h-.804l-.5.623.179.779zm1.5-3.095a.44.44 0 0 0 .7.336l.008.003 2.134-1.513a5.188 5.188 0 0 0-2.992-1.442l.148 2.615.002.001zm10.876 5.97l-5.773 7.181a1.6 1.6 0 0 1-1.248.594l-9.261.003a1.6 1.6 0 0 1-1.247-.596l-5.776-7.18a1.583 1.583 0 0 1-.307-1.34L2.1 5.573c.108-.47.425-.864.863-1.073L11.305.513a1.606 1.606 0 0 1 1.385 0l8.345 3.985c.438.209.755.604.863 1.073l2.062 8.955c.108.47-.005.963-.308 1.34zm-3.289-2.057c-.042-.01-.103-.026-.145-.034-.174-.033-.315-.025-.479-.038-.35-.037-.638-.067-.895-.148-.105-.04-.18-.165-.216-.216l-.201-.059a6.45 6.45 0 0 0-.105-2.332 6.465 6.465 0 0 0-.936-2.163c.052-.047.15-.133.177-.159.008-.09.001-.183.094-.282.197-.185.444-.338.743-.522.142-.084.273-.137.415-.242.032-.024.076-.062.11-.089.24-.191.295-.52.123-.736-.172-.216-.506-.236-.745-.045-.034.027-.08.062-.111.088-.134.116-.217.23-.33.35-.246.25-.45.458-.673.609-.097.056-.239.037-.303.033l-.19.135a6.545 6.545 0 0 0-4.146-2.003l-.012-.223c-.065-.062-.143-.115-.163-.25-.022-.268.015-.557.057-.905.023-.163.061-.298.068-.475.001-.04-.001-.099-.001-.142 0-.306-.224-.555-.5-.555-.275 0-.499.249-.499.555l.001.014c0 .041-.002.092 0 .128.006.177.044.312.067.475.042.348.078.637.056.906a.545.545 0 0 1-.162.258l-.012.211a6.424 6.424 0 0 0-4.166 2.003 8.373 8.373 0 0 1-.18-.128c-.09.012-.18.04-.297-.029-.223-.15-.427-.358-.673-.608-.113-.12-.195-.234-.329-.349-.03-.026-.077-.062-.111-.088a.594.594 0 0 0-.348-.132.481.481 0 0 0-.398.176c-.172.216-.117.546.123.737l.007.005.104.083c.142.105.272.159.414.242.299.185.546.338.743.522.076.082.09.226.1.288l.16.143a6.462 6.462 0 0 0-1.02 4.506l-.208.06c-.055.072-.133.184-.215.217-.257.081-.546.11-.895.147-.164.014-.305.006-.48.039-.037.007-.09.02-.133.03l-.004.002-.007.002c-.295.071-.484.342-.423.608.061.267.349.429.645.365l.007-.001.01-.003.129-.029c.17-.046.294-.113.448-.172.33-.118.604-.217.87-.256.112-.009.23.069.288.101l.217-.037a6.5 6.5 0 0 0 2.88 3.596l-.09.218c.033.084.069.199.044.282-.097.252-.263.517-.452.813-.091.136-.185.242-.268.399-.02.037-.045.095-.064.134-.128.275-.034.591.213.71.248.12.556-.007.69-.282v-.002c.02-.039.046-.09.062-.127.07-.162.094-.301.144-.458.132-.332.205-.68.387-.897.05-.06.13-.082.215-.105l.113-.205a6.453 6.453 0 0 0 4.609.012l.106.192c.086.028.18.042.256.155.136.232.229.507.342.84.05.156.074.295.145.457.016.037.043.09.062.129.133.276.442.402.69.282.247-.118.341-.435.213-.71-.02-.039-.045-.096-.065-.134-.083-.156-.177-.261-.268-.398-.19-.296-.346-.541-.443-.793-.04-.13.007-.21.038-.294-.018-.022-.059-.144-.083-.202a6.499 6.499 0 0 0 2.88-3.622c.064.01.176.03.213.038.075-.05.144-.114.28-.104.266.039.54.138.87.256.154.06.277.128.448.173.036.01.088.019.13.028l.009.003.007.001c.297.064.584-.098.645-.365.06-.266-.128-.537-.423-.608zM16.4 9.701l-1.95 1.746v.005a.44.44 0 0 0 .173.757l.003.01 2.526.728a5.199 5.199 0 0 0-.108-1.674A5.208 5.208 0 0 0 16.4 9.7zm-4.013 5.325a.437.437 0 0 0-.404-.232.44.44 0 0 0-.372.233h-.002l-1.268 2.292a5.164 5.164 0 0 0 3.326.003l-1.27-2.296h-.01zm1.888-1.293a.44.44 0 0 0-.27.036.44.44 0 0 0-.214.572l-.003.004 1.01 2.438a5.15 5.15 0 0 0 2.081-2.615l-2.6-.44-.004.005z",tensorflow:"M1.292 5.856L11.54 0v24l-4.095-2.378V7.603l-6.168 3.564.015-5.31zm21.43 5.311l-.014-5.31L12.46 0v24l4.095-2.378V14.87l3.092 1.788-.018-4.618-3.074-1.756V7.603l6.168 3.564z",pytorch:"M12.005 0L4.952 7.053a9.865 9.865 0 000 14.022 9.866 9.866 0 0014.022 0c3.984-3.9 3.986-10.205.085-14.023l-1.744 1.743c2.904 2.905 2.904 7.634 0 10.538s-7.634 2.904-10.538 0-2.904-7.634 0-10.538l4.647-4.646.582-.665zm3.568 3.899a1.327 1.327 0 00-1.327 1.327 1.327 1.327 0 001.327 1.328A1.327 1.327 0 0016.9 5.226 1.327 1.327 0 0015.573 3.9z","apache-spark":"M10.812 0c-.425.013-.845.215-1.196.605a3.593 3.593 0 00-.493.722c-.355.667-.425 1.415-.556 2.143a551.9 551.9 0 00-.726 4.087c-.027.16-.096.227-.244.273C5.83 8.386 4.06 8.94 2.3 9.514c-.387.125-.773.289-1.114.506-1.042.665-1.196 1.753-.415 2.71.346.422.79.715 1.284.936 1.1.49 2.202.976 3.3 1.47.019.01.036.013.053.019h-.004l1.306.535c0 .023.002.045 0 .073-.2 2.03-.39 4.063-.58 6.095-.04.419-.012.831.134 1.23.317.87 1.065 1.148 1.881.701.372-.204.666-.497.937-.818 1.372-1.623 2.746-3.244 4.113-4.872.111-.133.205-.15.363-.098.349.117.697.231 1.045.347h.001c.02.012.045.02.073.03l.142.042c1.248.416 2.68.775 3.929 1.19.4.132.622.164 1.045.098.311-.048.592-.062.828-.236.602-.33.995-.957.988-1.682-.005-.427-.154-.813-.35-1.186-.82-1.556-1.637-3.113-2.461-4.666-.078-.148-.076-.243.037-.375 1.381-1.615 2.756-3.236 4.133-4.855.272-.32.513-.658.653-1.058.308-.878-.09-1.57-1-1.741a2.783 2.783 0 00-1.235.069c-1.974.521-3.947 1.041-5.918 1.57-.175.047-.26.015-.355-.144a353.08 353.08 0 00-2.421-4.018 4.61 4.61 0 00-.652-.849c-.371-.37-.802-.549-1.227-.536zm.172 3.703a.592.592 0 01.189.211c.87 1.446 1.742 2.89 2.609 4.338.07.118.135.16.277.121 1.525-.41 3.052-.813 4.579-1.217.367-.098.735-.193 1.103-.289a.399.399 0 01-.1.2c-1.259 1.48-2.516 2.962-3.779 4.438-.11.13-.12.22-.04.37.937 1.803 1.768 3.309 2.498 4.76l-3.696-1.019c-.538-.18-1.077-.358-1.615-.539-.163-.055-.25-.03-.36.1-1.248 1.488-2.504 2.97-3.759 4.454a.398.398 0 01-.18.132c.035-.378.068-.757.104-1.136.149-1.572.297-3.144.451-4.716-.03-.318.117-.405-.322-.545-1.493-.593-3.346-1.321-4.816-1.905a.595.595 0 01.24-.134c1.797-.57 3.595-1.14 5.394-1.705.127-.04.199-.092.211-.233.013-.148.05-.294.076-.441.241-1.363.483-2.726.726-4.088.068-.386.14-.771.21-1.157z",databricks:"M.95 14.184L12 20.403l9.919-5.55v2.21L12 22.662l-10.484-5.96-.565.308v.77L12 24l11.05-6.218v-4.317l-.515-.309L12 19.118l-9.867-5.653v-2.21L12 16.805l11.05-6.218V6.32l-.515-.308L12 11.974 2.647 6.681 12 1.388l7.76 4.368.668-.411v-.566L12 0 .95 6.27v.72L12 13.207l9.919-5.55v2.26L12 15.52 1.516 9.56l-.565.308Z","aws-redshift":"M16.639 9.932a.822.822 0 0 1-.822-.82.823.823 0 0 1 1.645 0c0 .452-.37.82-.823.82m-2.086 4.994a.823.823 0 0 1-.822-.822.822.822 0 0 1 1.645 0 .822.822 0 0 1-.823.822m-5.004-.833a.822.822 0 1 1 .002-1.644.822.822 0 0 1-.002 1.644m-2.083 4.578a.823.823 0 0 1-.823-.82.823.823 0 0 1 1.645 0c0 .452-.37.82-.822.82m9.173-11.236a1.68 1.68 0 0 0-1.68 1.676c0 .566.285 1.066.718 1.37l-.782 1.982a1.674 1.674 0 0 0-1.923 1.104l-1.753-.398a1.675 1.675 0 0 0-3.348.103c0 .432.169.823.438 1.12l-.764 1.79c-.028-.001-.053-.008-.08-.008a1.68 1.68 0 0 0-1.68 1.676 1.68 1.68 0 0 0 3.36 0c0-.593-.312-1.112-.778-1.41l.674-1.579c.161.052.33.088.508.088.661 0 1.228-.386 1.502-.94l1.856.42a1.68 1.68 0 0 0 3.327-.325c0-.5-.224-.943-.574-1.25l.822-2.083c.053.005.104.016.157.016a1.68 1.68 0 0 0 1.68-1.676 1.68 1.68 0 0 0-1.68-1.676M12 23.145c-4.17 0-7.286-1.252-7.286-2.37V4.79C6.14 5.938 9.131 6.547 12 6.547c2.869 0 5.86-.609 7.286-1.756v15.983c0 1.12-3.116 2.37-7.286 2.37M12 .856c4.293 0 7.286 1.274 7.286 2.419 0 1.143-2.993 2.418-7.286 2.418-4.293 0-7.286-1.275-7.286-2.418C4.714 2.129 7.707.855 12 .855m8.143 2.419C20.143 1.147 15.947 0 12 0 8.052 0 3.857 1.147 3.857 3.274l.002.01h-.002v17.49C3.857 22.87 8.052 24 12 24c3.947 0 8.143-1.13 8.143-3.226V3.284h-.002l.002-.01"},W=t=>{let e=ot[t],i=st[t];return`<path fill="${e}" d="${i}"/>`},tr={kubernetes:W("kubernetes"),tensorflow:W("tensorflow"),pytorch:W("pytorch"),"apache-spark":W("apache-spark"),databricks:W("databricks"),"aws-redshift":W("aws-redshift")},lt=Object.fromEntries(Object.entries(st).map(([t,e])=>[t,`<path d="${e}"/>`]));var Zt={hub:'<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',model:'<rect x="4" y="8" width="16" height="10" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',google:'<path d="M12 11.2v2.4h6.6c-.3 1.5-1.8 4.4-6.6 4.4-4 0-7.2-3.3-7.2-7.3S8 3.4 12 3.4c2.3 0 3.9 1 4.8 1.8l3.2-3.1C17.5.8 14.9 0 12 0 5.4 0 0 5.4 0 12s5.4 12 12 12c6.9 0 11.5-4.8 11.5-11.6 0-.8-.1-1.4-.2-1.9H12z"/>',apple:'<path d="M16.365 12.14c.02 2.53 2.21 3.38 2.23 3.39-.02.07-.35 1.21-1.16 2.4-.7 1.02-1.43 2.03-2.58 2.05-1.13.02-1.49-.67-2.78-.67-1.29 0-1.69.65-2.75.69-1.11.04-1.95-1.12-2.66-2.13-1.44-2.08-2.54-5.87-1.07-8.43.73-1.27 2.04-2.08 3.46-2.1 1.08-.02 2.1.72 2.78.72.67 0 2.14-.89 3.61-.76.61.03 2.33.25 3.44 1.88-.09.06-2.05 1.2-2.03 3.55M13.75 3.64c.59-.71 1-1.7.89-2.68-.86.03-1.9.57-2.52 1.28-.55.63-1.03 1.65-.9 2.62.95.07 1.92-.49 2.53-1.22"/>'},ee={...Ke,...qe,...Be,...lt,...Zt},ct={...rt,...nt},ei={analytics:"deml",security:"shield",link:"link",visibility:"eye",shield:"shield",trending_up:"trending-up",lock:"lock",fingerprint:"fingerprint",gpp_maybe:"shield",verified_user:"user-shield",bolt:"bolt",cloud:"cloud",lan:"network",hub:"hub",speed:"speed",rocket_launch:"rocket",insights:"insights",check:"check",description:"file",vpn_key:"key",policy:"policy",bug_report:"bug",search:"search",chevron_left:"chevron-left",chevron_right:"chevron-right",verified:"check-circle",warning:"alert-triangle",close:"x",account_balance:"building",send:"send",check_circle:"check-circle",play_circle:"play",input:"terminal",model_training:"model",auto_awesome:"sparkle",error_outline:"alert-circle",home:"home",cookie:"cookie",search_off:"search-off",person_add:"user",storage:"aws-redshift",data_object:"aws-redshift",memory:"tensorflow",psychology:"pytorch",dns:"server",login:"log-in"},dt=["play","dots-horizontal","dots-vertical","grip-vertical"],lr=["google","apple",...at];var ti=new Set(Object.keys(ee)),gt=t=>{let e=t.trim().toLowerCase().replace(/\s+/g,"_");if(ti.has(e))return e;let i=ei[e];return i||"info"},cr=Object.keys(ee),dr=Object.keys(Ke);var ii=new Set(dt),p=(t,e=16,i="viking-wc-icon")=>{let r=gt(t),a=ii.has(r),n=a?ct[r]??ee[r]:ee[r];return a?`<svg class="${i}" width="${e}" height="${e}" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd" aria-hidden="true">${n}</svg>`:`<svg class="${i}" width="${e}" height="${e}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${n}</svg>`},ge={accent:"info",secondary:"info",success:"check-circle",warning:"alert-triangle",danger:"alert-circle",info:"info",muted:"info",subtle:"info"};var ht=`
/* Host is a transparent layout shell \u2014 never paint button chrome on the host
   (that creates a visual/semantic "button in a button" with the inner control). */
:host {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--viking-font-family);
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  min-height: 0;
  min-width: 0;
  color: inherit;
  cursor: default;
}

:host::before,
:host::after {
  display: none !important;
  content: none !important;
}

:host([full-width]) {
  display: flex;
  width: 100%;
}

:host([full-width]) .viking-btn {
  width: 100%;
  min-width: 0;
}

:host([compact]) .viking-btn {
  min-width: 0;
}

:host([square]) {
  flex: 0 0 auto;
}

.viking-btn {
  --viking-btn-depth-shadow:
    var(--viking-shadow-sm),
    inset 0 1px 0 color-mix(in srgb, var(--viking-white-pure) 7%, transparent),
    inset 0 -1px 0 color-mix(in srgb, var(--viking-black) 18%, transparent);
  --viking-btn-hover-shadow: var(--viking-shadow-hover);
  --viking-btn-press-shadow:
    inset 0 1px 3px color-mix(in srgb, var(--viking-black) 34%, transparent),
    inset 0 -1px 0 color-mix(in srgb, var(--viking-white-pure) 3%, transparent),
    var(--viking-shadow-xs);

  font-family: inherit;
  font-size: var(--viking-font-size-ui, var(--viking-font-size-sm));
  font-weight: var(--viking-font-weight-semibold);
  letter-spacing: var(--viking-letter-spacing-wide);
  line-height: var(--viking-line-height-snug);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-2);
  min-height: var(--viking-control-height);
  padding: var(--viking-space-0-5) var(--viking-control-padding-x);
  border-radius: var(--viking-button-radius, var(--viking-radius-lg));
  border: 1px solid transparent;
  cursor: pointer;
  text-decoration: none;
  transition: var(--viking-transition-interactive);
  width: auto;
  min-width: var(--viking-btn-min-width, 120px);
  white-space: nowrap;
  position: relative;
  background-clip: padding-box;
  isolation: isolate;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  box-sizing: border-box;
  overflow: hidden;
  box-shadow: var(--viking-btn-depth-shadow);
}

.viking-btn::before {
  content: "";
  position: absolute;
  inset: 1px 1px auto;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--viking-metallic-100) 58%, transparent),
    transparent
  );
  pointer-events: none;
  opacity: 0.88;
  transition: var(--viking-transition-interactive);
}

.viking-btn:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
  z-index: 1;
}

.viking-btn:disabled,
.viking-btn[aria-busy='true'] {
  opacity: var(--viking-state-disabled-opacity);
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.viking-btn[aria-busy='true'] {
  cursor: wait;
}

.viking-btn[aria-busy='true']:not(.viking-btn-square) {
  min-width: var(
    --viking-btn-loading-min-width,
    var(--viking-btn-min-width, 120px)
  );
}

.viking-btn[aria-busy='true']::before,
.viking-btn[aria-busy='true'] .viking-btn-label {
  opacity: 0.78;
  transform: translateY(1px);
}

.viking-btn[aria-busy='true'] .viking-btn-spinner {
  opacity: 0.85;
}

.viking-btn::after {
  content: "";
  position: absolute;
  inset: auto 0 0 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(
      in srgb,
      var(--viking-metallic-100) 24%,
      transparent
    ),
    transparent
  );
  pointer-events: none;
  opacity: 0.45;
  transition: var(--viking-transition-interactive);
}

.viking-btn-sm {
  min-height: var(--viking-control-height-sm);
  padding: 0 var(--viking-space-2);
  font-size: var(--viking-font-size-xs);
  min-width: auto;
}

.viking-btn-xs {
  min-height: var(--viking-control-height-xs);
  padding: 0 var(--viking-space-2);
  font-size: var(--viking-font-size-xs);
  min-width: auto;
}

.viking-btn-square {
  display: inline-grid;
  place-items: center;
  width: var(--viking-control-height);
  min-width: var(--viking-control-height);
  max-width: var(--viking-control-height);
  height: var(--viking-control-height);
  min-height: var(--viking-control-height);
  padding: 0;
  line-height: 1;
}

.viking-btn-square.viking-btn-sm {
  width: var(--viking-control-height-sm);
  min-width: var(--viking-control-height-sm);
  max-width: var(--viking-control-height-sm);
  height: var(--viking-control-height-sm);
  min-height: var(--viking-control-height-sm);
}

.viking-btn-square.viking-btn-xs {
  width: var(--viking-control-height-xs);
  min-width: var(--viking-control-height-xs);
  max-width: var(--viking-control-height-xs);
  height: var(--viking-control-height-xs);
  min-height: var(--viking-control-height-xs);
}

.viking-btn-square .viking-btn-label {
  display: inline-grid;
  place-items: center;
  width: 100%;
  height: 100%;
  line-height: 1;
}

.viking-btn-square ::slotted(*) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  line-height: 1;
}

.viking-btn-square ::slotted(svg),
.viking-btn-square ::slotted([data-viking-icon]) {
  width: var(--viking-icon-size-md, 20px);
  height: var(--viking-icon-size-md, 20px);
}

::slotted(viking-icon),
::slotted(.viking-icon),
::slotted([data-viking-icon]) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--viking-icon-size-md);
  height: var(--viking-icon-size-md);
  line-height: 1;
  flex-shrink: 0;
  pointer-events: none;
  flex: 0 0 auto;
  margin-block: calc(var(--viking-space-0-5) * -1);
  align-self: center;
}

.viking-btn-outline {
  background: var(--viking-surface-recipe, var(--viking-surface));
  color: var(--viking-text);
  border-color: var(--viking-border-strong);
  box-shadow: var(--viking-btn-depth-shadow);
}

.viking-btn-outline:hover:not(:disabled):not([aria-busy='true']) {
  background: color-mix(in srgb, var(--viking-accent) 5%, var(--viking-surface-alt));
  border-color: color-mix(in srgb, var(--viking-accent) 45%, var(--viking-border-strong));
  box-shadow: var(--viking-btn-hover-shadow);
  transform: translateY(var(--viking-state-hover-lift));
}

.viking-btn-outline:active:not(:disabled):not([aria-busy='true']) {
  transform: translateY(0) scale(var(--viking-state-active-scale));
  box-shadow: var(--viking-btn-press-shadow);
  border-color: var(--viking-border-strong);
}

.viking-btn-primary {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--viking-white-pure) 12%, transparent) 0%,
      transparent 42%
    ),
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--viking-electric-300) 18%, transparent) 0%,
      transparent 55%
    ),
    var(--viking-accent);
  color: var(--viking-accent-content);
  border-color: color-mix(in srgb, var(--viking-accent) 82%, var(--viking-black));
  box-shadow:
    var(--viking-btn-depth-shadow),
    inset 0 1px 0 color-mix(in srgb, var(--viking-white-pure) 12%, transparent);
}

.viking-btn-primary:hover:not(:disabled):not([aria-busy='true']) {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--viking-white-pure) 16%, transparent) 0%,
      transparent 44%
    ),
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--viking-electric-200) 20%, transparent) 0%,
      transparent 58%
    ),
    var(--viking-accent-hover);
  border-color: var(--viking-accent-hover);
  box-shadow: var(--viking-btn-hover-shadow);
  transform: translateY(var(--viking-state-hover-lift));
}

.viking-btn-primary:active:not(:disabled):not([aria-busy='true']) {
  transform: translateY(0) scale(var(--viking-state-active-scale));
  box-shadow: var(--viking-btn-press-shadow);
  border-color: color-mix(in srgb, var(--viking-accent) 82%, var(--viking-black));
}

.viking-btn-secondary {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--viking-white-pure) 11%, transparent) 0%,
      transparent 42%
    ),
    var(--viking-accent-secondary);
  color: var(--viking-accent-secondary-content);
  border-color: color-mix(in srgb, var(--viking-accent-secondary) 82%, var(--viking-black));
  box-shadow:
    var(--viking-btn-depth-shadow),
    inset 0 1px 0 color-mix(in srgb, var(--viking-white-pure) 10%, transparent);
}

.viking-btn-secondary:hover:not(:disabled):not([aria-busy='true']) {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--viking-white-pure) 14%, transparent) 0%,
      transparent 44%
    ),
    var(--viking-accent-secondary-hover);
  border-color: var(--viking-accent-secondary-hover);
  box-shadow: var(--viking-btn-hover-shadow);
  transform: translateY(var(--viking-state-hover-lift));
}

.viking-btn-secondary:active:not(:disabled):not([aria-busy='true']) {
  transform: translateY(0) scale(var(--viking-state-active-scale));
  box-shadow: var(--viking-btn-press-shadow);
  border-color: color-mix(in srgb, var(--viking-accent-secondary) 82%, var(--viking-black));
}

.viking-btn-filled {
  background: var(--viking-surface-recipe-muted, var(--viking-surface-alt));
  color: var(--viking-text);
  border-color: var(--viking-border);
  box-shadow: var(--viking-shadow-xs);
}

.viking-btn-filled:hover:not(:disabled):not([aria-busy='true']) {
  border-color: color-mix(in srgb, var(--viking-accent) 45%, var(--viking-border));
  background: color-mix(in srgb, var(--viking-accent) 8%, var(--viking-surface-alt));
  box-shadow: var(--viking-btn-hover-shadow);
  transform: translateY(var(--viking-state-hover-lift));
}

.viking-btn-filled:active:not(:disabled):not([aria-busy='true']) {
  transform: translateY(0) scale(var(--viking-state-active-scale));
  box-shadow: var(--viking-btn-press-shadow);
  border-color: color-mix(in srgb, var(--viking-accent) 20%, var(--viking-border));
  background: color-mix(in srgb, var(--viking-surface-alt) 84%, var(--viking-accent));
}

.viking-btn-danger {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--viking-white-pure) 10%, transparent) 0%,
      transparent 42%
    ),
    var(--viking-danger);
  color: var(--viking-on-danger);
  border-color: color-mix(in srgb, var(--viking-danger) 85%, var(--viking-black));
  box-shadow:
    var(--viking-btn-depth-shadow),
    inset 0 1px 0 color-mix(in srgb, var(--viking-white-pure) 10%, transparent);
}

.viking-btn-danger:hover:not(:disabled):not([aria-busy='true']) {
  background: color-mix(in srgb, var(--viking-danger) 88%, var(--viking-white));
  border-color: color-mix(in srgb, var(--viking-danger) 92%, var(--viking-white));
  box-shadow: var(--viking-btn-hover-shadow);
  transform: translateY(var(--viking-state-hover-lift));
}

.viking-btn-danger:active:not(:disabled):not([aria-busy='true']) {
  transform: translateY(0) scale(var(--viking-state-active-scale));
  border-color: color-mix(in srgb, var(--viking-danger) 72%, var(--viking-black));
  background: color-mix(in srgb, var(--viking-danger) 84%, var(--viking-black));
  box-shadow: var(--viking-btn-press-shadow);
}

.viking-btn-ghost {
  background: transparent;
  color: var(--viking-text);
  min-width: auto;
  box-shadow: none;
  border-color: transparent;
}

.viking-btn-ghost:hover:not(:disabled):not([aria-busy='true']) {
  background: var(--viking-accent-soft);
  color: var(--viking-accent-strong);
  border-color: var(--viking-border-subtle);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--viking-white-pure) 5%, transparent);
  transform: translateY(var(--viking-state-hover-lift));
}

.viking-btn-ghost:active:not(:disabled):not([aria-busy='true']) {
  transform: translateY(0) scale(var(--viking-state-active-scale));
  background: var(--viking-accent-soft);
  color: var(--viking-accent-strong);
}

.viking-btn-subtle {
  background: transparent;
  color: var(--viking-text-muted);
  border-color: var(--viking-border-subtle);
  min-width: auto;
  box-shadow: none;
}

.viking-btn-subtle:hover:not(:disabled):not([aria-busy='true']) {
  color: var(--viking-text);
  background: var(--viking-accent-soft);
  border-color: var(--viking-border-strong);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--viking-white-pure) 5%, transparent);
}

.viking-btn-subtle:active:not(:disabled):not([aria-busy='true']) {
  transform: translateY(0) scale(var(--viking-state-active-scale));
  border-color: var(--viking-border);
  background: color-mix(in srgb, var(--viking-accent-soft) 70%, var(--viking-surface));
  box-shadow: inset 0 1px 2px color-mix(in srgb, var(--viking-black) 24%, transparent);
}

.viking-btn:active:not(:disabled):not([aria-busy='true']) {
  transform: translateY(0) scale(var(--viking-state-active-scale));
}

.viking-btn-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-1);
  line-height: 1.2;
  min-height: var(--viking-icon-size-md);
  min-width: 0;
  text-align: center;
  white-space: nowrap;
}

.viking-btn-label ::slotted(*) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  line-height: 1;
}

.viking-btn-label ::slotted([data-viking-icon]),
.viking-btn-label ::slotted(svg),
.viking-btn-label ::slotted(viking-icon) {
  width: var(--viking-icon-size-md);
  height: var(--viking-icon-size-md);
}

.viking-btn-spinner {
  flex: 0 0 auto;
  width: var(--viking-icon-size-sm, 18px);
  height: var(--viking-icon-size-sm, 18px);
  aspect-ratio: 1;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: var(--viking-radius-pill);
  animation: viking-spin 0.8s linear infinite;
  margin-inline-end: var(--viking-space-0-5);
}

@keyframes viking-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .viking-btn-spinner { animation-duration: 0.01ms; }
  .viking-btn { transition-duration: 0.01ms; }
}
`,ut=`
:host {
  display: block;
  font-family: var(--viking-font-family);
}

.viking-input-shell {
  display: flex;
  align-items: center;
  gap: var(--viking-space-1);
  min-height: var(--viking-control-height);
  padding: 0 var(--viking-control-padding-x);
  font-family: inherit;
  font-size: var(--viking-font-size);
  color: var(--viking-text);
  background: var(--viking-surface-recipe-muted, var(--viking-surface-alt));
  border: 1px solid color-mix(in srgb, var(--viking-border-strong) 68%, var(--viking-border));
  border-radius: var(--viking-radius-md);
  box-shadow:
    var(--viking-shadow-xs),
    inset 0 1px 0 color-mix(in srgb, var(--viking-white-pure) 4%, transparent);
  transition: var(--viking-transition-interactive);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.viking-input-shell:hover:not(.viking-disabled):not(.viking-loading) {
  border-color: color-mix(in srgb, var(--viking-accent) 35%, var(--viking-border-strong));
  box-shadow: var(--viking-shadow-sm);
}

.viking-input-shell:focus-within:not(.viking-loading) {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
  border-color: var(--viking-accent);
  box-shadow:
    var(--viking-shadow-sm),
    0 0 0 1px color-mix(in srgb, var(--viking-accent) 22%, transparent);
}

.viking-input-shell.viking-disabled,
.viking-input-shell.viking-loading {
  opacity: var(--viking-state-disabled-opacity);
}

.viking-input-shell.viking-loading {
  cursor: wait;
}

.viking-input-native {
  flex: 1;
  min-width: 0;
  width: 100%;
  border: none;
  outline: none !important;
  background: transparent;
  color: var(--viking-text);
  font-family: inherit;
  font-size: inherit;
  padding: 0;
}

.viking-input-native::placeholder {
  color: var(--viking-text-muted);
}

input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none !important;
  background: transparent;
  color: var(--viking-text);
  font-family: inherit;
  font-size: inherit;
  padding: 0;
}

input::placeholder {
  color: var(--viking-text-muted);
}

input:disabled {
  cursor: not-allowed;
}

.viking-input-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--viking-touch-target-comfort, 44px);
  min-height: var(--viking-touch-target-comfort, 44px);
  border: none;
  background: transparent;
  color: var(--viking-text-muted);
  cursor: pointer;
  padding: var(--viking-space-0-5);
  border-radius: var(--viking-radius-pill);
  transition: var(--viking-transition-interactive);
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}

.viking-input-clear:hover {
  color: var(--viking-text);
  background: var(--viking-accent-soft);
}

.viking-input-clear:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.viking-input-spinner {
  width: 1rem;
  height: 1rem;
  aspect-ratio: 1;
  border: 2px solid var(--viking-text-muted);
  border-right-color: transparent;
  border-radius: var(--viking-radius-pill);
  animation: viking-spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes viking-spin {
  to { transform: rotate(360deg); }
}
`,vt=`
:host {
  display: block;
  font-family: var(--viking-font-family);
  color: var(--viking-text);
  min-width: 0;
}

:host([hidden]) {
  display: none;
}

:host([width='full']) {
  width: 100%;
}

:host([width='half']) {
  width: 100%;
  max-width: var(--viking-select-half-max-width, min(100%, 24rem));
}

.viking-field {
  display: flex;
  flex-direction: column;
  gap: var(--viking-space-2);
}

.viking-field-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--viking-space-2);
  margin-bottom: var(--viking-space-0-5);
}

.viking-field-label {
  display: inline-flex;
  align-items: center;
  gap: var(--viking-space-0-5);
  font-size: var(--viking-font-size-ui);
  font-weight: var(--viking-font-weight-bold);
  color: var(--viking-text);
  line-height: var(--viking-line-height-snug);
  cursor: pointer;
  margin: 0 0 var(--viking-space-1);
}

.viking-field-required {
  color: var(--viking-danger-text);
}

.viking-field-control {
  min-width: 0;
}

.viking-field-description,
.viking-field-error {
  margin: 0;
  font-size: var(--viking-font-size-xs);
  line-height: var(--viking-line-height-relaxed);
}

.viking-field-description {
  color: var(--viking-text-muted);
}

.viking-field-error {
  color: var(--viking-danger-text);
}

.viking-sr-only {
  position: absolute !important;
  width: var(--viking-space-px, 1px) !important;
  height: var(--viking-space-px, 1px) !important;
  padding: 0 !important;
  margin: calc(-1 * var(--viking-space-px, 1px)) !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
`,pt=`
:host {
  display: inline-flex;
  align-items: center;
  gap: var(--viking-space-0-5);
  padding: var(--viking-space-0-5) var(--viking-space-1);
  font-family: var(--viking-font-family);
  font-size: var(--viking-font-size-xs);
  font-weight: var(--viking-font-weight-semibold);
  letter-spacing: var(--viking-letter-spacing-wide);
  line-height: var(--viking-line-height-snug);
  border-radius: var(--viking-radius-pill);
  border: 1px solid var(--viking-border);
  background: var(--viking-surface-alt);
  color: var(--viking-text);
  white-space: nowrap;
  transition: var(--viking-transition-interactive);
  box-shadow: var(--viking-shadow-xs);
}

:host([size='sm']) {
  padding: 0 var(--viking-space-1);
  font-size: var(--viking-font-size-2xs);
}

:host([tone='accent']) {
  background: var(--viking-accent);
  border-color: color-mix(in srgb, var(--viking-accent) 80%, var(--viking-black));
  color: var(--viking-accent-content);
  box-shadow: var(--viking-shadow-sm);
}

:host([tone='secondary']) {
  background: color-mix(in srgb, var(--viking-accent-secondary) 16%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-accent-secondary) 55%, transparent);
  color: var(--viking-accent-secondary);
}

:host([tone='success']) {
  background: color-mix(in srgb, var(--viking-success) 16%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-success) 55%, transparent);
  color: var(--viking-success);
}

:host([tone='warning']) {
  background: color-mix(in srgb, var(--viking-warning) 18%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-warning) 55%, transparent);
  color: var(--viking-warning);
}

:host([tone='danger']) {
  background: color-mix(in srgb, var(--viking-danger) 14%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-danger) 50%, transparent);
  color: var(--viking-danger-text);
}

:host([tone='info']) {
  background: color-mix(in srgb, var(--viking-info) 14%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-info) 50%, transparent);
  color: var(--viking-info);
}

:host([tone='muted']),
:host([tone='subtle']) {
  color: var(--viking-text-muted);
  background: var(--viking-surface);
  border-color: var(--viking-border-subtle);
}

.viking-wc-icon {
  flex-shrink: 0;
}

.viking-badge-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--viking-touch-target-comfort, 44px);
  min-height: var(--viking-touch-target-comfort, 44px);
  border: none;
  background: transparent;
  color: currentColor;
  cursor: pointer;
  padding: var(--viking-space-0-5);
  border-radius: var(--viking-radius-pill);
  transition: var(--viking-transition-interactive);
  margin-left: calc(var(--viking-space-0-5) * -1);
}

.viking-badge-remove:hover {
  background: color-mix(in srgb, currentColor 12%, transparent);
}

.viking-badge-remove:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}
`,kt=`
:host {
  display: block;
  font-family: var(--viking-font-family);
}

:host([hidden]) {
  display: none;
}

.viking-callout {
  display: flex;
  align-items: flex-start;
  gap: var(--viking-space-2);
  padding: var(--viking-space-2);
  border-radius: var(--viking-radius-lg);
  border: 1px solid var(--viking-border);
  border-left-width: 3px;
  background: var(--viking-surface-alt);
  color: var(--viking-text);
  font-size: var(--viking-font-size-sm);
  box-shadow: var(--viking-shadow-sm);
}

.viking-callout-icon {
  flex-shrink: 0;
  margin-top: var(--viking-space-0-5);
  color: var(--viking-text-muted);
}

.viking-callout-body {
  flex: 1;
  min-width: 0;
}

.viking-callout-heading {
  margin: 0 0 var(--viking-space-0-5);
  font-size: var(--viking-font-size-ui);
  font-weight: var(--viking-font-weight-bold);
  color: var(--viking-text);
}

.viking-callout-text {
  margin: 0;
  color: var(--viking-text);
  line-height: var(--viking-line-height-relaxed);
}

.viking-callout-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--viking-touch-target-comfort, 44px);
  min-height: var(--viking-touch-target-comfort, 44px);
  border: none;
  background: transparent;
  color: var(--viking-text-muted);
  cursor: pointer;
  padding: var(--viking-space-0-5);
  border-radius: var(--viking-radius);
  transition: var(--viking-transition-interactive);
  flex-shrink: 0;
}

.viking-callout-close:hover {
  color: var(--viking-text);
  background: color-mix(in srgb, currentColor 8%, transparent);
}

.viking-callout-close:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.viking-callout-accent {
  border-color: var(--viking-accent);
  border-left-color: var(--viking-accent);
  background: var(--viking-accent-soft);
}

.viking-callout-accent .viking-callout-icon {
  color: var(--viking-accent);
}

.viking-callout-secondary {
  border-color: color-mix(in srgb, var(--viking-accent-secondary) 45%, transparent);
  border-left-color: var(--viking-accent-secondary);
  background: var(--viking-accent-secondary-soft);
}

.viking-callout-secondary .viking-callout-icon {
  color: var(--viking-accent-secondary);
}

.viking-callout-info {
  border-color: color-mix(in srgb, var(--viking-info) 45%, transparent);
  border-left-color: var(--viking-info);
  background: color-mix(in srgb, var(--viking-info) 10%, var(--viking-surface));
}

.viking-callout-info .viking-callout-icon {
  color: var(--viking-info);
}

.viking-callout-success {
  border-color: color-mix(in srgb, var(--viking-success) 45%, transparent);
  border-left-color: var(--viking-success);
  background: color-mix(in srgb, var(--viking-success) 10%, var(--viking-surface));
}

.viking-callout-success .viking-callout-icon {
  color: var(--viking-success);
}

.viking-callout-warning {
  border-color: color-mix(in srgb, var(--viking-warning) 45%, transparent);
  border-left-color: var(--viking-warning);
  background: color-mix(in srgb, var(--viking-warning) 12%, var(--viking-surface));
}

.viking-callout-warning .viking-callout-icon {
  color: var(--viking-warning);
}

.viking-callout-danger {
  border-color: var(--viking-danger);
  border-left-color: var(--viking-danger);
  background: color-mix(in srgb, var(--viking-crimson-600) 22%, var(--viking-surface));
  color: var(--viking-white);
}

.viking-callout-danger .viking-callout-icon {
  color: var(--viking-crimson-400);
}

.viking-callout-danger .viking-callout-text {
  color: var(--viking-white);
}
`,mt=`
:host {
  display: block;
  font-family: var(--viking-font-family);
  min-width: 0;
}

:host([width='full']) {
  width: 100%;
}

:host([width='half']) {
  width: 100%;
  max-width: var(--viking-select-half-max-width, min(100%, 24rem));
}

.viking-field {
  display: flex;
  flex-direction: column;
  gap: var(--viking-space-1);
}

.viking-field-label {
  font-size: var(--viking-font-size-ui);
  font-weight: var(--viking-font-weight-bold);
  color: var(--viking-text);
}

.viking-field-description {
  margin: 0;
  font-size: var(--viking-font-size-xs);
  color: var(--viking-text-muted);
}

.viking-field-error {
  margin: 0;
  font-size: var(--viking-font-size-xs);
  color: var(--viking-danger);
}

.viking-sr-only {
  position: absolute !important;
  width: var(--viking-space-px, 1px) !important;
  height: var(--viking-space-px, 1px) !important;
  padding: 0 !important;
  margin: calc(-1 * var(--viking-space-px, 1px)) !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

.viking-select-native {
  width: 100%;
  min-height: var(--viking-control-height);
  padding: 0 var(--viking-space-2);
  border: 1px solid var(--viking-border-strong);
  border-radius: var(--viking-radius);
  background: var(--viking-surface);
  color: var(--viking-text);
  font-family: inherit;
  font-size: var(--viking-font-size);
  cursor: pointer;
  transition: var(--viking-transition-interactive);
  box-shadow: var(--viking-shadow-sm);
}

.viking-select-native:hover:not(:disabled) {
  border-color: var(--viking-accent-strong);
  box-shadow: var(--viking-shadow-md);
}

.viking-select-native:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.viking-select-native:disabled {
  opacity: var(--viking-state-disabled-opacity);
  cursor: not-allowed;
}

.viking-select-native[aria-invalid='true'] {
  border-color: var(--viking-danger);
}
`,bt=`
:host {
  display: contents;
}

.viking-modal-backdrop:not([open]) {
  display: none !important;
  pointer-events: none;
}

.viking-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--viking-z-overlay, 10001);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--viking-space-3);
  background: var(--viking-overlay-backdrop);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: none;
  animation: viking-backdrop-in var(--viking-duration-fast) var(--viking-ease-out);
}

.viking-modal-panel {
  display: flex;
  flex-direction: column;
  gap: var(--viking-space-2);
  width: min(522px, calc(100vw - var(--viking-space-4)));
  max-height: calc(100vh - var(--viking-space-6));
  padding: var(--viking-space-3);
  border: 1px solid var(--viking-border-strong);
  border-radius: var(--viking-radius-lg);
  background: var(--viking-surface);
  color: var(--viking-text);
  box-shadow: var(--viking-shadow-lg);
  font-family: var(--viking-font-family);
  position: relative;
  overflow: hidden;
  animation: viking-modal-in var(--viking-duration) var(--viking-ease-default);
}

.viking-modal-panel::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--viking-metallic-200) 22%, transparent),
    transparent
  );
  pointer-events: none;
}

.viking-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--viking-space-2);
  padding-bottom: var(--viking-space-1);
  border-bottom: 1px solid var(--viking-border-subtle);
}

.viking-modal-heading {
  margin: 0;
  font-size: var(--viking-font-size-md);
  font-weight: var(--viking-font-weight-bold);
  letter-spacing: var(--viking-letter-spacing-tight);
  color: var(--viking-text);
  line-height: var(--viking-line-height-tight);
}

.viking-modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--viking-touch-target-comfort, 44px);
  min-height: var(--viking-touch-target-comfort, 44px);
  border: 1px solid transparent;
  background: transparent;
  color: var(--viking-text-muted);
  cursor: pointer;
  border-radius: var(--viking-radius);
  transition: var(--viking-transition-interactive);
  flex-shrink: 0;
}

.viking-modal-close:hover {
  color: var(--viking-text);
  background: var(--viking-accent-soft);
  border-color: var(--viking-border-subtle);
}

.viking-modal-close:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.viking-modal-body {
  overflow-y: auto;
  color: var(--viking-text-muted);
  font-size: var(--viking-font-size);
  line-height: var(--viking-line-height-relaxed);
}

.viking-modal-footer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--viking-space-2);
  justify-content: flex-end;
  padding-top: var(--viking-space-2);
  border-top: 1px solid var(--viking-border-subtle);
}

.viking-modal-footer:empty {
  display: none;
}

@keyframes viking-backdrop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes viking-modal-in {
  from {
    opacity: 0;
    transform: translateY(var(--viking-space-1)) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .viking-modal-backdrop,
  .viking-modal-panel {
    animation: none;
  }
}
`,ft=`
:host {
  display: contents;
}

.viking-search-palette-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--viking-z-overlay, 10001);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 10vh var(--viking-space-2) var(--viking-space-2);
  background: var(--viking-overlay-backdrop);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: none;
  animation: viking-backdrop-in var(--viking-duration-fast) var(--viking-ease-out);
}

.viking-search-palette-backdrop:not([open]) {
  display: none !important;
  pointer-events: none;
}

.viking-search-palette {
  display: flex;
  flex-direction: column;
  background: var(--viking-surface-raised, var(--viking-surface));
  border: 1px solid var(--viking-border-strong);
  border-radius: var(--viking-radius-lg);
  box-shadow: var(--viking-shadow-lg);
  overflow: hidden;
  max-width: 600px;
  width: min(100%, 600px);
  margin: 0 auto;
  font-family: var(--viking-font-family);
  color: var(--viking-text);
  animation: viking-modal-in var(--viking-duration) var(--viking-ease-default);
  position: relative;
  isolation: isolate;
}

.viking-search-palette::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--viking-metallic-200) 22%, transparent),
    transparent
  );
  pointer-events: none;
  z-index: 1;
}

.viking-search-palette-header {
  display: flex;
  align-items: center;
  padding: var(--viking-space-2);
  border-bottom: 1px solid var(--viking-border);
  gap: var(--viking-space-1);
  background: color-mix(in srgb, var(--viking-bg) 26%, var(--viking-surface-raised));
}

.viking-search-palette-header:focus-within {
  border-bottom-color: var(--viking-accent);
  box-shadow: inset 0 -2px 0 var(--viking-accent-soft);
}

.viking-search-palette-icon {
  color: var(--viking-text-muted);
  flex-shrink: 0;
}

.viking-search-palette-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: calc(var(--viking-font-size) * 1.05);
  color: var(--viking-text);
  font-family: inherit;
  min-width: 0;
}

.viking-search-palette-input::placeholder {
  color: var(--viking-text-muted);
}

.viking-search-palette-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--viking-touch-target-comfort, 44px);
  min-height: var(--viking-touch-target-comfort, 44px);
  border: none;
  background: transparent;
  color: var(--viking-text-muted);
  cursor: pointer;
  padding: var(--viking-space-0-5);
  border-radius: var(--viking-radius);
  transition: var(--viking-transition-interactive);
  flex-shrink: 0;
}

.viking-search-palette-close:hover {
  color: var(--viking-text);
  background: var(--viking-accent-soft);
}

.viking-search-palette-close:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.viking-search-palette-body {
  max-height: 50vh;
  overflow-y: auto;
  padding: var(--viking-space-2);
}

.viking-search-palette-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-1);
  padding: var(--viking-space-1) var(--viking-space-2);
  border-top: 1px solid var(--viking-border);
  font-size: calc(var(--viking-font-size) * 0.85);
  color: var(--viking-text-muted);
}

.viking-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  padding: var(--viking-space-0-5) var(--viking-space-1);
  font-family: inherit;
  font-size: calc(var(--viking-font-size) * 0.75);
  border-radius: calc(var(--viking-radius) / 2);
  border: 1px solid var(--viking-border);
  background: var(--viking-surface-alt);
}

.viking-search-results {
  display: flex;
  flex-direction: column;
  gap: var(--viking-space-1);
}

.viking-search-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--viking-space-1);
  margin: var(--viking-space-1) 0 var(--viking-space-0-5);
  padding: 0 var(--viking-space-1);
}

.viking-search-group-header .viking-search-group-label {
  margin: 0;
  padding: 0;
}

.viking-search-group-label {
  margin: var(--viking-space-1) 0 var(--viking-space-0-5);
  padding: 0 var(--viking-space-1);
  font-size: var(--viking-font-size-2xs);
  font-weight: var(--viking-font-weight-semibold);
  letter-spacing: var(--viking-letter-spacing-caps);
  text-transform: uppercase;
  color: var(--viking-text-muted);
}

.viking-search-clear-recent {
  border: none;
  background: transparent;
  color: var(--viking-text-muted);
  font: inherit;
  font-size: var(--viking-font-size-2xs);
  letter-spacing: var(--viking-letter-spacing-caps);
  text-transform: uppercase;
  cursor: pointer;
  padding: var(--viking-space-0-5) var(--viking-space-1);
  border-radius: var(--viking-radius);
  min-height: var(--viking-touch-target-comfort, 44px);
}

.viking-search-clear-recent:hover {
  color: var(--viking-text);
  background: var(--viking-accent-soft);
}

.viking-search-clear-recent:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.viking-search-result {
  display: flex;
  align-items: center;
  min-height: var(--viking-control-height-sm, 36px);
  padding: var(--viking-space-1) var(--viking-space-2);
  border-radius: var(--viking-radius);
  background: var(--viking-surface-alt);
  border: 1px solid var(--viking-border-subtle);
  cursor: pointer;
  transition: var(--viking-transition-interactive);
  gap: var(--viking-space-1);
  text-decoration: none;
  color: inherit;
}

.viking-search-result:hover,
.viking-search-result.is-selected {
  background: color-mix(in srgb, var(--viking-accent) 10%, var(--viking-surface-alt));
  border-color: color-mix(in srgb, var(--viking-accent) 42%, var(--viking-border-strong));
  box-shadow: var(--viking-shadow-sm);
}

.viking-search-result:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.viking-search-result-title {
  font-size: var(--viking-font-size-sm);
  font-weight: var(--viking-font-weight-semibold);
  color: var(--viking-text);
}

.viking-search-result-snippet {
  font-size: var(--viking-font-size-xs);
  color: var(--viking-text-muted);
}

.viking-search-empty {
  padding: var(--viking-space-3);
  text-align: center;
  color: var(--viking-text-muted);
  font-size: var(--viking-font-size-sm);
}

@keyframes viking-backdrop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes viking-modal-in {
  from {
    opacity: 0;
    transform: translateY(var(--viking-space-1)) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .viking-search-palette-backdrop,
  .viking-search-palette {
    animation: none;
  }
}
`;var ri=new Set(["accent","secondary","success","warning","danger","info","muted","subtle"]),I=class extends u{static tag="viking-badge";static legacyTag="viking-badge-wc";static get observedAttributes(){return["tone","size","icon","removable"]}shadow;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),k(this.shadow,pt)}connectedCallback(){this.render()}attributeChangedCallback(){this.isConnected&&this.render()}get tone(){let e=this.getAttribute("tone")??"";return ri.has(e)?e:null}get size(){return this.getAttribute("size")==="sm"?"sm":null}get removable(){return this.hasAttribute("removable")&&this.getAttribute("removable")!=="false"}onRemove=()=>{this.dispatchEvent(new CustomEvent("viking-removed",{bubbles:!0,composed:!0}))};render(){let e=this.tone;e&&this.getAttribute("tone")!==e?this.setAttribute("tone",e):!e&&this.hasAttribute("tone")&&this.removeAttribute("tone");let i=this.size;i&&this.getAttribute("size")!==i?this.setAttribute("size",i):!i&&this.hasAttribute("size")&&this.removeAttribute("size");let r=this.getAttribute("icon")??(e?ge[e]:null),a=r?p(r,16):"";this.shadow.innerHTML=`
      ${a}
      <span part="label"><slot></slot></span>
      ${this.removable?`<button type="button" class="viking-badge-remove" part="remove" aria-label="Remove">${p("x",14)}</button>`:""}
    `,this.shadow.querySelector(".viking-badge-remove")?.addEventListener("click",this.onRemove)}},he=()=>{g(I.tag,I),v(I.legacyTag,I)};var ni=new Set(["outline","primary","secondary","filled","danger","ghost","subtle"]),ai=new Set(["sm","xs"]),U=class extends u{static angularTag="viking-button";static tag="viking-button-wc";static get observedAttributes(){return["variant","size","type","disabled","loading","href","target","aria-label","aria-busy","square","full-width","compact"]}shadow;control=null;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),k(this.shadow,ht)}connectedCallback(){this.render(),this.addEventListener("click",this.onClick)}disconnectedCallback(){this.removeEventListener("click",this.onClick)}attributeChangedCallback(){this.isConnected&&this.render()}onClick=e=>{if(this.disabled||this.loading){e.preventDefault(),e.stopPropagation();return}this.dispatchEvent(new CustomEvent("viking-press",{bubbles:!0,composed:!0,detail:e}))};get variant(){let e=this.getAttribute("variant")??"outline";return ni.has(e)?e:"outline"}get size(){let e=this.getAttribute("size");return e&&ai.has(e)?e:null}get disabled(){return b(this,"disabled")}get loading(){return b(this,"loading")}get square(){return b(this,"square")}render(){let e=this.getAttribute("href"),i=!!e,r=i?"a":"button",a=["viking-btn",`viking-btn-${this.variant}`,this.size?`viking-btn-${this.size}`:"",this.square?"viking-btn-square":""].filter(Boolean).join(" "),n=this.getAttribute("aria-label")??"",o=this.getAttribute("aria-busy")==="true"||this.loading?"true":null,c=l(this.getAttribute("type")??"button"),s=e?l(e):"",d=this.getAttribute("target"),h=d?l(d):"";this.hasAttribute("type")&&!i&&this.removeAttribute("type"),this.shadow.innerHTML=`
      <${r}
        class="${a}"
        part="control"
        ${i?`href="${s}"`:`type="${c}"`}
        ${i&&h?`target="${h}"`:""}
        ${i&&d==="_blank"?'rel="noopener noreferrer"':""}
        ${this.disabled||this.loading?"disabled":""}
        ${n?`aria-label="${l(n)}"`:""}
        ${o?`aria-busy="${o}"`:""}
        ${this.disabled&&i?'aria-disabled="true" tabindex="-1"':""}
      >
        ${this.loading?'<span class="viking-btn-spinner" aria-hidden="true"></span>':""}
        <span class="viking-btn-label" part="label"><slot></slot></span>
      </${r}>
    `,this.control=this.shadow.querySelector(r)}},ue=()=>{g(U.tag,U)};var oi=new Set(["accent","secondary","success","warning","danger","info","muted"]),M=class extends u{static tag="viking-callout";static legacyTag="viking-callout-wc";static get observedAttributes(){return["tone","heading","icon","dismissible","hidden"]}shadow;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),k(this.shadow,kt)}connectedCallback(){this.render()}attributeChangedCallback(){this.isConnected&&this.render()}get tone(){let e=this.getAttribute("tone")??"info";return oi.has(e)?e:"info"}get dismissible(){return this.hasAttribute("dismissible")&&this.getAttribute("dismissible")!=="false"}onDismiss=()=>{this.setAttribute("hidden",""),this.dispatchEvent(new CustomEvent("viking-close",{bubbles:!0,composed:!0}))};render(){let e=this.getAttribute("heading")??"",i=this.getAttribute("icon")??ge[this.tone]??"info",r=p(i,22,"viking-callout-icon");this.shadow.innerHTML=`
      <div class="viking-callout viking-callout-${this.tone}" role="note" part="surface">
        <span part="icon">${r}</span>
        <div class="viking-callout-body" part="body">
          ${e?`<p class="viking-callout-heading" part="heading">${l(e)}</p>`:""}
          <div class="viking-callout-text" part="text"><slot></slot></div>
        </div>
        ${this.dismissible?`<button type="button" class="viking-callout-close" part="close" aria-label="Dismiss">${p("x",18)}</button>`:""}
      </div>
    `,this.shadow.querySelector(".viking-callout-close")?.addEventListener("click",this.onDismiss)}},ve=()=>{g(M.tag,M),v(M.legacyTag,M)};var T=class extends u{static tag="viking-card";static legacyTag="viking-card-wc";static get observedAttributes(){return["compact","interactive","title","loading"]}connectedCallback(){this.syncClasses()}attributeChangedCallback(){this.isConnected&&this.syncClasses()}syncClasses(){this.classList.add("viking-card"),this.classList.toggle("viking-card-compact",this.hasAttribute("compact")),this.classList.toggle("viking-card-interactive",this.hasAttribute("interactive")),this.classList.toggle("viking-card-loading",this.hasAttribute("loading"));let e=this.getAttribute("title");e?(this.setAttribute("role","region"),this.setAttribute("aria-label",e)):(this.removeAttribute("role"),this.removeAttribute("aria-label"))}},pe=()=>{g(T.tag,T),v(T.legacyTag,T)};var C=class extends u{static tag="viking-field";static legacyTag="viking-field-wc";static get observedAttributes(){return["label","description","error","required","width"]}shadow;labelId=_("viking-field-label");descriptionId=_("viking-field-description");errorId=_("viking-field-error");slotEl=null;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),k(this.shadow,vt)}connectedCallback(){this.render(),this.syncLightMessages(),this.syncControlA11y()}disconnectedCallback(){this.slotEl?.removeEventListener("slotchange",this.onSlotChange),this.clearLightMessages()}attributeChangedCallback(){this.isConnected&&(this.render(),this.syncLightMessages(),this.syncControlA11y())}get control(){return(this.slotEl?.assignedElements({flatten:!0})??[]).find(i=>i instanceof HTMLElement)??null}focusControl=()=>{this.control?.focus?.()};onSlotChange=()=>{this.syncControlA11y()};clearLightMessages(){this.querySelectorAll(":scope > [data-viking-field-msg]").forEach(e=>e.remove())}syncLightMessages(){this.clearLightMessages();let e=this.getAttribute("description")??"",i=this.getAttribute("error")??"";if(e){let r=document.createElement("p");r.id=this.descriptionId,r.className="viking-field-description suite-field-description",r.setAttribute("data-viking-field-msg","description"),r.textContent=e,this.append(r)}if(i){let r=document.createElement("p");r.id=this.errorId,r.className="viking-field-error suite-field-error",r.setAttribute("data-viking-field-msg","error"),r.setAttribute("role","alert"),r.setAttribute("aria-live","assertive"),r.setAttribute("aria-atomic","true");let a=document.createElement("span");a.className="suite-sr-only viking-sr-only",a.textContent="Error: ",r.append(a,document.createTextNode(i)),this.append(r)}}syncControlA11y=()=>{let e=this.control;if(!e)return;let i=this.getAttribute("description")??"",r=this.getAttribute("error")??"",a=[i&&this.descriptionId,r&&this.errorId].filter(Boolean).join(" "),n=this.getAttribute("label")??"";n&&!e.hasAttribute("aria-label")&&e.setAttribute("aria-label",n),a?e.setAttribute("aria-describedby",a):e.removeAttribute("aria-describedby"),e.removeAttribute("aria-description"),r?(e.setAttribute("aria-invalid","true"),e.setAttribute("error",r)):(e.removeAttribute("aria-invalid"),e.removeAttribute("error")),b(this,"required")&&(e.setAttribute("required",""),e.setAttribute("aria-required","true"))};render(){let e=this.getAttribute("label")??"",i=b(this,"required"),r=!!this.getAttribute("error");this.shadow.innerHTML=`
      <div class="viking-field${r?" viking-field-invalid":""}" part="field" role="group" aria-labelledby="${this.labelId}">
        ${e?`<div class="viking-field-label-row" part="label-row">
                <span class="viking-field-label" part="label" id="${this.labelId}">
                  <span>${l(e)}</span>
                  ${i?'<span class="viking-field-required" aria-label="required">*</span>':""}
                </span>
              </div>`:`<span id="${this.labelId}" hidden>Form field</span>`}
        <div class="viking-field-control" part="control"><slot></slot></div>
      </div>
    `,this.slotEl=this.shadow.querySelector("slot"),this.slotEl?.addEventListener("slotchange",this.onSlotChange),this.shadow.querySelector(".viking-field-label")?.addEventListener("click",this.focusControl)}},ke=()=>{g(C.tag,C),v(C.legacyTag,C)};var L=class extends u{static formAssociated=!0;static tag="viking-input";static legacyTag="viking-input-wc";static get observedAttributes(){return["type","placeholder","value","disabled","loading","clearable","name","autocomplete","required","readonly","minlength","maxlength","pattern","error","aria-label","aria-describedby","aria-invalid","aria-required","bare"]}shadow;internals;input=null;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),this.internals=le(this),k(this.shadow,ut)}connectedCallback(){this.render(),this.syncFormValue()}attributeChangedCallback(e){if(this.isConnected){if(e==="value"&&this.input){this.input.value=this.getAttribute("value")??"",this.syncFormValue();return}this.render()}}get value(){return this.input?.value??this.getAttribute("value")??""}set value(e){let i=e??"";this.getAttribute("value")!==i&&this.setAttribute("value",i),this.input&&this.input.value!==i&&(this.input.value=i),this.syncFormValue()}get disabled(){return b(this,"disabled")}get loading(){return b(this,"loading")}get clearable(){return b(this,"clearable")}get bare(){return b(this,"bare")}onInput=()=>{let e=this.input?.value??"";this.syncFormValue(),this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0})),this.dispatchEvent(new Event("change",{bubbles:!0,composed:!0})),this.getAttribute("value")!==e&&this.setAttribute("value",e)};onBlur=()=>{this.dispatchEvent(new Event("blur",{bubbles:!0,composed:!0}))};onClear=()=>{this.value="",this.input?.focus(),this.dispatchEvent(new CustomEvent("viking-cleared",{bubbles:!0,composed:!0})),this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0}))};syncFormValue(){se(this.internals,this.value)}render(){let e=["viking-input-shell",this.disabled?"viking-disabled":"",this.loading?"viking-loading":""].filter(Boolean).join(" "),i=l(this.getAttribute("type")??"text"),r=this.getAttribute("placeholder")??"",a=l(r),n=l(this.getAttribute("value")??""),o=l(this.getAttribute("name")??""),c=this.getAttribute("aria-label")??(r||"Text input"),s=l(this.getAttribute("autocomplete")??""),d=l(this.getAttribute("aria-describedby")??""),h=l(this.getAttribute("minlength")??""),m=l(this.getAttribute("maxlength")??""),f=l(this.getAttribute("pattern")??""),x=this.hasAttribute("error")||this.getAttribute("aria-invalid")==="true",A=b(this,"required")||this.getAttribute("aria-required")==="true",Pe=b(this,"readonly"),oe=this.resolveDescribedByText(),q=this.clearable&&n.length>0&&!this.loading&&!this.bare,it=`
      ${o?`name="${o}"`:""}
      ${this.disabled||this.loading?"disabled":""}
      ${A?"required":""}
      ${Pe?"readonly":""}
      aria-label="${l(c)}"
      ${d?`aria-describedby="${d}"`:""}
      ${oe?`aria-description="${l(oe)}"`:""}
      ${this.loading?'aria-busy="true"':""}
      ${x?'aria-invalid="true"':""}
      ${s?`autocomplete="${s}"`:""}
      ${h?`minlength="${h}"`:""}
      ${m?`maxlength="${m}"`:""}
      ${f?`pattern="${f}"`:""}
    `;this.bare?this.shadow.innerHTML=`
        <input
          part="input"
          class="viking-input-native"
          type="${i}"
          placeholder="${a}"
          value="${n}"
          ${it}
        />
      `:this.shadow.innerHTML=`
        <div class="${e}" part="shell">
          <slot name="leading"></slot>
          <input
            part="input"
            type="${i}"
            placeholder="${a}"
            value="${n}"
            ${it}
          />
          ${this.loading?'<span class="viking-input-spinner" aria-hidden="true"></span>':""}
          ${q?'<button type="button" class="viking-input-clear" aria-label="Clear input" part="clear">\xD7</button>':""}
          <slot name="trailing"></slot>
        </div>
      `,this.input=this.shadow.querySelector("input"),this.input?.addEventListener("input",this.onInput),this.input?.addEventListener("blur",this.onBlur),this.shadow.querySelector(".viking-input-clear")?.addEventListener("click",this.onClear),this.syncInternalsAria()}resolveDescribedByText(){let e=this.getAttribute("aria-describedby")??"";if(!e.trim())return"";let i=this.getRootNode()instanceof Document?this.getRootNode():document;return e.split(/\s+/).map(r=>i.getElementById(r)?.textContent?.trim()??"").filter(Boolean).join(" ")}syncInternalsAria(){if(!this.internals)return;let e=this.internals,i=this.hasAttribute("error")||this.getAttribute("aria-invalid")==="true";if("ariaInvalid"in e&&(e.ariaInvalid=i?"true":"false"),!("ariaDescribedByElements"in e))return;let r=this.getAttribute("aria-describedby")??"",a=this.getRootNode()instanceof Document?this.getRootNode():document,n=r.split(/\s+/).map(o=>a.getElementById(o)).filter(o=>o instanceof HTMLElement);try{e.ariaDescribedByElements=n}catch{}}},me=()=>{g(L.tag,L),v(L.legacyTag,L)};var H=class extends u{static angularTag="viking-modal";static tag="viking-modal-wc";static dialogTag="viking-dialog";static get observedAttributes(){return["open","title","dismissible"]}shadow;dialogEl=null;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),k(this.shadow,bt)}connectedCallback(){this.render(),this.syncOpen(),this.dialogEl?.addEventListener("close",this.onClose),this.dialogEl?.addEventListener("click",this.onBackdropClick)}disconnectedCallback(){this.dialogEl?.removeEventListener("close",this.onClose),this.dialogEl?.removeEventListener("click",this.onBackdropClick)}attributeChangedCallback(e){if(this.isConnected){if(e==="open"){this.syncOpen();return}if(e==="title"){this.updateTitle();return}e==="dismissible"&&(this.render(),this.syncOpen())}}openModal(){this.setAttribute("open",""),this.syncOpen()}closeModal(){this.removeAttribute("open"),B(this.dialogEl)}open(){this.openModal()}close(){this.closeModal()}get dismissible(){return this.getAttribute("dismissible")!=="false"}onClose=()=>{this.removeAttribute("open"),this.dispatchEvent(new CustomEvent("viking-close",{bubbles:!0,composed:!0}))};onBackdropClick=e=>{this.dismissible&&e.target===this.dialogEl&&this.closeModal()};syncOpen(){if(!this.dialogEl)return;let e=this.hasAttribute("open");e&&!this.dialogEl.open?(ce(this.dialogEl),queueMicrotask(()=>{(this.shadow.querySelector(".viking-modal-close")??this.dialogEl)?.focus()})):!e&&this.dialogEl.open&&B(this.dialogEl)}updateTitle(){let e=this.getAttribute("title")??"Dialog",i=this.shadow.querySelector(".viking-modal-heading");i&&(i.textContent=e),this.dialogEl?.setAttribute("aria-label",e)}render(){let e=this.getAttribute("title")??"Dialog";this.shadow.innerHTML=`
      <dialog class="viking-modal-backdrop" aria-label="${l(e)}" aria-modal="true">
        <div class="viking-modal-panel" part="panel" role="document">
          <header class="viking-modal-header" part="header">
            <h2 class="viking-modal-heading" part="title">${l(e)}</h2>
            ${this.dismissible?`<button type="button" class="viking-modal-close" part="close" aria-label="Close dialog">${p("x",20)}</button>`:""}
          </header>
          <div class="viking-modal-body" part="body"><slot></slot></div>
          <footer class="viking-modal-footer" part="footer"><slot name="actions"></slot></footer>
        </div>
      </dialog>
    `,this.dialogEl=this.shadow.querySelector("dialog"),this.shadow.querySelector(".viking-modal-close")?.addEventListener("click",()=>this.closeModal()),this.dialogEl?.addEventListener("keydown",i=>{i.key==="Escape"&&this.dismissible&&(i.preventDefault(),this.closeModal())})}},be=()=>{g(H.tag,H),v(H.dialogTag,H)};function We(){return typeof globalThis>"u"?{}:globalThis.DemlWidgets??{}}var fe=null,si=null,li=0;function ye(t){return fe||(fe=Ue(t),typeof document<"u"&&(si=Ge(fe))),fe}function Ue(t){let e=Math.max(1,t?.maxDepth??40),i=[],r=[],a=new Set,n=!1,o=()=>{for(let s of a)try{s()}catch{}},c=s=>{for(i.push(s);i.length>e;)i.shift();r.length=0,o()};return{async run(s){if(!n){n=!0;try{await s.do(),c({id:s.id??`cmd-${++li}`,label:s.label.trim()||"Action",undo:s.undo,redo:s.do})}finally{n=!1}}},async undo(){if(n||i.length===0)return!1;n=!0;let s=i.pop();try{return await s.undo(),r.push(s),o(),!0}catch{return i.push(s),o(),!1}finally{n=!1}},async redo(){if(n||r.length===0)return!1;n=!0;let s=r.pop();try{for(await s.redo(),i.push(s);i.length>e;)i.shift();return o(),!0}catch{return r.push(s),o(),!1}finally{n=!1}},clear(){i.length=0,r.length=0,o()},canUndo:()=>i.length>0,canRedo:()=>r.length>0,undoLabel:()=>i[i.length-1]?.label??null,redoLabel:()=>r[r.length-1]?.label??null,subscribe(s){return a.add(s),()=>{a.delete(s)}}}}function ci(t){if(!(t instanceof HTMLElement))return!1;let e=t.tagName;return e==="INPUT"||e==="TEXTAREA"||e==="SELECT"||t.isContentEditable?!0:!!t.closest("[contenteditable='true']")}function Ge(t,e){let i=e?.target??(typeof document<"u"?document:null);if(!i)return()=>{};let r=a=>{if(!a.metaKey&&!a.ctrlKey||ci(a.target))return;let n=a.key.toLowerCase(),o=n==="z"&&a.shiftKey,c=n==="y"&&!a.shiftKey;if(n==="z"&&!a.shiftKey){if(!t.canUndo())return;a.preventDefault(),t.undo();return}if(o||c){if(!t.canRedo())return;a.preventDefault(),t.redo()}};return i.addEventListener("keydown",r),()=>i.removeEventListener("keydown",r)}function Fe(t,e){let i=e.trim().toLowerCase();if(!i)return 0;let r=t.title.toLowerCase();if(r===i)return 100;if(r.startsWith(i))return 80;if(r.includes(i))return 60;let a=(t.keywords??[]).join(" ").toLowerCase();if(a.includes(i))return 45;let n=i.split(/\s+/).filter(Boolean);if(n.length>1){let d=0;for(let h of n)(r.includes(h)||a.includes(h)||(t.snippet??"").toLowerCase().includes(h))&&(d+=1);if(d===n.length)return 50;if(d>0)return 12*d}return(t.snippet??"").toLowerCase().includes(i)?25:(t.group??"").toLowerCase().includes(i)?15:t.href.toLowerCase().includes(i)?10:0}function xe(t,e,i){let r=i?.limit??48,a=e.trim();return a?t.map(n=>({item:n,score:Fe(n,a)})).filter(n=>n.score>0).sort((n,o)=>o.score-n.score||n.item.title.localeCompare(o.item.title)).slice(0,Math.max(0,r)).map(n=>n.item):t.slice(0,Math.max(0,r))}var V="viking-search-recent-v1",yt=8;function je(){try{return typeof globalThis.localStorage>"u"?null:globalThis.localStorage}catch{return null}}function xt(t){return t.trim().replace(/\s+/g," ").slice(0,120)}function P(t=V,e){let i=e?.limit??8,r=je();if(!r)return[];try{let a=r.getItem(t);if(!a)return[];let n=JSON.parse(a);if(!Array.isArray(n))return[];let o=[];for(let c of n){if(!c||typeof c!="object")continue;let s=xt(String(c.query??""));if(!s)continue;let d=c.title,h=c.href,m=Number(c.at)||Date.now();if(o.push({query:s,title:typeof d=="string"?d.slice(0,200):void 0,href:typeof h=="string"?h.slice(0,2048):void 0,at:m}),o.length>=i)break}return o}catch{return[]}}function wt(t,e){let i=je();if(i)try{i.setItem(e,JSON.stringify(t))}catch{}}function we(t,e=V){if(!t.length){te(e);return}wt(t,e)}function Se(t,e){let i=e?.storageKey??V,r=e?.limit??8,a=xt(t.query);if(!a)return P(i,{limit:r});let n={query:a,title:t.title?.slice(0,200),href:t.href?.slice(0,2048),at:Date.now()},o=P(i,{limit:r*2}).filter(s=>n.href&&s.href&&s.href!==n.href||s.query!==n.query),c=[n,...o].slice(0,r);return wt(c,i),c}function te(t=V){let e=je();if(e)try{e.removeItem(t)}catch{}}function Ee(t){return t.map(e=>({title:e.title||e.query,href:e.href||`#viking-recent:${encodeURIComponent(e.query)}`,snippet:e.title?`Recent \xB7 ${e.query}`:"Recent search",group:"Recent",keywords:["recent",e.query]}))}var St="#viking-recent:",di=t=>{let e=t.getAttribute("items");if(!e)return[];try{let i=JSON.parse(e);return Array.isArray(i)?i:[]}catch{return[]}},Ye=t=>t.getAttribute("recent-storage-key")?.trim()||V,gi=(t,e)=>{let i=di(t),r=e.trim();if(r)return xe(i,r);let a=Ee(P(Ye(t))),n=new Set(a.map(c=>`${c.title}:${c.href}`)),o=i.filter(c=>{let s=`${c.title}:${c.href}`;return n.has(s)?!1:(n.add(s),!0)});return[...a,...o]},hi=t=>{let e=new Map;return t.forEach(i=>{let r=i.group??null,a=e.get(r)??[];a.push(i),e.set(r,a)}),Array.from(e.entries()).map(([i,r])=>({group:i,items:r}))},S=class extends u{static tag="viking-command-palette";static searchTag="viking-search-palette";static legacyTag="viking-search-palette-wc";static get observedAttributes(){return["open","placeholder","items","global-shortcut","recent-storage-key"]}shadow;dialogEl=null;inputEl=null;resultsEl=null;globalKeyHandler=null;resultsId=_("viking-search-results");inputId=_("viking-search-input");query="";activeIndex=0;flatResults=[];history=ye();constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),k(this.shadow,ft)}connectedCallback(){this.render(),this.removeAttribute("open"),this.syncOpen(),this.bindGlobalShortcut(),this.dialogEl?.addEventListener("close",this.onClose),this.dialogEl?.addEventListener("click",this.onBackdropClick),this.inputEl?.addEventListener("input",this.onInput),this.inputEl?.addEventListener("keydown",this.onInputKeydown)}disconnectedCallback(){this.dialogEl?.removeEventListener("close",this.onClose),this.dialogEl?.removeEventListener("click",this.onBackdropClick),this.inputEl?.removeEventListener("input",this.onInput),this.inputEl?.removeEventListener("keydown",this.onInputKeydown),this.unbindGlobalShortcut()}attributeChangedCallback(e){if(this.isConnected&&(e==="open"&&this.syncOpen(),e==="global-shortcut"&&(this.unbindGlobalShortcut(),this.bindGlobalShortcut()),e==="items"||e==="placeholder"))if(e==="placeholder"&&this.inputEl){let i=this.getAttribute("placeholder")??"Search documentation, dashboard, API\u2026";this.inputEl.placeholder=i,this.inputEl.setAttribute("aria-label",i)}else this.renderResults()}openPalette(){this.setAttribute("open",""),this.syncOpen()}closePalette(){this.removeAttribute("open"),B(this.dialogEl)}search(e){this.query=e,this.inputEl&&(this.inputEl.value=e),this.activeIndex=0,this.renderResults(),this.dispatchEvent(new CustomEvent("viking-query",{bubbles:!0,composed:!0,detail:{query:this.query}}))}onClose=()=>{this.removeAttribute("open"),this.query="",this.activeIndex=0,this.inputEl&&(this.inputEl.value=""),this.dispatchEvent(new CustomEvent("viking-close",{bubbles:!0,composed:!0}))};onBackdropClick=e=>{e.target===this.dialogEl&&this.closePalette()};onInput=e=>{this.query=e.target.value??this.inputEl?.value??"",this.activeIndex=0,this.renderResults(),this.dispatchEvent(new CustomEvent("viking-query",{bubbles:!0,composed:!0,detail:{query:this.query}}))};onInputKeydown=e=>{if(e.key==="Escape"){e.preventDefault(),this.closePalette();return}if(this.flatResults.length!==0){if(e.key==="ArrowDown"){e.preventDefault(),this.activeIndex=Math.min(this.flatResults.length-1,this.activeIndex+1),this.renderResults(),this.scrollActiveIntoView();return}if(e.key==="ArrowUp"){e.preventDefault(),this.activeIndex=Math.max(0,this.activeIndex-1),this.renderResults(),this.scrollActiveIntoView();return}if(e.key==="Enter"){e.preventDefault();let i=this.flatResults[this.activeIndex];i&&this.activateItem(i)}}};bindGlobalShortcut(){b(this,"global-shortcut")&&(this.globalKeyHandler=e=>{let i=(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k",r=e.key==="/"&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!this.hasAttribute("open")&&!ui(e.target);if(!(!i&&!r)){if(e.preventDefault(),i&&this.hasAttribute("open")){this.closePalette();return}this.openPalette()}},document.addEventListener("keydown",this.globalKeyHandler))}unbindGlobalShortcut(){this.globalKeyHandler&&(document.removeEventListener("keydown",this.globalKeyHandler),this.globalKeyHandler=null)}syncOpen(){if(!this.dialogEl)return;let e=this.hasAttribute("open");e&&!this.dialogEl.open?(this.dialogEl.removeAttribute("aria-hidden"),ce(this.dialogEl),this.activeIndex=0,this.renderResults(),queueMicrotask(()=>this.inputEl?.focus())):!e&&this.dialogEl.open?(B(this.dialogEl),this.dialogEl.setAttribute("aria-hidden","true")):e||this.dialogEl.setAttribute("aria-hidden","true")}scrollActiveIntoView(){this.resultsEl?.querySelector(".viking-search-result.is-selected")?.scrollIntoView({block:"nearest"})}activateItem(e){if(e.href.startsWith(St)){let r=e.href.slice(St.length),a=e.title;try{a=decodeURIComponent(r)||e.title}catch{a=e.title}this.search(a);return}let i=this.query.trim()||e.title;if(Se({query:i,title:e.title,href:e.href!=="#"?e.href:void 0},{storageKey:Ye(this)}),this.dispatchEvent(new CustomEvent("viking-select",{bubbles:!0,composed:!0,detail:{item:e}})),this.closePalette(),e.action==="cookie-settings"){We().openCookieSettings?.();return}if(e.action==="bug-report"){let r=We().openBugReport;if(r){r();return}}if(e.href&&e.href!=="#")try{let r=new URL(e.href,window.location.href);r.origin===window.location.origin?window.location.assign(`${r.pathname}${r.search}${r.hash}`):window.location.assign(r.href)}catch{window.location.assign(e.href)}}renderResults(){if(!this.resultsEl)return;let e=gi(this,this.query);this.flatResults=e;let i=!this.query.trim()&&e.some(s=>s.group==="Recent");if(e.length===0){let s=this.query.trim();this.resultsEl.innerHTML=`<p class="viking-search-empty" role="status">${s?"No results found":"Start typing to search\u2026"}</p>`,this.inputEl?.removeAttribute("aria-activedescendant");return}this.activeIndex>=e.length&&(this.activeIndex=e.length-1);let r=0,a=hi(e),n=i?'<button type="button" class="viking-search-clear-recent" data-clear-recent>Clear recent</button>':"",o=a.map(({group:s,items:d})=>{let h=s?`<div class="viking-search-group-header" role="presentation"><p class="viking-search-group-label">${l(s)}</p>${s==="Recent"?n:""}</div>`:"",m=d.map(f=>{let x=`${this.resultsId}-result-${r}`,A=r===this.activeIndex;return r+=1,`
              <a
                id="${x}"
                class="viking-search-result${A?" is-selected":""}"
                role="option"
                aria-selected="${A}"
                href="${l(f.href)}"
                part="result"
                data-index="${r-1}"
              >
                <div>
                  <div class="viking-search-result-title">${l(f.title)}</div>
                  ${f.snippet?`<div class="viking-search-result-snippet">${l(f.snippet)}</div>`:""}
                </div>
              </a>`}).join("");return`${h}${m}`}).join("");this.resultsEl.innerHTML=`<div class="viking-search-results" id="${this.resultsId}" role="listbox" aria-label="Search results">${o}</div>`,this.resultsEl.querySelector("[data-clear-recent]")?.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation();let d=Ye(this),h=P(d);h.length&&this.history.run({label:"Cleared recent searches",do:()=>{te(d),this.renderResults()},undo:()=>{we(h,d),this.renderResults()}})});let c=`${this.resultsId}-result-${this.activeIndex}`;this.inputEl?.setAttribute("aria-activedescendant",c),this.inputEl?.setAttribute("role","combobox"),this.inputEl?.setAttribute("aria-expanded","true"),this.inputEl?.setAttribute("aria-controls",this.resultsId),this.resultsEl.querySelectorAll(".viking-search-result").forEach(s=>{s.addEventListener("click",d=>{let h=d;if(h.metaKey||h.ctrlKey||h.shiftKey||h.button===1){this.closePalette();return}d.preventDefault();let m=Number(s.dataset.index??0),f=this.flatResults[m];f&&this.activateItem(f)}),s.addEventListener("mouseenter",()=>{let d=Number(s.dataset.index??0);if(d===this.activeIndex)return;this.activeIndex=d,this.resultsEl?.querySelectorAll(".viking-search-result").forEach((m,f)=>{let x=f===d;m.classList.toggle("is-selected",x),m.setAttribute("aria-selected",x?"true":"false")});let h=`${this.resultsId}-result-${d}`;this.inputEl?.setAttribute("aria-activedescendant",h)})})}render(){let e=this.getAttribute("placeholder")??"Search documentation, dashboard, API\u2026",i=de();this.shadow.innerHTML=`
      <dialog class="viking-search-palette-backdrop" aria-label="Search" aria-hidden="true">
        <div class="viking-search-palette" part="panel" role="document">
          <div class="viking-search-palette-header" part="header">
            <span class="viking-search-palette-icon" aria-hidden="true">${p("search",24)}</span>
            <input
              id="${this.inputId}"
              type="search"
              class="viking-search-palette-input"
              part="input"
              placeholder="${l(e)}"
              aria-label="${l(e)}"
              aria-autocomplete="list"
              autocomplete="off"
              spellcheck="false"
            />
            <button type="button" class="viking-search-palette-close" part="close" aria-label="Close search">${p("x",20)}</button>
          </div>
          <div class="viking-search-palette-body" part="body">
            <slot></slot>
            <div class="viking-search-results-host"></div>
          </div>
          <footer class="viking-search-palette-footer" part="footer">
            <span class="viking-kbd">${i}</span><span class="viking-kbd">K</span> /
            <span class="viking-kbd">/</span> open \xB7
            <span class="viking-kbd">\u2191</span><span class="viking-kbd">\u2193</span> navigate \xB7
            <span class="viking-kbd">Enter</span> open \xB7
            <span class="viking-kbd">Esc</span> close \xB7
            <span class="viking-kbd">?</span> all shortcuts
          </footer>
        </div>
      </dialog>
    `,this.dialogEl=this.shadow.querySelector("dialog"),this.inputEl=this.shadow.querySelector("input"),this.resultsEl=this.shadow.querySelector(".viking-search-results-host"),this.shadow.querySelector(".viking-search-palette-close")?.addEventListener("click",()=>this.closePalette()),this.dialogEl?.addEventListener("keydown",r=>{r.key==="Escape"&&(r.preventDefault(),this.closePalette())})}};function ui(t){if(!(t instanceof HTMLElement))return!1;let e=t.tagName;return e==="INPUT"||e==="TEXTAREA"||e==="SELECT"||t.isContentEditable?!0:!!t.closest("[contenteditable='true']")}var G=()=>{g(S.tag,S),v(S.searchTag,S),v(S.legacyTag,S)};var vi=new Set(["accent","secondary","success","warning","danger","info","muted"]),N=class extends u{static tag="viking-status-card";static legacyTag="viking-status-card-wc";static get observedAttributes(){return["title","subtitle","status","status-tone","status-dot","href","target","compact","loading","interactive","aria-label"]}shadow=this.attachShadow({mode:"open"});connectedCallback(){this.render()}attributeChangedCallback(){this.isConnected&&this.render()}get compact(){let e=this.getAttribute("compact");return e!==null&&e!=="false"}get loading(){let e=this.getAttribute("loading");return e!==null&&e!=="false"}get interactive(){let e=this.getAttribute("interactive");return e!==null&&e!=="false"}get href(){return this.getAttribute("href")}get target(){return this.getAttribute("target")}get statusTone(){let e=this.getAttribute("status-tone")??"muted";return vi.has(e)?e:"muted"}get statusDot(){let e=this.getAttribute("status-dot");return e!==null&&e!=="false"}get cardTitle(){return this.getAttribute("title")??""}get subtitle(){return this.getAttribute("subtitle")??""}get status(){return this.getAttribute("status")??""}render(){let e=this.status.length>0,i=this.cardTitle,r=this.subtitle,a=this.compact?" status-card--compact":"",n=this.loading?" status-card--loading":"",o=this.interactive?" status-card--interactive":"",c=`status-card${a}${n}${o}`,s=this.target==="_blank"?' rel="noopener noreferrer"':"",d=this.statusDot?'<span class="status-card__status-dot" aria-hidden="true"></span>':"",h=e?`<span class="status-card__status status-card__status-${this.statusTone}" part="status">${d}<span>${l(this.status)}</span></span>`:"",m=this.href?l(this.href):"",f=l(this.getAttribute("aria-label")??""),x=m?"a":"div",A=`
      <header class="status-card__header">
        <div class="status-card__title-wrap">
          ${i?`<h3 class="status-card__title" part="title">${l(i)}</h3>`:""}
          ${r?`<p class="status-card__subtitle" part="subtitle">${l(r)}</p>`:""}
        </div>
        ${e||d?`<div class="status-card__status-wrap">${h}</div>`:""}
      </header>
    `;this.shadow.innerHTML=`
      <style>
        ${pi}
      </style>
      <${x}
        class="${c}"
        part="card"
        ${m?`href="${m}"`:""}
        ${this.target?`target="${l(this.target)}"`:""}
        ${m?s:""}
        ${f?`aria-label="${f}"`:""}
      >
        ${A}
        <section class="status-card__body">
          <slot></slot>
        </section>
      </${x}>
    `}},pi=`
:host {
  display: block;
}

:host([compact]) .status-card,
:host .status-card--compact {
  padding: var(--viking-space-3); /* Slightly increased compact breathing while staying compact */
  gap: var(--viking-space-3);
  border-radius: var(--viking-radius-lg);
}

.status-card {
  display: grid;
  gap: var(--viking-space-4);
  width: 100%;
  padding: var(--viking-card-padding);
  border-radius: var(--viking-radius-xl); /* Increased rounding for premium structured feel */
  border: 1px solid var(--viking-border);
  background: var(--viking-surface);
  color: var(--viking-text);
  box-sizing: border-box;
  transition: var(--viking-transition-interactive);
  text-decoration: none;
}

.status-card--interactive {
  cursor: pointer;
}

.status-card--interactive:hover {
  border-color: var(--viking-accent-strong);
  box-shadow: var(--viking-shadow-sm);
  transform: translateY(calc(var(--viking-state-hover-lift) * -1));
}

.status-card--loading {
  pointer-events: none;
  opacity: var(--viking-state-disabled-opacity);
}

.status-card__header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--viking-space-3);
  align-items: flex-start;
  min-width: 0;
  padding-bottom: var(--viking-space-3); /* Better breathing in header */
  margin-bottom: var(--viking-space-3);
  border-bottom: 1px solid var(--viking-border);
}

.status-card__title-wrap {
  display: grid;
  gap: var(--viking-space-1);
  min-width: 0;
  flex: 1 1 min(100%, 18rem);
}

.status-card__title {
  margin: 0;
  font-size: var(--viking-font-size-xl);
  font-weight: var(--viking-font-weight-bold);
  letter-spacing: var(--viking-letter-spacing-tight);
  line-height: var(--viking-line-height-tight);
}

.status-card__subtitle {
  margin: 0;
  max-width: 60ch;
  color: var(--viking-text-muted);
  font-size: var(--viking-font-size-sm);
  line-height: var(--viking-line-height-relaxed);
}

.status-card__status-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 1 auto;
  min-width: 0;
}

.status-card__status {
  display: inline-flex;
  align-items: center;
  gap: var(--viking-space-1);
  max-width: fit-content;
  padding: calc(var(--viking-space-0-5) - var(--viking-space-px))
    var(--viking-space-1);
  border-radius: var(--viking-radius-pill);
  border: 1px solid var(--viking-border-subtle);
  background: color-mix(in srgb, var(--viking-surface) 92%, transparent);
  color: var(--viking-text-muted);
  text-transform: capitalize;
  font-size: var(--viking-font-size-xs);
  font-weight: var(--viking-font-weight-semibold);
  letter-spacing: var(--viking-letter-spacing-wide);
}

.status-card__status-dot {
  width: var(--viking-space-1);
  height: var(--viking-space-1);
  border-radius: var(--viking-radius-full);
  background: currentColor;
  flex: 0 0 auto;
}

.status-card__status-success {
  background: color-mix(in srgb, var(--viking-success) 12%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-success) 40%, transparent);
  color: var(--viking-success);
}

.status-card__status-warning {
  background: color-mix(in srgb, var(--viking-warning) 12%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-warning) 40%, transparent);
  color: var(--viking-warning);
}

.status-card__status-danger {
  background: color-mix(in srgb, var(--viking-danger) 12%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-danger) 45%, transparent);
  color: var(--viking-danger-text);
}

.status-card__status-accent {
  background: color-mix(in srgb, var(--viking-accent) 12%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-accent) 40%, transparent);
  color: var(--viking-accent);
}

.status-card__status-secondary {
  background: color-mix(in srgb, var(--viking-accent-secondary) 12%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-accent-secondary) 40%, transparent);
  color: var(--viking-accent-secondary);
}

.status-card__status-info {
  background: color-mix(in srgb, var(--viking-info) 12%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-info) 40%, transparent);
  color: var(--viking-info);
}

.status-card__status-muted {
  background: var(--viking-surface);
  border-color: var(--viking-border-subtle);
  color: var(--viking-text-muted);
}

.status-card__body {
  display: grid;
  gap: var(--viking-space-4); /* Improved vertical rhythm inside the card body for breathing */
  min-width: 0;
  width: 100%;
}

.status-card__body > * {
  width: 100%;
  min-width: 0;
}
`,_e=()=>{g(N.tag,N),v(N.legacyTag,N)};var ki=new Set(["accent","secondary","success","warning","danger","info","muted"]),$=class extends u{static tag="viking-status-pill";static legacyTag="viking-status-pill-wc";static get observedAttributes(){return["tone","icon","href","target","compact","dot","removable","aria-label"]}shadow;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),k(this.shadow,mi)}connectedCallback(){this.render()}attributeChangedCallback(){this.isConnected&&this.render()}get tone(){let e=this.getAttribute("tone")??"muted";return ki.has(e)?e:"muted"}get compact(){let e=this.getAttribute("compact");return e!==null&&e!=="false"}get removable(){let e=this.getAttribute("removable");return e!==null&&e!=="false"}get href(){return this.getAttribute("href")}get icon(){return this.getAttribute("icon")}get showDot(){let e=this.getAttribute("dot");return e!==null&&e!=="false"}onRemove=()=>{this.dispatchEvent(new CustomEvent("viking-pill-removed",{bubbles:!0,composed:!0}))};render(){let e=this.tone,i=this.compact?" status-pill--compact":"",r=this.icon?p(this.icon,14,"status-pill__icon"):"",a=this.showDot?'<span class="status-pill__dot" aria-hidden="true"></span>':"",n='<span class="status-pill__label" part="label"><slot></slot></span>',o=l(this.getAttribute("aria-label")??""),c=this.href,s=this.getAttribute("target"),d=c&&s==="_blank"?' rel="noopener noreferrer"':"";if(c){this.shadow.innerHTML=`
        <a
          class="status-pill status-pill-${e}${i}"
          part="control"
          href="${l(c)}"
          ${s?`target="${l(s)}"${d}`:""}
          ${o?`aria-label="${o}"`:""}
        >
          ${a}
          ${r}
          ${n}
        </a>
      `;return}this.shadow.innerHTML=`
      <span
        class="status-pill status-pill-${e}${i}"
        part="control"
        ${o?`role="status" aria-label="${o}"`:""}
      >
        ${a}
        ${r}
        ${n}
        ${this.removable?'<button type="button" class="status-pill__remove" part="remove" aria-label="Remove"><span class="status-pill__remove-icon" aria-hidden="true">&times;</span></button>':""}
      </span>
    `,this.shadow.querySelector(".status-pill__remove")?.addEventListener("click",this.onRemove)}},mi=`
:host {
  display: inline-flex;
}

.status-pill {
  --viking-status-pill-bg: color-mix(in srgb, var(--viking-surface-alt) 88%, var(--viking-surface));
  --viking-status-pill-text: var(--viking-text-muted);
  --viking-status-pill-border: var(--viking-border-subtle);
  --viking-status-pill-shadow: var(--viking-shadow-xs);

  display: inline-flex;
  align-items: center;
  gap: var(--viking-space-0-5);
  padding: var(--viking-space-0-5) var(--viking-space-2);
  border-radius: var(--viking-radius-pill);
  border: 1px solid var(--viking-status-pill-border);
  background: var(--viking-status-pill-bg);
  color: var(--viking-status-pill-text);
  font-family: var(--viking-font-family);
  font-size: var(--viking-font-size-xs);
  font-weight: var(--viking-font-weight-semibold);
  letter-spacing: var(--viking-letter-spacing-caps);
  line-height: var(--viking-line-height-snug);
  white-space: nowrap;
  text-transform: uppercase;
  box-shadow: var(--viking-status-pill-shadow);
}

:host(:hover) .status-pill {
  text-decoration: none;
}

.status-pill--compact {
  padding: var(--viking-space-0-5);
  font-size: var(--viking-font-size-2xs);
}

.status-pill__label {
  display: inline-flex;
  align-items: center;
}

.status-pill__dot {
  width: var(--viking-space-1);
  height: var(--viking-space-1);
  border-radius: var(--viking-radius-full);
  background: currentColor;
  flex: 0 0 auto;
}

.status-pill__icon,
::slotted([data-viking-icon]) {
  width: var(--viking-space-3);
  height: var(--viking-space-3);
  color: currentColor;
  flex-shrink: 0;
}

.status-pill__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  background: transparent;
  color: currentColor;
  border-radius: var(--viking-radius-full);
  width: var(--viking-touch-target-min);
  height: var(--viking-touch-target-min);
  margin-right: calc(var(--viking-space-0-5) * -1);
  padding: 0;
  cursor: pointer;
}

.status-pill__remove:hover {
  background: color-mix(in srgb, currentColor 10%, transparent);
}

.status-pill__remove:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.status-pill-accent {
  --viking-status-pill-bg: color-mix(in srgb, var(--viking-accent) 18%, var(--viking-surface));
  --viking-status-pill-text: var(--viking-accent);
  --viking-status-pill-border: color-mix(in srgb, var(--viking-accent) 52%, transparent);
}

.status-pill-secondary {
  --viking-status-pill-bg: color-mix(in srgb, var(--viking-accent-secondary) 16%, var(--viking-surface));
  --viking-status-pill-text: var(--viking-accent-secondary);
  --viking-status-pill-border: color-mix(in srgb, var(--viking-accent-secondary) 52%, transparent);
}

.status-pill-success {
  --viking-status-pill-bg: color-mix(in srgb, var(--viking-success) 16%, var(--viking-surface));
  --viking-status-pill-text: var(--viking-success);
  --viking-status-pill-border: color-mix(in srgb, var(--viking-success) 55%, transparent);
}

.status-pill-warning {
  --viking-status-pill-bg: color-mix(in srgb, var(--viking-warning) 16%, var(--viking-surface));
  --viking-status-pill-text: var(--viking-warning);
  --viking-status-pill-border: color-mix(in srgb, var(--viking-warning) 55%, transparent);
}

.status-pill-danger {
  --viking-status-pill-bg: color-mix(in srgb, var(--viking-danger) 14%, var(--viking-surface));
  --viking-status-pill-text: var(--viking-danger-text);
  --viking-status-pill-border: color-mix(in srgb, var(--viking-danger) 50%, transparent);
}

.status-pill-info {
  --viking-status-pill-bg: color-mix(in srgb, var(--viking-info) 14%, var(--viking-surface));
  --viking-status-pill-text: var(--viking-info);
  --viking-status-pill-border: color-mix(in srgb, var(--viking-info) 50%, transparent);
}

.status-pill-muted {
  --viking-status-pill-bg: var(--viking-surface);
  --viking-status-pill-text: var(--viking-text-muted);
  --viking-status-pill-border: var(--viking-border-subtle);
}

.status-pill a {
  color: inherit;
}

a.status-pill {
  text-decoration: none;
}
`,Ae=()=>{g($.tag,$),v($.legacyTag,$)};var F=[{id:"blue-notes",label:"Blue Notes",icon:"file",appHref:"https://dataengineeringformachinelearning.com/blog/",marketingHref:"/blog/"},{id:"book",label:"Book",icon:"policy",appHref:"https://dataengineeringformachinelearning.com/book/",marketingHref:"/book"},{id:"dashboard",label:"Dashboard",icon:"home",appHref:"/dashboard",marketingHref:"/dashboard",requireAuth:!0,platform:!0},{id:"sites",label:"Sites",icon:"building",appHref:"/settings",marketingHref:"/settings",requireAuth:!0,platform:!0},{id:"account",label:"Account",icon:"user",appHref:"/account",marketingHref:"/account",requireAuth:!0,platform:!0}],Ie=[{title:"Platforms",links:[{label:"DEML",appHref:"/",marketingHref:"https://deml.app/",platform:!0},{label:"FORJD",appHref:"https://forjd.co/",marketingHref:"https://forjd.co/",external:!0},{label:"Explore",appHref:"/explore",marketingHref:"/explore",platform:!0},{label:"Dashboard",appHref:"/dashboard",marketingHref:"/dashboard",platform:!0,requireAuth:!0}]},{title:"Resources",links:[{label:"Community",appHref:"https://dataengineeringformachinelearning.com/",marketingHref:"/"},{label:"Whitepaper",appHref:"https://dataengineeringformachinelearning.com/whitepaper/",marketingHref:"/whitepaper"},{label:"Book",appHref:"https://dataengineeringformachinelearning.com/book/",marketingHref:"/book"},{label:"Blue Notes",appHref:"https://dataengineeringformachinelearning.com/blog/",marketingHref:"/blog/"},{label:"DEML Swagger",appHref:"https://backend.deml.app/api/v1/docs",marketingHref:"https://backend.deml.app/api/v1/docs",external:!0},{label:"DEML ReDoc",appHref:"https://backend.deml.app/api/v1/redoc",marketingHref:"https://backend.deml.app/api/v1/redoc",external:!0},{label:"FORJD capabilities",appHref:"https://backend.forjd.co/api/v1/capabilities",marketingHref:"https://backend.forjd.co/api/v1/capabilities",external:!0}]},{title:"Support",links:[{label:"Platform Status",appHref:"/status/platform-status",marketingHref:"/status/platform-status",platform:!0},{label:"Report a Bug",appHref:"#",marketingHref:"#",action:"bug-report"}]},{title:"Legal & Compliance",links:[{label:"Privacy Policy",appHref:"https://dataengineeringformachinelearning.com/privacy/",marketingHref:"/privacy"},{label:"Terms of Service",appHref:"https://dataengineeringformachinelearning.com/terms/",marketingHref:"/terms"},{label:"SOC2 Compliance",appHref:"https://dataengineeringformachinelearning.com/compliance/",marketingHref:"/compliance"},{label:"GDPR Compliance",appHref:"https://dataengineeringformachinelearning.com/privacy/#gdpr",marketingHref:"/privacy#gdpr"},{label:"Cookie Settings",appHref:"#",marketingHref:"#",action:"cookie-settings"}]}],bi="reportBug=1",fi="cookieSettings=1",Et=t=>/^https?:\/\//i.test(t),Me=(t,e)=>{if(Et(e))return e;let i=t.replace(/\/$/,""),r=e.startsWith("/")?e:`/${e}`;return`${i}${r}`},Xe=t=>`${Me(t.app,"/")}?${bi}`,Je=t=>`${Me(t.marketing,"/")}?${fi}`,_t=(t,e,i)=>Et(t)||t.startsWith("mailto:")||e==="marketing"&&t.startsWith("/")?t:Me(i.marketing,t),At=(t,e,i)=>e==="app"?t:Me(i.app,t),j=(t,e,i)=>t.platform?At(t.appHref,e,i):e==="app"?t.appHref:_t(t.marketingHref,e,i),Te=(t,e,i)=>t.action==="bug-report"?e==="app"?"#":Xe(i):t.action==="cookie-settings"?Je(i):t.platform?At(t.appHref,e,i):e==="app"?t.appHref:_t(t.marketingHref,e,i),Ce=(t,e)=>t==="marketing"?"/":e.marketing,It=(t,e=!1)=>t.filter(i=>!i.requireAuth||e);var y={app:"https://deml.app",marketing:"https://dataengineeringformachinelearning.com",backend:"https://backend.deml.app"};var Mt=t=>{if(t==null)return!1;let e=t.trim().toLowerCase();return e===""||e==="true"||e==="1"?!0:!(e==="false"||e==="0"||e==="off"||e==="no")},Le=(t,e=0)=>{if(t==null||t.trim()==="")return e;let i=Number(t);return Number.isFinite(i)?i:e},Tt=t=>{if(!(t==null||t.trim()===""))try{return JSON.parse(t)}catch{return}},He=(t,e,i)=>{let r=i??e[0];if(r===void 0)throw new Error("parseSelect requires a non-empty options list");return t==null?r:e.includes(t)?t:r};var Y=class extends u{_props={};_updateScheduled=!1;connectedCallback(){this.scheduleRender()}attributeChangedCallback(e,i,r){i!==r&&this.isConnected&&this.scheduleRender()}attr(e,i){let r=this.getAttribute(e);return i?.parser?r==null&&i.default!==void 0?i.default:i.parser(r):r??(i?.default!==void 0?String(i.default):null)}setProp(e,i){Object.is(this._props[e],i)||(this._props[e]=i,this.isConnected&&this.scheduleRender())}getProp(e){return this._props[e]}requestUpdate(){this.scheduleRender()}scheduleRender(){this._updateScheduled||(this._updateScheduled=!0,queueMicrotask(()=>{this._updateScheduled=!1,this.isConnected&&this.render()}))}};var Lt=["app","marketing","backend","docs"],Ct=()=>{if(typeof document>"u")return"marketing";let t=document.documentElement.getAttribute("data-deml-context");if(t&&Lt.includes(t))return t;if(typeof window>"u")return"marketing";let e=window.location.hostname;return e.startsWith("backend.")?"backend":e.startsWith("ui.")?"docs":e.includes("deml.app")?"app":"marketing"},D=class extends Y{static tag="viking-site-footer";static legacyTag="viking-site-footer-wc";static get observedAttributes(){return["context","app-url","marketing-url","backend-url","year","authenticated"]}onAuthState=e=>{let i=e.detail;this.toggleAttribute("authenticated",i?.isAuthenticated===!0)};connectedCallback(){window.addEventListener("deml:auth-state",this.onAuthState),document.documentElement.dataset.authenticated==="true"&&this.setAttribute("authenticated",""),super.connectedCallback()}disconnectedCallback(){window.removeEventListener("deml:auth-state",this.onAuthState)}resolveContext(){return this.attr("context",{parser:e=>He(e,Lt,Ct()),default:Ct()})}resolveUrls(){let e=globalThis.__DEML??{};return{app:this.getAttribute("app-url")??e.app??y.app,marketing:this.getAttribute("marketing-url")??e.marketing??y.marketing,backend:this.getAttribute("backend-url")??e.backend??y.backend}}resolveYear(){return this.attr("year",{parser:e=>Le(e,new Date().getFullYear()),default:new Date().getFullYear()})}render(){let e=this.resolveContext(),i=this.resolveUrls(),r=this.resolveYear(),a=this.hasAttribute("authenticated"),n=Ie.map(o=>{let c=o.links.filter(s=>!s.requireAuth||a).map(s=>{let d=Te(s,e,i);return`
          <li>
            <a href="${l(d)}">${l(s.label)}</a>
          </li>
        `}).join("");return`
      <div class="footer-column">
        <h2 class="footer-column-title">${l(o.title)}</h2>
        <ul class="footer-list">
          ${c}
        </ul>
      </div>
    `}).join("");this.innerHTML=`
      <footer class="mega-footer">
        <div class="footer-content">
          <nav class="footer-directory" aria-label="Footer Directory">
            ${n}
          </nav>

          <section class="footer-bottom">
            <div class="footer-badges-top">
              <span
                class="usa-badge"
                id="usa-badge"
              >
                <span class="usa-badge-icon" aria-hidden="true">\u{1F1FA}\u{1F1F8}</span>
                <span>Made in the U.S.A</span>
              </span>
            </div>

            <div class="footer-compliance-row">
              <div class="copyright-info">
                <span class="copyright-text">
                  Copyright \xA9 ${r} Data Engineering for Machine Learning by
                  <a href="https://joealongi.dev/" target="_blank" rel="noopener noreferrer">Joe Alongi</a>.
                  All rights reserved.
                </span>
              </div>
            </div>
          </section>
        </div>
      </footer>
    `}},ie=()=>{g(D.tag,D),v(D.legacyTag,D)};ie();var Ht=new Set(["app","marketing","backend","docs"]),yi=()=>{let t=document.documentElement.getAttribute("data-deml-context");if(t&&Ht.has(t))return t;let e=window.location.hostname;return e.startsWith("ui.")?"docs":e.startsWith("backend.")?"backend":e.includes("deml.app")?"app":"marketing"},xi=t=>{let e=t.getAttribute("context");return e&&Ht.has(e)?e:yi()},Vt=(t,e)=>{let i=t.getAttribute(e);return i!==null&&i!=="false"},wi=t=>{let e=globalThis.__DEML??{};return{app:t.getAttribute("app-url")??e.app??y.app,marketing:t.getAttribute("marketing-url")??e.marketing??y.marketing,backend:t.getAttribute("backend-url")??e.backend??y.backend}},Si=t=>Vt(t,"authenticated"),Ei=t=>t.getAttribute("show-search")===null?!0:Vt(t,"show-search"),_i=(t,e)=>{let i=t.getAttribute("sign-in-href");if(i)return i;let r=t.getAttribute("return-url")??window.location.href;return`${e.app}/login?returnUrl=${encodeURIComponent(r)}`},z=(t,e,i={})=>{let r=i.id?` id="${l(i.id)}"`:"",a=i.color?` data-viking-icon-color="${l(i.color)}"`:"",n=i.className?` class="${l(i.className)}"`:"";return`<span${r}${n} data-viking-icon="${l(t)}" data-viking-icon-size="${e}"${a} aria-hidden="true">${p(t,e,"viking-navbar-inline-icon")}</span>`},R=class extends HTMLElement{static tag="viking-site-navbar";static legacyTag="viking-site-navbar-wc";static get observedAttributes(){return["context","app-url","marketing-url","backend-url","authenticated","show-search","sign-in-href","dashboard-href","return-url"]}mobileMenuOpen=!1;connectedCallback(){this.render(),this.addEventListener("click",this.onHostClick),document.addEventListener("click",this.onDocumentClick),document.addEventListener("keydown",this.onDocumentKeydown),window.addEventListener("resize",this.onWindowResize)}disconnectedCallback(){this.removeEventListener("click",this.onHostClick),document.removeEventListener("click",this.onDocumentClick),document.removeEventListener("keydown",this.onDocumentKeydown),window.removeEventListener("resize",this.onWindowResize)}attributeChangedCallback(){this.isConnected&&this.render()}renderNavLinks(e,i,r="desktop"){let a=r==="mobile"?"mobile-nav-btn":"nav-btn";return F.map(n=>{let o=j(n,e,i),c=n.requireAuth,s=c?" hidden":"",d=c?' data-require-auth="true"':"";return`
        <a
          href="${l(o)}"
          class="${a}"
          data-nav-id="${l(n.id)}"
          ${d}
          ${s}
        >
          ${z(n.icon,16)}
          <span>${l(n.label)}</span>
        </a>
      `}).join("")}renderAuthDesktop(e,i,r){return`
      <div class="desktop-auth" role="group" aria-label="Account actions">
        <viking-button-wc
          variant="primary"
          class="auth-btn"
          href="${l(e?r:i)}"
          id="auth-btn-desktop"
        >
          ${z(e?"home":"arrow-right",16,{id:"auth-icon-desktop"})}
          <span id="auth-text-desktop">${e?"Dashboard":"Sign In"}</span>
        </viking-button-wc>
        <viking-button-wc
          variant="ghost"
          class="auth-btn auth-signout-btn"
          id="auth-signout-desktop"
          ${e?"":" hidden"}
        >
          Sign Out
        </viking-button-wc>
      </div>
    `}renderAuthMobile(e,i,r){return`
      <div class="mobile-divider"></div>
      <viking-button-wc
        variant="primary"
        full-width
        class="mobile-auth-btn auth-btn"
        href="${l(e?i:r)}"
        id="auth-btn-mobile"
      >
        ${z(e?"home":"arrow-right",16,{id:"auth-icon-mobile"})}
        <span id="auth-text-mobile">${e?"Dashboard":"Sign In"}</span>
      </viking-button-wc>
      <viking-button-wc
        variant="ghost"
        full-width
        class="mobile-auth-btn auth-btn auth-signout-btn"
        id="auth-signout-mobile"
        ${e?"":" hidden"}
      >
        Sign Out
      </viking-button-wc>
    `}renderSearchButton(e){return e?`
      <div class="navbar-search" role="search">
        <viking-button-wc
          variant="outline"
          square
          compact
          class="navbar-search-trigger"
          aria-label="Open search (${navigator.platform.match(/Mac|iPhone|iPad/i)?"\u2318K":"Ctrl+K"})"
          id="navbar-search-trigger"
        >
          ${z("search",20)}
        </viking-button-wc>
      </div>
    `:""}render(){let e=xi(this),i=wi(this),r=Si(this),a=Ei(this),n=Ce(e,i),o=_i(this,i),c=this.getAttribute("dashboard-href")??`${i.app}/dashboard`,s=this.renderNavLinks(e,i,"desktop"),d=this.renderNavLinks(e,i,"mobile"),h=this.renderAuthDesktop(r,o,c),m=this.renderAuthMobile(r,c,o),f=this.renderSearchButton(a);this.innerHTML=`
      <header class="navbar">
        <div class="navbar-content">
          <div class="navbar-left">
            <a href="${l(n)}" class="navbar-brand" aria-label="Go to homepage" id="navbar-brand-link">
              ${z("drakkar",28,{color:"accent",className:"brand-icon navbar-logo"})}
            </a>
          </div>

          <nav class="navbar-center desktop-nav" aria-label="Main navigation">
            ${s}
          </nav>

          <div class="navbar-right">
            ${f}
            ${h}
            <viking-theme-toggle-wc class="theme-toggle-btn" aria-label="Toggle light and dark theme"></viking-theme-toggle-wc>
            <viking-button-wc
              variant="outline"
              square
              class="menu-toggle-btn"
              aria-label="Toggle navigation menu"
              aria-controls="mobile-menu"
              aria-expanded="false"
              id="mobile-menu-btn"
            >
              ${z("menu",24)}
            </viking-button-wc>
          </div>
        </div>

        <nav class="mobile-menu" id="mobile-menu" aria-label="Mobile navigation" hidden>
          ${d}
          ${m}
        </nav>
      </header>
    `,this.syncMobileMenu()}onHostClick=e=>{let i=typeof e.composedPath=="function"?e.composedPath():[];if(i.some(n=>n instanceof HTMLElement&&n.id==="mobile-menu-btn")){e.preventDefault(),this.toggleMobileMenu();return}i.some(n=>n instanceof HTMLElement&&n.closest?.("#mobile-menu")&&(n.matches("a")||n.matches("viking-button-wc")))&&this.closeMobileMenu()};onDocumentClick=e=>{if(!this.mobileMenuOpen)return;let i=e.target;i instanceof Node&&!this.contains(i)&&this.closeMobileMenu()};onDocumentKeydown=e=>{e.key==="Escape"&&this.closeMobileMenu()};onWindowResize=()=>{window.matchMedia("(min-width: 768px)").matches&&this.closeMobileMenu()};toggleMobileMenu(){this.mobileMenuOpen=!this.mobileMenuOpen,this.syncMobileMenu()}closeMobileMenu(){this.mobileMenuOpen&&(this.mobileMenuOpen=!1,this.syncMobileMenu())}syncMobileMenu(){let e=this.querySelector("#mobile-menu"),i=this.querySelector("#mobile-menu-btn");!e||!i||(e.classList.toggle("open",this.mobileMenuOpen),e.toggleAttribute("hidden",!this.mobileMenuOpen),i.setAttribute("aria-expanded",this.mobileMenuOpen?"true":"false"),i.setAttribute("aria-label",this.mobileMenuOpen?"Close navigation menu":"Toggle navigation menu"),i.innerHTML=z(this.mobileMenuOpen?"x":"menu",24))}},Ve=()=>{g(R.tag,R),v(R.legacyTag,R)};var Ai=t=>{let e=new Set;return t.filter(i=>{let r=`${i.title}:${i.href}:${i.action??""}`;return e.has(r)?!1:(e.add(r),!0)})},Ii=(t,e,i)=>({title:t.label,href:j(t,e,i),snippet:`Open ${t.label}`,group:"Platform",keywords:[t.id,t.label.toLowerCase(),"navigate","go"]}),Mi=(t,e,i,r)=>t.action==="cookie-settings"?{title:t.label,href:Je(r),snippet:"Manage analytics and cookie preferences",group:e,keywords:["cookies","consent","privacy","gdpr"],action:"cookie-settings"}:t.action==="bug-report"?{title:t.label,href:i==="app"?"#":Xe(r),snippet:"Submit a product issue or regression",group:e,keywords:["bug","issue","support","feedback"],action:"bug-report"}:{title:t.label,href:Te(t,i,r),snippet:`Open ${t.label}`,group:e,keywords:[t.label.toLowerCase(),e.toLowerCase()]},Ti=[{title:"DEML product showcase",snippet:"Operational intelligence product home on deml.app",group:"Resources",keywords:["deml","product","showcase","docs","quick start"]},{title:"DEML Swagger",snippet:"Interactive DEML control-plane OpenAPI",group:"Resources",keywords:["api","openapi","swagger","rest","deml"]},{title:"DEML ReDoc",snippet:"Readable DEML control-plane API reference",group:"Resources",keywords:["api","openapi","redoc","rest","deml"]},{title:"FORJD capabilities",snippet:"Public FORJD capability matrix (data plane)",group:"Resources",keywords:["api","capabilities","forjd","streaming"]}],Ci=(t,e,i)=>{switch(t.title){case"DEML product showcase":return`${i.app.replace(/\/$/,"")}/`;case"DEML Swagger":return`${i.backend.replace(/\/$/,"")}/api/v1/docs`;case"DEML ReDoc":return`${i.backend.replace(/\/$/,"")}/api/v1/redoc`;case"FORJD capabilities":return"https://backend.forjd.co/api/v1/capabilities";default:return e==="app"?i.app:i.marketing}},Qe=(t,e,i)=>{let r=i?.authenticated??t==="app",a=[...F.filter(n=>!n.requireAuth||r).map(n=>Ii(n,t,e)),...Ie.flatMap(n=>n.links.filter(o=>!o.requireAuth||r).map(o=>Mi(o,n.title,t,e))),...Ti.map(n=>({...n,href:Ci(n,t,e)}))];return t==="app"&&(a.push({title:"Explore status pages",href:"/explore",snippet:"Public status directory",group:"App",keywords:["explore","status","directory","public"]},{title:"Platform status",href:"/status/platform-status",snippet:"Live public sentinel for the DEML stack",group:"App",keywords:["platform-status","tenant0","health","sla"]},{title:"Login",href:"/login",snippet:"Sign in or complete SMS MFA",group:"App",keywords:["login","sign in","auth","mfa"]}),r&&a.push({title:"Dashboard",href:"/dashboard",snippet:"CES overview, KPIs, and performance telemetry",group:"App",keywords:["dashboard","ces","home","overview","kpi"]},{title:"Analytics",href:"/analytics",snippet:"Latency, origins, threat charts, and gauges",group:"App",keywords:["analytics","charts","latency","map","threat"]},{title:"Status pages",href:"/status",snippet:"Your published and draft status surfaces",group:"App",keywords:["status","pages","uptime","incidents"]},{title:"Vulnerabilities",href:"/vulnerabilities",snippet:"SOC triage and vulnerability Kanban",group:"App",keywords:["vulnerabilities","soc","semgrep","trivy","kanban"]},{title:"Account",href:"/account",snippet:"Profile, MFA enrollment, and linked accounts",group:"App",keywords:["account","profile","mfa","oauth"]},{title:"Settings",href:"/settings",snippet:"Workspace domains, billing, and security",group:"App",keywords:["settings","sites","workspace","configuration"]},{title:"Billing & subscription",href:"/settings/billing",snippet:"Manage plan, invoices, and payment methods",group:"App",keywords:["billing","stripe","subscription","payment"]},{title:"Security settings",href:"/settings/security",snippet:"Keys, sessions, and access controls",group:"App",keywords:["security","keys","auth","rbac"]})),t==="backend"&&a.push({title:"OpenAPI / Swagger",href:`${e.backend.replace(/\/$/,"")}/api/v1/docs`,snippet:"Interactive DEML control-plane sandbox",group:"Backend",keywords:["swagger","openapi","docs","api"]},{title:"ReDoc",href:`${e.backend.replace(/\/$/,"")}/api/v1/redoc`,snippet:"Readable DEML control-plane reference",group:"Backend",keywords:["redoc","openapi","docs","api"]}),Ai(a)};var Nt=["dataengineeringformachinelearning_com_zjafyosh2v_pages","deml_app_pages","deml_backend_pages"],Li={dataengineeringformachinelearning_com_zjafyosh2v_pages:"https://dataengineeringformachinelearning.com",deml_app_pages:"https://deml.app",deml_backend_pages:"https://backend.deml.app"},Hi=()=>typeof globalThis>"u"?{}:globalThis.ALGOLIA_CONFIG??{},w=t=>typeof t=="string"&&t.trim()?t:null,re=t=>{let e=w(t);return e&&/^https?:\/\//i.test(e)?e:null},Vi=(t,e)=>{let i=w(t.objectID),r=re(t.url)||re(t.url_without_anchor)||re(t.permalink)||re(t.link)||re(i);if(r)return r;let a=w(t.path);if(!a)return null;let n=w(t.hostname),o=Li[e]||(n?`https://${n.replace(/^https?:\/\//i,"")}`:null);if(!o)return null;try{return new URL(a.startsWith("/")?a:`/${a}`,o).href}catch{return null}},Ni=(t,e)=>{let i=Vi(t,e);if(!i)return null;let r=t.hierarchy,a=w(t.title)||w(r?.lvl1)||w(r?.lvl0)||w(t.path)||i,n=w(t.description)||(w(t.content)??"").slice(0,160)||w(r?.lvl2)||"",o=w(t.hostname);if(!o)try{o=new URL(i).hostname}catch{o=e}let c=w(t.keywords),s=w(t.path)??"";return{title:a.slice(0,120),href:i,snippet:n?`${o} \xB7 ${n.slice(0,140)}`:o,group:"Live pages",keywords:[o,e,s,...c?c.split(/[,\s]+/).filter(Boolean):[]].filter(d=>!!d)}},Ne=async(t,e)=>{let i=t.trim();if(!i||i.length<2)return[];let r=Hi(),a=r.appId||"ZJAFYOSH2V",n=r.apiKey||"";if(!n)return[];let o=r.indexNames&&r.indexNames.length>0?r.indexNames:[...Nt],c=e?.hitsPerPage??8,s=`https://${a}-dsn.algolia.net/1/indexes/*/queries`;try{let d=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json","X-Algolia-Application-Id":a,"X-Algolia-API-Key":n},body:JSON.stringify({requests:o.map(x=>({indexName:x,params:new URLSearchParams({query:i,hitsPerPage:String(c),attributesToRetrieve:["url","url_without_anchor","permalink","link","title","description","content","path","hostname","keywords","hierarchy","type","objectID"].join(","),attributesToHighlight:"[]"}).toString()}))}),signal:e?.signal});if(!d.ok)return[];let h=await d.json(),m=new Set,f=[];return(h.results??[]).forEach((x,A)=>{let Pe=x.index||o[A]||"pages";(x.hits??[]).forEach(oe=>{let q=Ni(oe,Pe);!q||m.has(q.href)||(m.add(q.href),f.push(q))})}),f}catch{return[]}},$t=Nt;var Rt=new Set(["app","marketing","backend","docs"]),$i=()=>{let t=document.documentElement.getAttribute("data-deml-context");if(t&&Rt.has(t))return t;let e=window.location.hostname;return e.startsWith("ui.")?"docs":e.includes("deml.app")&&!e.startsWith("backend.")?"app":e.startsWith("backend.")?"backend":"marketing"},Di=t=>{let e=globalThis.__DEML??{};return{app:t.getAttribute("app-url")??e.app??y.app,marketing:t.getAttribute("marketing-url")??e.marketing??y.marketing,backend:t.getAttribute("backend-url")??e.backend??y.backend}},Ri=t=>{let e=t.getAttribute("context");return e&&Rt.has(e)?e:$i()},Dt=t=>t.hasAttribute("authenticated")||document.documentElement.dataset.authenticated==="true",E=class extends u{static tag="viking-suite-command-palette";static searchTag="viking-suite-search-palette";static legacyTag="viking-suite-search-palette-wc";static get observedAttributes(){return["context","app-url","marketing-url","backend-url","placeholder","global-shortcut","authenticated"]}paletteEl=null;itemsLoaded=!1;curatedItems=[];queryTimer=null;searchAbort=null;onAuthState=e=>{let i=e.detail;this.toggleAttribute("authenticated",i?.isAuthenticated===!0)};onPaletteQuery=e=>{let r=e.detail?.query??"";this.scheduleAlgoliaSearch(r)};connectedCallback(){G(),window.addEventListener("deml:auth-state",this.onAuthState),this.ensurePalette(),this.loadItems()}disconnectedCallback(){window.removeEventListener("deml:auth-state",this.onAuthState),this.paletteEl?.removeEventListener("viking-query",this.onPaletteQuery),this.queryTimer&&(clearTimeout(this.queryTimer),this.queryTimer=null),this.searchAbort?.abort()}attributeChangedCallback(e){if(this.isConnected){if(e==="placeholder"&&this.paletteEl){let i=this.getAttribute("placeholder")??"Search documentation, dashboard, settings\u2026";this.paletteEl.setAttribute("placeholder",i);return}if(e==="global-shortcut"&&this.paletteEl){b(this,"global-shortcut")||!this.hasAttribute("global-shortcut")?this.paletteEl.setAttribute("global-shortcut",""):this.paletteEl.removeAttribute("global-shortcut");return}(e==="context"||e==="app-url"||e==="marketing-url"||e==="backend-url"||e==="authenticated")&&this.loadItems(!0)}}openPalette(){this.ensurePalette(),this.loadItems().then(()=>this.paletteEl?.openPalette())}closePalette(){this.paletteEl?.closePalette()}ensurePalette(){if(this.paletteEl)return;this.paletteEl=document.createElement("viking-command-palette"),this.paletteEl.id="deml-command-palette";let e=this.getAttribute("placeholder")??"Search documentation, dashboard, settings\u2026";this.paletteEl.setAttribute("placeholder",e),(b(this,"global-shortcut")||!this.hasAttribute("global-shortcut"))&&this.paletteEl.setAttribute("global-shortcut",""),this.paletteEl.addEventListener("viking-query",this.onPaletteQuery),this.append(this.paletteEl)}scheduleAlgoliaSearch(e){this.queryTimer&&clearTimeout(this.queryTimer),this.queryTimer=setTimeout(()=>{this.mergeAlgoliaResults(e)},180)}async mergeAlgoliaResults(e){if(!this.paletteEl)return;this.itemsLoaded||await this.loadItems();let i=e.trim();if(i.length<2){this.paletteEl.setAttribute("items",JSON.stringify(this.curatedItems));return}this.searchAbort?.abort(),this.searchAbort=new AbortController;let r=await Ne(i,{hitsPerPage:6,signal:this.searchAbort.signal}),a=this.curatedItems,n=new Set(a.map(c=>c.href.replace(/\/$/,""))),o=r.filter(c=>{let s=c.href.replace(/\/$/,"");return n.has(s)?!1:(n.add(s),!0)}).map(c=>({...c,keywords:[...c.keywords??[],i,c.title,c.href]}));this.paletteEl.setAttribute("items",JSON.stringify([...a,...o]))}async loadItems(e=!1){if(!this.paletteEl||this.itemsLoaded&&!e)return;let i=Ri(this),r=Di(this),a=i==="docs"?window.location.origin:"https://deml.app",n=Qe(i,r,{docsOrigin:a,authenticated:Dt(this)});try{(await fetch("/assets/site-drakkar.json",{cache:"no-cache"}).catch(()=>null)||await fetch("/site-drakkar.json",{cache:"no-cache"}).catch(()=>null))?.ok&&(n=Qe(i,r,{docsOrigin:a,authenticated:Dt(this)}))}catch{}this.curatedItems=n,this.paletteEl.setAttribute("items",JSON.stringify(n)),this.itemsLoaded=!0}},X=()=>{g(E.tag,E),v(E.searchTag,E),v(E.legacyTag,E)};var zt="suite-theme",Ze="theme",$e="suite-theme-change";function K(t=typeof window<"u"?window.matchMedia("(prefers-color-scheme: dark)"):null){return t?.matches??!0}function ne(t,e=K()){return t==="system"?e?"dark":"light":t}function Ot(t){return t==="light"||t==="dark"||t==="system"?t:null}function ae(t=typeof localStorage<"u"?localStorage:null){if(!t)return"system";let e=Ot(t.getItem(zt));if(e)return e;let i=Ot(t.getItem(Ze));return i==="light"||i==="dark"?i:"system"}function Kt(t,e=typeof localStorage<"u"?localStorage:null){e&&(e.setItem(zt,t),t==="system"?e.removeItem(Ze):e.setItem(Ze,t))}function et(t,e=typeof document<"u"?document.documentElement:null){return!e||e.getAttribute("data-theme")===t&&e.style.colorScheme===t&&e.classList.contains("dark")===(t==="dark")?!1:(e.setAttribute("data-theme",t),e.classList.toggle("dark",t==="dark"),e.style.colorScheme=t,!0)}function tt(t,e=typeof window<"u"?window:null){e&&e.dispatchEvent(new CustomEvent($e,{bubbles:!0,detail:t}))}var Pt=!1;function qt(){if(Pt||typeof window>"u"||typeof window.matchMedia!="function")return;Pt=!0;let t=window.matchMedia("(prefers-color-scheme: dark)");t.addEventListener("change",()=>{if(ae()!=="system")return;let e=ne("system",K(t));et(e)&&tt({preference:"system",resolved:e})})}function Bt(t,e=K()){return ne(t,e)==="dark"?"light":"dark"}var Wt=`
:host { display: inline-flex; }
.theme-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--suite-control-height, var(--viking-control-height, 40px));
  height: var(--suite-control-height, var(--viking-control-height, 40px));
  min-width: var(--suite-touch, 44px);
  min-height: var(--suite-touch, 44px);
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--suite-primary, var(--viking-accent)) 32%, var(--suite-border-strong, var(--viking-border)));
  border-radius: var(--suite-radius-control, var(--viking-radius));
  background: color-mix(in srgb, var(--suite-primary, var(--viking-accent)) 8%, var(--suite-surface, var(--viking-surface)));
  color: var(--suite-primary, var(--viking-accent-strong, var(--viking-ring)));
  box-shadow: var(--suite-shadow-sm, var(--viking-shadow-sm));
  cursor: pointer;
  transition: var(--suite-transition, var(--viking-transition-interactive));
  -webkit-tap-highlight-color: transparent;
}
.theme-toggle-btn:hover {
  border-color: var(--suite-primary-hover, var(--viking-accent-strong));
  background: color-mix(in srgb, var(--suite-primary, var(--viking-accent)) 14%, var(--suite-surface-2, var(--viking-surface-alt)));
  box-shadow: var(--suite-shadow-md, var(--viking-shadow-md));
}
.theme-toggle-btn:focus-visible {
  outline: var(--suite-ring-width, 2px) solid var(--suite-ring, var(--viking-ring));
  outline-offset: var(--suite-ring-offset, 2px);
}
.theme-icon { display: none; }
.theme-icon.is-visible { display: block; }
@media (min-width: 768px) {
  .theme-toggle-btn {
    min-width: var(--suite-control-height, 40px);
    min-height: var(--suite-control-height, 40px);
  }
}
`,Oi=()=>ne(ae(),K()),J=class extends u{static tag="viking-theme-toggle-wc";shadow;button=null;sunIcon=null;moonIcon=null;onStorage=()=>{this.syncIcons()};onThemeChange=()=>{this.syncIcons()};constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),k(this.shadow,Wt)}connectedCallback(){this.render(),this.syncIcons(),this.button?.addEventListener("click",this.onClick),window.addEventListener("storage",this.onStorage),window.addEventListener($e,this.onThemeChange),qt()}disconnectedCallback(){this.button?.removeEventListener("click",this.onClick),window.removeEventListener("storage",this.onStorage),window.removeEventListener($e,this.onThemeChange)}onClick=()=>{let e=ae(),i=Bt(e,K());Kt(i);let r=ne(i,K());et(r),tt({preference:i,resolved:r}),this.syncIcons()};syncIcons=()=>{let e=Oi()==="dark";this.sunIcon?.classList.toggle("is-visible",e),this.moonIcon?.classList.toggle("is-visible",!e);let r=ae()==="system"?e?"Theme: system (dark). Switch to light":"Theme: system (light). Switch to dark":e?"Theme: dark. Switch to light":"Theme: light. Switch to dark";this.button?.setAttribute("aria-label",r),this.button?.setAttribute("title",r)};render(){let e=this.getAttribute("aria-label")??"Toggle light and dark theme";this.shadow.innerHTML=`
      <button type="button" class="theme-toggle-btn suite-theme-toggle" part="control" aria-label="${e}">
        <svg class="theme-icon theme-icon-sun" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
          <path stroke="currentColor" stroke-width="2" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
        <svg class="theme-icon theme-icon-moon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      </button>
    `,k(this.shadow,Wt),this.button=this.shadow.querySelector("button"),this.sunIcon=this.shadow.querySelector(".theme-icon-sun"),this.moonIcon=this.shadow.querySelector(".theme-icon-moon")}},Q=()=>{g(J.tag,J)};var Ut=new Set(["app","marketing","backend","docs"]),Pi=`
:host {
  display: block;
  position: sticky;
  top: 0;
  z-index: var(--viking-z-sticky, 50);
  color: var(--viking-text);
  font-family: var(--viking-font-family);
}

* {
  box-sizing: border-box;
}

.suite-header {
  width: 100%;
  min-height: var(--viking-navbar-height, var(--viking-space-8));
  background: var(--viking-surface);
  border-bottom: var(--viking-border-width, 1px) solid var(--viking-border);
  box-shadow: var(--viking-shadow-xs);
  isolation: isolate;
}

.suite-header__bar {
  display: grid;
  grid-template-columns: minmax(max-content, auto) minmax(0, 1fr) max-content;
  align-items: center;
  gap: var(--viking-space-1);
  width: 100%;
  max-width: var(--viking-container-max-width);
  min-height: var(--viking-navbar-height, var(--viking-space-8));
  margin-inline: auto;
  padding-inline: var(--viking-page-gutter);
}

.suite-header__brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-1);
  min-width: 0;
  min-height: var(--viking-control-height);
  color: var(--viking-text);
  text-decoration: none;
  border-radius: var(--viking-radius);
}

.suite-header__brand:focus-visible,
.suite-header__link:focus-visible,
.suite-header__icon-button:focus-visible,
.suite-header__auth-link:focus-visible,
.suite-header__user-trigger:focus-visible,
.suite-header__menu-link:focus-visible,
.suite-header__menu-button:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.suite-header__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--viking-space-4);
  height: var(--viking-space-4);
  color: var(--viking-accent);
  flex: 0 0 auto;
}

.suite-header__lockup {
  display: none;
  min-width: 0;
  color: var(--viking-text);
  font-size: var(--viking-font-size-sm);
  font-weight: var(--viking-font-weight-bold);
  line-height: var(--viking-line-height-tight);
  letter-spacing: var(--viking-letter-spacing-caps);
  text-transform: uppercase;
  white-space: nowrap;
}

.suite-header__nav {
  display: none;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-0-5);
  min-width: 0;
  overflow: hidden;
}

.suite-header__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-0-5);
  min-width: 0;
  height: var(--viking-control-height);
  padding-inline: var(--viking-space-2);
  color: var(--viking-text-muted);
  border-radius: var(--viking-radius) var(--viking-radius) 0 0;
  font-size: var(--viking-font-size-sm);
  font-weight: var(--viking-font-weight-semibold);
  line-height: var(--viking-line-height-none);
  letter-spacing: var(--viking-letter-spacing-caps);
  text-decoration: none;
  text-transform: uppercase;
  white-space: nowrap;
  transition: var(--viking-transition-interactive);
}

.suite-header__link:hover,
.suite-header__link[aria-current='page'] {
  color: var(--viking-text);
  background: var(--viking-surface-alt);
}

.suite-header__actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--viking-space-1);
  min-width: 0;
}

.suite-header__icon-button,
.suite-header__menu-button,
.suite-header__user-trigger,
.suite-header__auth-link {
  min-height: var(--viking-control-height);
  border: var(--viking-border-width, 1px) solid var(--viking-border-strong);
  border-radius: var(--viking-radius);
  background: var(--viking-surface);
  color: var(--viking-text);
  box-shadow: var(--viking-shadow-sm);
  cursor: pointer;
  font-family: inherit;
  transition: var(--viking-transition-interactive);
  -webkit-tap-highlight-color: transparent;
}

.suite-header__icon-button,
.suite-header__menu-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--viking-control-height);
  min-width: var(--viking-control-height);
  padding: 0;
}

.suite-header__icon-button:hover,
.suite-header__menu-button:hover,
.suite-header__user-trigger:hover,
.suite-header__auth-link:hover {
  border-color: var(--viking-accent-strong);
  background: var(--viking-surface-alt);
  box-shadow: var(--viking-shadow-md);
}

.suite-header__auth-link {
  display: none;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-0-5);
  min-width: max-content;
  padding-inline: var(--viking-space-2);
  background: var(--viking-accent);
  border-color: var(--viking-accent);
  color: var(--viking-accent-content);
  font-size: var(--viking-font-size-sm);
  font-weight: var(--viking-font-weight-bold);
  line-height: var(--viking-line-height-none);
  letter-spacing: var(--viking-letter-spacing-caps);
  text-decoration: none;
  text-transform: uppercase;
}

.suite-header__auth-icon,
.suite-header__menu-icon,
.suite-header__action-icon,
.suite-header__avatar-icon,
.suite-header__chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.suite-header__auth-link:hover {
  background: var(--viking-accent-hover);
  color: var(--viking-accent-content);
}

.suite-header__user {
  position: relative;
  display: none;
}

.suite-header__user-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-1);
  min-width: max-content;
  padding-inline: var(--viking-space-1);
}

.suite-header__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--viking-space-3);
  height: var(--viking-space-3);
  border-radius: var(--viking-radius-full);
  background: var(--viking-accent-soft);
  color: var(--viking-accent-strong);
}

.suite-header__user-text {
  display: none;
  max-width: var(--viking-space-16);
  overflow: hidden;
  color: var(--viking-text);
  font-size: var(--viking-font-size-sm);
  font-weight: var(--viking-font-weight-semibold);
  line-height: var(--viking-line-height-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suite-header__menu {
  position: absolute;
  inset-block-start: calc(100% + var(--viking-space-1));
  inset-inline-end: 0;
  display: none;
  min-width: var(--viking-space-24);
  padding: var(--viking-space-1);
  background: var(--viking-surface);
  border: var(--viking-border-width, 1px) solid var(--viking-border-strong);
  border-radius: var(--viking-radius);
  box-shadow: var(--viking-shadow-lg);
}

.suite-header__user[data-open='true'] .suite-header__menu {
  display: grid;
  gap: var(--viking-space-0-5);
}

.suite-header__menu-label {
  padding: var(--viking-space-1);
  color: var(--viking-text-muted);
  font-size: var(--viking-font-size-xs);
  line-height: var(--viking-line-height-tight);
}

.suite-header__menu-label strong {
  display: block;
  color: var(--viking-text);
  font-size: var(--viking-font-size-sm);
}

.suite-header__menu-link,
.suite-header__menu-button {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--viking-space-1);
  width: 100%;
  min-height: var(--viking-control-height);
  padding-inline: var(--viking-space-1);
  background: transparent;
  border: 0;
  border-radius: var(--viking-radius-sm);
  box-shadow: none;
  color: var(--viking-text);
  font: inherit;
  text-align: start;
  text-decoration: none;
}

.suite-header__menu-link:hover,
.suite-header__menu-button:hover {
  background: var(--viking-surface-alt);
}

.suite-header__mobile {
  display: none;
  width: 100%;
  max-width: var(--viking-container-max-width);
  margin-inline: auto;
  padding: 0 var(--viking-page-gutter) var(--viking-space-2);
}

.suite-header[data-menu-open='true'] .suite-header__mobile {
  display: grid;
  gap: var(--viking-space-1);
}

.suite-header__mobile .suite-header__link,
.suite-header__mobile .suite-header__auth-link,
.suite-header__mobile .suite-header__menu-button {
  display: inline-flex;
  justify-content: flex-start;
  width: 100%;
  border-radius: var(--viking-radius);
}

.suite-header__mobile .suite-header__auth-link {
  justify-content: center;
  margin-block-start: var(--viking-space-1);
}

viking-suite-command-palette {
  display: contents;
}

@media (min-width: 600px) {
  .suite-header__lockup,
  .suite-header__user-text {
    display: inline;
  }
}

@media (min-width: 768px) {
  .suite-header__bar {
    padding-inline: var(--viking-page-gutter-lg);
  }

  .suite-header__nav {
    display: flex;
  }

  .suite-header__auth-link,
  .suite-header__user {
    display: inline-flex;
  }

  .suite-header__menu-button {
    display: none;
  }

  .suite-header[data-menu-open='true'] .suite-header__mobile {
    display: none;
  }
}
`,zi=()=>{let t=document.documentElement.getAttribute("data-deml-context");if(t&&Ut.has(t))return t;let e=window.location.hostname;return e.startsWith("ui.")?"docs":e.startsWith("backend.")?"backend":e.includes("deml.app")?"app":"marketing"},Ki=t=>{let e=t.getAttribute("context");return e&&Ut.has(e)?e:zi()},qi=t=>{let e=globalThis.__DEML??{};return{app:t.getAttribute("app-url")??e.app??y.app,marketing:t.getAttribute("marketing-url")??e.marketing??y.marketing,backend:t.getAttribute("backend-url")??e.backend??y.backend}},Bi=t=>{try{let e=new URL(t,window.location.origin);return e.origin===window.location.origin&&e.pathname===window.location.pathname}catch{return!1}},Z=class extends u{static tag="viking-suite-header";static get observedAttributes(){return["context","app-url","marketing-url","backend-url","authenticated","user-name","user-email","sign-in-href","dashboard-href"]}shadow;menuOpen=!1;userMenuOpen=!1;paletteEl=null;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),k(this.shadow,Pi)}connectedCallback(){Q(),X(),this.render(),document.addEventListener("click",this.onDocumentClick)}disconnectedCallback(){document.removeEventListener("click",this.onDocumentClick)}attributeChangedCallback(){this.isConnected&&this.render()}openSearch(){this.paletteEl?.openPalette(),this.dispatchEvent(new CustomEvent("viking-search-open",{bubbles:!0,composed:!0}))}onDocumentClick=e=>{e.composedPath().includes(this)||(this.menuOpen||this.userMenuOpen)&&(this.menuOpen=!1,this.userMenuOpen=!1,this.syncOpenState())};onSearchClick=()=>{this.openSearch()};onMenuClick=()=>{this.menuOpen=!this.menuOpen,this.syncOpenState()};onUserClick=()=>{this.userMenuOpen=!this.userMenuOpen,this.syncOpenState()};onSignInClick=e=>{let i=new CustomEvent("viking-sign-in",{bubbles:!0,cancelable:!0,composed:!0,detail:e});this.dispatchEvent(i),i.defaultPrevented&&e.preventDefault()};onSignOutClick=()=>{this.userMenuOpen=!1,this.menuOpen=!1,this.syncOpenState(),this.dispatchEvent(new CustomEvent("viking-sign-out",{bubbles:!0,composed:!0}))};syncOpenState(){let e=this.shadow.querySelector(".suite-header"),i=this.shadow.querySelector("[data-menu-toggle]"),r=this.shadow.querySelector(".suite-header__user"),a=this.shadow.querySelector("[data-user-toggle]");e?.setAttribute("data-menu-open",String(this.menuOpen)),i?.setAttribute("aria-expanded",String(this.menuOpen)),r?.setAttribute("data-open",String(this.userMenuOpen)),a?.setAttribute("aria-expanded",String(this.userMenuOpen))}renderNavLinks(e,i,r){return It(F,r).map(a=>{let n=j(a,e,i),o=Bi(n)?' aria-current="page"':"";return`
          <a class="suite-header__link" href="${l(n)}"${o}>
            ${p(a.icon,16,"suite-header__link-icon")}
            <span>${l(a.label)}</span>
          </a>
        `}).join("")}renderAuth(e,i,r=!1){if(!i){let o=this.getAttribute("sign-in-href")??`${e.app}/login`;return`
        <a class="suite-header__auth-link" href="${l(o)}" data-sign-in>
          <span>Sign In</span>
          ${p("arrow-right",16,"suite-header__auth-icon")}
        </a>
      `}if(r)return`
        <a class="suite-header__menu-link" href="${l(this.getDashboardHref(e))}">
          ${p("home",16,"suite-header__menu-icon")}
          <span>Dashboard</span>
        </a>
        <button class="suite-header__menu-button" type="button" data-sign-out>
          ${p("log-out",16,"suite-header__menu-icon")}
          <span>Sign Out</span>
        </button>
      `;let a=this.getAttribute("user-name")??"Account",n=this.getAttribute("user-email")??"";return`
      <div class="suite-header__user" data-open="${String(this.userMenuOpen)}">
        <button
          class="suite-header__user-trigger"
          type="button"
          aria-haspopup="menu"
          aria-expanded="${String(this.userMenuOpen)}"
          data-user-toggle
        >
          <span class="suite-header__avatar" aria-hidden="true">
            ${p("user",16,"suite-header__avatar-icon")}
          </span>
          <span class="suite-header__user-text">${l(a)}</span>
          ${p("chevron-down",16,"suite-header__chevron")}
        </button>
        <div class="suite-header__menu" role="menu">
          <div class="suite-header__menu-label">
            <strong>${l(a)}</strong>
            ${n?`<span>${l(n)}</span>`:""}
          </div>
          <a class="suite-header__menu-link" role="menuitem" href="${l(this.getDashboardHref(e))}">
            ${p("home",16,"suite-header__menu-icon")}
            <span>Dashboard</span>
          </a>
          <button class="suite-header__menu-button" type="button" role="menuitem" data-sign-out>
            ${p("log-out",16,"suite-header__menu-icon")}
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    `}getDashboardHref(e){return this.getAttribute("dashboard-href")??`${e.app}/dashboard`}render(){let e=Ki(this),i=qi(this),r=b(this,"authenticated"),a=this.renderNavLinks(e,i,r),n=Ce(e,i),o=`${de()}K`;this.shadow.innerHTML=`
      <header class="suite-header" data-menu-open="${String(this.menuOpen)}">
        <div class="suite-header__bar">
          <a class="suite-header__brand" href="${l(n)}" aria-label="Data Engineering for Machine Learning home">
            <span class="suite-header__mark" aria-hidden="true">
              ${p("drakkar",28,"suite-header__brand-icon")}
            </span>
            <span class="suite-header__lockup">DEML</span>
          </a>

          <nav class="suite-header__nav" aria-label="Main navigation">
            ${a}
          </nav>

          <div class="suite-header__actions">
            <button
              class="suite-header__icon-button"
              type="button"
              aria-label="Open command palette (${o})"
              title="Open command palette (${o})"
              data-search-trigger
            >
              ${p("search",18,"suite-header__action-icon")}
            </button>
            ${this.renderAuth(i,r)}
            <viking-theme-toggle-wc></viking-theme-toggle-wc>
            <button
              class="suite-header__menu-button"
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded="${String(this.menuOpen)}"
              data-menu-toggle
            >
              ${p(this.menuOpen?"x":"menu",18,"suite-header__action-icon")}
            </button>
          </div>
        </div>

        <nav class="suite-header__mobile" aria-label="Mobile navigation">
          ${a}
          ${this.renderAuth(i,r,!0)}
        </nav>
      </header>
      <viking-suite-command-palette
        context="${e}"
        app-url="${l(i.app)}"
        marketing-url="${l(i.marketing)}"
        backend-url="${l(i.backend)}"
        global-shortcut
      ></viking-suite-command-palette>
    `,this.paletteEl=this.shadow.querySelector("viking-suite-command-palette"),this.shadow.querySelector("[data-search-trigger]")?.addEventListener("click",this.onSearchClick),this.shadow.querySelector("[data-menu-toggle]")?.addEventListener("click",this.onMenuClick),this.shadow.querySelector("[data-user-toggle]")?.addEventListener("click",this.onUserClick),this.shadow.querySelectorAll("[data-sign-in]").forEach(c=>c.addEventListener("click",this.onSignInClick)),this.shadow.querySelectorAll("[data-sign-out]").forEach(c=>c.addEventListener("click",this.onSignOutClick))}},De=()=>{g(Z.tag,Z)};var O=class extends u{static formAssociated=!0;static tag="viking-select";static legacyTag="viking-select-wc";static get observedAttributes(){return["label","name","value","placeholder","description","error","width","disabled","required"]}shadow;internals;selectEl=null;optionObserver=null;controlId=_("viking-select");constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),this.internals=le(this),k(this.shadow,mt)}connectedCallback(){this.render(),this.syncOptions(),this.observeOptions(),this.selectEl?.addEventListener("change",this.onChange)}disconnectedCallback(){this.selectEl?.removeEventListener("change",this.onChange),this.optionObserver?.disconnect(),this.optionObserver=null}attributeChangedCallback(e){if(this.isConnected){if(e==="value"&&this.selectEl){this.selectEl.value=this.getAttribute("value")??"",this.syncFormValue();return}if(e==="error"||e==="description"||e==="label"){this.render(),this.syncOptions();return}this.render(),this.syncOptions()}}get value(){return this.selectEl?.value??this.getAttribute("value")??""}set value(e){this.setAttribute("value",e),this.selectEl&&(this.selectEl.value=e),this.syncFormValue()}onChange=()=>{let e=this.selectEl?.value??"";this.setAttribute("value",e),this.syncFormValue(),this.dispatchEvent(new CustomEvent("viking-change",{bubbles:!0,composed:!0,detail:{value:e}}))};syncFormValue(){se(this.internals,this.value)}observeOptions(){this.optionObserver?.disconnect(),this.optionObserver=new MutationObserver(()=>this.syncOptions()),this.optionObserver.observe(this,{childList:!0,subtree:!0,characterData:!0})}render(){let e=this.getAttribute("label")??"",i=this.getAttribute("name")??"",r=this.hasAttribute("disabled"),a=this.hasAttribute("required"),n=this.getAttribute("error")??"",o=this.getAttribute("description")??"",c=[o&&`${this.controlId}-desc`,n&&`${this.controlId}-error`].filter(Boolean).join(" ");this.shadow.innerHTML=`
      <div class="viking-field" part="field">
        ${e?`<label class="viking-field-label" part="label" for="${this.controlId}">${l(e)}</label>`:""}
        <select
          id="${this.controlId}"
          class="viking-select-native"
          part="control"
          ${i?`name="${l(i)}"`:""}
          ${r?"disabled":""}
          ${a?"required":""}
          ${n?'aria-invalid="true"':""}
          ${c?`aria-describedby="${c}"`:""}
        ></select>
        ${o?`<p id="${this.controlId}-desc" class="viking-field-description" part="description">${l(o)}</p>`:""}
        ${n?`<p id="${this.controlId}-error" class="viking-field-error" part="error" role="alert" aria-live="assertive" aria-atomic="true"><span class="viking-sr-only">Error: </span>${l(n)}</p>`:""}
      </div>
    `,this.selectEl=this.shadow.querySelector("select");let s=this.getAttribute("value");this.selectEl&&s&&(this.selectEl.value=s),this.syncFormValue()}syncOptions(){if(!this.selectEl)return;let e=this.selectEl.value;this.selectEl.innerHTML="";let i=this.querySelectorAll("option");if(i.length===0){let a=this.getAttribute("placeholder")??"Select\u2026",n=document.createElement("option");n.value="",n.textContent=a,n.disabled=!0,n.selected=!this.getAttribute("value"),this.selectEl.append(n);return}i.forEach(a=>{this.selectEl?.append(a.cloneNode(!0))});let r=this.getAttribute("value");r?this.selectEl.value=r:e&&(this.selectEl.value=e),this.syncFormValue()}},Re=()=>{g(O.tag,O),v(O.legacyTag,O)};var Oe=()=>{ue(),ke(),me(),he(),ve(),pe(),Re(),be(),G(),_e(),Ae(),De(),X(),Ve(),ie(),Q()};typeof globalThis<"u"&&typeof document<"u"&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Oe):Oe());return Jt(Wi);})();
