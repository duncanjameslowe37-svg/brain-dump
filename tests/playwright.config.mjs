export default {testDir:'.',testMatch:/.*\.spec\.mjs/,timeout:20000,workers:2,reporter:'list',
 use:{baseURL:process.env.BD_URL||'http://localhost:8765/',launchOptions:{executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}},
 projects:[{name:'phone-390',use:{viewport:{width:390,height:844},hasTouch:true,isMobile:true}},{name:'phone-360',use:{viewport:{width:360,height:740},hasTouch:true,isMobile:true}},{name:'desktop',use:{viewport:{width:1280,height:800}}}]};
