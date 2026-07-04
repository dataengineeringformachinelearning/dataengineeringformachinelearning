"use strict";var VikingUI=(()=>{var A=Object.defineProperty;var H=Object.getOwnPropertyDescriptor;var q=Object.getOwnPropertyNames;var B=Object.prototype.hasOwnProperty;var W=(e,i)=>{for(var t in i)A(e,t,{get:i[t],enumerable:!0})},O=(e,i,t,r)=>{if(i&&typeof i=="object"||typeof i=="function")for(let n of q(i))!B.call(e,n)&&n!==t&&A(e,n,{get:()=>i[n],enumerable:!(r=H(i,n))||r.enumerable});return e};var _=e=>O(A({},"__esModule",{value:!0}),e);var X={};W(X,{VikingBadgeWc:()=>c,VikingButtonWc:()=>v,VikingCalloutWc:()=>d,VikingCardWc:()=>g,VikingInputWc:()=>h,VikingModalWc:()=>u,VikingSearchPaletteWc:()=>k,VikingSelectWc:()=>p,VikingThemeToggleWc:()=>b,registerVikingBadgeWc:()=>m,registerVikingButtonWc:()=>f,registerVikingCalloutWc:()=>y,registerVikingCardWc:()=>x,registerVikingElements:()=>T,registerVikingInputWc:()=>w,registerVikingModalWc:()=>E,registerVikingSearchPaletteWc:()=>S,registerVikingSelectWc:()=>C,registerVikingThemeToggleWc:()=>L});var a=(e,i)=>{if("adoptedStyleSheets"in Document.prototype&&"replaceSync"in CSSStyleSheet.prototype){let r=new CSSStyleSheet;r.replaceSync(i),e.adoptedStyleSheets=[r];return}let t=document.createElement("style");t.textContent=i,e.append(t)},o=(e,i)=>e.hasAttribute(i)&&e.getAttribute(i)!=="false";var K=new Set(["accent","success","warning","danger","subtle"]),N=`
:host {
  display: inline-flex;
  align-items: center;
  gap: var(--viking-space-half);
  padding: var(--viking-space-half) var(--viking-space-1);
  font-family: var(--viking-font-family);
  font-size: var(--viking-font-size-xs);
  font-weight: var(--viking-font-weight-semibold);
  letter-spacing: var(--viking-letter-spacing-wide);
  border-radius: var(--viking-radius-pill);
  border: 1px solid var(--viking-border);
  background: var(--viking-surface-alt);
  color: var(--viking-text);
  white-space: nowrap;
}

:host([tone='accent']) {
  background: var(--viking-accent);
  border-color: color-mix(in srgb, var(--viking-accent) 80%, var(--viking-black));
  color: var(--viking-accent-content);
}

:host([tone='success']) {
  background: color-mix(in srgb, var(--viking-success) 18%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-success) 40%, transparent);
  color: var(--viking-success);
}

:host([tone='warning']) {
  background: color-mix(in srgb, var(--viking-warning) 18%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-warning) 40%, transparent);
  color: var(--viking-warning);
}

:host([tone='danger']) {
  background: color-mix(in srgb, var(--viking-danger) 18%, var(--viking-surface));
  border-color: color-mix(in srgb, var(--viking-danger) 40%, transparent);
  color: var(--viking-danger);
}

:host([tone='subtle']) {
  background: var(--viking-surface-alt);
  color: var(--viking-text-muted);
  font-size: var(--viking-font-size-2xs);
}
`,c=class extends HTMLElement{static tag="viking-badge-wc";static get observedAttributes(){return["tone"]}shadow;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),a(this.shadow,N)}connectedCallback(){this.render()}attributeChangedCallback(){this.isConnected&&this.render()}get tone(){let i=this.getAttribute("tone")??"";return K.has(i)?i:""}render(){this.tone?this.setAttribute("tone",this.tone):this.removeAttribute("tone"),this.shadow.innerHTML='<span part="label"><slot></slot></span>'}},m=()=>{customElements.get(c.tag)||customElements.define(c.tag,c)};var $=`
:host {
  display: inline-flex;
  font-family: var(--viking-font-family);
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

.viking-btn {
  font-family: inherit;
  font-size: var(--viking-font-size-ui, var(--viking-font-size-sm));
  font-weight: var(--viking-font-weight-semibold);
  letter-spacing: var(--viking-letter-spacing-wide);
  line-height: var(--viking-line-height-snug);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-1);
  min-height: var(--viking-control-height);
  padding: 0 var(--viking-control-padding-x);
  border-radius: var(--viking-radius);
  border: 1px solid transparent;
  cursor: pointer;
  text-decoration: none;
  transition: var(--viking-transition-interactive);
  width: auto;
  min-width: var(--viking-btn-min-width, 120px);
  white-space: nowrap;
  position: relative;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  box-sizing: border-box;
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

.viking-btn-sm {
  min-height: var(--viking-control-height-sm);
  padding: 0 var(--viking-space-2);
  font-size: var(--viking-font-size-xs);
  min-width: auto;
}

.viking-btn-xs {
  min-height: var(--viking-control-height-xs);
  padding: 0 var(--viking-space-1);
  font-size: var(--viking-font-size-xs);
  min-width: auto;
}

.viking-btn-square {
  width: var(--viking-control-height);
  min-width: var(--viking-control-height);
  padding: 0;
}

.viking-btn-square.viking-btn-sm {
  width: var(--viking-control-height-sm);
  min-width: var(--viking-control-height-sm);
}

.viking-btn-square.viking-btn-xs {
  width: var(--viking-control-height-xs);
  min-width: var(--viking-control-height-xs);
}

.viking-btn-square ::slotted(*) {
  display: none;
}

.viking-btn-outline {
  background: var(--viking-surface);
  color: var(--viking-text);
  border-color: var(--viking-border-strong);
  box-shadow: var(--viking-shadow-sm);
}

.viking-btn-outline:hover:not(:disabled):not([aria-busy='true']) {
  background: var(--viking-surface-alt);
  border-color: color-mix(in srgb, var(--viking-accent) 45%, var(--viking-border-strong));
  box-shadow: var(--viking-shadow-md);
  transform: translateY(var(--viking-state-hover-lift));
}

.viking-btn-primary {
  background: var(--viking-accent);
  color: var(--viking-accent-content);
  border-color: color-mix(in srgb, var(--viking-accent) 82%, var(--viking-black));
  box-shadow: var(--viking-shadow-sm);
}

.viking-btn-primary:hover:not(:disabled):not([aria-busy='true']) {
  background: var(--viking-accent-hover);
  border-color: var(--viking-accent-hover);
  box-shadow: var(--viking-shadow-hover);
  transform: translateY(var(--viking-state-hover-lift));
}

.viking-btn-secondary {
  background: var(--viking-accent-secondary);
  color: var(--viking-accent-secondary-content);
  border-color: color-mix(in srgb, var(--viking-accent-secondary) 82%, var(--viking-black));
  box-shadow: var(--viking-shadow-sm);
}

.viking-btn-secondary:hover:not(:disabled):not([aria-busy='true']) {
  background: var(--viking-accent-secondary-hover);
  border-color: var(--viking-accent-secondary-hover);
  box-shadow: var(--viking-shadow-hover);
  transform: translateY(var(--viking-state-hover-lift));
}

.viking-btn-filled {
  background: var(--viking-surface-alt);
  color: var(--viking-text);
  border-color: var(--viking-border);
  box-shadow: var(--viking-shadow-xs);
}

.viking-btn-filled:hover:not(:disabled):not([aria-busy='true']) {
  border-color: color-mix(in srgb, var(--viking-accent) 45%, var(--viking-border));
  background: color-mix(in srgb, var(--viking-accent) 8%, var(--viking-surface-alt));
  box-shadow: var(--viking-shadow-sm);
  transform: translateY(var(--viking-state-hover-lift));
}

.viking-btn-danger {
  background: var(--viking-danger);
  color: var(--viking-on-danger);
  border-color: color-mix(in srgb, var(--viking-danger) 85%, var(--viking-black));
  box-shadow: var(--viking-shadow-sm);
}

.viking-btn-danger:hover:not(:disabled):not([aria-busy='true']) {
  background: color-mix(in srgb, var(--viking-danger) 88%, var(--viking-white));
  box-shadow: var(--viking-shadow-hover);
  transform: translateY(var(--viking-state-hover-lift));
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
}

.viking-btn:active:not(:disabled):not([aria-busy='true']) {
  transform: translateY(0) scale(var(--viking-state-active-scale));
}

.viking-btn-label {
  display: inline-flex;
  align-items: center;
  line-height: inherit;
}

.viking-btn-spinner {
  width: 1.125rem;
  height: 1.125rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: viking-spin 0.8s linear infinite;
}

@keyframes viking-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .viking-btn-spinner { animation-duration: 0.01ms; }
  .viking-btn { transition-duration: 0.01ms; }
}
`,z=`
:host {
  display: block;
  font-family: var(--viking-font-family);
}

.viking-input-shell {
  display: flex;
  align-items: center;
  gap: var(--viking-space-1);
  min-height: var(--viking-control-height);
  padding: 0 var(--viking-space-2);
  font-family: inherit;
  font-size: var(--viking-font-size);
  color: var(--viking-text);
  background: var(--viking-surface-alt);
  border: 1px solid var(--viking-border);
  border-radius: var(--viking-radius-sm);
  box-shadow: var(--viking-shadow-xs);
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
  box-shadow: var(--viking-shadow-sm);
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
  padding: var(--viking-space-half);
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
  border: 2px solid var(--viking-text-muted);
  border-right-color: transparent;
  border-radius: 50%;
  animation: viking-spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes viking-spin {
  to { transform: rotate(360deg); }
}
`;var Y=new Set(["outline","primary","secondary","filled","danger","ghost","subtle"]),G=new Set(["sm","xs"]),v=class extends HTMLElement{static tag="viking-button-wc";static get observedAttributes(){return["variant","size","type","disabled","loading","href","target","aria-label","aria-busy","square","full-width","compact"]}shadow;control=null;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),a(this.shadow,$)}connectedCallback(){this.render(),this.control?.addEventListener("click",this.onClick)}disconnectedCallback(){this.control?.removeEventListener("click",this.onClick)}attributeChangedCallback(){this.isConnected&&this.render()}onClick=i=>{if(this.disabled||this.loading){i.preventDefault(),i.stopPropagation();return}this.dispatchEvent(new CustomEvent("viking-press",{bubbles:!0,composed:!0,detail:i}))};get variant(){let i=this.getAttribute("variant")??"outline";return Y.has(i)?i:"outline"}get size(){let i=this.getAttribute("size");return i&&G.has(i)?i:null}get disabled(){return o(this,"disabled")}get loading(){return o(this,"loading")}get square(){return o(this,"square")}render(){let i=this.getAttribute("href"),t=!!i,r=t?"a":"button",n=["viking-btn",`viking-btn-${this.variant}`,this.size?`viking-btn-${this.size}`:"",this.square?"viking-btn-square":""].filter(Boolean).join(" "),l=this.getAttribute("aria-label")??"",s=this.getAttribute("aria-busy")==="true"||this.loading?"true":null;this.shadow.innerHTML=`
      <${r}
        class="${n}"
        part="control"
        ${t?`href="${i}"`:`type="${this.getAttribute("type")??"button"}"`}
        ${t&&this.getAttribute("target")?`target="${this.getAttribute("target")}"`:""}
        ${t&&this.getAttribute("target")==="_blank"?'rel="noopener noreferrer"':""}
        ${this.disabled||this.loading?"disabled":""}
        ${l?`aria-label="${l}"`:""}
        ${s?`aria-busy="${s}"`:""}
      >
        ${this.loading?'<span class="viking-btn-spinner" aria-hidden="true"></span>':""}
        <span class="viking-btn-label" part="label"><slot></slot></span>
      </${r}>
    `,this.control=this.shadow.querySelector(r)}},f=()=>{customElements.get(v.tag)||customElements.define(v.tag,v)};var P=new Set(["accent","info","success","warning","danger","secondary"]),R=`
:host {
  display: block;
  font-family: var(--viking-font-family);
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
  margin-top: 2px;
  color: var(--viking-text-muted);
  font-size: var(--viking-font-size-lg);
  line-height: 1;
}

.viking-callout-body {
  flex: 1;
  min-width: 0;
}

.viking-callout-heading {
  margin: 0 0 var(--viking-space-half);
  font-weight: var(--viking-font-weight-semibold);
  color: var(--viking-text);
}

.viking-callout-text {
  margin: 0;
  color: var(--viking-text-muted);
  line-height: var(--viking-line-height-relaxed);
}

.viking-callout-info {
  border-color: color-mix(in srgb, var(--viking-info) 45%, transparent);
  border-left-color: var(--viking-info);
  background: color-mix(in srgb, var(--viking-info) 8%, var(--viking-surface));
}

.viking-callout-info .viking-callout-icon {
  color: var(--viking-info);
}

.viking-callout-accent {
  border-color: var(--viking-accent);
  border-left-color: var(--viking-accent);
  background: var(--viking-accent-soft);
}

.viking-callout-accent .viking-callout-icon {
  color: var(--viking-accent);
}

.viking-callout-success {
  border-color: color-mix(in srgb, var(--viking-success) 45%, transparent);
  border-left-color: var(--viking-success);
  background: color-mix(in srgb, var(--viking-success) 8%, var(--viking-surface));
}

.viking-callout-success .viking-callout-icon {
  color: var(--viking-success);
}

.viking-callout-warning {
  border-color: color-mix(in srgb, var(--viking-warning) 45%, transparent);
  border-left-color: var(--viking-warning);
  background: color-mix(in srgb, var(--viking-warning) 8%, var(--viking-surface));
}

.viking-callout-warning .viking-callout-icon {
  color: var(--viking-warning);
}

.viking-callout-danger {
  border-color: color-mix(in srgb, var(--viking-danger) 45%, transparent);
  border-left-color: var(--viking-danger);
  background: color-mix(in srgb, var(--viking-danger) 8%, var(--viking-surface));
}

.viking-callout-danger .viking-callout-icon {
  color: var(--viking-danger);
}
`,M={accent:"\u25C6",info:"\u2139",success:"\u2713",warning:"\u26A0",danger:"\u2715",secondary:"\u25C6"},d=class extends HTMLElement{static tag="viking-callout-wc";static get observedAttributes(){return["tone","heading"]}shadow;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),a(this.shadow,R)}connectedCallback(){this.render()}attributeChangedCallback(){this.isConnected&&this.render()}get tone(){let i=this.getAttribute("tone")??"info";return P.has(i)?i:"info"}render(){let i=this.getAttribute("heading")??"",t=M[this.tone]??M.info;this.shadow.innerHTML=`
      <div class="viking-callout viking-callout-${this.tone}" role="note" part="surface">
        <span class="viking-callout-icon" aria-hidden="true" part="icon">${t}</span>
        <div class="viking-callout-body" part="body">
          ${i?`<p class="viking-callout-heading" part="heading">${i}</p>`:""}
          <div class="viking-callout-text" part="text"><slot></slot></div>
        </div>
      </div>
    `}},y=()=>{customElements.get(d.tag)||customElements.define(d.tag,d)};var g=class extends HTMLElement{static tag="viking-card-wc";static get observedAttributes(){return["compact","interactive"]}connectedCallback(){this.syncClasses()}attributeChangedCallback(){this.isConnected&&this.syncClasses()}syncClasses(){this.classList.add("viking-card"),this.classList.toggle("viking-card-compact",this.hasAttribute("compact")),this.classList.toggle("viking-card-interactive",this.hasAttribute("interactive"))}},x=()=>{customElements.get(g.tag)||customElements.define(g.tag,g)};var h=class extends HTMLElement{static tag="viking-input-wc";static get observedAttributes(){return["type","placeholder","value","disabled","loading","clearable","name","autocomplete","aria-label","bare"]}shadow;internals;input=null;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),this.internals=this.attachInternals(),a(this.shadow,z)}connectedCallback(){this.render(),this.syncFormValue()}attributeChangedCallback(i){if(this.isConnected){if(i==="value"&&this.input){this.input.value=this.getAttribute("value")??"",this.syncFormValue();return}this.render()}}get value(){return this.input?.value??this.getAttribute("value")??""}set value(i){let t=i??"";this.setAttribute("value",t),this.input&&(this.input.value=t),this.syncFormValue()}get disabled(){return o(this,"disabled")}get loading(){return o(this,"loading")}get clearable(){return o(this,"clearable")}get bare(){return o(this,"bare")}onInput=()=>{let i=this.input?.value??"";this.setAttribute("value",i),this.syncFormValue(),this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0})),this.dispatchEvent(new Event("change",{bubbles:!0,composed:!0}))};onBlur=()=>{this.dispatchEvent(new Event("blur",{bubbles:!0,composed:!0}))};onClear=()=>{this.value="",this.input?.focus(),this.dispatchEvent(new CustomEvent("viking-cleared",{bubbles:!0,composed:!0})),this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0}))};syncFormValue(){this.internals.setFormValue(this.value)}render(){let i=["viking-input-shell",this.disabled?"viking-disabled":"",this.loading?"viking-loading":""].filter(Boolean).join(" "),t=this.getAttribute("type")??"text",r=this.getAttribute("placeholder")??"",n=this.getAttribute("value")??"",l=this.getAttribute("aria-label")??(r||"Text input"),s=this.getAttribute("autocomplete")??"",V=this.clearable&&n.length>0&&!this.loading&&!this.bare;this.bare?this.shadow.innerHTML=`
        <input
          part="input"
          class="viking-input-native"
          type="${t}"
          placeholder="${r}"
          value="${n}"
          ${this.disabled||this.loading?"disabled":""}
          aria-label="${l}"
          ${this.loading?'aria-busy="true"':""}
          ${s?`autocomplete="${s}"`:""}
        />
      `:this.shadow.innerHTML=`
        <div class="${i}" part="shell">
          <slot name="leading"></slot>
          <input
            part="input"
            type="${t}"
            placeholder="${r}"
            value="${n}"
            ${this.disabled||this.loading?"disabled":""}
            aria-label="${l}"
            ${this.loading?'aria-busy="true"':""}
            ${s?`autocomplete="${s}"`:""}
          />
          ${this.loading?'<span class="viking-input-spinner" aria-hidden="true"></span>':""}
          ${V?'<button type="button" class="viking-input-clear" aria-label="Clear input" part="clear">\xD7</button>':""}
          <slot name="trailing"></slot>
        </div>
      `,this.input=this.shadow.querySelector("input"),this.input?.addEventListener("input",this.onInput),this.input?.addEventListener("blur",this.onBlur),this.shadow.querySelector(".viking-input-clear")?.addEventListener("click",this.onClear)}},w=()=>{customElements.get(h.tag)||customElements.define(h.tag,h)};var j=`
:host {
  display: contents;
}

.viking-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--viking-z-overlay, 10001);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--viking-space-3);
  background: var(--viking-overlay-backdrop, rgba(0, 0, 0, 0.55));
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
}

.viking-modal-heading {
  margin: 0;
  font-size: var(--viking-font-size-lg);
  font-weight: var(--viking-font-weight-bold);
  color: var(--viking-text);
}

.viking-modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--viking-touch-target-comfort, 44px);
  min-height: var(--viking-touch-target-comfort, 44px);
  border: none;
  background: transparent;
  color: var(--viking-text-muted);
  cursor: pointer;
  border-radius: var(--viking-radius);
  font-size: var(--viking-font-size-lg);
  line-height: 1;
}

.viking-modal-close:hover {
  color: var(--viking-text);
  background: var(--viking-accent-soft);
}

.viking-modal-close:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.viking-modal-body {
  overflow-y: auto;
  color: var(--viking-text-muted);
  font-size: var(--viking-font-size-sm);
  line-height: var(--viking-line-height-relaxed);
}

.viking-modal-footer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--viking-space-2);
  justify-content: flex-end;
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
`,u=class extends HTMLElement{static tag="viking-modal-wc";static get observedAttributes(){return["open","title","dismissible"]}shadow;dialogEl=null;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),a(this.shadow,j)}connectedCallback(){this.render(),this.syncOpen(),this.dialogEl?.addEventListener("close",this.onClose),this.dialogEl?.addEventListener("click",this.onBackdropClick)}disconnectedCallback(){this.dialogEl?.removeEventListener("close",this.onClose),this.dialogEl?.removeEventListener("click",this.onBackdropClick)}attributeChangedCallback(){this.isConnected&&(this.syncOpen(),this.updateTitle())}onClose=()=>{this.removeAttribute("open"),this.dispatchEvent(new CustomEvent("viking-close",{bubbles:!0,composed:!0}))};onBackdropClick=i=>{!o(this,"dismissible")&&this.getAttribute("dismissible")!==null||i.target===this.dialogEl&&this.close()};open(){this.setAttribute("open",""),this.syncOpen()}close(){this.removeAttribute("open"),this.dialogEl?.close()}syncOpen(){if(!this.dialogEl)return;let i=this.hasAttribute("open");i&&!this.dialogEl.open?(this.dialogEl.showModal(),queueMicrotask(()=>{this.shadow.querySelector(".viking-modal-close")?.focus()})):!i&&this.dialogEl.open&&this.dialogEl.close()}updateTitle(){let i=this.getAttribute("title")??"Dialog",t=this.shadow.querySelector(".viking-modal-heading");t&&(t.textContent=i),this.dialogEl?.setAttribute("aria-label",i)}render(){let i=this.getAttribute("title")??"Dialog",t=this.getAttribute("dismissible")!=="false";this.shadow.innerHTML=`
      <dialog class="viking-modal-backdrop" aria-label="${i}" aria-modal="true">
        <div class="viking-modal-panel" part="panel">
          <header class="viking-modal-header" part="header">
            <h2 class="viking-modal-heading" part="title">${i}</h2>
            ${t?'<button type="button" class="viking-modal-close" part="close" aria-label="Close dialog">\u2715</button>':""}
          </header>
          <div class="viking-modal-body" part="body"><slot></slot></div>
          <footer class="viking-modal-footer" part="footer"><slot name="actions"></slot></footer>
        </div>
      </dialog>
    `,this.dialogEl=this.shadow.querySelector("dialog"),this.shadow.querySelector(".viking-modal-close")?.addEventListener("click",()=>this.close()),this.dialogEl?.addEventListener("keydown",n=>{n.key==="Escape"&&t&&this.close()})}},E=()=>{customElements.get(u.tag)||customElements.define(u.tag,u)};var D=`
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
  background: var(--viking-overlay-backdrop, rgba(0, 0, 0, 0.55));
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: none;
  animation: viking-backdrop-in var(--viking-duration-fast) var(--viking-ease-out);
}

.viking-search-palette {
  display: flex;
  flex-direction: column;
  background: var(--viking-surface);
  border: 1px solid var(--viking-border-strong);
  border-radius: var(--viking-radius-lg);
  box-shadow: var(--viking-shadow-lg);
  overflow: hidden;
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
  font-family: var(--viking-font-family);
  color: var(--viking-text);
  animation: viking-modal-in var(--viking-duration) var(--viking-ease-default);
  position: relative;
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
  background: color-mix(in srgb, var(--viking-bg) 20%, transparent);
}

.viking-search-palette-header:focus-within {
  border-bottom-color: var(--viking-accent);
  box-shadow: inset 0 -2px 0 var(--viking-accent-soft);
}

.viking-search-palette-icon {
  color: var(--viking-text-muted);
  font-size: var(--viking-font-size-lg);
  line-height: 1;
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
  padding: var(--viking-space-half);
  border-radius: var(--viking-radius);
  font-size: var(--viking-font-size-lg);
  line-height: 1;
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
  padding: 2px 6px;
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

.viking-search-result {
  display: flex;
  align-items: center;
  min-height: var(--viking-control-height-sm, 36px);
  padding: var(--viking-space-1) var(--viking-space-2);
  border-radius: var(--viking-radius);
  background: color-mix(in srgb, var(--viking-surface) 2%, transparent);
  border: 1px solid transparent;
  cursor: pointer;
  transition: var(--viking-transition-interactive);
  gap: var(--viking-space-1);
  text-decoration: none;
  color: inherit;
}

.viking-search-result:hover,
.viking-search-result.is-selected {
  background: color-mix(in srgb, var(--viking-accent) 5%, transparent);
  border-color: color-mix(in srgb, var(--viking-accent) 30%, transparent);
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
`,F=()=>typeof navigator<"u"&&/Mac|iPhone|iPad/i.test(navigator.platform)?"\u2318":"Ctrl",U=e=>{let i=e.getAttribute("items");if(!i)return[];try{let t=JSON.parse(i);return Array.isArray(t)?t:[]}catch{return[]}},k=class extends HTMLElement{static tag="viking-search-palette-wc";static get observedAttributes(){return["open","placeholder","items"]}shadow;dialogEl=null;inputEl=null;resultsEl=null;globalKeyHandler=null;query="";constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),a(this.shadow,D)}connectedCallback(){this.render(),this.syncOpen(),this.bindGlobalShortcut(),this.dialogEl?.addEventListener("close",this.onClose),this.dialogEl?.addEventListener("click",this.onBackdropClick),this.inputEl?.addEventListener("input",this.onInput)}disconnectedCallback(){this.dialogEl?.removeEventListener("close",this.onClose),this.dialogEl?.removeEventListener("click",this.onBackdropClick),this.inputEl?.removeEventListener("input",this.onInput),this.unbindGlobalShortcut()}attributeChangedCallback(i){this.isConnected&&(i==="open"&&this.syncOpen(),(i==="items"||i==="placeholder")&&this.renderResults())}openPalette(){this.setAttribute("open",""),this.syncOpen()}closePalette(){this.removeAttribute("open"),this.dialogEl?.close()}onClose=()=>{this.removeAttribute("open"),this.query="",this.inputEl&&(this.inputEl.value=""),this.dispatchEvent(new CustomEvent("viking-close",{bubbles:!0,composed:!0}))};onBackdropClick=i=>{i.target===this.dialogEl&&this.closePalette()};onInput=i=>{this.query=i.target.value,this.renderResults(),this.dispatchEvent(new CustomEvent("viking-query",{bubbles:!0,composed:!0,detail:{query:this.query}}))};bindGlobalShortcut(){o(this,"global-shortcut")&&(this.globalKeyHandler=i=>{(i.metaKey||i.ctrlKey)&&i.key.toLowerCase()==="k"&&(i.preventDefault(),this.openPalette())},document.addEventListener("keydown",this.globalKeyHandler))}unbindGlobalShortcut(){this.globalKeyHandler&&(document.removeEventListener("keydown",this.globalKeyHandler),this.globalKeyHandler=null)}syncOpen(){if(!this.dialogEl)return;let i=this.hasAttribute("open");i&&!this.dialogEl.open?(this.dialogEl.showModal(),this.renderResults(),queueMicrotask(()=>this.inputEl?.focus())):!i&&this.dialogEl.open&&this.dialogEl.close()}renderResults(){if(!this.resultsEl)return;let i=U(this),t=this.query.trim().toLowerCase(),r=t?i.filter(n=>n.title.toLowerCase().includes(t)||(n.snippet?.toLowerCase().includes(t)??!1)):i;if(r.length===0){this.resultsEl.innerHTML=`<p class="viking-search-empty">${t?"No results found":"Start typing to search\u2026"}</p>`;return}this.resultsEl.innerHTML=`<div class="viking-search-results" role="listbox">${r.map(n=>`
        <a class="viking-search-result" role="option" href="${n.href}" part="result">
          <div>
            <div class="viking-search-result-title">${n.title}</div>
            ${n.snippet?`<div class="viking-search-result-snippet">${n.snippet}</div>`:""}
          </div>
        </a>`).join("")}</div>`}render(){let i=this.getAttribute("placeholder")??"Search documentation, dashboard, API\u2026",t=F();this.shadow.innerHTML=`
      <dialog class="viking-search-palette-backdrop" aria-label="Search">
        <div class="viking-search-palette" part="panel" role="dialog" aria-modal="true">
          <div class="viking-search-palette-header" part="header">
            <span class="viking-search-palette-icon" aria-hidden="true">\u2315</span>
            <input
              type="search"
              class="viking-search-palette-input"
              part="input"
              placeholder="${i}"
              aria-label="${i}"
              autocomplete="off"
              spellcheck="false"
            />
            <button type="button" class="viking-search-palette-close" part="close" aria-label="Close search">\u2715</button>
          </div>
          <div class="viking-search-palette-body" part="body">
            <slot></slot>
            <div class="viking-search-results-host"></div>
          </div>
          <footer class="viking-search-palette-footer" part="footer">
            <span class="viking-kbd">${t}</span><span class="viking-kbd">K</span> toggle \xB7
            <span class="viking-kbd">Esc</span> close
          </footer>
        </div>
      </dialog>
    `,this.dialogEl=this.shadow.querySelector("dialog"),this.inputEl=this.shadow.querySelector("input"),this.resultsEl=this.shadow.querySelector(".viking-search-results-host"),this.shadow.querySelector(".viking-search-palette-close")?.addEventListener("click",()=>this.closePalette()),this.dialogEl?.addEventListener("keydown",n=>{n.key==="Escape"&&this.closePalette()})}},S=()=>{customElements.get(k.tag)||customElements.define(k.tag,k)};var J=`
:host {
  display: block;
  font-family: var(--viking-font-family);
}

.viking-field {
  display: flex;
  flex-direction: column;
  gap: var(--viking-space-half);
}

.viking-field-label {
  font-size: var(--viking-font-size-xs);
  font-weight: var(--viking-font-weight-semibold);
  letter-spacing: var(--viking-letter-spacing-caps);
  text-transform: uppercase;
  color: var(--viking-text-muted);
}

.viking-select-native {
  width: 100%;
  min-height: var(--viking-control-height, 40px);
  padding: 0 var(--viking-space-2);
  border: 1px solid var(--viking-border);
  border-radius: var(--viking-radius);
  background: var(--viking-surface);
  color: var(--viking-text);
  font-family: inherit;
  font-size: var(--viking-font-size-sm);
  cursor: pointer;
}

.viking-select-native:focus-visible {
  outline: var(--viking-ring-width, 2px) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset, 2px);
}

.viking-select-native:disabled {
  opacity: var(--viking-state-disabled-opacity);
  cursor: not-allowed;
}
`,p=class extends HTMLElement{static tag="viking-select-wc";static get observedAttributes(){return["label","name","value","disabled","required"]}shadow;selectEl=null;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),a(this.shadow,J)}connectedCallback(){this.render(),this.syncOptions(),this.selectEl?.addEventListener("change",this.onChange)}disconnectedCallback(){this.selectEl?.removeEventListener("change",this.onChange)}attributeChangedCallback(){this.isConnected&&(this.render(),this.syncOptions())}onChange=()=>{let i=this.selectEl?.value??"";this.setAttribute("value",i),this.dispatchEvent(new CustomEvent("viking-change",{bubbles:!0,composed:!0,detail:{value:i}}))};render(){let i=this.getAttribute("label")??"",t=this.getAttribute("name")??"",r=this.getAttribute("value")??"",n=this.hasAttribute("disabled"),l=this.hasAttribute("required"),s=`viking-select-${Math.random().toString(36).slice(2,9)}`;this.shadow.innerHTML=`
      <div class="viking-field" part="field">
        ${i?`<label class="viking-field-label" part="label" for="${s}">${i}</label>`:""}
        <select
          id="${s}"
          class="viking-select-native"
          part="control"
          ${t?`name="${t}"`:""}
          ${n?"disabled":""}
          ${l?"required":""}
        ></select>
      </div>
    `,this.selectEl=this.shadow.querySelector("select"),this.selectEl&&r&&(this.selectEl.value=r)}syncOptions(){if(!this.selectEl)return;this.selectEl.innerHTML="";let i=this.querySelectorAll("option");if(i.length===0){let r=this.getAttribute("placeholder")??"Select\u2026",n=document.createElement("option");n.value="",n.textContent=r,n.disabled=!0,n.selected=!0,this.selectEl.append(n);return}i.forEach(r=>{this.selectEl?.append(r.cloneNode(!0))});let t=this.getAttribute("value");t&&(this.selectEl.value=t)}},C=()=>{customElements.get(p.tag)||customElements.define(p.tag,p)};var Z=`
:host {
  display: inline-flex;
}

.theme-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--viking-touch-target-min, 44px);
  min-height: var(--viking-touch-target-min, 44px);
  padding: var(--viking-space-1);
  border: 1px solid var(--viking-border);
  border-radius: var(--viking-radius);
  background: var(--viking-surface);
  color: var(--viking-text);
  cursor: pointer;
  transition: var(--viking-transition-interactive);
  -webkit-tap-highlight-color: transparent;
}

.theme-toggle-btn:hover {
  border-color: var(--viking-border-strong);
  background: var(--viking-surface-alt);
}

.theme-toggle-btn:focus-visible {
  outline: var(--viking-ring-width, 2px) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset, 2px);
}

.theme-icon {
  display: none;
}

.theme-icon.is-visible {
  display: block;
}
`,Q=e=>{document.documentElement.setAttribute("data-theme",e),document.documentElement.classList.toggle("dark",e==="dark"),localStorage.setItem("theme",e)},I=()=>{let e=localStorage.getItem("theme");return e==="light"||e==="dark"?e:window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"},b=class extends HTMLElement{static tag="viking-theme-toggle-wc";shadow;button=null;sunIcon=null;moonIcon=null;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),a(this.shadow,Z)}connectedCallback(){this.render(),this.syncIcons(),this.button?.addEventListener("click",this.onClick)}disconnectedCallback(){this.button?.removeEventListener("click",this.onClick)}onClick=()=>{let i=I()==="light"?"dark":"light";Q(i),this.syncIcons(),this.dispatchEvent(new CustomEvent("viking-theme-change",{bubbles:!0,composed:!0,detail:{theme:i}}))};syncIcons=()=>{let i=I()==="light";this.sunIcon?.classList.toggle("is-visible",i),this.moonIcon?.classList.toggle("is-visible",!i)};render(){let i=this.getAttribute("aria-label")??"Toggle light and dark theme";this.shadow.innerHTML=`
      <button type="button" class="theme-toggle-btn" part="control" aria-label="${i}">
        <svg class="theme-icon theme-icon-sun" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
          <path stroke="currentColor" stroke-width="2" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
        <svg class="theme-icon theme-icon-moon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      </button>
    `,this.button=this.shadow.querySelector("button"),this.sunIcon=this.shadow.querySelector(".theme-icon-sun"),this.moonIcon=this.shadow.querySelector(".theme-icon-moon")}},L=()=>{customElements.get(b.tag)||customElements.define(b.tag,b)};var T=()=>{f(),w(),m(),y(),x(),C(),E(),S(),L()};typeof globalThis<"u"&&typeof document<"u"&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",T):T());return _(X);})();
