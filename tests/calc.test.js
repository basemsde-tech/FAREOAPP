/* Fareo maths tests. Run: node tests/calc.test.js  (needs playwright + Chrome)
   Drives the real functions inside index.html with known inputs and checks
   them against hand-worked answers. */
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{const f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0].split('#')[0]).replace(/^\/+/,'')||'index.html');
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d)})});
let pass=0,fail=0;
function eq(name,got,want,tol=0.005){const ok=typeof want==='number'?Math.abs(got-want)<=tol:JSON.stringify(got)===JSON.stringify(want);
  if(ok){pass++;console.log('  ok  ',name)}else{fail++;console.log('  FAIL',name,'got',got,'want',want)}}
(async()=>{
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));
  const url=`http://127.0.0.1:${srv.address().port}/index.html`;
  const b=await chromium.launch(process.env.CHROME?{executablePath:process.env.CHROME,args:['--no-sandbox']}:{});
  const pg=await (await b.newContext({serviceWorkers:'block'})).newPage();
  const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
  await pg.route('**/*',r=>r.request().url().startsWith(url.split('/index')[0])?r.continue():r.abort());
  await pg.goto(url);await pg.evaluate(()=>localStorage.clear());await pg.goto(url);

  console.log('Shift settlement (pct 55%)');
  const s=await pg.evaluate(()=>{
    settings.pct=55;settings.levy=1.2;settings.payTypes=[];settings.cashGstFree=true;settings.gstBase='gross';
    draft=freshDraft('5088M');draft.date='2026-10-29';
    draft.eos=['400'];draft.cash=[{name:'A',amount:'50'}];draft.square=[{name:'B',amount:'30'}];
    draft.runs='2';draft.accounts=[{name:'C',amount:'20'}];
    draft.fuel=[{type:'Diesel',amount:'60'},{type:'Diesel',amount:'40',opPaid:true}];draft.hail='3';
    return {gross:grossT(),take:takeT(),share:fareShareT(),held:heldT(),levy:levyT(),fi:fuelIPaidT(),fo:fuelOpPaidT()};
  });
  eq('gross = 400+50+30+2×5+20',s.gross,510);
  eq('driver-held = cash+square',s.held,80);
  eq('settlement = 430×.55 − 80×.45 + 60',s.take,260.5);
  eq('driver share = 510×.55',s.share,280.5);
  eq('levy = 3 × $1.20',s.levy,3.6);
  eq('fuel I paid / op paid',[s.fi,s.fo],[60,40]);

  console.log('Saved entry → BAS (cash tax-free, GST on full gross)');
  const bas=await pg.evaluate(()=>{
    entries=[];deductions=[];recurring=[];fuelManual=[];settings.claimOff={};
    saveShift(false);
    repRange.from='2026-10-01';repRange.to='2026-12-31';
    const a=rangeAgg(),v=basValsFromAgg(a);
    return {n:entries.length,take:entries[0].take,g1:v.g1,oneA:v.oneA,oneB:v.oneB,net:v.net,levy:a.levy,share:a.share,inc:a.inc};
  });
  eq('one entry saved',bas.n,1);
  eq('saved settlement',bas.take,260.5);
  eq('G1 = 510 − 80 tax-free cash, whole dollars',bas.g1,430);
  eq('1A = 430/11 = 39.09 → round down',bas.oneA,39);
  eq('1B = all claimed fuel 100/11 = 9.09 → round down',bas.oneB,9);
  eq('net GST payable',bas.net,30);
  eq('levy in range',bas.levy,3.6);

  console.log('ATO whole-dollar rounding (round down, no cents)');
  const r=await pg.evaluate(()=>[roundAtoDollar(236.5),roundAtoDollar(236.99),roundAtoDollar(236.01),roundAtoDollar(0),roundAtoDollar(-12.7)]);
  eq('236.50 → 236',r[0],236);eq('236.99 → 236',r[1],236);eq('236.01 → 236',r[2],236);eq('0 → 0',r[3],0);eq('−12.70 → −12',r[4],-12);

  console.log('GST on driver share');
  const sh=await pg.evaluate(()=>{settings.gstBase='share';const v=basValsFromAgg(rangeAgg());settings.gstBase='gross';return v});
  eq('G1 = 430 × .55 = 236.5 → 236',sh.g1,236);
  eq('1A = 236/11 = 21.45 → 21',sh.oneA,21);

  console.log('Expenses with GST and business use');
  const ex=await pg.evaluate(()=>{
    deductions=[{id:'d1',date:'2026-11-01',amount:110,gst:true,bu:50,cat:'Car'},{id:'d2',date:'2026-11-01',amount:40,gst:false,bu:100,cat:'Fees'}];
    const a=rangeAgg();return {cred:a.expCred,ded:a.expDed,oneB:basValsFromAgg(a).oneB};
  });
  eq('GST credit = 110/11 × 50%',ex.cred,5);
  eq('deduction = 110×10/11×50% + 40',ex.ded,90);
  eq('1B = 5 + 9.09 = 14.09 → 14',ex.oneB,14);

  console.log('Income tax (ATO 2026–27 resident rates)');
  const tx=await pg.evaluate(()=>typeof incomeTaxFor==='function'?[incomeTaxFor(18200,2026),incomeTaxFor(45000,2026),incomeTaxFor(60000,2026),incomeTaxFor(135000,2026),incomeTaxFor(200000,2026)]:null);
  if(tx){
    eq('$18,200 → $0',tx[0].tax,0);
    eq('$45,000 → $4,020',tx[1].tax,4020);
    eq('$60,000 → 4,020 + 30%×15,000 = 8,520',tx[2].tax,8520);
    eq('$135,000 → $31,020',tx[3].tax,31020);
    eq('$200,000 → 51,370 + 45%×10,000 = 55,870',tx[4].tax,55870);
    eq('LITO at $45,000 = $325',tx[1].lito,325);
    eq('LITO at $60,000 = 325 − 1.5%×15,000 = 100',tx[2].lito,100);
    eq('Medicare 2% at $60,000',tx[2].medicare,1200);
    eq('total at $60,000 = 8,520 − 100 + 1,200',tx[2].total,9620);
    const lo=await pg.evaluate(()=>[incomeTaxFor(28000,2026).medicare,incomeTaxFor(30000,2026).medicare,incomeTaxFor(40000,2026).medicare]);
    eq('Medicare nil at $28,000 (under $28,011)',lo[0],0);
    eq('Medicare phase-in at $30,000 = 10%×1,989',lo[1],198.9);
    eq('Medicare full 2% at $40,000',lo[2],800);
  } else console.log('  (incomeTaxFor not present yet)');

  console.log('Executive figures (fixed 20% set-aside)');
  const ef=await pg.evaluate(()=>{
    deductions=[];settings.taxMode='fixed';settings.taxPct=20;
    const x=execFigures(rangeAgg());settings.taxMode='auto';return x});
  eq('operator = 510 − 280.50',ef.operator,229.5);
  eq('GST net = 430/11 − 100/11',ef.gstNet,30);
  eq('costs = 0 (shift fuel excluded)',ef.costs,0);
  eq('taxable = 280.50 − 39.0909 − 3.60',ef.taxable,237.8091,0.001);
  eq('tax = 20% of taxable',ef.tax,47.5618,0.001);
  eq('kept = 280.50 − 3.60 − 30 − 47.5618',ef.kept,199.3382,0.001);
  eq('identity: gross = operator+levy+GST+costs+tax+kept',ef.operator+ef.levy+ef.gstNet+ef.costs+ef.tax+ef.kept,510,0.0001);
  const ef2=await pg.evaluate(()=>{deductions=[{id:'d1',date:'2026-11-01',amount:110,gst:true,bu:100,cat:'Car'}];settings.taxMode='fixed';settings.taxPct=20;const x=execFigures(rangeAgg());settings.taxMode='auto';deductions=[];return x});
  eq('costs with $110 expense = 110',ef2.costs,110);
  eq('taxable drops by 100 ex-GST',ef2.taxable,137.8091,0.001);
  eq('identity holds with costs',ef2.operator+ef2.levy+ef2.gstNet+ef2.costs+ef2.tax+ef2.kept,510,0.0001);
  const off=await pg.evaluate(()=>{settings.taxMode='off';const x=execFigures(rangeAgg()).tax;settings.taxMode='auto';return x});
  eq('set-aside off → $0 tax',off,0);
  eq('no page errors',errs,[]);
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close();srv.close();process.exit(fail?1:0);
})();
