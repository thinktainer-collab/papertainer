/* SUPER-D model factory for still images: the same build as the game sprites, plus a chicken driver. */
function makeRacerFactory(){

const V=(x,y,z)=>new THREE.Vector3(x,y,z), PI=Math.PI;
const MATS={};const lin=c=>new THREE.Color(c).convertSRGBToLinear();
const mat=(c,o)=>{const k=c+(o?JSON.stringify(o):'');if(MATS[k])return MATS[k];const m=new THREE.MeshStandardMaterial(Object.assign({roughness:0.7,flatShading:true},o||{}));
  m.color=lin(c);if(o&&o.emissive)m.emissive=lin(o.emissive);return MATS[k]=m;};
function mesh(geo,c,o){const m=new THREE.Mesh(geo,mat(c,o));m.castShadow=true;m.receiveShadow=true;return m;}
function put(parent,m,x,y,z,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1){m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.scale.set(sx,sy,sz);parent.add(m);return m;}
const rig=new THREE.Group(); let paint=null, car=null, parts={};
function labelTex(dark){
  const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');
  g.clearRect(0,0,512,128);g.font='italic 900 84px "Black Han Sans", sans-serif';g.textAlign='center';g.textBaseline='middle';
  g.lineWidth=10;g.strokeStyle=dark?'#ffc83d':'#2b2622';g.strokeText('SUPER-D',256,68);g.fillStyle='#e8483b';g.fillText('SUPER-D',256,68);
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;
}
function wheel(r,w){
  const g=new THREE.Group();
  put(g,mesh(new THREE.CylinderGeometry(r,r,w,12),'#3c3c46'),0,0,0,0,0,PI/2);
  for(let k=0;k<12;k++){const a=k/12*PI*2;put(g,mesh(new THREE.BoxGeometry(w*1.02,r*0.12,r*0.22),'#2b2b33'),0,Math.cos(a)*r*0.98,Math.sin(a)*r*0.98,a);}
  put(g,mesh(new THREE.CylinderGeometry(r*0.58,r*0.58,w*1.06,10),'#ffc83d'),0,0,0,0,0,PI/2);
  for(let k=0;k<5;k++){const a=k/5*PI*2;for(const s of [1,-1]) put(g,mesh(new THREE.BoxGeometry(0.04,0.07,0.07),'#2b2622'),s*w*0.54,Math.cos(a)*r*0.32,Math.sin(a)*r*0.32);}
  for(const s of [1,-1]) put(g,mesh(new THREE.CylinderGeometry(r*0.14,r*0.14,0.04,8),'#2b2622'),s*w*0.54,0,0,0,0,PI/2);
  return g;
}
function build(){
  if(car) rig.remove(car);
  car=new THREE.Group();rig.add(car);parts={wheels:[]};
  const body=new THREE.Group();car.add(body);parts.body=body;
  const DY=1.25, WR=0.62; // deck height, wheel radius
  const limb=(parent,p1,p2,r,c)=>{const A=V(...p1),B=V(...p2),d=B.clone().sub(A),m=mesh(new THREE.IcosahedronGeometry(1,1),c);
    m.position.copy(A.clone().add(B).multiplyScalar(0.5));m.scale.set(r,d.length()/2,r);m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());parent.add(m);return m;};
  // skateboard deck: flat middle, kicktails at both ends, maple edge, black grip tape (no lettering)
  put(body,mesh(new THREE.BoxGeometry(1.5,0.12,3.2),'#e8c27a'),0,DY,0);
  put(body,mesh(new THREE.BoxGeometry(1.44,0.03,3.2),'#2b2b33'),0,DY+0.075,0);
  for(const s of [1,-1]){
    const tail=new THREE.Group();tail.position.set(0,DY,s*1.6);tail.rotation.x=-s*0.32;body.add(tail);
    put(tail,mesh(new THREE.BoxGeometry(1.5,0.12,0.7),'#e8c27a'),0,0,s*0.35);
    put(tail,mesh(new THREE.CylinderGeometry(0.75,0.75,0.12,16,1,false,s>0?-PI/2:PI/2,PI),'#e8c27a'),0,0,s*0.7);
    put(tail,mesh(new THREE.BoxGeometry(1.44,0.03,0.7),'#2b2b33'),0,0.075,s*0.35);
    put(tail,mesh(new THREE.CylinderGeometry(0.72,0.72,0.03,16,1,false,s>0?-PI/2:PI/2,PI),'#2b2b33'),0,0.075,s*0.7);
  }
  for(const s of [1,-1]) put(body,mesh(new THREE.BoxGeometry(0.04,0.06,3.2),paint.deck),s*0.75,DY-0.03,0);
  // tall risers + long axles carrying big knobby off-road tyres
  for(const z of [1.25,-1.25]){
    put(body,mesh(new THREE.BoxGeometry(0.55,0.1,0.45),'#c8cbe0'),0,DY-0.11,z);
    put(body,mesh(new THREE.BoxGeometry(0.26,DY-WR-0.1,0.26),'#a6aab8'),0,(DY+WR)/2-0.08,z);
    put(car,mesh(new THREE.CylinderGeometry(0.08,0.08,2.0,8),'#c8cbe0'),0,WR,z,0,0,PI/2);
    for(const s of [1,-1]){const w=new THREE.Group();w.position.set(s*1.0,WR,z);car.add(w);parts.wheels.push(w);
      put(w,mesh(new THREE.CylinderGeometry(WR*0.9,WR*0.9,0.5,14),'#2f2f37'),0,0,0,0,0,PI/2);
      for(let k=0;k<16;k++){const t=k/16*PI*2, off=(k%2?0.12:-0.12);
        put(w,mesh(new THREE.BoxGeometry(0.24,WR*0.2,0.2),'#24242b'),off,Math.cos(t)*WR*0.93,Math.sin(t)*WR*0.93,t);}
      put(w,mesh(new THREE.CylinderGeometry(WR*0.5,WR*0.5,0.52,10),paint.wheel),0,0,0,0,0,PI/2);
      for(let k=0;k<5;k++){const t=k/5*PI*2;put(w,mesh(new THREE.BoxGeometry(0.06,WR*0.38,0.08),paint.wheel2),s*0.27,Math.cos(t)*WR*0.2,Math.sin(t)*WR*0.2,t);}
      put(w,mesh(new THREE.CylinderGeometry(0.1,0.1,0.56,8),'#2b2622'),0,0,0,0,0,PI/2);}
  }
  // bucket seat in the middle and a steering column at the front
  put(body,mesh(new THREE.BoxGeometry(0.85,0.22,0.75),'#3c3c46'),0,DY+0.19,-0.1);
  put(body,mesh(new THREE.BoxGeometry(0.85,0.9,0.14),'#3c3c46'),0,DY+0.6,-0.5,-0.15);
  for(const sd of [1,-1]) put(body,mesh(new THREE.BoxGeometry(0.1,0.42,0.75),'#e8483b'),sd*0.44,DY+0.38,-0.12);
  const col=mesh(new THREE.CylinderGeometry(0.05,0.05,1.0,8),'#3c3c46');col.position.set(0,DY+0.5,0.78);col.rotation.x=-0.55;body.add(col);
  const steer=new THREE.Group();steer.position.set(0,DY+0.92,0.52);steer.rotation.x=-0.7;body.add(steer);parts.driver=steer;
  put(steer,mesh(new THREE.TorusGeometry(0.3,0.05,6,16),'#2b2622'),0,0,0);
  put(steer,mesh(new THREE.BoxGeometry(0.56,0.06,0.06),'#2b2622'),0,0,0);
  put(steer,mesh(new THREE.CylinderGeometry(0.08,0.08,0.06,10),'#e8483b'),0,0,0,PI/2);
  // the MAD duck now drives: sitting in the seat, wings on the wheel, feet on the deck
  const duck=new THREE.Group();duck.position.set(0,DY,-0.57);body.add(duck);parts.duck=duck;
  put(duck,mesh(new THREE.IcosahedronGeometry(1,1),paint.duck),0,0.66,0.5,0,0,0,0.62,0.6,0.56);
  put(duck,mesh(new THREE.ConeGeometry(0.2,0.5,5),paint.wing),0,1.0,0.05,-0.6);
  for(const sd of [1,-1]){ limb(duck,[sd*0.5,0.85,0.55],[sd*0.27,0.98,1.06],0.12,paint.wing);
    put(duck,mesh(new THREE.BoxGeometry(0.22,0.06,0.3),'#ff9a1f'),sd*0.2,0.12,1.2); }
  const head=new THREE.Group();head.position.set(0,1.5,0.62);duck.add(head);parts.head=head;
  put(head,mesh(new THREE.IcosahedronGeometry(0.56,1),paint.head),0,0,0);
  put(head,mesh(new THREE.BoxGeometry(0.46,0.11,0.55),'#ff9a1f'),0,-0.08,0.62);
  const billLo=put(head,mesh(new THREE.BoxGeometry(0.42,0.08,0.48),'#e8801a'),0,-0.2,0.56);
  parts.billLo=billLo;
  for(const s of [1,-1]){
    // angry eyes: big whites facing forward, pupils pulled toward the bill, a lid squinting from above, brows in a sharp V
    put(head,mesh(new THREE.IcosahedronGeometry(0.21,1),'#ffffff'),s*0.21,0.1,0.42,0,0,0,1,1,0.6);
    put(head,mesh(new THREE.IcosahedronGeometry(0.1,1),'#1a1410'),s*0.15,0.06,0.53,0,0,0,1,1,0.5);
    put(head,mesh(new THREE.BoxGeometry(0.03,0.03,0.02),'#ffffff'),s*0.12,0.1,0.58);
    put(head,mesh(new THREE.BoxGeometry(0.46,0.14,0.2),paint.head),s*0.21,0.24,0.47,0,0,s*0.5);
    put(head,mesh(new THREE.BoxGeometry(0.42,0.1,0.14),'#1a1410'),s*0.21,0.33,0.52,0,0,s*0.55);
  }
  for(const s of [1,-1]) put(head,mesh(new THREE.ConeGeometry(0.05,0.36,4),'#1a1410'),s*0.08,0.62,0.05,0.2,0,s*-0.35);
  // the jet engine on a pylon at the back: intake ring, spinning fan, red band, nozzle
  const jet=new THREE.Group();jet.position.set(0,DY+0.95,-1.45);body.add(jet);
  put(body,mesh(new THREE.BoxGeometry(0.16,0.55,0.9),'#a6aab8'),0,DY+0.35,-1.45);
  put(jet,mesh(new THREE.CylinderGeometry(0.46,0.42,1.3,16),'#d0d2e6'),0,0,0,PI/2);
  put(jet,mesh(new THREE.CylinderGeometry(0.47,0.47,0.16,16),'#e8483b'),0,0,0.1,PI/2);
  put(jet,mesh(new THREE.TorusGeometry(0.45,0.07,8,20),'#a6aab8'),0,0,0.66);
  put(jet,mesh(new THREE.CylinderGeometry(0.43,0.43,0.04,16),'#2b2b33'),0,0,0.5,PI/2);
  const fan=new THREE.Group();fan.position.set(0,0,0.56);jet.add(fan);parts.fan=fan;
  for(let k=0;k<8;k++){const b=new THREE.Group();b.rotation.z=k/8*PI*2;fan.add(b);put(b,mesh(new THREE.BoxGeometry(0.09,0.36,0.03),'#e6e9f2'),0,0.21,0,0,0.5);}
  put(fan,mesh(new THREE.ConeGeometry(0.12,0.25,10),'#e6e9f2'),0,0,0.1,PI/2);
  put(jet,mesh(new THREE.CylinderGeometry(0.42,0.28,0.4,16),'#8f93b0'),0,0,-0.85,PI/2);
  const glow=put(jet,mesh(new THREE.CylinderGeometry(0.26,0.26,0.03,16),'#ff9a1f',{emissive:'#ff6a1a'}),0,0,-1.06,PI/2);parts.glow=glow;
  parts.nozzle=V(0,DY+0.95,-2.55);
  for(const s of [1,-1]) put(body,mesh(new THREE.BoxGeometry(0.12,0.08,0.06),'#fff6c0',{emissive:'#7a6a20'}),s*0.45,DY+0.02,2.31);
}

