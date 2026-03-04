import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
//  CHESS ENGINE
// ═══════════════════════════════════════════════════════════════
const VAL = { P:100, N:320, B:330, R:500, Q:900, K:20000 };
const PST = {
  P:  [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
  N:  [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
  B:  [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
  R:  [0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
  Q:  [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
  K:  [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20],
  Ke: [-50,-40,-30,-20,-20,-30,-40,-50,-30,-20,-10,0,0,-10,-20,-30,-30,-10,20,30,30,20,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,20,30,30,20,-10,-30,-30,-30,0,0,0,0,-30,-30,-50,-30,-30,-30,-30,-30,-30,-50],
};

const sq  = (r,c) => r*8+c;
const ROW = i => i >> 3;
const COL = i => i & 7;
const CLR = p => p ? p[0] : null;
const TYP = p => p ? p[1] : null;
const inB = (r,c) => r>=0 && r<8 && c>=0 && c<8;
const OPP = c => c==="w" ? "b" : "w";

// ── Board init ────────────────────────────────────────────────
function initBoard() {
  const b = Array(64).fill(null);
  const back = ["R","N","B","Q","K","B","N","R"];
  for (let i=0;i<8;i++) { b[i]="b"+back[i]; b[8+i]="bP"; b[48+i]="wP"; b[56+i]="w"+back[i]; }
  return b;
}
const newGS = () => ({ board:initBoard(), turn:"w", castling:{wK:true,wQ:true,bK:true,bQ:true}, enPassant:null, halfMove:0, fullMove:1 });

// ── Move generation ───────────────────────────────────────────
function genMoves(state, from, onlyCap=false) {
  const { board, turn, castling, enPassant } = state;
  const piece = board[from]; if (!piece || CLR(piece)!==turn) return [];
  const pt=TYP(piece), moves=[], r=ROW(from), c=COL(from);
  const push = (to, sp=null, pt2=null) => {
    if (to<0||to>63) return;
    const t=board[to];
    if (t && CLR(t)===turn) return;
    if (onlyCap && !t && sp!=="ep") return;
    moves.push({from,to,special:sp,promTo:pt2});
  };
  const slide = (dr,dc) => {
    let nr=r+dr, nc=c+dc;
    while (inB(nr,nc)) {
      const ti=sq(nr,nc);
      if (board[ti]) { if (CLR(board[ti])!==turn) moves.push({from,to:ti,special:null,promTo:null}); break; }
      if (!onlyCap) moves.push({from,to:ti,special:null,promTo:null});
      nr+=dr; nc+=dc;
    }
  };
  if (pt==="P") {
    const dir=turn==="w"?-1:1, sR=turn==="w"?6:1, pR=turn==="w"?0:7, fwd=sq(r+dir,c);
    if (inB(r+dir,c) && !board[fwd] && !onlyCap) {
      if (r+dir===pR) { for (const p of ["Q","R","B","N"]) push(fwd,"prom",p); }
      else { push(fwd); if (r===sR && !board[sq(r+2*dir,c)]) push(sq(r+2*dir,c),"dp"); }
    }
    for (const dc2 of [-1,1]) {
      if (!inB(r+dir,c+dc2)) continue;
      const ti=sq(r+dir,c+dc2);
      if (board[ti] && CLR(board[ti])!==turn) {
        if (r+dir===pR) { for (const p of ["Q","R","B","N"]) push(ti,"prom",p); } else push(ti);
      }
      if (enPassant===ti) push(ti,"ep");
    }
  } else if (pt==="N") {
    for (const [dr,dc2] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
      if (inB(r+dr,c+dc2)) push(sq(r+dr,c+dc2));
  } else if (pt==="B") { for (const [dr,dc2] of [[-1,-1],[-1,1],[1,-1],[1,1]]) slide(dr,dc2); }
  else if (pt==="R") { for (const [dr,dc2] of [[-1,0],[1,0],[0,-1],[0,1]]) slide(dr,dc2); }
  else if (pt==="Q") { for (const [dr,dc2] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) slide(dr,dc2); }
  else if (pt==="K") {
    for (const [dr,dc2] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
      if (inB(r+dr,c+dc2)) push(sq(r+dr,c+dc2));
    if (!onlyCap) {
      if (turn==="w" && r===7) {
        if (castling.wK && !board[61] && !board[62] && board[63]==="wR") moves.push({from,to:62,special:"castle",promTo:null});
        if (castling.wQ && !board[59] && !board[58] && !board[57] && board[56]==="wR") moves.push({from,to:58,special:"castle",promTo:null});
      } else if (turn==="b" && r===0) {
        if (castling.bK && !board[5] && !board[6] && board[7]==="bR") moves.push({from,to:6,special:"castle",promTo:null});
        if (castling.bQ && !board[3] && !board[2] && !board[1] && board[0]==="bR") moves.push({from,to:2,special:"castle",promTo:null});
      }
    }
  }
  return moves;
}

// ── Apply move ────────────────────────────────────────────────
function applyMove(state, move) {
  const b=[...state.board];
  const {from,to,special,promTo}=move;
  const piece=b[from]; const pt=TYP(piece); const turn=state.turn;
  const nc={...state.castling}; let nep=null;
  b[to]=promTo?(turn+promTo):piece; b[from]=null;
  if (special==="ep") b[sq(ROW(to)+(turn==="w"?1:-1),COL(to))]=null;
  if (special==="castle") {
    if (to===62){b[61]="wR";b[63]=null;} if (to===58){b[59]="wR";b[56]=null;}
    if (to===6){b[5]="bR";b[7]=null;}   if (to===2){b[3]="bR";b[0]=null;}
  }
  if (special==="dp") nep=sq(ROW(from)+(turn==="w"?-1:1),COL(from));
  if (pt==="K") { nc[turn+"K"]=false; nc[turn+"Q"]=false; }
  if (from===63||to===63) nc.wK=false; if (from===56||to===56) nc.wQ=false;
  if (from===7 ||to===7)  nc.bK=false; if (from===0 ||to===0)  nc.bQ=false;
  return { board:b, turn:OPP(turn), castling:nc, enPassant:nep,
    halfMove:(pt==="P"||state.board[to])?0:state.halfMove+1,
    fullMove:turn==="b"?state.fullMove+1:state.fullMove };
}

// ── Check detection ───────────────────────────────────────────
function sqAttacked(board, idx, byC) {
  const fs={board,turn:byC,castling:{wK:false,wQ:false,bK:false,bQ:false},enPassant:null};
  for (let i=0;i<64;i++)
    if (board[i] && CLR(board[i])===byC && genMoves(fs,i,true).some(m=>m.to===idx)) return true;
  return false;
}
const findKing = (board,c) => { for (let i=0;i<64;i++) if (board[i]===c+"K") return i; return -1; };
const inChk = (state,c) => { const k=findKing(state.board,c); return k<0?false:sqAttacked(state.board,k,OPP(c)); };
const legalOf = (state,from) => genMoves(state,from).filter(m=>!inChk(applyMove(state,m),state.turn));
function allLegal(state) {
  const ms=[];
  for (let i=0;i<64;i++) if (state.board[i] && CLR(state.board[i])===state.turn) ms.push(...legalOf(state,i));
  return ms;
}

// ── Evaluation ────────────────────────────────────────────────
function isEndgame(board) {
  let q=0,m=0;
  for (let i=0;i<64;i++){const p=board[i];if(!p)continue;const t=TYP(p);if(t==="Q")q++;if(t==="N"||t==="B"||t==="R")m++;}
  return q===0||(q<=2&&m<=2);
}
function evalBoard(state) {
  const {board}=state; const eg=isEndgame(board); let score=0;
  for (let i=0;i<64;i++){
    const p=board[i]; if(!p)continue;
    const pt=TYP(p),c=CLR(p),pi=c==="w"?i:63-i,pk=(pt==="K"&&eg)?"Ke":pt;
    score+=(c==="w"?1:-1)*(VAL[pt]+(PST[pk]?PST[pk][pi]:0));
  }
  // Mobility (skip kings/pawns for speed)
  for (let i=0;i<64;i++){
    const p=board[i]; if(!p)continue; const pt=TYP(p),c=CLR(p);
    if(pt==="K"||pt==="P") continue;
    const fs={board,turn:c,castling:{wK:false,wQ:false,bK:false,bQ:false},enPassant:null};
    score+=(c==="w"?1:-1)*genMoves(fs,i).length*2;
  }
  // Pawn structure
  const wP=Array(8).fill(0),bP=Array(8).fill(0);
  for (let i=0;i<64;i++){const p=board[i];if(!p||TYP(p)!=="P")continue;if(CLR(p)==="w")wP[COL(i)]++;else bP[COL(i)]++;}
  for (let f=0;f<8;f++){
    if(wP[f]>1)score-=20*(wP[f]-1); if(bP[f]>1)score+=20*(bP[f]-1);
    if((f===0||wP[f-1]===0)&&(f===7||wP[f+1]===0)&&wP[f]>0)score-=25;
    if((f===0||bP[f-1]===0)&&(f===7||bP[f+1]===0)&&bP[f]>0)score+=25;
  }
  // Passed pawns
  for (let i=0;i<64;i++){
    const p=board[i];if(!p||TYP(p)!=="P")continue;
    const r=ROW(i),cf=COL(i),c=CLR(p);
    if(c==="w"){let ok=true;for(let rr=0;rr<r&&ok;rr++)for(let ff=Math.max(0,cf-1);ff<=Math.min(7,cf+1);ff++)if(board[sq(rr,ff)]==="bP")ok=false;if(ok)score+=20+(6-r)*10;}
    else{let ok=true;for(let rr=r+1;rr<8&&ok;rr++)for(let ff=Math.max(0,cf-1);ff<=Math.min(7,cf+1);ff++)if(board[sq(rr,ff)]==="wP")ok=false;if(ok)score-=20+(r-1)*10;}
  }
  // King safety (middlegame)
  if(!eg){
    for (const c of ["w","b"]){
      const kIdx=findKing(board,c);if(kIdx<0)continue;
      const kr=ROW(kIdx),kc=COL(kIdx),sign=c==="w"?1:-1,dir=c==="w"?-1:1;
      let sh=0;for(const dc2 of[-1,0,1])if(inB(kr+dir,kc+dc2)&&board[sq(kr+dir,kc+dc2)]===c+"P")sh++;
      score+=sign*sh*15;
      for(const dc2 of[-1,0,1]){const f=kc+dc2;if(f<0||f>7)continue;let hp=false;for(let rr=0;rr<8;rr++)if(board[sq(rr,f)]===c+"P")hp=true;if(!hp)score-=sign*20;}
      let att=0;for(let dr=-2;dr<=2;dr++)for(let dc2=-2;dc2<=2;dc2++){if(!inB(kr+dr,kc+dc2))continue;const pp=board[sq(kr+dr,kc+dc2)];if(pp&&CLR(pp)===OPP(c)&&TYP(pp)!=="P"&&TYP(pp)!=="K")att++;}
      score-=sign*att*15;
    }
  }
  // Bishop pair
  let wB=0,bB=0;for(let i=0;i<64;i++){const p=board[i];if(!p||TYP(p)!=="B")continue;if(CLR(p)==="w")wB++;else bB++;}
  if(wB>=2)score+=30;if(bB>=2)score-=30;
  return score;
}
const evalForMover = state => state.turn==="w" ? evalBoard(state) : -evalBoard(state);

// ── Transposition table ───────────────────────────────────────
const TT_SIZE = 1<<18;
let tt = new Array(TT_SIZE);
const TT_EXACT=0, TT_ALPHA=1, TT_BETA=2;
const ttStore = (h,d,s,f,m) => { tt[h%TT_SIZE]={hash:h,depth:d,score:s,flag:f,bestMove:m}; };
const ttProbe = h => { const e=tt[h%TT_SIZE]; return(e&&e.hash===h)?e:null; };

// ── Zobrist hashing ───────────────────────────────────────────
const ZK = (() => {
  let s=0xdeadbeef;
  const rnd=()=>{s=(s^(s<<13))>>>0;s=(s^(s>>>7))>>>0;s=(s^(s<<17))>>>0;return s;};
  const k={};
  for (const p of ["wP","wN","wB","wR","wQ","wK","bP","bN","bB","bR","bQ","bK"]) { k[p]=[]; for(let i=0;i<64;i++) k[p][i]=rnd(); }
  k.turn=rnd(); k.ep=[]; for(let i=0;i<8;i++) k.ep[i]=rnd();
  k.castle={wK:rnd(),wQ:rnd(),bK:rnd(),bQ:rnd()};
  return k;
})();
function zobrist(state) {
  let h=0;
  for(let i=0;i<64;i++){const p=state.board[i];if(p)h^=ZK[p][i];}
  if(state.turn==="b") h^=ZK.turn;
  if(state.enPassant!==null) h^=ZK.ep[COL(state.enPassant)];
  for(const k of["wK","wQ","bK","bQ"]) if(state.castling[k]) h^=ZK.castle[k];
  return h>>>0;
}

// ── Quiescence search ─────────────────────────────────────────
const QMAX=5;
function quiesce(state, alpha, beta, qd=0) {
  const stand=evalForMover(state);
  if(qd>=QMAX) return stand;
  if(stand>=beta) return beta;
  if(stand>alpha) alpha=stand;
  const caps=[];
  for(let i=0;i<64;i++) if(state.board[i]&&CLR(state.board[i])===state.turn) caps.push(...genMoves(state,i,true));
  caps.sort((a,b)=>((VAL[TYP(state.board[b.to])]||0)-(VAL[TYP(state.board[b.from])]||0))-((VAL[TYP(state.board[a.to])]||0)-(VAL[TYP(state.board[a.from])]||0)));
  for(const m of caps){
    const ns=applyMove(state,m); if(inChk(ns,state.turn)) continue;
    const s=-quiesce(ns,-beta,-alpha,qd+1);
    if(s>=beta) return beta;
    if(s>alpha) alpha=s;
  }
  return alpha;
}

// ── Move ordering ─────────────────────────────────────────────
const mvScore = (state,m,ttBest) => {
  if(ttBest && m.from===ttBest.from && m.to===ttBest.to) return 1e6;
  const vic=state.board[m.to];
  if(vic) return 1e5+(VAL[TYP(vic)]||0)-(VAL[TYP(state.board[m.from])]||0);
  if(m.promTo) return 9e4+VAL[m.promTo];
  return 0;
};

// ── Negamax with alpha-beta ───────────────────────────────────
function negamax(state, depth, alpha, beta, hash) {
  const tte=ttProbe(hash); let ttBest=null;
  if(tte){
    ttBest=tte.bestMove;
    if(tte.depth>=depth){
      if(tte.flag===TT_EXACT) return tte.score;
      if(tte.flag===TT_ALPHA && tte.score<=alpha) return alpha;
      if(tte.flag===TT_BETA  && tte.score>=beta)  return beta;
    }
  }
  if(depth===0) return quiesce(state,alpha,beta);
  const pseudo=[];
  for(let i=0;i<64;i++) if(state.board[i]&&CLR(state.board[i])===state.turn) pseudo.push(...genMoves(state,i));
  if(!pseudo.length) return inChk(state,state.turn)?-99000+depth:0;
  const legal=pseudo.filter(m=>!inChk(applyMove(state,m),state.turn));
  if(!legal.length) return inChk(state,state.turn)?-99000+depth:0;
  legal.sort((a,b)=>mvScore(state,b,ttBest)-mvScore(state,a,ttBest));
  let best=-Infinity, bestMove=legal[0], flag=TT_ALPHA;
  for(const m of legal){
    const ns=applyMove(state,m);
    const s=-negamax(ns,depth-1,-beta,-alpha,zobrist(ns));
    if(s>best){best=s;bestMove=m;}
    if(s>alpha){alpha=s;flag=TT_EXACT;if(alpha>=beta){ttStore(hash,depth,beta,TT_BETA,m);return beta;}}
  }
  ttStore(hash,depth,best,flag,bestMove);
  return best;
}

// ── Iterative deepening ───────────────────────────────────────
function searchID(state, maxDepth, timeLimitMs) {
  const start=Date.now(); let bestMove=null;
  const rootHash=zobrist(state);
  for(let d=1;d<=maxDepth;d++){
    const moves=allLegal(state); if(!moves.length) break;
    const tte=ttProbe(rootHash);
    moves.sort((a,b)=>mvScore(state,b,tte?.bestMove||null)-mvScore(state,a,tte?.bestMove||null));
    let iterBest=null,iterScore=-Infinity,alpha=-Infinity,beta=Infinity;
    for(const m of moves){
      const ns=applyMove(state,m);
      const s=-negamax(ns,d-1,-beta,-alpha,zobrist(ns));
      if(s>iterScore){iterScore=s;iterBest=m;}
      if(s>alpha) alpha=s;
    }
    if(iterBest) bestMove=iterBest;
    if(Date.now()-start>timeLimitMs) break;
  }
  return bestMove||allLegal(state)[0]||null;
}

// ── Move quality ──────────────────────────────────────────────
const sqName = i => "abcdefgh"[COL(i)]+(8-ROW(i));
function mvName(state, move) {
  const pt=TYP(state.board[move.from]);
  if(move.special==="castle") return COL(move.to)===6?"O-O":"O-O-O";
  const cap=state.board[move.to]?"x":"", prom=move.promTo?"="+move.promTo:"";
  return (pt==="P"?(cap?sqName(move.from)[0]:""):pt)+cap+sqName(move.to)+prom;
}
function evalMoveQuality(state, move, opt) {
  if(!opt||(move.from===opt.from&&move.to===opt.to)) return {label:"Best!",color:"#22c55e",delta:0};
  const myS  = -evalForMover(applyMove(state,move));
  const optS = -evalForMover(applyMove(state,opt));
  const diff = optS-myS;
  if(diff<20)  return {label:"Excellent", color:"#86efac", delta:Math.max(0,Math.round(diff))};
  if(diff<60)  return {label:"Good",      color:"#bef264", delta:Math.round(diff)};
  if(diff<120) return {label:"Inaccuracy",color:"#fbbf24", delta:Math.round(diff)};
  if(diff<250) return {label:"Mistake",   color:"#f97316", delta:Math.round(diff)};
  return           {label:"Blunder!",  color:"#ef4444", delta:Math.round(diff)};
}

// ── Trash talk lines ─────────────────────────────────────────
// Bot gains advantage → mocks the player
const BOT_WINNING = [
  "Ajde bre, kaj prajiš? Mama ti igra bolje od tebe! 😂",
  "Jao čoveče, ti si k'o slepa kokoška na šahovskoj tabli!",
  "Bre, dal' ti znaš šta radiš il' samo turčiš figure?",
  "Majko mila, ovako loše nisam video ni kad Žika Šiponja igra pijan!",
  "Hahahaha! Idi nauči prvo da igras pa onda dođi kod mene!",
  "Bre čoveče, ti si meni dao figuru k'o poklon za Božić! Fala lepo! 🎁",
  "Jel' to potez il' si slučajno kliknuo? Pitam za drugarčeta...",
  "Bolan, nemoj me nerviraš... Ali ti si stvarno jadan igrač, čovek božji.",
  "E pa ovo je to! Sad ću te pregazim k'o kamion ciglu!",
  "Hej, piši kući da kasniš — ovde se dugo patiš! 😄",
  "Mori, ja sam mislio da ću se oznojim, al' ti si k'o baba na ledu!",
  "Uzeo sam ti figuru a ti si stojiš k'o kip na trgu. Budi živ!",
  "Bre, ti igraš šah il' glediš u tabanicu? Makni se malo!",
  "Ovolko lošo? Jel' si spavao sinoć il' si celu noć gledao u tabu?",
];

// Player gains advantage → bot gets salty / makes excuses
const PLAYER_WINNING = [
  "Čekaj čekaj, ja sam se samo zagrejavao! Nemoj da misliš ništa.",
  "Sačuvaj Bože, beginner's luck. Nema tu ništa od tebe!",
  "Bre, ovo se nije računalo! Ja sam mislio da igramo na šalu!",
  "Okej okej, mali je prednost, al' ti si još uvek gubiš na kraju — videćeš!",
  "Mama mi zvoni, sačekaj malo... (nema šanse da se sklanjam, ali daj odmor!)",
  "Auu, malo si se raspalio k'o Leskovačka roštiljijada! Al' nema struja dugo!",
  "Jao, uspeo si nešto. Sačekaj da se skupim, ima još dugo do mata!",
  "Bre, ne verujem! Valda si guglao potez? Nema šanse da si to sam smislio!",
  "Okej ti si malo bolji nego što sam mislio... AL SAMO MALO!",
  "Čovek pogodi jednom i misli da je Kasparo! Smiri se, brate!",
  "Slučajno si bio dobar. To se desi. Jednom u životu.",
  "Jel' te neko uči? Ko te uči? Kaži mi da ga nađem i objasnim mu!",
];

// Bot checkmates player
const BOT_CHECKMATE = [
  "ŠAH-MAT, BOLAN! 🏆 Idi kući, opere se, odmoraj se, ne igraš više šah!",
  "MATA! Ha! Rekao sam ti! Idi sad pa plači kod mame!",
  "Gotovo je, čoveče! Šah-mat k'o iz pušće! Nisi me iznervirao ni malo!",
];

// Player checkmates bot
const PLAYER_CHECKMATE = [
  "Ne može biti... Ovo nije fer... Ti si sigurno varao! 😤",
  "Dobro dobro, pobedio si. AL SAMO OVAJ PUT! Rematch, odmah!",
  "Bre, čestitam. Al' sledeći put te mlatim k'o tepih!",
];

const pick = arr => arr[Math.floor(Math.random()*arr.length)];

// ── Score helpers for trash talk trigger ────────────────────
// Returns centipawn score from white's perspective
const quickEval = board => {
  let s=0;
  for(let i=0;i<64;i++){const p=board[i];if(!p)continue;s+=(CLR(p)==="w"?1:-1)*VAL[TYP(p)];}
  return s;
};
const GLYPHS = {wK:"♔",wQ:"♕",wR:"♖",wB:"♗",wN:"♘",wP:"♙",bK:"♚",bQ:"♛",bR:"♜",bB:"♝",bN:"♞",bP:"♟"};

// ═══════════════════════════════════════════════════════════════
//  REACT COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function ChessApp() {
  const [screen,      setScreen]      = useState("menu");
  const [botRating,   setBotRating]   = useState(1000);
  const [playerColor, setPlayerColor] = useState("w");
  const [gs,          setGs]          = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [selMoves,    setSelMoves]    = useState([]);
  const [history,     setHistory]     = useState([]);
  const [lastMove,    setLastMove]    = useState(null);
  const [optMove,     setOptMove]     = useState(null);
  const [gameOver,    setGameOver]    = useState(null);
  const [thinking,    setThinking]    = useState(false);
  const [analysing,   setAnalysing]   = useState(false);
  const [chatLog,     setChatLog]     = useState([]); // [{msg, type}]
  const chatEndRef = useRef(null);
  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:"smooth"}); },[chatLog]);

  // drag
  const dragRef      = useRef(null);
  const [dragState,    setDragState]    = useState(null);
  const [dragOverIdx,  setDragOverIdx]  = useState(null);
  const boardRef     = useRef(null);

  // always-fresh refs for pointer handlers
  const gsRef   = useRef(gs);   useEffect(()=>{gsRef.current=gs;},[gs]);
  const pcRef   = useRef(playerColor); useEffect(()=>{pcRef.current=playerColor;},[playerColor]);
  const goRef   = useRef(gameOver);    useEffect(()=>{goRef.current=gameOver;},[gameOver]);
  const thkRef  = useRef(thinking);    useEffect(()=>{thkRef.current=thinking;},[thinking]);

  // timer refs so we can cancel on unmount / new game
  const botTimerRef  = useRef(null);
  const analTimerRef = useRef(null);

  const clearTimers = () => { clearTimeout(botTimerRef.current); clearTimeout(analTimerRef.current); };

  // ── Start game ─────────────────────────────────────────────
  const startGame = (r, pc) => {
    clearTimers();
    tt = new Array(TT_SIZE); // fresh TT each game
    setBotRating(r); setPlayerColor(pc);
    const g = newGS();
    setGs(g); setSelected(null); setSelMoves([]); setHistory([]);
    setLastMove(null); setOptMove(null); setGameOver(null);
    setThinking(false); setAnalysing(false); setChatLog([]);
    setDragState(null); setDragOverIdx(null); dragRef.current=null;
    setScreen("game");
    // If player chose black, bot goes first
    if (pc==="b") {
      setThinking(true);
      botTimerRef.current = setTimeout(() => runBot(g, r), 80);
    }
  };

  // ── Run bot (called via setTimeout so UI paints first) ─────
  const runBot = useCallback((state, rating) => {
    let depth, err, timeMs;
    if(rating<=500) {depth=1;err=0.65;timeMs=200;}
    else if(rating<=1000) {depth=3;err=0.3;timeMs=800;}
    else if(rating<=1500) {depth=4;err=0.08;timeMs=1800;}
    else {depth=6;err=0;timeMs=3000;}

    let move;
    if(Math.random()<err) {
      const ms=allLegal(state); move=ms[Math.floor(Math.random()*ms.length)]||null;
    } else {
      move=searchID(state,depth,timeMs);
    }

    if(!move) {
      setGameOver(inChk(state,state.turn)?"Bot checkmated! You win! 🎉":"Stalemate! Draw.");
      setThinking(false); return;
    }
    const ns=applyMove(state,move);
    const name=mvName(state,move);
    setLastMove(move); setGs(ns); setThinking(false);
    setHistory(h=>[...h,{color:state.turn,name,eval:null,isBot:true}]);
    // check game end
    const al=allLegal(ns);
    if(!al.length){
      const over=inChk(ns,ns.turn)?"Checkmate! Bot wins.":"Stalemate! Draw.";
      setGameOver(over);
      if(inChk(ns,ns.turn)) setChatLog(l=>[...l,{msg:pick(BOT_CHECKMATE),type:"bot"}]);
      return;
    }
    // Trash talk: fire when bot gains material OR just randomly (~60% of moves)
    const scoreBefore = quickEval(state.board);
    const scoreAfter  = quickEval(ns.board);
    const botColor    = state.turn;
    const botGain     = botColor==="w" ? scoreAfter-scoreBefore : scoreBefore-scoreAfter;
    // Overall bot advantage (positive = bot ahead)
    const botAdvantage = botColor==="w" ? scoreAfter : -scoreAfter;
    if(botGain >= 50 || botAdvantage > 150 || Math.random() < 0.35) {
      setChatLog(l=>[...l,{msg:pick(BOT_WINNING),type:"bot"}]);
    }
  }, []);

  // ── Bot turn trigger ────────────────────────────────────────
  useEffect(()=>{
    if(!gs||gameOver||thinking) return;
    if(gs.turn !== (playerColor==="w"?"b":"w")) return;
    setThinking(true);
    botTimerRef.current = setTimeout(()=>runBot(gs,botRating), 50);
  }, [gs, gameOver]); // eslint-disable-line

  // ── Execute player move ─────────────────────────────────────
  const execMove = useCallback((state, move, pc) => {
    const name=mvName(state,move);
    const ns=applyMove(state,move);
    setGs(ns); setLastMove(move);
    setSelected(null); setSelMoves([]); setOptMove(null);
    // Add to history immediately (eval fills in async)
    setHistory(h=>[...h,{color:pc,name,eval:null,optimal:null,isBot:false,pending:true}]);
    // Check game end
    const al=allLegal(ns);
    if(!al.length){
      if(inChk(ns,ns.turn)){
        setGameOver("Checkmate! You win! 🎉");
        setChatLog(l=>[...l,{msg:pick(PLAYER_CHECKMATE),type:"player"}]);
      } else {
        setGameOver("Stalemate! Draw.");
      }
      return;
    }
    // Async analysis — yields to paint first, then computes
    setAnalysing(true);
    analTimerRef.current = setTimeout(()=>{
      const opt=searchID(state,3,1200);
      const qual=evalMoveQuality(state,move,opt);
      const optName=opt?mvName(state,opt):null;
      setOptMove(opt);
      setAnalysing(false);
      setHistory(h=>{
        const next=[...h];
        const idx=next.findLastIndex(e=>!e.isBot&&e.pending);
        if(idx>=0) next[idx]={...next[idx],eval:qual,optimal:optName,pending:false};
        return next;
      });
      // Trash talk: player gains material OR player has clear advantage → bot gets salty
      const scoreBefore = quickEval(state.board);
      const scoreAfter  = quickEval(applyMove(state,move).board);
      const playerColor2 = state.turn;
      const playerGain   = playerColor2==="w" ? scoreAfter-scoreBefore : scoreBefore-scoreAfter;
      const playerAdvantage = playerColor2==="w" ? scoreAfter : -scoreAfter;
      if(playerGain >= 50 || playerAdvantage > 150 || Math.random() < 0.3) {
        setChatLog(l=>[...l,{msg:pick(PLAYER_WINNING),type:"player"}]);
      }
    }, 30);
  }, []);

  // ── Click ───────────────────────────────────────────────────
  const handleClick = useCallback((idx)=>{
    if(!gs||gs.turn!==playerColor||thinking||gameOver) return;
    if(selected===null){
      const p=gs.board[idx];
      if(p&&CLR(p)===playerColor){setSelected(idx);setSelMoves(legalOf(gs,idx));}
    } else {
      const move=selMoves.find(m=>m.to===idx);
      if(move) execMove(gs,move,playerColor);
      else if(gs.board[idx]&&CLR(gs.board[idx])===playerColor){setSelected(idx);setSelMoves(legalOf(gs,idx));}
      else {setSelected(null);setSelMoves([]);}
    }
  },[gs,selected,selMoves,playerColor,thinking,gameOver,execMove]);

  // ── Pointer drag ────────────────────────────────────────────
  const getBoardIdx = useCallback((cx,cy)=>{
    if(!boardRef.current) return null;
    const rect=boardRef.current.getBoundingClientRect();
    const x=cx-rect.left, y=cy-rect.top;
    if(x<0||y<0||x>rect.width||y>rect.height) return null;
    const fc=Math.floor(x/(rect.width/8)), fr=Math.floor(y/(rect.height/8));
    return pcRef.current==="b"?sq(7-fr,7-fc):sq(fr,fc);
  },[]);

  const onPDown = useCallback((e,idx)=>{
    const state=gsRef.current, pc=pcRef.current;
    if(!state||state.turn!==pc||thkRef.current||goRef.current) return;
    const piece=state.board[idx]; if(!piece||CLR(piece)!==pc) return;
    e.preventDefault();
    try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_){}
    const d={fromIdx:idx,piece,x:e.clientX,y:e.clientY,moved:false};
    dragRef.current=d; setDragState(d); setDragOverIdx(idx);
    setSelected(idx); setSelMoves(legalOf(state,idx));
  },[]);

  const onPMove = useCallback((e)=>{
    if(!dragRef.current) return; e.preventDefault();
    const d={...dragRef.current,x:e.clientX,y:e.clientY,moved:true};
    dragRef.current=d; setDragState({...d}); setDragOverIdx(getBoardIdx(e.clientX,e.clientY));
  },[getBoardIdx]);

  const onPUp = useCallback((e)=>{
    if(!dragRef.current) return;
    const{fromIdx,moved}=dragRef.current;
    const toIdx=getBoardIdx(e.clientX,e.clientY);
    dragRef.current=null; setDragState(null); setDragOverIdx(null);
    if(!moved) return;
    const state=gsRef.current, pc=pcRef.current;
    if(!state||toIdx===null||toIdx===fromIdx) return;
    const ms=legalOf(state,fromIdx);
    const move=ms.find(m=>m.to===toIdx);
    if(move) execMove(state,move,pc);
    else {setSelected(null);setSelMoves([]);}
  },[getBoardIdx,execMove]);

  // ── Render board ────────────────────────────────────────────
  const boardFlipped = playerColor==="b";
  const gameInCheck  = gs && inChk(gs, gs.turn);
  const lastPM       = [...history].reverse().find(h=>!h.isBot);

  const squares = gs ? Array.from({length:64},(_,vi)=>{
    const idx = boardFlipped?63-vi:vi;
    const r=ROW(idx), c=COL(idx), light=(r+c)%2===0;
    const piece=gs.board[idx];
    const isDrag  = dragState?.fromIdx===idx && dragState.moved;
    const isSel   = selected===idx;
    const isLegal = selMoves.some(m=>m.to===idx);
    const isLF=lastMove?.from===idx, isLT=lastMove?.to===idx;
    const isOF=optMove?.from===idx,  isOT=optMove?.to===idx;
    const isDO=dragOverIdx===idx && dragState && dragState.fromIdx!==idx;

    // High-contrast board: cream & walnut
    let bg = light ? "#f5f0e8" : "#6b4226";
    if (isSel||isDrag)   bg = "#ffe033";
    else if (isLF||isLT) bg = light ? "#e8d44d" : "#c9a800";
    else if (isOF||isOT) bg = light ? "#7ee87e" : "#2fa82f";
    if (isDO && isLegal) bg = light ? "#60c8ff" : "#1a8fd1";

    const coordColor = light ? "#6b4226" : "#f5f0e8";

    return (
      <div key={idx}
        onClick={()=>!dragState&&handleClick(idx)}
        onPointerDown={e=>onPDown(e,idx)}
        onPointerMove={onPMove}
        onPointerUp={onPUp}
        style={{width:"12.5%",aspectRatio:"1",background:bg,display:"flex",alignItems:"center",justifyContent:"center",
          cursor:piece&&CLR(piece)===playerColor?"grab":isLegal?"pointer":"default",
          position:"relative",userSelect:"none",touchAction:"none",transition:"background 0.08s"}}
      >
        {(!boardFlipped?vi%8===0:vi%8===7) && <span style={{position:"absolute",top:2,left:3,fontSize:9,fontWeight:800,color:coordColor,fontFamily:"Georgia,serif",pointerEvents:"none",opacity:0.85}}>{"87654321"[!boardFlipped?Math.floor(vi/8):7-Math.floor(vi/8)]}</span>}
        {(!boardFlipped?vi>=56:vi<8)       && <span style={{position:"absolute",bottom:2,right:3,fontSize:9,fontWeight:800,color:coordColor,fontFamily:"Georgia,serif",pointerEvents:"none",opacity:0.85}}>{"abcdefgh"[!boardFlipped?vi%8:7-vi%8]}</span>}
        {/* Legal move indicators */}
        {isLegal && !piece && <div style={{width:"32%",height:"32%",borderRadius:"50%",background:"rgba(0,0,0,0.28)",pointerEvents:"none"}}/>}
        {isLegal &&  piece && <div style={{position:"absolute",inset:0,border:"4px solid rgba(0,0,0,0.45)",boxSizing:"border-box",borderRadius:1,pointerEvents:"none"}}/>}
        {/* Piece */}
        {piece && !isDrag && (
          <span style={{fontSize:"clamp(24px,5.2vw,46px)",lineHeight:1,pointerEvents:"none",
            filter: CLR(piece)==="w"
              ? "drop-shadow(0 0 3px rgba(255,255,255,0.95)) drop-shadow(0 0 6px rgba(255,255,255,0.7)) drop-shadow(0 1px 2px rgba(100,60,0,0.4))"
              : "drop-shadow(0 2px 2px rgba(0,0,0,0.9)) drop-shadow(0 0 3px rgba(255,255,255,0.25))",
            transform:isSel&&!dragState?"scale(1.15)":"scale(1)",transition:"transform 0.1s"
          }}>{GLYPHS[piece]}</span>
        )}
      </div>
    );
  }) : null;

  // ── MENU ───────────────────────────────────────────────────
  if (screen==="menu") return (
    <div style={{minHeight:"100vh",background:"#1e2532",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif"}}>
      <div style={{textAlign:"center",color:"#eef2f7"}}>
        <div style={{fontSize:72,marginBottom:8}}>♟</div>
        <h1 style={{fontSize:42,fontWeight:900,letterSpacing:"-1px",margin:"0 0 4px"}}>Chess Simulator</h1>
        <p style={{color:"#8899bb",fontSize:14,marginBottom:8}}>Play against bots · Evaluate your moves</p>
        <div style={{display:"inline-flex",gap:6,flexWrap:"wrap",justifyContent:"center",marginBottom:32}}>
          {["Quiescence search","Transposition table","Iter. deepening","King safety","Pawn structure","Mobility"].map(f=>(
            <span key={f} style={{fontSize:10,color:"#7eb8f7",background:"rgba(126,184,247,0.1)",border:"1px solid rgba(126,184,247,0.25)",padding:"2px 8px",borderRadius:4}}>✓ {f}</span>
          ))}
        </div>

        <div style={{marginBottom:28}}>
          <p style={{color:"#7eb8f7",fontSize:13,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Your Color</p>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            {[["w","♔ White"],["b","♚ Black"]].map(([c2,label])=>(
              <button key={c2} onClick={()=>setPlayerColor(c2)}
                style={{padding:"10px 28px",borderRadius:8,border:`2px solid ${playerColor===c2?"#7eb8f7":"#2e3a50"}`,background:playerColor===c2?"#2e3a50":"transparent",color:playerColor===c2?"#eef2f7":"#5a7090",fontSize:15,cursor:"pointer",fontFamily:"Georgia,serif",transition:"all 0.2s"}}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <p style={{color:"#7eb8f7",fontSize:13,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Bot Rating</p>
        <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:36}}>
          {[[500,"Beginner","depth 1"],[1000,"Club","depth 3"],[1500,"Expert","depth 4"],[2000,"Master","depth 6"]].map(([r,label,d])=>(
            <button key={r} onClick={()=>setBotRating(r)}
              style={{width:82,padding:"12px 0",borderRadius:10,border:`2px solid ${botRating===r?"#7eb8f7":"#2e3a50"}`,background:botRating===r?"#2e3a50":"transparent",color:botRating===r?"#eef2f7":"#5a7090",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif",transition:"all 0.2s"}}>
              <div>{r}</div>
              <div style={{fontSize:9,letterSpacing:1,marginTop:2,textTransform:"uppercase",color:botRating===r?"#7eb8f7":"#3a5070"}}>{label}</div>
              <div style={{fontSize:9,color:botRating===r?"#5a88bb":"#2e3a50",marginTop:1}}>{d}</div>
            </button>
          ))}
        </div>

        <button onClick={()=>startGame(botRating,playerColor)}
          style={{padding:"14px 48px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#4a90d9,#2563a8)",color:"#fff",fontSize:18,fontWeight:700,cursor:"pointer",fontFamily:"Georgia,serif",letterSpacing:1,boxShadow:"0 4px 24px rgba(74,144,217,0.4)"}}>
          Start Game
        </button>
      </div>
    </div>
  );

  // ── GAME ────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:"#1e2532",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",padding:16}}>
      {/* Drag ghost */}
      {dragState?.moved && (
        <div style={{position:"fixed",pointerEvents:"none",zIndex:9999,left:dragState.x,top:dragState.y,transform:"translate(-50%,-52%)",fontSize:"clamp(34px,7vw,58px)",lineHeight:1,
          filter:CLR(dragState.piece)==="w"?"drop-shadow(0 0 4px rgba(255,255,255,0.95)) drop-shadow(0 0 8px rgba(255,255,255,0.6)) drop-shadow(0 2px 4px rgba(0,0,0,0.4))":"drop-shadow(0 4px 10px rgba(0,0,0,0.95)) drop-shadow(0 0 4px rgba(255,255,255,0.2))"}}>
          {GLYPHS[dragState.piece]}
        </div>
      )}

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:14,width:"100%",maxWidth:820,justifyContent:"space-between"}}>
        <button onClick={()=>{clearTimers();setScreen("menu");}}
          style={{padding:"7px 16px",background:"#263045",border:"1px solid #364560",color:"#a0b8d8",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:"Georgia,serif"}}>← Menu</button>
        <span style={{color:"#eef2f7",fontWeight:700,fontSize:15}}>
          {playerColor==="w"?"♔ You (White)":"♚ You (Black)"} vs Bot {botRating}
        </span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {analysing && <span style={{fontSize:10,color:"#6a8aaa"}}>analysing…</span>}
          <span style={{
            color: gameOver?"#eef2f7": gs?.turn===playerColor?"#4ade80":"#fb923c",
            fontSize:12,fontWeight:700,padding:"4px 12px",
            background: gameOver?"#374060": gs?.turn===playerColor?"#14532d":"#431407",
            border:`1px solid ${gameOver?"#4a5580":gs?.turn===playerColor?"#166534":"#7c2d12"}`,
            borderRadius:5
          }}>
            {gameOver?"Game Over":thinking?"Thinking…":gs?.turn===playerColor?"Your turn":"Bot's turn"}
          </span>
        </div>
      </div>

      <div style={{display:"flex",gap:16,alignItems:"flex-start",width:"100%",maxWidth:820}}>
        {/* Board */}
        <div style={{flex:"0 0 auto"}}>
          {gameInCheck && !gameOver && (
            <div style={{background:"#7f1d1d",color:"#fca5a5",padding:"7px 14px",borderRadius:6,marginBottom:8,fontSize:13,textAlign:"center",fontWeight:700,border:"1px solid #991b1b"}}>
              {gs.turn===playerColor?"⚠️ You are in check!":"Bot is in check!"}
            </div>
          )}
          {gameOver && (
            <div style={{background:"#14532d",color:"#86efac",padding:"8px 14px",borderRadius:6,marginBottom:8,fontSize:14,textAlign:"center",fontWeight:700,border:"1px solid #166534"}}>
              {gameOver}
            </div>
          )}
          <div ref={boardRef}
            style={{display:"flex",flexWrap:"wrap",width:"min(488px,90vw)",height:"min(488px,90vw)",border:"4px solid #364560",borderRadius:4,overflow:"hidden",boxShadow:"0 10px 48px rgba(0,0,0,0.7)",cursor:dragState?"grabbing":"default"}}>
            {squares}
          </div>
          <p style={{color:"#4a6080",fontSize:11,textAlign:"center",marginTop:6}}>Click or drag & drop to move</p>
        </div>

        {/* Side panel */}
        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:12}}>

          {/* 🗨️ Bot Chat */}
          <div style={{background:"#1a2035",border:"1px solid #364560",borderRadius:10,padding:12,display:"flex",flexDirection:"column",gap:0,maxHeight:180,minHeight:60}}>
            <p style={{color:"#6a8aaa",fontSize:10,letterSpacing:2,textTransform:"uppercase",margin:"0 0 8px",flexShrink:0}}>🤖 Bot Chat</p>
            <div style={{overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:6}}>
              {chatLog.length===0 && (
                <p style={{color:"#2e3a50",fontSize:12,fontStyle:"italic",margin:0}}>Bot još ćuti… čekaj malo.</p>
              )}
              {chatLog.map((entry,i)=>(
                <div key={i} style={{
                  background: entry.type==="bot"?"#1e1040":"#0d2018",
                  border:`1px solid ${entry.type==="bot"?"#5b21b6":"#166534"}`,
                  borderRadius:8,padding:"7px 10px",
                  display:"flex",alignItems:"flex-start",gap:7,
                }}>
                  <span style={{fontSize:16,lineHeight:1,flexShrink:0,marginTop:1}}>{entry.type==="bot"?"🤖":"😤"}</span>
                  <span style={{fontSize:12,color:"#eef2f7",lineHeight:1.5,fontStyle:"italic",wordBreak:"break-word"}}>
                    "{entry.msg}"
                  </span>
                </div>
              ))}
              <div ref={chatEndRef}/>
            </div>
          </div>
          {lastPM && (
            <div style={{background:"#263045",border:"1px solid #364560",borderRadius:10,padding:14}}>
              <p style={{color:"#6a8aaa",fontSize:11,letterSpacing:2,textTransform:"uppercase",margin:"0 0 8px"}}>Last Move</p>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                <span style={{fontSize:24}}>
                  {!lastPM.eval?"⏳":lastPM.eval.label==="Best!"?"🏆":lastPM.eval.label==="Excellent"?"✨":lastPM.eval.label==="Good"?"👍":lastPM.eval.label==="Inaccuracy"?"⚠️":lastPM.eval.label==="Mistake"?"❌":"💥"}
                </span>
                <div>
                  <span style={{fontWeight:700,fontSize:17,color:lastPM.eval?.color||"#6a8aaa"}}>{lastPM.eval?.label||"analysing…"}</span>
                  <div style={{color:"#6a8aaa",fontSize:12,marginTop:2}}>You played: <strong style={{color:"#eef2f7"}}>{lastPM.name}</strong></div>
                </div>
              </div>
              {lastPM.eval && lastPM.eval.label!=="Best!" && lastPM.optimal && (
                <div style={{background:"rgba(74,222,128,0.08)",border:"1px solid rgba(74,222,128,0.25)",borderRadius:6,padding:"8px 12px",marginTop:6}}>
                  <span style={{color:"#4ade80",fontSize:12}}>💡 Optimal: <strong>{lastPM.optimal}</strong>{lastPM.eval.delta>0&&` (−${lastPM.eval.delta} cp)`}</span>
                </div>
              )}
            </div>
          )}

          {/* History */}
          <div style={{background:"#263045",border:"1px solid #364560",borderRadius:10,padding:14,flex:1,maxHeight:300,display:"flex",flexDirection:"column"}}>
            <p style={{color:"#6a8aaa",fontSize:11,letterSpacing:2,textTransform:"uppercase",margin:"0 0 10px"}}>Move History</p>
            <div style={{overflowY:"auto",flex:1}}>
              {!history.length && <p style={{color:"#364560",fontSize:13}}>No moves yet.</p>}
              {history.map((h,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 6px",borderRadius:4,marginBottom:2,background:i===history.length-1?"rgba(126,184,247,0.07)":"transparent"}}>
                  <span style={{color:"#4a6080",fontSize:11,minWidth:22}}>{Math.ceil((i+1)/2)}.</span>
                  <span style={{fontSize:13,color:h.color==="w"?"#eef2f7":"#a0b8d8"}}>{h.color==="w"?"♔":"♚"} {h.name}</span>
                  {!h.isBot && (h.eval
                    ? <span style={{fontSize:11,color:h.eval.color,marginLeft:"auto",fontWeight:700}}>{h.eval.label}</span>
                    : <span style={{fontSize:10,color:"#4a6080",marginLeft:"auto"}}>…</span>)}
                  {h.isBot && <span style={{fontSize:10,color:"#4a6080",marginLeft:"auto"}}>bot</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Hint */}
          <button
            onClick={()=>{
              if(!gs||gs.turn!==playerColor||thinking||gameOver) return;
              const opt=searchID(gs,3,1000);
              setOptMove(opt);
            }}
            style={{padding:"10px",background:"#263045",border:"1px solid #364560",color:"#7eb8f7",borderRadius:8,cursor:"pointer",fontSize:13,fontFamily:"Georgia,serif",fontWeight:600}}>
            💡 Show optimal move
          </button>
          {optMove && gs?.turn===playerColor && (
            <div style={{background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.25)",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#4ade80"}}>
              Best move: <strong>{mvName(gs,optMove)}</strong>
              <span style={{color:"#2d8a50",fontSize:11,display:"block",marginTop:2}}>{sqName(optMove.from)} → {sqName(optMove.to)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
