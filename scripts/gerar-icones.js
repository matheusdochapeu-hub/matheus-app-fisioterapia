/* Gera os ícones PWA do zero, em Node puro (só zlib), sem libs externas.
   Tema outono/terracota: tile terracota com uma folha âmbar/creme.
   Uso: node scripts/gerar-icones.js
   Saída: icons/icon-192.png, icon-512.png, icon-maskable-512.png */
'use strict';
var zlib = require('zlib');
var fs = require('fs');
var path = require('path');

/* ---------- PNG encoder (RGBA, 8-bit) ---------- */
function crc32(buf){
  var c, table = crc32._t;
  if(!table){
    table = crc32._t = [];
    for(var n=0;n<256;n++){
      c = n;
      for(var k=0;k<8;k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
  }
  c = 0xFFFFFFFF;
  for(var i=0;i<buf.length;i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data){
  var len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  var t = Buffer.from(type, 'ascii');
  var body = Buffer.concat([t, data]);
  var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba){
  var sig = Buffer.from([137,80,78,71,13,10,26,10]);
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0); ihdr.writeUInt32BE(height,4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  var stride = width*4;
  var raw = Buffer.alloc((stride+1)*height);
  for(var y=0;y<height;y++){
    raw[y*(stride+1)] = 0;  // filtro None
    rgba.copy(raw, y*(stride+1)+1, y*stride, y*stride+stride);
  }
  var idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([ sig, chunk('IHDR',ihdr), chunk('IDAT',idat), chunk('IEND',Buffer.alloc(0)) ]);
}

/* ---------- helpers de pintura ---------- */
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function mix(a,b,t){ return a+(b-a)*t; }
function mixColor(c1,c2,t){ return [mix(c1[0],c2[0],t),mix(c1[1],c2[1],t),mix(c1[2],c2[2],t)]; }
/* cobertura suave de uma borda em distância d (d<0 dentro), aa = largura da transição */
function cov(d, aa){ return clamp(0.5 - d/aa, 0, 1); }

/* desenha uma folha estilizada (elipse + nervura central + recortes) centrada em (cx,cy) */
function leafShape(px, py, cx, cy, R){
  // coordenadas locais, girando ~ -20°
  var ang = -0.35;
  var dx = px - cx, dy = py - cy;
  var x =  dx*Math.cos(ang) + dy*Math.sin(ang);
  var y = -dx*Math.sin(ang) + dy*Math.cos(ang);
  // elipse alongada (folha): raio em x menor que em y
  var rx = R*0.62, ry = R*0.98;
  // ondulação da borda para dar cara de folha
  var theta = Math.atan2(y, x);
  var wob = 1 + 0.06*Math.cos(theta*7);
  var e = Math.sqrt((x*x)/(rx*rx) + (y*y)/(ry*ry)) / wob;
  // distância assinada aproximada à borda (em px)
  var d = (e - 1) * Math.min(rx,ry);
  return { d: d, x: x, y: y, rx: rx, ry: ry };
}

function buildIcon(size, maskable){
  var rgba = Buffer.alloc(size*size*4);
  var aa = Math.max(1.2, size/190);           // largura de anti-aliasing
  var pad = maskable ? size*0.12 : 0;         // zona segura do maskable
  var inner = size - pad*2;
  var radius = maskable ? size*0.5 : inner*0.235;  // maskable: fundo circular; normal: quadrado arredondado
  var cx = size/2, cy = size/2;

  // paleta terracota / outono
  var terraTop = [0xC9,0x62,0x33];   // terracota clara (topo)
  var terraBot = [0x8F,0x3F,0x20];   // terracota profunda (base)
  var leafFill1 = [0xF3,0xD9,0xB0];  // creme âmbar (claro)
  var leafFill2 = [0xE3,0x9A,0x3C];  // âmbar/mostarda (sombra)
  var vein = [0xB5,0x54,0x2E];       // nervura terracota
  var stem = [0x7C,0x54,0x2C];

  var leafR = inner*0.33;

  for(var y=0;y<size;y++){
    for(var x=0;x<size;x++){
      var i = (y*size + x)*4;
      var r,g,b,a=0;

      // --- fundo (tile) ---
      var bgCov;
      if(maskable){
        var dC = Math.sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy)) - radius;
        bgCov = cov(dC, aa);
      }else{
        // retângulo arredondado dentro do padding
        var qx = Math.abs(x-cx) - (inner/2 - radius);
        var qy = Math.abs(y-cy) - (inner/2 - radius);
        var dR = Math.min(Math.max(qx,qy),0) + Math.sqrt(Math.max(qx,0)*Math.max(qx,0)+Math.max(qy,0)*Math.max(qy,0)) - radius;
        bgCov = cov(dR, aa);
      }

      // gradiente diagonal do fundo
      var tg = clamp(((x*0.4 + y*0.6)/size), 0, 1);
      var bg = mixColor(terraTop, terraBot, tg);
      r=bg[0]; g=bg[1]; b=bg[2]; a = bgCov;

      // --- caule ---
      var sx = cx + leafR*0.15, sy0 = cy + leafR*0.55, sy1 = cy + leafR*1.15;
      // distância a um segmento vertical levemente inclinado
      var t = clamp((y - sy0)/(sy1 - sy0), 0, 1);
      var stemX = sx + t*leafR*0.18;
      var dStem = Math.abs(x - stemX) - leafR*0.055*(1-0.4*t);
      var stemCov = (y>sy0-aa && y<sy1+aa) ? cov(dStem, aa) : 0;

      // --- folha ---
      var lf = leafShape(x, y, cx, cy - leafR*0.08, leafR);
      var leafCov = cov(lf.d, aa);
      if(leafCov > 0){
        // sombreado da folha: do centro (claro) para a borda (âmbar escuro)
        var shade = clamp((lf.d/leafR) + 1, 0, 1); // 0 centro .. 1 borda
        var lcol = mixColor(leafFill1, leafFill2, clamp(shade*1.1,0,1));

        // nervura central (midrib): linha vertical em coords locais, afinando nas pontas
        var midW = leafR*0.030 * (1 - 0.55*clamp(Math.abs(lf.y)/lf.ry,0,1));
        var vcovMain = cov(Math.abs(lf.x) - midW, aa) * (Math.abs(lf.y) < lf.ry*0.9 ? 1 : 0);

        // nervuras laterais: partem da nervura central (base em y0 sobre x=0) e sobem em diagonal,
        // limitadas ao próprio comprimento para não "furar" a folha
        var vc = 0;
        var pairs = [
          { y0:  leafR*0.30, slope: 0.62, len: leafR*0.55 },
          { y0:  leafR*0.02, slope: 0.72, len: leafR*0.62 },
          { y0: -leafR*0.28, slope: 0.85, len: leafR*0.52 }
        ];
        for(var bi=0; bi<pairs.length; bi++){
          for(var side=-1; side<=1; side+=2){
            var p = pairs[bi];
            var s = p.slope*side;
            // x esperado da nervura para este y
            var xv = s*(lf.y - p.y0);
            var along = (lf.y - p.y0);                 // distância ao longo (em y) a partir da base
            var ok = (along <= p.len*1.0 && along >= -leafR*0.04);
            // mantém a nervura do lado correto (não cruza a central)
            var rightSide = (side>0 ? lf.x >= -midW : lf.x <= midW);
            var dv = Math.abs(lf.x - xv) - leafR*0.018;
            if(ok && rightSide) vc = Math.max(vc, cov(dv, aa));
          }
        }
        var veinCov = Math.max(vcovMain, vc*0.75) * (leafCov>0.55?1:0); // nervuras só no miolo opaco
        var leafColor = mixColor(lcol, vein, veinCov*0.8);
        // compõe folha sobre o fundo
        r = mix(r, leafColor[0], leafCov);
        g = mix(g, leafColor[1], leafCov);
        b = mix(b, leafColor[2], leafCov);
        a = Math.max(a, leafCov*bgCov>0?Math.max(a,leafCov):a);
      }
      // caule por cima do fundo, por baixo da folha já composta
      if(stemCov>0 && leafCov<0.5){
        r = mix(r, stem[0], stemCov);
        g = mix(g, stem[1], stemCov);
        b = mix(b, stem[2], stemCov);
        a = Math.max(a, stemCov);
      }

      rgba[i]   = Math.round(clamp(r,0,255));
      rgba[i+1] = Math.round(clamp(g,0,255));
      rgba[i+2] = Math.round(clamp(b,0,255));
      rgba[i+3] = Math.round(clamp(a,0,1)*255);
    }
  }
  return encodePNG(size, size, rgba);
}

var outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir,'icon-192.png'), buildIcon(192, false));
fs.writeFileSync(path.join(outDir,'icon-512.png'), buildIcon(512, false));
fs.writeFileSync(path.join(outDir,'icon-maskable-512.png'), buildIcon(512, true));
console.log('Ícones gerados em', outDir);
