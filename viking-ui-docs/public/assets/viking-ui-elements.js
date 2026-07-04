"use strict";var VikingUI=(()=>{var h=Object.defineProperty;var m=Object.getOwnPropertyDescriptor;var f=Object.getOwnPropertyNames;var w=Object.prototype.hasOwnProperty;var y=(n,i)=>{for(var t in i)h(n,t,{get:i[t],enumerable:!0})},x=(n,i,t,e)=>{if(i&&typeof i=="object"||typeof i=="function")for(let r of f(i))!w.call(n,r)&&r!==t&&h(n,r,{get:()=>i[r],enumerable:!(e=m(i,r))||e.enumerable});return n};var S=n=>x(h({},"__esModule",{value:!0}),n);var A={};y(A,{VikingButtonWc:()=>s,VikingInputWc:()=>l,registerVikingButtonWc:()=>g,registerVikingElements:()=>u,registerVikingInputWc:()=>c});var d=(n,i)=>{if("adoptedStyleSheets"in Document.prototype&&"replaceSync"in CSSStyleSheet.prototype){let e=new CSSStyleSheet;e.replaceSync(i),n.adoptedStyleSheets=[e];return}let t=document.createElement("style");t.textContent=i,n.append(t)},a=(n,i)=>n.hasAttribute(i)&&n.getAttribute(i)!=="false";var b=`
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
`,k=`
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
`;var E=new Set(["outline","primary","secondary","filled","danger","ghost","subtle"]),$=new Set(["sm","xs"]),s=class extends HTMLElement{static tag="viking-button-wc";static get observedAttributes(){return["variant","size","type","disabled","loading","href","target","aria-label","aria-busy","square","full-width","compact"]}shadow;control=null;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),d(this.shadow,b)}connectedCallback(){this.render(),this.control?.addEventListener("click",this.onClick)}disconnectedCallback(){this.control?.removeEventListener("click",this.onClick)}attributeChangedCallback(){this.isConnected&&this.render()}onClick=i=>{if(this.disabled||this.loading){i.preventDefault(),i.stopPropagation();return}this.dispatchEvent(new CustomEvent("viking-press",{bubbles:!0,composed:!0,detail:i}))};get variant(){let i=this.getAttribute("variant")??"outline";return E.has(i)?i:"outline"}get size(){let i=this.getAttribute("size");return i&&$.has(i)?i:null}get disabled(){return a(this,"disabled")}get loading(){return a(this,"loading")}get square(){return a(this,"square")}render(){let i=this.getAttribute("href"),t=!!i,e=t?"a":"button",r=["viking-btn",`viking-btn-${this.variant}`,this.size?`viking-btn-${this.size}`:"",this.square?"viking-btn-square":""].filter(Boolean).join(" "),v=this.getAttribute("aria-label")??"",o=this.getAttribute("aria-busy")==="true"||this.loading?"true":null;this.shadow.innerHTML=`
      <${e}
        class="${r}"
        part="control"
        ${t?`href="${i}"`:`type="${this.getAttribute("type")??"button"}"`}
        ${t&&this.getAttribute("target")?`target="${this.getAttribute("target")}"`:""}
        ${t&&this.getAttribute("target")==="_blank"?'rel="noopener noreferrer"':""}
        ${this.disabled||this.loading?"disabled":""}
        ${v?`aria-label="${v}"`:""}
        ${o?`aria-busy="${o}"`:""}
      >
        ${this.loading?'<span class="viking-btn-spinner" aria-hidden="true"></span>':""}
        <span class="viking-btn-label" part="label"><slot></slot></span>
      </${e}>
    `,this.control=this.shadow.querySelector(e)}},g=()=>{customElements.get(s.tag)||customElements.define(s.tag,s)};var l=class extends HTMLElement{static tag="viking-input-wc";static get observedAttributes(){return["type","placeholder","value","disabled","loading","clearable","name","autocomplete","aria-label","bare"]}shadow;internals;input=null;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),this.internals=this.attachInternals(),d(this.shadow,k)}connectedCallback(){this.render(),this.syncFormValue()}attributeChangedCallback(i){if(this.isConnected){if(i==="value"&&this.input){this.input.value=this.getAttribute("value")??"",this.syncFormValue();return}this.render()}}get value(){return this.input?.value??this.getAttribute("value")??""}set value(i){let t=i??"";this.setAttribute("value",t),this.input&&(this.input.value=t),this.syncFormValue()}get disabled(){return a(this,"disabled")}get loading(){return a(this,"loading")}get clearable(){return a(this,"clearable")}get bare(){return a(this,"bare")}onInput=()=>{let i=this.input?.value??"";this.setAttribute("value",i),this.syncFormValue(),this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0})),this.dispatchEvent(new Event("change",{bubbles:!0,composed:!0}))};onBlur=()=>{this.dispatchEvent(new Event("blur",{bubbles:!0,composed:!0}))};onClear=()=>{this.value="",this.input?.focus(),this.dispatchEvent(new CustomEvent("viking-cleared",{bubbles:!0,composed:!0})),this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0}))};syncFormValue(){this.internals.setFormValue(this.value)}render(){let i=["viking-input-shell",this.disabled?"viking-disabled":"",this.loading?"viking-loading":""].filter(Boolean).join(" "),t=this.getAttribute("type")??"text",e=this.getAttribute("placeholder")??"",r=this.getAttribute("value")??"",v=this.getAttribute("aria-label")??(e||"Text input"),o=this.getAttribute("autocomplete")??"",p=this.clearable&&r.length>0&&!this.loading&&!this.bare;this.bare?this.shadow.innerHTML=`
        <input
          part="input"
          class="viking-input-native"
          type="${t}"
          placeholder="${e}"
          value="${r}"
          ${this.disabled||this.loading?"disabled":""}
          aria-label="${v}"
          ${this.loading?'aria-busy="true"':""}
          ${o?`autocomplete="${o}"`:""}
        />
      `:this.shadow.innerHTML=`
        <div class="${i}" part="shell">
          <slot name="leading"></slot>
          <input
            part="input"
            type="${t}"
            placeholder="${e}"
            value="${r}"
            ${this.disabled||this.loading?"disabled":""}
            aria-label="${v}"
            ${this.loading?'aria-busy="true"':""}
            ${o?`autocomplete="${o}"`:""}
          />
          ${this.loading?'<span class="viking-input-spinner" aria-hidden="true"></span>':""}
          ${p?'<button type="button" class="viking-input-clear" aria-label="Clear input" part="clear">\xD7</button>':""}
          <slot name="trailing"></slot>
        </div>
      `,this.input=this.shadow.querySelector("input"),this.input?.addEventListener("input",this.onInput),this.input?.addEventListener("blur",this.onBlur),this.shadow.querySelector(".viking-input-clear")?.addEventListener("click",this.onClear)}},c=()=>{customElements.get(l.tag)||customElements.define(l.tag,l)};var u=()=>{g(),c()};typeof globalThis<"u"&&typeof document<"u"&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",u):u());return S(A);})();
