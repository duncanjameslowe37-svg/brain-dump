'use strict';
window.Icon=(()=>{const P={
task:'<circle cx="12" cy="12" r="9"/><path d="M8.5 12.2l2.3 2.3 4.7-4.8"/>',
reminder:'<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9"/><path d="M10.3 20.5a2 2 0 0 0 3.4 0"/>',
shopping:'<path d="M5 7h14l-1.2 12.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
idea:'<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
note:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
contact:'<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-3.5 4-5 7.5-5s6.3 1.5 7.5 5"/>',
money:'<path d="M16.5 7.5A3.5 3.5 0 0 0 10 9.2c0 2.4.6 3.5.6 5.3 0 1.9-1 3.6-2.6 4.5h9"/><path d="M7.5 13.5h6"/>',
today:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
all:'<path d="M3 13h5l1.5 2.5h5L16 13h5"/><path d="M5.5 5h13L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z"/>',
search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',moon:'<path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a6.5 6.5 0 0 0 10 10z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
more:'<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>',
mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',camera:'<path d="M3 8.5A2 2 0 0 1 5 6.5h2.2l1.6-2.5h6.4l1.6 2.5H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.8"/>',
up:'<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>',play:'<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',pause:'<path d="M8 5v14M16 5v14"/>',
bell:'<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9"/><path d="M10.3 20.5a2 2 0 0 0 3.4 0"/>',cal:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
download:'<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',upload:'<path d="M12 20V9M7 13.5l5-5 5 5M5 4h14"/>',broom:'<path d="M14 4 9.5 12M5 21l1.5-6.5L12 13l2 4.5L11 21z"/>',phone:'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
speaker:'<path d="M4 9.5v5h3.5L13 19V5L7.5 9.5z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',link:'<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',trash:'<path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12.5a2 2 0 0 0 2 1.5h6a2 2 0 0 0 2-1.5L18 7M9 7V4.5h6V7"/>',
image:'<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m20.5 16-4.5-4.5L6 19.5"/>',repeat:'<path d="M17 2.5 20.5 6 17 9.5"/><path d="M3.5 11.5V10a4 4 0 0 1 4-4h13M7 21.5 3.5 18 7 14.5"/><path d="M20.5 12.5V14a4 4 0 0 1-4 4h-13"/>',star:'<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',copy:'<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>'};
return(n,c='')=>`<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${P[n]||''}</svg>`})();
