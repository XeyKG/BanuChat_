import {colors} from './tokens';

// Loaded only by WebFrame.web. Shared screens retain their native styles.
// data-testid anchors identify visual regions without coupling to RNW classes.
export const webAppearance = `
#banu-web-frame, #banu-web-frame * {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
}
#banu-web-frame { color: ${colors.ink}; }
#banu-web-frame [role="button"], #banu-web-frame [role="radio"],
#banu-web-frame input, #banu-web-frame textarea { min-height: 44px; }
#banu-web-frame input, #banu-web-frame textarea { font-size: 16px; }
#banu-web-frame :is([role="button"],[role="radio"],input,textarea,a):focus-visible {
  outline: 3px solid ${colors.accent}; outline-offset: 3px;
}
.web-skip { position:absolute;left:8px;top:-100px;z-index:100;background:${colors.surface};padding:12px;color:${colors.accentStrong}; }
.web-skip:focus { top:8px; }
#web-main:focus { outline:none; }
#web-navigation [role="button"] { margin:2px 0; }
#web-navigation [aria-current="page"] { box-shadow:inset 3px 0 ${colors.accent}; }
#web-navigation [aria-current="page"] > div { color:${colors.accentStrong}; }
@media (hover:hover) {
  #web-navigation [role="button"]:hover { background:${colors.accentSoft}; }
  #banu-web-frame [data-testid="home-action-card"]:hover,
  #banu-web-frame [data-testid="history-card"]:hover { border-color:${colors.borderStrong}; }
}
#banu-web-frame [data-testid="screen-header"] {
  max-width:1008px;padding:24px;gap:20px;border-bottom-color:${colors.border};
}
#banu-web-frame [data-testid="screen-title"],
#banu-web-frame [data-testid="home-greeting"] { font-size:28px;line-height:36px;letter-spacing:-.6px; }
#banu-web-frame [data-testid="aux-controls"],
#banu-web-frame [data-testid="aux-filters"] {
  width:100%;max-width:1008px;align-self:center;padding-left:24px;padding-right:24px;
}
#banu-web-frame [data-testid="aux-controls"] { padding-top:16px;padding-bottom:8px; }
#banu-web-frame [data-testid="aux-filters"] { padding-top:12px;padding-bottom:12px; }
#banu-web-frame [data-testid="aux-filters"] [role="radiogroup"] { padding:0;flex-wrap:wrap; }
#banu-web-frame [data-testid="aux-content"] { max-width:960px; }
#banu-web-frame [data-testid="oe2-scroll"] > div { max-width:1008px;padding:24px; }
#banu-web-frame [data-testid="source-meta"],
#banu-web-frame [data-testid="source-kind"] { font-size:13px;line-height:20px;overflow-wrap:anywhere; }
#banu-web-frame [data-testid="publication-card"] { padding:24px;gap:10px; }
#banu-web-frame [data-testid="publication-card"] > div { line-height:24px; }
#banu-web-frame [data-testid="demo-notice"] {
  background:${colors.warningSoft};border-radius:10px;border-left:3px solid ${colors.amber};
  padding:12px 16px;font-size:13px;line-height:21px;text-align:left;color:${colors.textSecondary};
}
#banu-web-frame [data-testid="home-content"] { max-width:960px;gap:24px; }
#banu-web-frame [data-testid="home-topbar"] { display:none; }
#banu-web-frame [data-testid="home-hero"] { padding:28px;border-radius:24px; }
#banu-web-frame [data-testid="home-hero-body"] { max-width:68ch;line-height:24px; }
#banu-web-frame [data-testid="home-actions"] { gap:16px; }
#banu-web-frame [data-testid="home-action-card"] { height:100%;box-shadow:none;min-height:100px; }
#banu-web-frame [data-testid="history-content"] { max-width:960px; }
#banu-web-frame [data-testid="history-new"] { align-self:flex-start;padding-left:20px;padding-right:24px; }
#banu-web-frame [data-testid="history-card"] { height:100%;box-shadow:none; }
#banu-web-frame [data-testid="chat-header"] { max-width:792px;padding:16px 24px; }
#banu-web-frame [data-testid="chat-column"] { max-width:744px;gap:24px; }
#banu-web-frame [data-testid="chat-user"] { padding:14px 18px;max-width:85%;box-shadow:none; }
#banu-web-frame [data-testid="chat-assistant"] {
  min-width:0;padding:20px;gap:12px;background:${colors.surface};border:1px solid ${colors.border};border-radius:18px;
}
#banu-web-frame [data-testid="chat-message"] { line-height:26px;overflow-wrap:anywhere; }
#banu-web-frame [data-testid="chat-sources"] { border-top:1px solid ${colors.border};padding-top:12px; }
#banu-web-frame [data-testid="chat-composer"] { padding:16px 24px;background:${colors.surface};border-top:1px solid ${colors.border}; }
#banu-web-frame [data-testid="chat-composer-row"],
#banu-web-frame [data-testid="chat-error"] { width:100%;max-width:744px;align-self:center; }
#banu-web-frame [data-testid="chat-input-shell"] {
  min-width:0;border-radius:16px;padding:8px 12px;background:${colors.surfaceSoft};box-shadow:none;
}
#banu-web-frame textarea[aria-label="Mensaje"] { font-size:16px;line-height:24px;min-height:44px;padding:10px 0; }
#banu-web-frame [data-testid="chat-suggestions"] [role="button"] { justify-content:center;border-radius:14px; }
@media (min-width:760px) {
  #banu-web-frame [data-testid="home-actions"] { display:grid;grid-template-columns:repeat(2,minmax(0,1fr)); }
  #banu-web-frame [data-testid="home-actions"] > div:first-child { grid-column:1 / -1; }
  #banu-web-frame [data-testid="home-actions"] > div > [role="button"] { height:100%; }
  #banu-web-frame [data-testid="home-hero"] { display:grid;grid-template-columns:64px minmax(0,1fr);column-gap:24px; }
  #banu-web-frame [data-testid="home-hero"] > [aria-hidden="true"] { display:none; }
  #banu-web-frame [data-testid="home-hero-icon"] { grid-column:1;grid-row:1 / 4;align-self:center;margin:0; }
  #banu-web-frame [data-testid="home-hero-title"],
  #banu-web-frame [data-testid="home-hero-body"],
  #banu-web-frame [data-testid="home-hero-cta"] { grid-column:2; }
  #banu-web-frame [data-testid="history-list"] { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px; }
  #banu-web-frame [data-testid="change-field"] { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 24px; }
  #banu-web-frame [data-testid="change-field"] > div:first-child { grid-column:1 / -1; }
}
@media (min-width:1024px) {
  #banu-web-frame [data-testid="announcement-list"],
  #banu-web-frame [data-testid="course-list"] { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px; }
  #banu-web-frame [data-testid="course-list"] > div { width:100% !important;min-width:0;flex-basis:auto; }
}
@media (max-width:599px) {
  #banu-web-frame [data-testid="screen-header"] { padding:16px;gap:12px; }
  #banu-web-frame [data-testid="screen-title"],
  #banu-web-frame [data-testid="home-greeting"] { font-size:24px;line-height:32px; }
  #banu-web-frame [data-testid="aux-controls"],
  #banu-web-frame [data-testid="aux-filters"] { padding-left:16px;padding-right:16px; }
  #banu-web-frame [data-testid="oe2-scroll"] > div { padding:16px; }
  #banu-web-frame [data-testid="publication-card"] { padding:16px; }
  #banu-web-frame [data-testid="home-hero"] { padding:24px; }
  #banu-web-frame [data-testid="chat-header"] { padding:12px 16px; }
  #banu-web-frame [data-testid="chat-column"] { gap:20px; }
  #banu-web-frame [data-testid="chat-assistant"] { padding:16px; }
  #banu-web-frame [data-testid="chat-composer"] { padding:12px; }
}
`;