function angryEyes(head){
  for(const s of [1,-1]){
    put(head,mesh(new THREE.IcosahedronGeometry(0.21,1),'#ffffff'),s*0.21,0.1,0.42,0,0,0,1,1,0.6);
    put(head,mesh(new THREE.IcosahedronGeometry(0.1,1),'#1a1410'),s*0.15,0.06,0.53,0,0,0,1,1,0.5);
    put(head,mesh(new THREE.BoxGeometry(0.03,0.03,0.02),'#ffffff'),s*0.12,0.1,0.58);
    put(head,mesh(new THREE.BoxGeometry(0.46,0.14,0.2),paint.head),s*0.21,0.24,0.47,0,0,s*0.5);
    put(head,mesh(new THREE.BoxGeometry(0.42,0.1,0.14),'#1a1410'),s*0.21,0.33,0.52,0,0,s*0.55);
  }
}
function chickenify(){
  const head=parts.head; while(head.children.length) head.remove(head.children[0]);
  put(head,mesh(new THREE.IcosahedronGeometry(0.56,1),paint.head),0,0,0);
  for(const [z,y,r] of [[0.28,0.56,0.15],[0.06,0.66,0.19],[-0.17,0.62,0.17],[-0.36,0.5,0.13]]) put(head,mesh(new THREE.IcosahedronGeometry(r,1),'#e8483b'),0,y,z,0,0,0,0.55,1,1);
  put(head,mesh(new THREE.ConeGeometry(0.17,0.36,4),'#ffb02e'),0,-0.06,0.68,Math.PI/2,Math.PI/4,0);
  put(head,mesh(new THREE.IcosahedronGeometry(0.12,1),'#e8483b'),0,-0.34,0.5,0,0,0,0.8,1.5,0.8);
  angryEyes(head);
  const d=parts.duck;
  for(const [x,rz,c] of [[0,0,'#e8483b'],[0.14,-0.3,'#c96a2a'],[-0.14,0.3,'#c96a2a']]) put(d,mesh(new THREE.ConeGeometry(0.12,0.6,4),c),x,1.15,0.0,-0.5,0,rz);
}
return function make(p,chicken){ paint=p; build(); if(chicken) chickenify(); const c=car; rig.remove(c); return {car:c,parts}; };
}
