const nav=document.getElementById('nav');
addEventListener('scroll',()=>nav.classList.toggle('scrolled',scrollY>24),{passive:true});
const burger=document.getElementById('burger'),mm=document.getElementById('mmenu');
burger.addEventListener('click',()=>{const o=mm.classList.toggle('open');burger.textContent=o?'✕':'☰';burger.setAttribute('aria-expanded',o)});
mm.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mm.classList.remove('open');burger.textContent='☰'}));
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.rv,.step').forEach(el=>{el.classList.add('rv');io.observe(el)});
document.querySelectorAll('.step').forEach(s=>new IntersectionObserver((es,o)=>es.forEach(e=>{if(e.isIntersecting){s.classList.add('visible');o.disconnect()}}),{threshold:.4}).observe(s));
// active nav
const secs=[...document.querySelectorAll('section[id]')];
const links=[...document.querySelectorAll('.links a')];
secs.forEach(s=>new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)links.forEach(l=>l.classList.toggle('active',l.hash==='#'+s.id))}),{rootMargin:'-40% 0px -55% 0px'}).observe(s));
// Testimonials toggle
const tgl=document.getElementById('testitoggle'),more=document.getElementById('testimore');
if(tgl&&more){tgl.addEventListener('click',()=>{const open=more.hasAttribute('hidden');if(open){more.removeAttribute('hidden')}else{more.setAttribute('hidden','')}tgl.setAttribute('aria-expanded',String(open));tgl.innerHTML=open?'Show fewer reviews <span class="ar">↑</span>':'Show more reviews <span class="ar">↓</span>';if(open)more.querySelectorAll('.testi').forEach(el=>{el.classList.add('in')})});}
// Hero particles (subtle, pauses offscreen, off for reduced motion)
(function(){const cv=document.getElementById('dust');if(!cv)return;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
const ctx=cv.getContext('2d');let W,H,pts=[],run=true;
function size(){const r=cv.parentElement.getBoundingClientRect();W=cv.width=r.width;H=cv.height=r.height}
size();addEventListener('resize',size);
for(let i=0;i<42;i++)pts.push({x:Math.random(),y:Math.random(),vx:(Math.random()-.5)*.0006,vy:(Math.random()-.5)*.0006,r:Math.random()*1.6+.4,l:Math.random()<.18});
new IntersectionObserver(es=>run=es[0].isIntersecting).observe(cv);
(function tick(){requestAnimationFrame(tick);if(!run)return;ctx.clearRect(0,0,W,H);
pts.forEach(p=>{p.x=(p.x+p.vx+1)%1;p.y=(p.y+p.vy+1)%1;ctx.beginPath();ctx.arc(p.x*W,p.y*H,p.r,0,7);ctx.fillStyle=p.l?'rgba(182,255,0,.5)':'rgba(245,245,242,.22)';ctx.fill()});
ctx.strokeStyle='rgba(245,245,242,.05)';ctx.lineWidth=1;
for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const dx=(pts[i].x-pts[j].x)*W,dy=(pts[i].y-pts[j].y)*H;if(dx*dx+dy*dy<9000){ctx.beginPath();ctx.moveTo(pts[i].x*W,pts[i].y*H);ctx.lineTo(pts[j].x*W,pts[j].y*H);ctx.stroke()}}})()})();
// Case study data — qualitative outcomes only, no invented metrics
const CASES={
lead:{cat:'AI • Automation • Lead Generation',title:'AI-Powered Lead Generation System',sub:'Discover, enrich, qualify and organize prospects.',shot:'work/work-lead-generation.png',shotAlt:'n8n workflow canvas for the AI lead generation pipeline',
problem:'Prospect data is scattered, research is manual, and outreach lists lack structure. Teams spend hours qualifying leads that never convert.',
approach:'Stage the pipeline so each step structures data before passing it downstream: discover sources, enrich records, apply AI qualification, then organize sales-ready output.',
system:'Discover → search → enrich → AI qualify → organize. Research branches run in parallel and merge into a single structured record per prospect.',
tech:['n8n','AI','APIs','Lead Generation','Data Enrichment'],
outcome:'A repeatable pipeline where outreach starts from structured intelligence instead of raw lists. Value shows in hours saved and consistency of qualification.'},
support:{cat:'AI • Customer Support • Automation',title:'AI Support Operations System',sub:'Classify, route and resolve — with human review.',shot:'work/work-support-ops.png',shotAlt:'n8n workflow canvas for the AI support operations system',
problem:'Support inboxes mix simple questions with complex cases. Manual triage is slow, inconsistent, and pulls humans into work automation could handle.',
approach:'Classify every request with AI, check order and subscription context, then decide: auto-resolve what is safe, route the rest to a human with full context attached.',
system:'Intake → AI classification → business-data lookup → decision logic → auto-resolve or human-review branch, with the full trail preserved.',
tech:['n8n','AI Agents','Zendesk','Automation','Human Escalation'],
outcome:'Faster first responses and consistent triage, with humans involved exactly where judgement is needed. Automation knows when to act — and when to escalate.'},
marketing:{cat:'AI • Marketing • Automation',title:'AI Marketing Operations Platform',sub:'Campaigns, content and retention in one architecture.',shot:'work/work-marketing-ops.png',shotAlt:'n8n workflow canvas for the AI marketing operations platform',
problem:'Marketing work fragments across planning docs, content drafts, SEO tasks, social queues and retention emails — nothing connects, so effort leaks.',
approach:'Treat marketing as one architecture: a planning core that fans out to content, SEO, social and retention branches, then merges reporting back.',
system:'Campaign planning → content generation → SEO and social distribution → retention operations, orchestrated as connected n8n workflows.',
tech:['n8n','AI','SEO','Social Media','Marketing Automation'],
outcome:'Scattered tactics become one operable system — planned once, executed across channels, with retention closing the loop.'},
voice:{cat:'Conversational AI • Automation • Booking',title:'Voice AI Receptionist',sub:'Customer calls handled end-to-end.',shot:'work/work-voice-ai.png',shotAlt:'n8n workflow canvas for the voice AI receptionist',
problem:'Missed calls mean missed revenue, and hiring cover for every call is expensive. Even answered calls lose context before anything gets booked or followed up.',
approach:'Answer every call conversationally, extract structured intent as the conversation happens, then trigger the right backend workflow — booking, update, or escalation.',
system:'Call → conversation → understanding → structured extraction → booking / messaging / sheet updates, all from one workflow.',
tech:['ElevenLabs','n8n','AI','Voice','API Integration'],
outcome:'No missed first contact, and every conversation becomes structured data with booked actions instead of scribbled notes.'},
engine:{cat:'Workflow Engineering • API Integration',title:'Automated Business Workflow Engine',sub:'Branching logic, data and execution.',shot:'work/work-workflow-engine.png',shotAlt:'n8n workflow canvas for the automated business workflow engine',
problem:'Business processes run on manual handoffs across disconnected tools. One missed step breaks the chain and nobody can see where.',
approach:'Model the process as an explicit engine: triggers, conditional branches, data processing and execution paths — visible, testable, repeatable.',
system:'Trigger → conditional logic → API calls and data transforms → executed outcomes, with branching paths for every real-world case.',
tech:['n8n','REST APIs','Webhooks','Google Workspace','Automation'],
outcome:'Fragile handoffs become reliable execution paths — the process runs the same way every time, and exceptions surface instead of vanishing.'}};
const modal=document.getElementById('modal'),mbox=document.getElementById('mbox');
function openCase(k){const c=CASES[k];if(!c)return;
mbox.innerHTML=`<button class="closebtn" id="mclose" aria-label="Close">✕</button>
<p class="label">${c.cat}</p><h3>${c.title}</h3><p class="sub" style="font-family:var(--font-m);font-size:12px;letter-spacing:.14em;color:var(--silver);text-transform:uppercase">${c.sub}</p>
<figure class="shot modal-shot"><img src="${c.shot}" alt="${c.shotAlt}" loading="lazy"></figure>
<div class="case-sec"><b>PROBLEM</b><p style="color:var(--muted)">${c.problem}</p></div>
<div class="case-sec"><b>APPROACH</b><p style="color:var(--muted)">${c.approach}</p></div>
<div class="case-sec"><b>SYSTEM</b><p style="color:var(--muted)">${c.system}</p></div>
<div class="case-sec"><b>TECHNOLOGY</b><p>${c.tech.map(t=>`<span style="font-family:var(--font-m);font-size:11px;border:1px solid var(--line2);border-radius:999px;padding:6px 11px;margin:0 6px 6px 0;display:inline-block">${t}</span>`).join('')}</p></div>
<div class="case-sec"><b>OUTCOME</b><p style="color:var(--muted)">${c.outcome}</p></div>
<div style="margin-top:24px;display:flex;gap:10px;flex-wrap:wrap"><a class="btn solid" href="#contact">Have a similar problem? Start a project ↗</a></div>`;
modal.classList.add('open');document.body.style.overflow='hidden';
document.getElementById('mclose').onclick=closeCase;
mbox.querySelector('a[href="#contact"]').addEventListener('click',closeCase);
history.replaceState(null,'','#/work/'+k);}
function closeCase(){modal.classList.remove('open');document.body.style.overflow='';history.replaceState(null,'',' ')}
document.querySelectorAll('[data-case]').forEach(b=>b.addEventListener('click',()=>openCase(b.dataset.case)));
modal.querySelector('.modal-bg').addEventListener('click',closeCase);
addEventListener('keydown',e=>{if(e.key==='Escape')closeCase()});
if(location.hash.startsWith('#/work/'))openCase(location.hash.split('/')[2]);
// Inquiry form → n8n webhook integration.
// All sensitive processing stays inside n8n; no credentials live here.
const WEBHOOK_URL =
  "https://sprtsamurai.app.n8n.cloud/webhook/Emx_consult";
