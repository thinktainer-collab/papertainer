/* "뿡뿡 행진곡": an original bouncy toy-box tune in C major, General-MIDI style instruments
   (marimba lead, glockenspiel sparkles, tuba-ish oom-pah bass, pizzicato off-beat chords, soft kit).
   16 bars on a 16th-note grid, looped. The same engine drives the game and the offline preview render. */
function makeSong(ctx,dest,noiseBuf){
  const N=(m)=>440*Math.pow(2,(m-69)/12);
  // melody: [bar, step, midi note, length in 16ths]
  const MEL=[
    // A: C  Am  F  G
    [0,0,76,2],[0,2,79,2],[0,4,84,2],[0,6,79,2],[0,8,81,3],[0,11,79,1],[0,12,76,4],
    [1,0,72,2],[1,2,76,2],[1,4,81,2],[1,6,79,2],[1,8,76,2],[1,10,74,2],[1,12,72,4],
    [2,0,77,2],[2,2,81,2],[2,4,84,2],[2,6,81,2],[2,8,79,3],[2,11,77,1],[2,12,76,2],[2,14,74,2],
    [3,0,74,2],[3,2,76,2],[3,4,79,2],[3,6,83,2],[3,8,81,2],[3,10,79,2],[3,12,74,2],[3,14,79,2],
    // A': C  Am  F  G->C
    [4,0,76,2],[4,2,79,2],[4,4,84,2],[4,6,79,2],[4,8,81,3],[4,11,79,1],[4,12,76,4],
    [5,0,72,2],[5,2,76,2],[5,4,81,2],[5,6,79,2],[5,8,76,2],[5,10,74,2],[5,12,72,4],
    [6,0,77,2],[6,2,81,2],[6,4,84,2],[6,6,81,2],[6,8,79,3],[6,11,77,1],[6,12,76,2],[6,14,74,2],
    [7,0,83,2],[7,2,81,2],[7,4,79,2],[7,6,77,2],[7,8,76,2],[7,10,74,2],[7,12,72,4],
    // B: F  G  Em  Am  F  G  C  G
    [8,0,81,4],[8,4,84,4],[8,8,81,2],[8,10,79,2],[8,12,77,4],
    [9,0,79,4],[9,4,83,4],[9,8,86,4],[9,12,83,4],
    [10,0,79,2],[10,2,76,2],[10,4,79,2],[10,6,83,2],[10,8,81,4],[10,12,79,4],
    [11,0,76,2],[11,2,72,2],[11,4,76,2],[11,6,81,2],[11,8,79,4],[11,12,76,4],
    [12,0,77,2],[12,2,79,2],[12,4,81,2],[12,6,84,2],[12,8,86,4],[12,12,84,4],
    [13,0,83,2],[13,2,81,2],[13,4,79,2],[13,6,81,2],[13,8,83,4],[13,12,86,4],
    [14,0,84,2],[14,2,88,2],[14,4,86,2],[14,6,84,2],[14,8,79,4],[14,12,76,4],
    [15,0,74,2],[15,2,76,2],[15,4,77,2],[15,6,79,2],[15,8,81,2],[15,10,83,2],[15,12,79,4],
  ];
  // chord per bar: [bass root midi, triad midi]
  const C=[48,[60,64,67]],Am=[45,[57,60,64]],F=[41,[57,60,65]],G=[43,[55,59,62]],Em=[40,[55,59,64]];
  const CH=[C,Am,F,G, C,Am,F,C, F,G,Em,Am, F,G,C,G];
  const byStep={};for(const [b,s,m,l] of MEL)(byStep[b*16+s]=byStep[b*16+s]||[]).push([m,l]);
  const env=(g,t,peak,att,dec)=>{g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+att);g.gain.exponentialRampToValueAtTime(0.0001,t+att+dec);};
  function marimba(t,m,len){ // woody mallet: sine + 4th harmonic with a quick knock
    const f=N(m);for(const [mul,v,d] of [[1,0.16,Math.min(0.55,len*0.9)],[4,0.035,0.08],[10,0.012,0.03]]){
      const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f*mul;env(g,t,v,0.004,d);o.connect(g);g.connect(dest);o.start(t);o.stop(t+d+0.05);}
  }
  function glock(t,m){ // bell sparkle: sine with an inharmonic partial, long ring
    const f=N(m);for(const [mul,v,d] of [[1,0.05,0.9],[2.76,0.018,0.35]]){
      const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f*mul;env(g,t,v,0.002,d);o.connect(g);g.connect(dest);o.start(t);o.stop(t+d+0.05);}
  }
  function tuba(t,m,d){ // round oom-pah bass: triangle + sine sub through a low-pass, soft attack
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=700;lp.connect(dest);
    for(const [type,mul,v] of [['triangle',1,0.2],['sine',0.5,0.12]]){
      const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=N(m)*mul;env(g,t,v,0.02,d);o.connect(g);g.connect(lp);o.start(t);o.stop(t+d+0.08);}
  }
  function pizz(t,notes){ // short plucked off-beat chord
    for(const m of notes){const o=ctx.createOscillator(),g=ctx.createGain();o.type='square';o.frequency.value=N(m);
      const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1800;env(g,t,0.018,0.003,0.11);o.connect(lp);lp.connect(g);g.connect(dest);o.start(t);o.stop(t+0.16);}
  }
  function kick(t){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(48,t+0.1);
    env(g,t,0.32,0.003,0.14);o.connect(g);g.connect(dest);o.start(t);o.stop(t+0.2);}
  function hiss(t,dur,vol,lo,hi){ if(!noiseBuf) return; const s=ctx.createBufferSource();s.buffer=noiseBuf;
    const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=lo;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=hi;
    const g=ctx.createGain();env(g,t,vol,0.002,dur);s.connect(hp);hp.connect(lp);lp.connect(g);g.connect(dest);s.start(t,Math.random()*0.5);s.stop(t+dur+0.05);}
  // play one 16th-note step of the 256-step loop at time t
  return function playStep(step,t,sixteenth){
    const bar=Math.floor(step/16)%16, s=step%16, [root,tri]=CH[bar];
    for(const [m,l] of (byStep[(bar*16+s)]||[])) marimba(t,m,l*sixteenth);
    if(s===0||s===8) tuba(t,root,sixteenth*3.2);
    if(s===4||s===12) tuba(t,root+7,sixteenth*2.6);
    if(s===14&&bar%2===1) tuba(t,root+12,sixteenth*1.5);
    if(s===2||s===6||s===10||s===14) pizz(t,tri);
    if(s===15) glock(t,tri[(bar)%3]+24);
    if(s===7&&bar%4===3) glock(t,tri[2]+24);
    if(s===0||s===8) kick(t);
    if(s===4||s===12) hiss(t,0.09,0.07,1200,5000);
    hiss(t,0.03,s%2?0.022:0.012,6000,12000);
  };
}
