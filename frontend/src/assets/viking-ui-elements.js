"use strict";var VikingUI=(()=>{var p=Object.defineProperty;var S=Object.getOwnPropertyDescriptor;var E=Object.getOwnPropertyNames;var T=Object.prototype.hasOwnProperty;var C=(t,i)=>{for(var e in i)p(t,e,{get:i[e],enumerable:!0})},$=(t,i,e,n)=>{if(i&&typeof i=="object"||typeof i=="function")for(let r of E(i))!T.call(t,r)&&r!==e&&p(t,r,{get:()=>i[r],enumerable:!(n=S(i,r))||n.enumerable});return t};var A=t=>$(p({},"__esModule",{value:!0}),t);var q={};C(q,{VikingBadgeWc:()=>l,VikingButtonWc:()=>v,VikingInputWc:()=>g,VikingThemeToggleWc:()=>d,registerVikingBadgeWc:()=>h,registerVikingButtonWc:()=>u,registerVikingElements:()=>m,registerVikingInputWc:()=>b,registerVikingThemeToggleWc:()=>k});var o=(t,i)=>{if("adoptedStyleSheets"in Document.prototype&&"replaceSync"in CSSStyleSheet.prototype){let n=new CSSStyleSheet;n.replaceSync(i),t.adoptedStyleSheets=[n];return}let e=document.createElement("style");e.textContent=i,t.append(e)},a=(t,i)=>t.hasAttribute(i)&&t.getAttribute(i)!=="false";var I=new Set(["accent","success","warning","danger","subtle"]),L=`
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
`,l=class extends HTMLElement{static tag="viking-badge-wc";static get observedAttributes(){return["tone"]}shadow;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),o(this.shadow,L)}connectedCallback(){this.render()}attributeChangedCallback(){this.isConnected&&this.render()}get tone(){let i=this.getAttribute("tone")??"";return I.has(i)?i:""}render(){this.tone?this.setAttribute("tone",this.tone):this.removeAttribute("tone"),this.shadow.innerHTML='<span part="label"><slot></slot></span>'}},h=()=>{customElements.get(l.tag)||customElements.define(l.tag,l)};var f=`
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
`,w=`
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
`;var V=new Set(["outline","primary","secondary","filled","danger","ghost","subtle"]),M=new Set(["sm","xs"]),v=class extends HTMLElement{static tag="viking-button-wc";static get observedAttributes(){return["variant","size","type","disabled","loading","href","target","aria-label","aria-busy","square","full-width","compact"]}shadow;control=null;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),o(this.shadow,f)}connectedCallback(){this.render(),this.control?.addEventListener("click",this.onClick)}disconnectedCallback(){this.control?.removeEventListener("click",this.onClick)}attributeChangedCallback(){this.isConnected&&this.render()}onClick=i=>{if(this.disabled||this.loading){i.preventDefault(),i.stopPropagation();return}this.dispatchEvent(new CustomEvent("viking-press",{bubbles:!0,composed:!0,detail:i}))};get variant(){let i=this.getAttribute("variant")??"outline";return V.has(i)?i:"outline"}get size(){let i=this.getAttribute("size");return i&&M.has(i)?i:null}get disabled(){return a(this,"disabled")}get loading(){return a(this,"loading")}get square(){return a(this,"square")}render(){let i=this.getAttribute("href"),e=!!i,n=e?"a":"button",r=["viking-btn",`viking-btn-${this.variant}`,this.size?`viking-btn-${this.size}`:"",this.square?"viking-btn-square":""].filter(Boolean).join(" "),c=this.getAttribute("aria-label")??"",s=this.getAttribute("aria-busy")==="true"||this.loading?"true":null;this.shadow.innerHTML=`
      <${n}
        class="${r}"
        part="control"
        ${e?`href="${i}"`:`type="${this.getAttribute("type")??"button"}"`}
        ${e&&this.getAttribute("target")?`target="${this.getAttribute("target")}"`:""}
        ${e&&this.getAttribute("target")==="_blank"?'rel="noopener noreferrer"':""}
        ${this.disabled||this.loading?"disabled":""}
        ${c?`aria-label="${c}"`:""}
        ${s?`aria-busy="${s}"`:""}
      >
        ${this.loading?'<span class="viking-btn-spinner" aria-hidden="true"></span>':""}
        <span class="viking-btn-label" part="label"><slot></slot></span>
      </${n}>
    `,this.control=this.shadow.querySelector(n)}},u=()=>{customElements.get(v.tag)||customElements.define(v.tag,v)};var g=class extends HTMLElement{static tag="viking-input-wc";static get observedAttributes(){return["type","placeholder","value","disabled","loading","clearable","name","autocomplete","aria-label","bare"]}shadow;internals;input=null;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),this.internals=this.attachInternals(),o(this.shadow,w)}connectedCallback(){this.render(),this.syncFormValue()}attributeChangedCallback(i){if(this.isConnected){if(i==="value"&&this.input){this.input.value=this.getAttribute("value")??"",this.syncFormValue();return}this.render()}}get value(){return this.input?.value??this.getAttribute("value")??""}set value(i){let e=i??"";this.setAttribute("value",e),this.input&&(this.input.value=e),this.syncFormValue()}get disabled(){return a(this,"disabled")}get loading(){return a(this,"loading")}get clearable(){return a(this,"clearable")}get bare(){return a(this,"bare")}onInput=()=>{let i=this.input?.value??"";this.setAttribute("value",i),this.syncFormValue(),this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0})),this.dispatchEvent(new Event("change",{bubbles:!0,composed:!0}))};onBlur=()=>{this.dispatchEvent(new Event("blur",{bubbles:!0,composed:!0}))};onClear=()=>{this.value="",this.input?.focus(),this.dispatchEvent(new CustomEvent("viking-cleared",{bubbles:!0,composed:!0})),this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0}))};syncFormValue(){this.internals.setFormValue(this.value)}render(){let i=["viking-input-shell",this.disabled?"viking-disabled":"",this.loading?"viking-loading":""].filter(Boolean).join(" "),e=this.getAttribute("type")??"text",n=this.getAttribute("placeholder")??"",r=this.getAttribute("value")??"",c=this.getAttribute("aria-label")??(n||"Text input"),s=this.getAttribute("autocomplete")??"",y=this.clearable&&r.length>0&&!this.loading&&!this.bare;this.bare?this.shadow.innerHTML=`
        <input
          part="input"
          class="viking-input-native"
          type="${e}"
          placeholder="${n}"
          value="${r}"
          ${this.disabled||this.loading?"disabled":""}
          aria-label="${c}"
          ${this.loading?'aria-busy="true"':""}
          ${s?`autocomplete="${s}"`:""}
        />
      `:this.shadow.innerHTML=`
        <div class="${i}" part="shell">
          <slot name="leading"></slot>
          <input
            part="input"
            type="${e}"
            placeholder="${n}"
            value="${r}"
            ${this.disabled||this.loading?"disabled":""}
            aria-label="${c}"
            ${this.loading?'aria-busy="true"':""}
            ${s?`autocomplete="${s}"`:""}
          />
          ${this.loading?'<span class="viking-input-spinner" aria-hidden="true"></span>':""}
          ${y?'<button type="button" class="viking-input-clear" aria-label="Clear input" part="clear">\xD7</button>':""}
          <slot name="trailing"></slot>
        </div>
      `,this.input=this.shadow.querySelector("input"),this.input?.addEventListener("input",this.onInput),this.input?.addEventListener("blur",this.onBlur),this.shadow.querySelector(".viking-input-clear")?.addEventListener("click",this.onClear)}},b=()=>{customElements.get(g.tag)||customElements.define(g.tag,g)};var z=`
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
`,B=t=>{document.documentElement.setAttribute("data-theme",t),document.documentElement.classList.toggle("dark",t==="dark"),localStorage.setItem("theme",t)},x=()=>{let t=localStorage.getItem("theme");return t==="light"||t==="dark"?t:window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"},d=class extends HTMLElement{static tag="viking-theme-toggle-wc";shadow;button=null;sunIcon=null;moonIcon=null;constructor(){super(),this.shadow=this.attachShadow({mode:"open"}),o(this.shadow,z)}connectedCallback(){this.render(),this.syncIcons(),this.button?.addEventListener("click",this.onClick)}disconnectedCallback(){this.button?.removeEventListener("click",this.onClick)}onClick=()=>{let i=x()==="light"?"dark":"light";B(i),this.syncIcons(),this.dispatchEvent(new CustomEvent("viking-theme-change",{bubbles:!0,composed:!0,detail:{theme:i}}))};syncIcons=()=>{let i=x()==="light";this.sunIcon?.classList.toggle("is-visible",i),this.moonIcon?.classList.toggle("is-visible",!i)};render(){let i=this.getAttribute("aria-label")??"Toggle light and dark theme";this.shadow.innerHTML=`
      <button type="button" class="theme-toggle-btn" part="control" aria-label="${i}">
        <svg class="theme-icon theme-icon-sun" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
          <path stroke="currentColor" stroke-width="2" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
        <svg class="theme-icon theme-icon-moon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      </button>
    `,this.button=this.shadow.querySelector("button"),this.sunIcon=this.shadow.querySelector(".theme-icon-sun"),this.moonIcon=this.shadow.querySelector(".theme-icon-moon")}},k=()=>{customElements.get(d.tag)||customElements.define(d.tag,d)};var m=()=>{u(),b(),h(),k()};typeof globalThis<"u"&&typeof document<"u"&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",m):m());return A(q);})();