const form=document.getElementById('inquiry'),note=document.getElementById('formnote');
const submitBtn=form.querySelector('[type="submit"]');
const submitLabel=submitBtn.innerHTML;
let sending=false;
form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(sending)return;
  if(!form.reportValidity())return;
  sending=true;
  submitBtn.disabled=true;
  submitBtn.innerHTML='Sending…';
  const d=Object.fromEntries(new FormData(form).entries());
  const payload={
    name:(d.name||'').trim(),
    email:(d.email||'').trim(),
    company:(d.company||'').trim(),
    service:d.type||'',
    need:(d.need||'').trim(),
    budget:d.budget||'',
    timeline:d.timeline||'',
    message:(d.message||'').trim(),
    source:'EMX Consult Website',
    page:location.origin+location.pathname,
    submittedAt:new Date().toISOString()
  };
  try{
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),15000);
    let res;
    try{
      res=await fetch(WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:ctrl.signal});
    }finally{clearTimeout(timer)}
    if(!res.ok)throw new Error('Webhook responded '+res.status);
    try{await res.text()}catch(_){/* body optional — status is what matters */}
    note.innerHTML='<b>Thank you. Your inquiry has been received.</b> <span style="color:var(--muted)">EMX Consult will review your request and get back to you shortly.</span>';
    note.style.borderColor='rgba(199,255,61,.5)';
    form.reset();
  }catch(err){
    console.warn('Inquiry submission failed:',err);
    note.innerHTML='<b>We couldn\'t submit your inquiry right now.</b> <span style="color:var(--muted)">Please try again or contact EMX Consult directly by email: <a style="color:var(--lime)" href="mailto:adebayoemmanuelibk@gmail.com">adebayoemmanuelibk@gmail.com</a>.</span>';
    note.style.borderColor='rgba(255,120,120,.55)';
  }finally{
    sending=false;
    submitBtn.disabled=false;
    submitBtn.innerHTML=submitLabel;
  }
});
document.getElementById('yr').textContent=new Date().getFullYear();
