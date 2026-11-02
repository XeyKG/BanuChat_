import {colors,banuHeroGradient} from './tokens';

// Loaded only by WebFrame.web. Tokens and primitives are shared; layout is web-specific.
// data-testid anchors identify visual regions without coupling to RNW classes.
export const webAppearance = `
#banu-web-frame, #banu-web-frame * {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
}
#banu-web-frame { color: ${colors.ink}; }
#banu-web-frame [data-testid] { min-width:0; }
#banu-web-frame [data-testid="chat-message"],
#banu-web-frame [data-testid="source-kind"] { overflow-wrap:anywhere; }
#banu-web-frame [role="button"], #banu-web-frame [role="radio"],
#banu-web-frame input, #banu-web-frame textarea { min-height: 44px; }
#banu-web-frame input, #banu-web-frame textarea { font-size: 16px; }
#banu-web-frame [role="button"] { cursor:pointer; }
#banu-web-frame [aria-disabled="true"] { cursor:default; }
#banu-web-frame :is([role="button"],[role="radio"],input,textarea,a):focus-visible {
  outline: 3px solid ${colors.banuMagenta}; outline-offset: 3px;
}
.web-skip { position:absolute;left:8px;top:-100px;z-index:100;background:${colors.surface};padding:12px;color:${colors.accentStrong}; }
.web-skip:focus { top:8px; }
#web-main:focus { outline:none; }
#web-navigation [role="button"] { margin:2px 0; }
#web-navigation [aria-current="page"] { box-shadow:inset 3px 0 ${colors.banuMagenta}; }
#web-navigation [aria-current="page"] > div { color:${colors.banuMagentaStrong}; }
#banu-web-frame [data-testid="login-form"] { max-width:560px; }
#banu-web-frame [data-testid="login-form"] input:focus-visible { outline-offset:2px; }
#banu-web-frame [data-testid="home-action-card"],
#banu-web-frame [data-testid="app-button-secondary"] {
  transition:background-color 120ms ease-out,border-color 120ms ease-out;
}
@media (hover:hover) {
  #web-navigation [role="button"]:hover { background:${colors.banuSoft}; }
  #banu-web-frame [data-testid="home-action-card"]:hover { border-color:${colors.banuMagenta};background:${colors.banuCanvas}; }
  #banu-web-frame [data-testid="history-card"]:hover { border-color:${colors.banuMagenta};background:${colors.banuCanvas}; }
  #banu-web-frame [data-testid="home-hero"]:hover { background-color:${colors.banuNavy}; }
  #banu-web-frame [data-testid="app-button-secondary"]:hover { border-color:${colors.accent};background:${colors.surfaceSoft}; }
  #banu-web-frame [data-testid="secondary-screen"] [data-testid="app-button-secondary"]:hover { border-color:${colors.banuMagenta};background:${colors.banuCanvas}; }
  #banu-web-frame [data-testid="filter-chip"]:hover { border-color:${colors.banuMagenta}; }
}
#banu-web-frame [data-testid="screen-header"] {
  max-width:1220px;padding:24px 20px;gap:20px;flex-wrap:wrap;
}
#banu-web-frame [data-testid="screen-header"] > div:first-child { min-width:min-content;max-width:100%; }
#banu-web-frame [data-testid="screen-title"],
#banu-web-frame [data-testid="home-greeting"] { font-size:28px;line-height:36px;letter-spacing:-.6px; }
#banu-web-frame [data-testid="source-meta"],
#banu-web-frame [data-testid="source-kind"] { font-size:13px;line-height:20px;overflow-wrap:anywhere; }
#banu-web-frame [data-testid="document-text"] { overflow-wrap:anywhere; }
#banu-web-frame [data-testid="demo-notice"] {
  background:${colors.warningSoft};border-radius:10px;border-left:3px solid ${colors.amber};
  padding:12px 16px;font-size:13px;line-height:21px;text-align:left;color:${colors.textSecondary};
}
#banu-web-frame [data-testid="secondary-screen"] [data-testid="demo-notice"] { background:${colors.banuSoft};border-left-color:${colors.banuMagenta};color:${colors.banuSecondary}; }
#banu-web-frame [data-testid="secondary-screen"] :is([data-testid="source-meta"],[data-testid="secondary-card"],[data-testid="history-card"],[data-testid="publication-card"],[data-testid="change-field"]) { overflow-wrap:anywhere; }
@media (min-width:760px) {
  #banu-web-frame [data-testid="secondary-screen"] { padding:0 28px 12px !important; }
}

/* UIX-04 core compositions from the approved HTML. */
#banu-web-frame [data-testid="core-page-heading"]:focus { outline:none; }
#banu-web-frame [data-testid="home-content"] { max-width:1180px;gap:24px; }
#banu-web-frame [data-testid="home-content"] > div:first-child { margin-bottom:2px; }
#banu-web-frame [data-testid="home-topbar"] { display:none; }
#banu-web-frame [data-testid="home-hero"] { background-image:${banuHeroGradient};padding:32px;min-height:324px;display:flex;flex-direction:row;border-radius:22px; }
#banu-web-frame [data-testid="home-hero-copy"] { flex:1;gap:14px; }
#banu-web-frame [data-testid="home-hero-title"] { font-size:33px;line-height:38px;letter-spacing:-1.1px;max-width:min(280px,100%);font-weight:600; }
#banu-web-frame [data-testid="home-hero-eyebrow"] { max-width:100%;font-size:10px; }
#banu-web-frame [data-testid="home-hero-body"] { font-size:14px;line-height:23px;max-width:min(290px,100%); }
#banu-web-frame [data-testid="home-hero-icon"] { position:relative;right:auto;bottom:auto;align-self:center;width:180px;flex-shrink:0;margin-left:12px; }
#banu-web-frame [data-testid="home-hero-cta"] { align-self:flex-start; }
#banu-web-frame [data-testid="home-actions"] { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px; }
#banu-web-frame [data-testid="home-actions"] > div:first-child { grid-column:1 / -1; }
#banu-web-frame [data-testid="home-actions"] > div { min-width:0; }
#banu-web-frame [data-testid="home-action-card"] { height:100%;min-height:96px;display:flex;flex-direction:row;align-items:center;gap:16px;padding:20px; }
#banu-web-frame [data-testid="home-action-card"] > div:last-child { position:relative;right:auto;top:auto; }
#banu-web-frame [data-testid="home-action-card"] > div:nth-child(2) { min-width:0; }
#banu-web-frame [data-testid="home-action-card"] [role="button"] { min-width:0; }
#banu-web-frame [data-testid="home-agenda"] { width:280px;flex-shrink:0; }
#banu-web-frame [data-testid="home-layout"] { flex-direction:row;gap:22px;align-items:stretch; }
#banu-web-frame [data-testid="core-chat-screen"] { padding:24px 48px 32px !important;gap:24px; }
#banu-web-frame [data-testid="chat-layout"] { width:100%;max-width:1180px;align-self:center;gap:20px; }
#banu-web-frame [data-testid="chat-header"] { padding:16px 22px;max-width:none; }
#banu-web-frame [data-testid="chat-column"] { max-width:744px;gap:24px; }
#banu-web-frame [data-testid="chat-user"] { padding:12px 16px;max-width:85%;box-shadow:inset 0 1px 0 rgba(255,255,255,.75); }
#banu-web-frame [data-testid="chat-assistant"] { min-width:0;flex:1;padding:0;gap:10px;background:${colors.surface};border:0;border-radius:0; }
#banu-web-frame [data-testid="chat-message"] { font-size:15px;line-height:26px;overflow-wrap:anywhere; }
#banu-web-frame [data-testid="chat-sources"] { padding-top:8px;overflow-wrap:anywhere; }
#banu-web-frame [data-testid="chat-composer"] { padding:12px 16px;background:${colors.surface};border-top:1px solid ${colors.banuBorder}; }
#banu-web-frame [data-testid="chat-composer-row"], #banu-web-frame [data-testid="chat-error"], #banu-web-frame [data-testid="chat-composer-hint"] { width:100%;max-width:744px;align-self:center; }
#banu-web-frame [data-testid="chat-composer-row"] { padding:12px; }
#banu-web-frame [data-testid="chat-input-shell"] { min-width:0;border:0;padding:0;background:transparent;box-shadow:none; }
#banu-web-frame textarea[aria-label="Mensaje"] { font-size:16px;line-height:24px;min-height:48px;padding:4px 0; }
#banu-web-frame [data-testid="chat-composer-row"]:focus-within { border-color:${colors.banuMagenta}; }
#banu-web-frame [data-testid="chat-suggestions"] { display:flex;flex-direction:row;flex-wrap:wrap;gap:8px; }
#banu-web-frame [data-testid="chat-suggestions"] > div { max-width:100%;min-width:0;flex-shrink:1; }
#banu-web-frame [data-testid="chat-suggestions"] [role="button"] { max-width:100%;min-width:0;white-space:normal;justify-content:center;border-radius:24px; }
#banu-web-frame [data-testid="chat-suggestion"] * { min-width:0;overflow-wrap:anywhere; }
#banu-web-frame [data-testid="login-shell"] { max-width:960px;gap:28px; }
#banu-web-frame [data-testid="login-layout"] { max-width:760px; }
#banu-web-frame [data-testid="login-form"] { max-width:none;padding:32px; }
@media (min-width:1100px) { #banu-web-frame [data-testid="chat-context"] { display:flex; } }
@media (min-width:760px) {
  #banu-web-frame [data-testid="home-content"] { padding:20px 28px 32px; }
  #banu-web-frame [data-testid="home-hero-icon"] > div:last-child { display:flex; }
}
@media (min-width:760px) and (max-width:1040px) {
  #web-navigation-shell { width:216px; }
  #banu-web-frame [data-testid="home-content"] { padding:4px 5px 24px; }
  #banu-web-frame [data-testid="core-chat-screen"] { padding:24px !important; }
  #banu-web-frame [data-testid="home-hero-icon"] { width:135px;margin-left:0; }
}
@media (max-width:759px) {
  #banu-web-frame [data-testid="home-hero-cta"] { max-width:calc(100% - 96px); }
  #banu-web-frame [data-testid="home-greeting"] { font-size:27px;line-height:33px; }
  #banu-web-frame [data-testid="home-hero"] { min-height:356px;padding:24px; }
  #banu-web-frame [data-testid="home-hero-title"] { max-width:min(205px,100%);font-size:29px;line-height:33px; }
  #banu-web-frame [data-testid="home-hero-body"] { max-width:200px;font-size:13px;line-height:21px; }
  #banu-web-frame [data-testid="home-hero-icon"] { position:absolute;right:8px;bottom:34px;width:108px;margin:0; }
  #banu-web-frame [data-testid="home-hero-icon"] > div:last-child { display:none; }
  #banu-web-frame [data-testid="home-action-card"] { min-height:160px;flex-direction:column;align-items:flex-start;padding:16px;gap:12px; }
  #banu-web-frame [data-testid="home-action-card"] > div:last-child { position:absolute;right:12px;top:24px; }
  #banu-web-frame [data-testid="home-layout"] { flex-direction:column; }
  #banu-web-frame [data-testid="core-chat-screen"] { padding:24px 20px 16px !important;gap:20px; }
  #banu-web-frame [data-testid="chat-header"] { padding:12px 14px; }
  #banu-web-frame [data-testid="chat-message"] { font-size:14px;line-height:24px; }
  #banu-web-frame [data-testid="chat-composer"] { padding:10px; }
  #banu-web-frame [data-testid="chat-composer-row"] { padding:10px; }
  #banu-web-frame [data-testid="login-form"] { padding:24px; }
}
@media (max-width:370px) {
  #banu-web-frame [data-testid="home-hero-title"] { max-width:205px;font-size:27px;line-height:32px; }
  #banu-web-frame [data-testid="home-hero-body"] { max-width:180px; }
  #banu-web-frame [data-testid="home-hero-icon"] { right:7px;bottom:38px;width:96px; }
}
@media (prefers-reduced-motion:reduce) {
  #banu-web-frame *, #banu-web-frame *::before, #banu-web-frame *::after {
    animation:none !important;transition:none !important;scroll-behavior:auto !important;
  }
}
`;
