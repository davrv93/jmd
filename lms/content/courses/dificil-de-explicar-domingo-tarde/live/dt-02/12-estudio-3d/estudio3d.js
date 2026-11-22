/* Estudio 3D JMD v2 · incluye three.js r170 (MIT, Copyright 2010-2024 Three.js Authors) */
var pc="170",Oi={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},Fi={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Md=0,uh=1,Sd=2;var yu=1,bd=2,vn=3,ai=0,zt=1,Xt=2,on=0,cs=1,ha=2,dh=3,fh=4,Ed=5,Mi=100,Td=101,wd=102,Ad=103,Cd=104,Rd=200,Pd=201,Id=202,Dd=203,Yo=204,Zo=205,Ld=206,Ud=207,Nd=208,Od=209,Fd=210,Bd=211,zd=212,Hd=213,kd=214,jo=0,Ko=1,Jo=2,ms=3,Qo=4,$o=5,el=6,tl=7,qu=0,Vd=1,Gd=2,ri=0,mc=1,gc=2,xc=3,vc=4,Wd=5,_c=6,xr=7;var Mu=300,gs=301,xs=302,nr=303,nl=304,ka=306,vs=1e3,Ei=1001,il=1002,qt=1003,Xd=1004;var Dr=1005;var Vt=1006,mo=1007;var Ti=1008;var Hn=1009,Su=1010,bu=1011,ir=1012,yc=1013,wi=1014,Tn=1015,At=1016,qc=1017,Mc=1018,_s=1020,Eu=35902,Tu=1021,wu=1022,tn=1023,Au=1024,Cu=1025,hs=1026,ys=1027,Sc=1028,bc=1029,Ru=1030,Ec=1031;var Tc=1033,ra=33776,aa=33777,oa=33778,la=33779,sl=35840,rl=35841,al=35842,ol=35843,ll=36196,cl=37492,hl=37496,ul=37808,dl=37809,fl=37810,pl=37811,ml=37812,gl=37813,xl=37814,vl=37815,_l=37816,yl=37817,ql=37818,Ml=37819,Sl=37820,bl=37821,ca=36492,El=36494,Tl=36495,Pu=36283,wl=36284,Al=36285,Cl=36286;var ua=2300,Rl=2301,go=2302,ph=2400,mh=2401,gh=2402;var Yd=3200,wc=3201;var Iu=0,Zd=1,si="",Ft="srgb",ci="srgb-linear",Va="linear",et="srgb";var Wi=7680;var xh=519,jd=512,Kd=513,Jd=514,Du=515,Qd=516,$d=517,ef=518,tf=519,vh=35044;var _h="300 es",Bn=2e3,da=2001,kn=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;let n=this._listeners;return n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;let s=this._listeners[e];if(s!==void 0){let r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){if(this._listeners===void 0)return;let n=this._listeners[e.type];if(n!==void 0){e.target=this;let s=n.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,e);e.target=null}}},Nt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],yh=1234567,Js=Math.PI/180,qs=180/Math.PI;function Bi(){let i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Nt[i&255]+Nt[i>>8&255]+Nt[i>>16&255]+Nt[i>>24&255]+"-"+Nt[e&255]+Nt[e>>8&255]+"-"+Nt[e>>16&15|64]+Nt[e>>24&255]+"-"+Nt[t&63|128]+Nt[t>>8&255]+"-"+Nt[t>>16&255]+Nt[t>>24&255]+Nt[n&255]+Nt[n>>8&255]+Nt[n>>16&255]+Nt[n>>24&255]).toLowerCase()}function _t(i,e,t){return Math.max(e,Math.min(t,i))}function Ac(i,e){return(i%e+e)%e}function nf(i,e,t,n,s){return n+(i-e)*(s-n)/(t-e)}function sf(i,e,t){return i!==e?(t-i)/(e-i):0}function Qs(i,e,t){return(1-t)*i+t*e}function rf(i,e,t,n){return Qs(i,e,1-Math.exp(-t*n))}function af(i,e=1){return e-Math.abs(Ac(i,e*2)-e)}function of(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function lf(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function cf(i,e){return i+Math.floor(Math.random()*(e-i+1))}function hf(i,e){return i+Math.random()*(e-i)}function uf(i){return i*(.5-Math.random())}function df(i){i!==void 0&&(yh=i);let e=yh+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function ff(i){return i*Js}function pf(i){return i*qs}function mf(i){return(i&i-1)===0&&i!==0}function gf(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function xf(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function vf(i,e,t,n,s){let r=Math.cos,a=Math.sin,o=r(t/2),l=a(t/2),c=r((e+n)/2),h=a((e+n)/2),u=r((e-n)/2),f=a((e-n)/2),p=r((n-e)/2),g=a((n-e)/2);switch(s){case"XYX":i.set(o*h,l*u,l*f,o*c);break;case"YZY":i.set(l*f,o*h,l*u,o*c);break;case"ZXZ":i.set(l*u,l*f,o*h,o*c);break;case"XZX":i.set(o*h,l*g,l*p,o*c);break;case"YXY":i.set(l*p,o*h,l*g,o*c);break;case"ZYZ":i.set(l*g,l*p,o*h,o*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function as(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function Ht(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}var zi={DEG2RAD:Js,RAD2DEG:qs,generateUUID:Bi,clamp:_t,euclideanModulo:Ac,mapLinear:nf,inverseLerp:sf,lerp:Qs,damp:rf,pingpong:af,smoothstep:of,smootherstep:lf,randInt:cf,randFloat:hf,randFloatSpread:uf,seededRandom:df,degToRad:ff,radToDeg:pf,isPowerOfTwo:mf,ceilPowerOfTwo:gf,floorPowerOfTwo:xf,setQuaternionFromProperEuler:vf,normalize:Ht,denormalize:as},K=class i{constructor(e=0,t=0){i.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(_t(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,a=this.y-e.y;return this.x=r*n-a*s+e.x,this.y=r*s+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},ze=class i{constructor(e,t,n,s,r,a,o,l,c){i.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,a,o,l,c)}set(e,t,n,s,r,a,o,l,c){let h=this.elements;return h[0]=e,h[1]=s,h[2]=o,h[3]=t,h[4]=r,h[5]=l,h[6]=n,h[7]=a,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],h=n[4],u=n[7],f=n[2],p=n[5],g=n[8],x=s[0],m=s[3],d=s[6],S=s[1],y=s[4],v=s[7],D=s[2],T=s[5],A=s[8];return r[0]=a*x+o*S+l*D,r[3]=a*m+o*y+l*T,r[6]=a*d+o*v+l*A,r[1]=c*x+h*S+u*D,r[4]=c*m+h*y+u*T,r[7]=c*d+h*v+u*A,r[2]=f*x+p*S+g*D,r[5]=f*m+p*y+g*T,r[8]=f*d+p*v+g*A,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8];return t*a*h-t*o*c-n*r*h+n*o*l+s*r*c-s*a*l}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8],u=h*a-o*c,f=o*l-h*r,p=c*r-a*l,g=t*u+n*f+s*p;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);let x=1/g;return e[0]=u*x,e[1]=(s*c-h*n)*x,e[2]=(o*n-s*a)*x,e[3]=f*x,e[4]=(h*t-s*l)*x,e[5]=(s*r-o*t)*x,e[6]=p*x,e[7]=(n*l-c*t)*x,e[8]=(a*t-n*r)*x,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,a,o){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*a+c*o)+a+e,-s*c,s*l,-s*(-c*a+l*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(xo.makeScale(e,t)),this}rotate(e){return this.premultiply(xo.makeRotation(-e)),this}translate(e,t){return this.premultiply(xo.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},xo=new ze;function Lu(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function sr(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function _f(){let i=sr("canvas");return i.style.display="block",i}var qh={};function js(i){i in qh||(qh[i]=!0,console.warn(i))}function yf(i,e,t){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}function qf(i){let e=i.elements;e[2]=.5*e[2]+.5*e[3],e[6]=.5*e[6]+.5*e[7],e[10]=.5*e[10]+.5*e[11],e[14]=.5*e[14]+.5*e[15]}function Mf(i){let e=i.elements;e[11]===-1?(e[10]=-e[10]-1,e[14]=-e[14]):(e[10]=-e[10],e[14]=-e[14]+1)}var Ge={enabled:!0,workingColorSpace:ci,spaces:{},convert:function(i,e,t){return this.enabled===!1||e===t||!e||!t||(this.spaces[e].transfer===et&&(i.r=zn(i.r),i.g=zn(i.g),i.b=zn(i.b)),this.spaces[e].primaries!==this.spaces[t].primaries&&(i.applyMatrix3(this.spaces[e].toXYZ),i.applyMatrix3(this.spaces[t].fromXYZ)),this.spaces[t].transfer===et&&(i.r=us(i.r),i.g=us(i.g),i.b=us(i.b))),i},fromWorkingColorSpace:function(i,e){return this.convert(i,this.workingColorSpace,e)},toWorkingColorSpace:function(i,e){return this.convert(i,e,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===si?Va:this.spaces[i].transfer},getLuminanceCoefficients:function(i,e=this.workingColorSpace){return i.fromArray(this.spaces[e].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,e,t){return i.copy(this.spaces[e].toXYZ).multiply(this.spaces[t].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace}};function zn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function us(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var Mh=[.64,.33,.3,.6,.15,.06],Sh=[.2126,.7152,.0722],bh=[.3127,.329],Eh=new ze().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Th=new ze().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);Ge.define({[ci]:{primaries:Mh,whitePoint:bh,transfer:Va,toXYZ:Eh,fromXYZ:Th,luminanceCoefficients:Sh,workingColorSpaceConfig:{unpackColorSpace:Ft},outputColorSpaceConfig:{drawingBufferColorSpace:Ft}},[Ft]:{primaries:Mh,whitePoint:bh,transfer:et,toXYZ:Eh,fromXYZ:Th,luminanceCoefficients:Sh,outputColorSpaceConfig:{drawingBufferColorSpace:Ft}}});var Xi,Pl=class{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{Xi===void 0&&(Xi=sr("canvas")),Xi.width=e.width,Xi.height=e.height;let n=Xi.getContext("2d");e instanceof ImageData?n.putImageData(e,0,0):n.drawImage(e,0,0,e.width,e.height),t=Xi}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=sr("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=zn(r[a]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(zn(t[n]/255)*255):t[n]=zn(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},Sf=0,fa=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Sf++}),this.uuid=Bi(),this.data=e,this.dataReady=!0,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(vo(s[a].image)):r.push(vo(s[a]))}else r=vo(s);n.url=r}return t||(e.images[this.uuid]=n),n}};function vo(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Pl.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}var bf=0,wt=class i extends kn{constructor(e=i.DEFAULT_IMAGE,t=i.DEFAULT_MAPPING,n=Ei,s=Ei,r=Vt,a=Ti,o=tn,l=Hn,c=i.DEFAULT_ANISOTROPY,h=si){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:bf++}),this.uuid=Bi(),this.name="",this.source=new fa(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new K(0,0),this.repeat=new K(1,1),this.center=new K(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new ze,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Mu)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case vs:e.x=e.x-Math.floor(e.x);break;case Ei:e.x=e.x<0?0:1;break;case il:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case vs:e.y=e.y-Math.floor(e.y);break;case Ei:e.y=e.y<0?0:1;break;case il:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};wt.DEFAULT_IMAGE=null;wt.DEFAULT_MAPPING=Mu;wt.DEFAULT_ANISOTROPY=1;var gt=class i{constructor(e=0,t=0,n=0,s=1){i.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*s+a[12]*r,this.y=a[1]*t+a[5]*n+a[9]*s+a[13]*r,this.z=a[2]*t+a[6]*n+a[10]*s+a[14]*r,this.w=a[3]*t+a[7]*n+a[11]*s+a[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r,l=e.elements,c=l[0],h=l[4],u=l[8],f=l[1],p=l[5],g=l[9],x=l[2],m=l[6],d=l[10];if(Math.abs(h-f)<.01&&Math.abs(u-x)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+f)<.1&&Math.abs(u+x)<.1&&Math.abs(g+m)<.1&&Math.abs(c+p+d-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let y=(c+1)/2,v=(p+1)/2,D=(d+1)/2,T=(h+f)/4,A=(u+x)/4,R=(g+m)/4;return y>v&&y>D?y<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(y),s=T/n,r=A/n):v>D?v<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(v),n=T/s,r=R/s):D<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(D),n=A/r,s=R/r),this.set(n,s,r,t),this}let S=Math.sqrt((m-g)*(m-g)+(u-x)*(u-x)+(f-h)*(f-h));return Math.abs(S)<.001&&(S=1),this.x=(m-g)/S,this.y=(u-x)/S,this.z=(f-h)/S,this.w=Math.acos((c+p+d-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},Il=class extends kn{constructor(e=1,t=1,n={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new gt(0,0,e,t),this.scissorTest=!1,this.viewport=new gt(0,0,e,t);let s={width:e,height:t,depth:1};n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Vt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},n);let r=new wt(s,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace);r.flipY=!1,r.generateMipmaps=n.generateMipmaps,r.internalFormat=n.internalFormat,this.textures=[];let a=n.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0;this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=n;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let n=0,s=e.textures.length;n<s;n++)this.textures[n]=e.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0;let t=Object.assign({},e.texture.image);return this.texture.source=new fa(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}},pt=class extends Il{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},pa=class extends wt{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=qt,this.minFilter=qt,this.wrapR=Ei,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var Dl=class extends wt{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=qt,this.minFilter=qt,this.wrapR=Ei,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var yn=class{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,a,o){let l=n[s+0],c=n[s+1],h=n[s+2],u=n[s+3],f=r[a+0],p=r[a+1],g=r[a+2],x=r[a+3];if(o===0){e[t+0]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u;return}if(o===1){e[t+0]=f,e[t+1]=p,e[t+2]=g,e[t+3]=x;return}if(u!==x||l!==f||c!==p||h!==g){let m=1-o,d=l*f+c*p+h*g+u*x,S=d>=0?1:-1,y=1-d*d;if(y>Number.EPSILON){let D=Math.sqrt(y),T=Math.atan2(D,d*S);m=Math.sin(m*T)/D,o=Math.sin(o*T)/D}let v=o*S;if(l=l*m+f*v,c=c*m+p*v,h=h*m+g*v,u=u*m+x*v,m===1-o){let D=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=D,c*=D,h*=D,u*=D}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,s,r,a){let o=n[s],l=n[s+1],c=n[s+2],h=n[s+3],u=r[a],f=r[a+1],p=r[a+2],g=r[a+3];return e[t]=o*g+h*u+l*p-c*f,e[t+1]=l*g+h*f+c*u-o*p,e[t+2]=c*g+h*p+o*f-l*u,e[t+3]=h*g-o*u-l*f-c*p,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,s=e._y,r=e._z,a=e._order,o=Math.cos,l=Math.sin,c=o(n/2),h=o(s/2),u=o(r/2),f=l(n/2),p=l(s/2),g=l(r/2);switch(a){case"XYZ":this._x=f*h*u+c*p*g,this._y=c*p*u-f*h*g,this._z=c*h*g+f*p*u,this._w=c*h*u-f*p*g;break;case"YXZ":this._x=f*h*u+c*p*g,this._y=c*p*u-f*h*g,this._z=c*h*g-f*p*u,this._w=c*h*u+f*p*g;break;case"ZXY":this._x=f*h*u-c*p*g,this._y=c*p*u+f*h*g,this._z=c*h*g+f*p*u,this._w=c*h*u-f*p*g;break;case"ZYX":this._x=f*h*u-c*p*g,this._y=c*p*u+f*h*g,this._z=c*h*g-f*p*u,this._w=c*h*u+f*p*g;break;case"YZX":this._x=f*h*u+c*p*g,this._y=c*p*u+f*h*g,this._z=c*h*g-f*p*u,this._w=c*h*u-f*p*g;break;case"XZY":this._x=f*h*u-c*p*g,this._y=c*p*u-f*h*g,this._z=c*h*g+f*p*u,this._w=c*h*u+f*p*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],s=t[4],r=t[8],a=t[1],o=t[5],l=t[9],c=t[2],h=t[6],u=t[10],f=n+o+u;if(f>0){let p=.5/Math.sqrt(f+1);this._w=.25/p,this._x=(h-l)*p,this._y=(r-c)*p,this._z=(a-s)*p}else if(n>o&&n>u){let p=2*Math.sqrt(1+n-o-u);this._w=(h-l)/p,this._x=.25*p,this._y=(s+a)/p,this._z=(r+c)/p}else if(o>u){let p=2*Math.sqrt(1+o-n-u);this._w=(r-c)/p,this._x=(s+a)/p,this._y=.25*p,this._z=(l+h)/p}else{let p=2*Math.sqrt(1+u-n-o);this._w=(a-s)/p,this._x=(r+c)/p,this._y=(l+h)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<Number.EPSILON?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(_t(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,s=e._y,r=e._z,a=e._w,o=t._x,l=t._y,c=t._z,h=t._w;return this._x=n*h+a*o+s*c-r*l,this._y=s*h+a*l+r*o-n*c,this._z=r*h+a*c+n*l-s*o,this._w=a*h-n*o-s*l-r*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);let n=this._x,s=this._y,r=this._z,a=this._w,o=a*e._w+n*e._x+s*e._y+r*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=n,this._y=s,this._z=r,this;let l=1-o*o;if(l<=Number.EPSILON){let p=1-t;return this._w=p*a+t*this._w,this._x=p*n+t*this._x,this._y=p*s+t*this._y,this._z=p*r+t*this._z,this.normalize(),this}let c=Math.sqrt(l),h=Math.atan2(c,o),u=Math.sin((1-t)*h)/c,f=Math.sin(t*h)/c;return this._w=a*u+this._w*f,this._x=n*u+this._x*f,this._y=s*u+this._y*f,this._z=r*u+this._z*f,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},P=class i{constructor(e=0,t=0,n=0){i.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(wh.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(wh.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=e.elements,a=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*a,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*a,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,s=this.z,r=e.x,a=e.y,o=e.z,l=e.w,c=2*(a*s-o*n),h=2*(o*t-r*s),u=2*(r*n-a*t);return this.x=t+l*c+a*u-o*h,this.y=n+l*h+o*c-r*u,this.z=s+l*u+r*h-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,s=e.y,r=e.z,a=t.x,o=t.y,l=t.z;return this.x=s*l-r*o,this.y=r*a-n*l,this.z=n*o-s*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return _o.copy(this).projectOnVector(e),this.sub(_o)}reflect(e){return this.sub(_o.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(_t(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},_o=new P,wh=new yn,ln=class{constructor(e=new P(1/0,1/0,1/0),t=new P(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(mn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(mn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=mn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,mn):mn.fromBufferAttribute(r,a),mn.applyMatrix4(e.matrixWorld),this.expandByPoint(mn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Lr.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Lr.copy(n.boundingBox)),Lr.applyMatrix4(e.matrixWorld),this.union(Lr)}let s=e.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,mn),mn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Vs),Ur.subVectors(this.max,Vs),Yi.subVectors(e.a,Vs),Zi.subVectors(e.b,Vs),ji.subVectors(e.c,Vs),Qn.subVectors(Zi,Yi),$n.subVectors(ji,Zi),mi.subVectors(Yi,ji);let t=[0,-Qn.z,Qn.y,0,-$n.z,$n.y,0,-mi.z,mi.y,Qn.z,0,-Qn.x,$n.z,0,-$n.x,mi.z,0,-mi.x,-Qn.y,Qn.x,0,-$n.y,$n.x,0,-mi.y,mi.x,0];return!yo(t,Yi,Zi,ji,Ur)||(t=[1,0,0,0,1,0,0,0,1],!yo(t,Yi,Zi,ji,Ur))?!1:(Nr.crossVectors(Qn,$n),t=[Nr.x,Nr.y,Nr.z],yo(t,Yi,Zi,ji,Ur))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,mn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(mn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(In[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),In[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),In[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),In[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),In[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),In[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),In[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),In[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(In),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}},In=[new P,new P,new P,new P,new P,new P,new P,new P],mn=new P,Lr=new ln,Yi=new P,Zi=new P,ji=new P,Qn=new P,$n=new P,mi=new P,Vs=new P,Ur=new P,Nr=new P,gi=new P;function yo(i,e,t,n,s){for(let r=0,a=i.length-3;r<=a;r+=3){gi.fromArray(i,r);let o=s.x*Math.abs(gi.x)+s.y*Math.abs(gi.y)+s.z*Math.abs(gi.z),l=e.dot(gi),c=t.dot(gi),h=n.dot(gi);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}var Ef=new ln,Gs=new P,qo=new P,Ai=class{constructor(e=new P,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):Ef.setFromPoints(e).getCenter(n);let s=0;for(let r=0,a=e.length;r<a;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Gs.subVectors(e,this.center);let t=Gs.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(Gs,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(qo.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Gs.copy(e.center).add(qo)),this.expandByPoint(Gs.copy(e.center).sub(qo))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}},Dn=new P,Mo=new P,Or=new P,ei=new P,So=new P,Fr=new P,bo=new P,rr=class{constructor(e=new P,t=new P(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Dn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Dn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Dn.copy(this.origin).addScaledVector(this.direction,t),Dn.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){Mo.copy(e).add(t).multiplyScalar(.5),Or.copy(t).sub(e).normalize(),ei.copy(this.origin).sub(Mo);let r=e.distanceTo(t)*.5,a=-this.direction.dot(Or),o=ei.dot(this.direction),l=-ei.dot(Or),c=ei.lengthSq(),h=Math.abs(1-a*a),u,f,p,g;if(h>0)if(u=a*l-o,f=a*o-l,g=r*h,u>=0)if(f>=-g)if(f<=g){let x=1/h;u*=x,f*=x,p=u*(u+a*f+2*o)+f*(a*u+f+2*l)+c}else f=r,u=Math.max(0,-(a*f+o)),p=-u*u+f*(f+2*l)+c;else f=-r,u=Math.max(0,-(a*f+o)),p=-u*u+f*(f+2*l)+c;else f<=-g?(u=Math.max(0,-(-a*r+o)),f=u>0?-r:Math.min(Math.max(-r,-l),r),p=-u*u+f*(f+2*l)+c):f<=g?(u=0,f=Math.min(Math.max(-r,-l),r),p=f*(f+2*l)+c):(u=Math.max(0,-(a*r+o)),f=u>0?r:Math.min(Math.max(-r,-l),r),p=-u*u+f*(f+2*l)+c);else f=a>0?-r:r,u=Math.max(0,-(a*f+o)),p=-u*u+f*(f+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(Mo).addScaledVector(Or,f),p}intersectSphere(e,t){Dn.subVectors(e.center,this.origin);let n=Dn.dot(this.direction),s=Dn.dot(Dn)-n*n,r=e.radius*e.radius;if(s>r)return null;let a=Math.sqrt(r-s),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,a,o,l,c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,f=this.origin;return c>=0?(n=(e.min.x-f.x)*c,s=(e.max.x-f.x)*c):(n=(e.max.x-f.x)*c,s=(e.min.x-f.x)*c),h>=0?(r=(e.min.y-f.y)*h,a=(e.max.y-f.y)*h):(r=(e.max.y-f.y)*h,a=(e.min.y-f.y)*h),n>a||r>s||((r>n||isNaN(n))&&(n=r),(a<s||isNaN(s))&&(s=a),u>=0?(o=(e.min.z-f.z)*u,l=(e.max.z-f.z)*u):(o=(e.max.z-f.z)*u,l=(e.min.z-f.z)*u),n>l||o>s)||((o>n||n!==n)&&(n=o),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,Dn)!==null}intersectTriangle(e,t,n,s,r){So.subVectors(t,e),Fr.subVectors(n,e),bo.crossVectors(So,Fr);let a=this.direction.dot(bo),o;if(a>0){if(s)return null;o=1}else if(a<0)o=-1,a=-a;else return null;ei.subVectors(this.origin,e);let l=o*this.direction.dot(Fr.crossVectors(ei,Fr));if(l<0)return null;let c=o*this.direction.dot(So.cross(ei));if(c<0||l+c>a)return null;let h=-o*ei.dot(bo);return h<0?null:this.at(h/a,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},ut=class i{constructor(e,t,n,s,r,a,o,l,c,h,u,f,p,g,x,m){i.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,a,o,l,c,h,u,f,p,g,x,m)}set(e,t,n,s,r,a,o,l,c,h,u,f,p,g,x,m){let d=this.elements;return d[0]=e,d[4]=t,d[8]=n,d[12]=s,d[1]=r,d[5]=a,d[9]=o,d[13]=l,d[2]=c,d[6]=h,d[10]=u,d[14]=f,d[3]=p,d[7]=g,d[11]=x,d[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new i().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){let t=this.elements,n=e.elements,s=1/Ki.setFromMatrixColumn(e,0).length(),r=1/Ki.setFromMatrixColumn(e,1).length(),a=1/Ki.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,s=e.y,r=e.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(e.order==="XYZ"){let f=a*h,p=a*u,g=o*h,x=o*u;t[0]=l*h,t[4]=-l*u,t[8]=c,t[1]=p+g*c,t[5]=f-x*c,t[9]=-o*l,t[2]=x-f*c,t[6]=g+p*c,t[10]=a*l}else if(e.order==="YXZ"){let f=l*h,p=l*u,g=c*h,x=c*u;t[0]=f+x*o,t[4]=g*o-p,t[8]=a*c,t[1]=a*u,t[5]=a*h,t[9]=-o,t[2]=p*o-g,t[6]=x+f*o,t[10]=a*l}else if(e.order==="ZXY"){let f=l*h,p=l*u,g=c*h,x=c*u;t[0]=f-x*o,t[4]=-a*u,t[8]=g+p*o,t[1]=p+g*o,t[5]=a*h,t[9]=x-f*o,t[2]=-a*c,t[6]=o,t[10]=a*l}else if(e.order==="ZYX"){let f=a*h,p=a*u,g=o*h,x=o*u;t[0]=l*h,t[4]=g*c-p,t[8]=f*c+x,t[1]=l*u,t[5]=x*c+f,t[9]=p*c-g,t[2]=-c,t[6]=o*l,t[10]=a*l}else if(e.order==="YZX"){let f=a*l,p=a*c,g=o*l,x=o*c;t[0]=l*h,t[4]=x-f*u,t[8]=g*u+p,t[1]=u,t[5]=a*h,t[9]=-o*h,t[2]=-c*h,t[6]=p*u+g,t[10]=f-x*u}else if(e.order==="XZY"){let f=a*l,p=a*c,g=o*l,x=o*c;t[0]=l*h,t[4]=-u,t[8]=c*h,t[1]=f*u+x,t[5]=a*h,t[9]=p*u-g,t[2]=g*u-p,t[6]=o*h,t[10]=x*u+f}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Tf,e,wf)}lookAt(e,t,n){let s=this.elements;return $t.subVectors(e,t),$t.lengthSq()===0&&($t.z=1),$t.normalize(),ti.crossVectors(n,$t),ti.lengthSq()===0&&(Math.abs(n.z)===1?$t.x+=1e-4:$t.z+=1e-4,$t.normalize(),ti.crossVectors(n,$t)),ti.normalize(),Br.crossVectors($t,ti),s[0]=ti.x,s[4]=Br.x,s[8]=$t.x,s[1]=ti.y,s[5]=Br.y,s[9]=$t.y,s[2]=ti.z,s[6]=Br.z,s[10]=$t.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],h=n[1],u=n[5],f=n[9],p=n[13],g=n[2],x=n[6],m=n[10],d=n[14],S=n[3],y=n[7],v=n[11],D=n[15],T=s[0],A=s[4],R=s[8],b=s[12],q=s[1],C=s[5],O=s[9],N=s[13],B=s[2],W=s[6],k=s[10],ee=s[14],V=s[3],ae=s[7],ue=s[11],ge=s[15];return r[0]=a*T+o*q+l*B+c*V,r[4]=a*A+o*C+l*W+c*ae,r[8]=a*R+o*O+l*k+c*ue,r[12]=a*b+o*N+l*ee+c*ge,r[1]=h*T+u*q+f*B+p*V,r[5]=h*A+u*C+f*W+p*ae,r[9]=h*R+u*O+f*k+p*ue,r[13]=h*b+u*N+f*ee+p*ge,r[2]=g*T+x*q+m*B+d*V,r[6]=g*A+x*C+m*W+d*ae,r[10]=g*R+x*O+m*k+d*ue,r[14]=g*b+x*N+m*ee+d*ge,r[3]=S*T+y*q+v*B+D*V,r[7]=S*A+y*C+v*W+D*ae,r[11]=S*R+y*O+v*k+D*ue,r[15]=S*b+y*N+v*ee+D*ge,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],a=e[1],o=e[5],l=e[9],c=e[13],h=e[2],u=e[6],f=e[10],p=e[14],g=e[3],x=e[7],m=e[11],d=e[15];return g*(+r*l*u-s*c*u-r*o*f+n*c*f+s*o*p-n*l*p)+x*(+t*l*p-t*c*f+r*a*f-s*a*p+s*c*h-r*l*h)+m*(+t*c*u-t*o*p-r*a*u+n*a*p+r*o*h-n*c*h)+d*(-s*o*h-t*l*u+t*o*f+s*a*u-n*a*f+n*l*h)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8],u=e[9],f=e[10],p=e[11],g=e[12],x=e[13],m=e[14],d=e[15],S=u*m*c-x*f*c+x*l*p-o*m*p-u*l*d+o*f*d,y=g*f*c-h*m*c-g*l*p+a*m*p+h*l*d-a*f*d,v=h*x*c-g*u*c+g*o*p-a*x*p-h*o*d+a*u*d,D=g*u*l-h*x*l-g*o*f+a*x*f+h*o*m-a*u*m,T=t*S+n*y+s*v+r*D;if(T===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let A=1/T;return e[0]=S*A,e[1]=(x*f*r-u*m*r-x*s*p+n*m*p+u*s*d-n*f*d)*A,e[2]=(o*m*r-x*l*r+x*s*c-n*m*c-o*s*d+n*l*d)*A,e[3]=(u*l*r-o*f*r-u*s*c+n*f*c+o*s*p-n*l*p)*A,e[4]=y*A,e[5]=(h*m*r-g*f*r+g*s*p-t*m*p-h*s*d+t*f*d)*A,e[6]=(g*l*r-a*m*r-g*s*c+t*m*c+a*s*d-t*l*d)*A,e[7]=(a*f*r-h*l*r+h*s*c-t*f*c-a*s*p+t*l*p)*A,e[8]=v*A,e[9]=(g*u*r-h*x*r-g*n*p+t*x*p+h*n*d-t*u*d)*A,e[10]=(a*x*r-g*o*r+g*n*c-t*x*c-a*n*d+t*o*d)*A,e[11]=(h*o*r-a*u*r-h*n*c+t*u*c+a*n*p-t*o*p)*A,e[12]=D*A,e[13]=(h*x*s-g*u*s+g*n*f-t*x*f-h*n*m+t*u*m)*A,e[14]=(g*o*s-a*x*s-g*n*l+t*x*l+a*n*m-t*o*m)*A,e[15]=(a*u*s-h*o*s+h*n*l-t*u*l-a*n*f+t*o*f)*A,this}scale(e){let t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),s=Math.sin(t),r=1-n,a=e.x,o=e.y,l=e.z,c=r*a,h=r*o;return this.set(c*a+n,c*o-s*l,c*l+s*o,0,c*o+s*l,h*o+n,h*l-s*a,0,c*l-s*o,h*l+s*a,r*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,a){return this.set(1,n,r,0,e,1,a,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){let s=this.elements,r=t._x,a=t._y,o=t._z,l=t._w,c=r+r,h=a+a,u=o+o,f=r*c,p=r*h,g=r*u,x=a*h,m=a*u,d=o*u,S=l*c,y=l*h,v=l*u,D=n.x,T=n.y,A=n.z;return s[0]=(1-(x+d))*D,s[1]=(p+v)*D,s[2]=(g-y)*D,s[3]=0,s[4]=(p-v)*T,s[5]=(1-(f+d))*T,s[6]=(m+S)*T,s[7]=0,s[8]=(g+y)*A,s[9]=(m-S)*A,s[10]=(1-(f+x))*A,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){let s=this.elements,r=Ki.set(s[0],s[1],s[2]).length(),a=Ki.set(s[4],s[5],s[6]).length(),o=Ki.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),e.x=s[12],e.y=s[13],e.z=s[14],gn.copy(this);let c=1/r,h=1/a,u=1/o;return gn.elements[0]*=c,gn.elements[1]*=c,gn.elements[2]*=c,gn.elements[4]*=h,gn.elements[5]*=h,gn.elements[6]*=h,gn.elements[8]*=u,gn.elements[9]*=u,gn.elements[10]*=u,t.setFromRotationMatrix(gn),n.x=r,n.y=a,n.z=o,this}makePerspective(e,t,n,s,r,a,o=Bn){let l=this.elements,c=2*r/(t-e),h=2*r/(n-s),u=(t+e)/(t-e),f=(n+s)/(n-s),p,g;if(o===Bn)p=-(a+r)/(a-r),g=-2*a*r/(a-r);else if(o===da)p=-a/(a-r),g=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=c,l[4]=0,l[8]=u,l[12]=0,l[1]=0,l[5]=h,l[9]=f,l[13]=0,l[2]=0,l[6]=0,l[10]=p,l[14]=g,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,s,r,a,o=Bn){let l=this.elements,c=1/(t-e),h=1/(n-s),u=1/(a-r),f=(t+e)*c,p=(n+s)*h,g,x;if(o===Bn)g=(a+r)*u,x=-2*u;else if(o===da)g=r*u,x=-1*u;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-f,l[1]=0,l[5]=2*h,l[9]=0,l[13]=-p,l[2]=0,l[6]=0,l[10]=x,l[14]=-g,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},Ki=new P,gn=new ut,Tf=new P(0,0,0),wf=new P(1,1,1),ti=new P,Br=new P,$t=new P,Ah=new ut,Ch=new yn,wn=class i{constructor(e=0,t=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let s=e.elements,r=s[0],a=s[4],o=s[8],l=s[1],c=s[5],h=s[9],u=s[2],f=s[6],p=s[10];switch(t){case"XYZ":this._y=Math.asin(_t(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,p),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(f,c),this._z=0);break;case"YXZ":this._x=Math.asin(-_t(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,p),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(_t(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-u,p),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-_t(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(f,p),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(_t(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(o,p));break;case"XZY":this._z=Math.asin(-_t(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(f,c),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,p),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Ah.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Ah,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Ch.setFromEuler(this),this.setFromQuaternion(Ch,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};wn.DEFAULT_ORDER="XYZ";var ma=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},Af=0,Rh=new P,Ji=new yn,Ln=new ut,zr=new P,Ws=new P,Cf=new P,Rf=new yn,Ph=new P(1,0,0),Ih=new P(0,1,0),Dh=new P(0,0,1),Lh={type:"added"},Pf={type:"removed"},Qi={type:"childadded",child:null},Eo={type:"childremoved",child:null},Mt=class i extends kn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Af++}),this.uuid=Bi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let e=new P,t=new wn,n=new yn,s=new P(1,1,1);function r(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new ut},normalMatrix:{value:new ze}}),this.matrix=new ut,this.matrixWorld=new ut,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ma,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Ji.setFromAxisAngle(e,t),this.quaternion.multiply(Ji),this}rotateOnWorldAxis(e,t){return Ji.setFromAxisAngle(e,t),this.quaternion.premultiply(Ji),this}rotateX(e){return this.rotateOnAxis(Ph,e)}rotateY(e){return this.rotateOnAxis(Ih,e)}rotateZ(e){return this.rotateOnAxis(Dh,e)}translateOnAxis(e,t){return Rh.copy(e).applyQuaternion(this.quaternion),this.position.add(Rh.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Ph,e)}translateY(e){return this.translateOnAxis(Ih,e)}translateZ(e){return this.translateOnAxis(Dh,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Ln.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?zr.copy(e):zr.set(e,t,n);let s=this.parent;this.updateWorldMatrix(!0,!1),Ws.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Ln.lookAt(Ws,zr,this.up):Ln.lookAt(zr,Ws,this.up),this.quaternion.setFromRotationMatrix(Ln),s&&(Ln.extractRotation(s.matrixWorld),Ji.setFromRotationMatrix(Ln),this.quaternion.premultiply(Ji.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Lh),Qi.child=e,this.dispatchEvent(Qi),Qi.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Pf),Eo.child=e,this.dispatchEvent(Eo),Eo.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Ln.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Ln.multiply(e.parent.matrixWorld)),e.applyMatrix4(Ln),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Lh),Qi.child=e,this.dispatchEvent(Qi),Qi.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){let a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ws,e,Cf),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ws,Rf,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){let n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.visibility=this._visibility,s.active=this._active,s.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.geometryCount=this._geometryCount,s.matricesTexture=this._matricesTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere={center:s.boundingSphere.center.toArray(),radius:s.boundingSphere.radius}),this.boundingBox!==null&&(s.boundingBox={min:s.boundingBox.min.toArray(),max:s.boundingBox.max.toArray()}));function r(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let u=l[c];r(e.shapes,u)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(r(e.materials,this.material[l]));s.material=o}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){let l=this.animations[o];s.animations.push(r(e.animations,l))}}if(t){let o=a(e.geometries),l=a(e.materials),c=a(e.textures),h=a(e.images),u=a(e.shapes),f=a(e.skeletons),p=a(e.animations),g=a(e.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),f.length>0&&(n.skeletons=f),p.length>0&&(n.animations=p),g.length>0&&(n.nodes=g)}return n.object=s,n;function a(o){let l=[];for(let c in o){let h=o[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let s=e.children[n];this.add(s.clone())}return this}};Mt.DEFAULT_UP=new P(0,1,0);Mt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Mt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var xn=new P,Un=new P,To=new P,Nn=new P,$i=new P,es=new P,Uh=new P,wo=new P,Ao=new P,Co=new P,Ro=new gt,Po=new gt,Io=new gt,Si=class i{constructor(e=new P,t=new P,n=new P){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),xn.subVectors(e,t),s.cross(xn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){xn.subVectors(s,t),Un.subVectors(n,t),To.subVectors(e,t);let a=xn.dot(xn),o=xn.dot(Un),l=xn.dot(To),c=Un.dot(Un),h=Un.dot(To),u=a*c-o*o;if(u===0)return r.set(0,0,0),null;let f=1/u,p=(c*l-o*h)*f,g=(a*h-o*l)*f;return r.set(1-p-g,g,p)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,Nn)===null?!1:Nn.x>=0&&Nn.y>=0&&Nn.x+Nn.y<=1}static getInterpolation(e,t,n,s,r,a,o,l){return this.getBarycoord(e,t,n,s,Nn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Nn.x),l.addScaledVector(a,Nn.y),l.addScaledVector(o,Nn.z),l)}static getInterpolatedAttribute(e,t,n,s,r,a){return Ro.setScalar(0),Po.setScalar(0),Io.setScalar(0),Ro.fromBufferAttribute(e,t),Po.fromBufferAttribute(e,n),Io.fromBufferAttribute(e,s),a.setScalar(0),a.addScaledVector(Ro,r.x),a.addScaledVector(Po,r.y),a.addScaledVector(Io,r.z),a}static isFrontFacing(e,t,n,s){return xn.subVectors(n,t),Un.subVectors(e,t),xn.cross(Un).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return xn.subVectors(this.c,this.b),Un.subVectors(this.a,this.b),xn.cross(Un).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return i.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return i.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,s,r){return i.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return i.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return i.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,s=this.b,r=this.c,a,o;$i.subVectors(s,n),es.subVectors(r,n),wo.subVectors(e,n);let l=$i.dot(wo),c=es.dot(wo);if(l<=0&&c<=0)return t.copy(n);Ao.subVectors(e,s);let h=$i.dot(Ao),u=es.dot(Ao);if(h>=0&&u<=h)return t.copy(s);let f=l*u-h*c;if(f<=0&&l>=0&&h<=0)return a=l/(l-h),t.copy(n).addScaledVector($i,a);Co.subVectors(e,r);let p=$i.dot(Co),g=es.dot(Co);if(g>=0&&p<=g)return t.copy(r);let x=p*c-l*g;if(x<=0&&c>=0&&g<=0)return o=c/(c-g),t.copy(n).addScaledVector(es,o);let m=h*g-p*u;if(m<=0&&u-h>=0&&p-g>=0)return Uh.subVectors(r,s),o=(u-h)/(u-h+(p-g)),t.copy(s).addScaledVector(Uh,o);let d=1/(m+x+f);return a=x*d,o=f*d,t.copy(n).addScaledVector($i,a).addScaledVector(es,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},Uu={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ni={h:0,s:0,l:0},Hr={h:0,s:0,l:0};function Do(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}var Re=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Ft){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Ge.toWorkingColorSpace(this,t),this}setRGB(e,t,n,s=Ge.workingColorSpace){return this.r=e,this.g=t,this.b=n,Ge.toWorkingColorSpace(this,s),this}setHSL(e,t,n,s=Ge.workingColorSpace){if(e=Ac(e,1),t=_t(t,0,1),n=_t(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,a=2*n-r;this.r=Do(a,r,e+1/3),this.g=Do(a,r,e),this.b=Do(a,r,e-1/3)}return Ge.toWorkingColorSpace(this,s),this}setStyle(e,t=Ft){function n(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r,a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){let r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(r,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Ft){let n=Uu[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=zn(e.r),this.g=zn(e.g),this.b=zn(e.b),this}copyLinearToSRGB(e){return this.r=us(e.r),this.g=us(e.g),this.b=us(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Ft){return Ge.fromWorkingColorSpace(Ot.copy(this),e),Math.round(_t(Ot.r*255,0,255))*65536+Math.round(_t(Ot.g*255,0,255))*256+Math.round(_t(Ot.b*255,0,255))}getHexString(e=Ft){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ge.workingColorSpace){Ge.fromWorkingColorSpace(Ot.copy(this),t);let n=Ot.r,s=Ot.g,r=Ot.b,a=Math.max(n,s,r),o=Math.min(n,s,r),l,c,h=(o+a)/2;if(o===a)l=0,c=0;else{let u=a-o;switch(c=h<=.5?u/(a+o):u/(2-a-o),a){case n:l=(s-r)/u+(s<r?6:0);break;case s:l=(r-n)/u+2;break;case r:l=(n-s)/u+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=Ge.workingColorSpace){return Ge.fromWorkingColorSpace(Ot.copy(this),t),e.r=Ot.r,e.g=Ot.g,e.b=Ot.b,e}getStyle(e=Ft){Ge.fromWorkingColorSpace(Ot.copy(this),e);let t=Ot.r,n=Ot.g,s=Ot.b;return e!==Ft?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL(ni),this.setHSL(ni.h+e,ni.s+t,ni.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(ni),e.getHSL(Hr);let n=Qs(ni.h,Hr.h,t),s=Qs(ni.s,Hr.s,t),r=Qs(ni.l,Hr.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Ot=new Re;Re.NAMES=Uu;var If=0,Ci=class extends kn{static get type(){return"Material"}get type(){return this.constructor.type}set type(e){}constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:If++}),this.uuid=Bi(),this.name="",this.blending=cs,this.side=ai,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Yo,this.blendDst=Zo,this.blendEquation=Mi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Re(0,0,0),this.blendAlpha=0,this.depthFunc=ms,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=xh,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Wi,this.stencilZFail=Wi,this.stencilZPass=Wi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==cs&&(n.blending=this.blending),this.side!==ai&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Yo&&(n.blendSrc=this.blendSrc),this.blendDst!==Zo&&(n.blendDst=this.blendDst),this.blendEquation!==Mi&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==ms&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==xh&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Wi&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Wi&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Wi&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let a=[];for(let o in r){let l=r[o];delete l.metadata,a.push(l)}return a}if(t){let r=s(e.textures),a=s(e.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}},An=class extends Ci{static get type(){return"MeshBasicMaterial"}constructor(e){super(),this.isMeshBasicMaterial=!0,this.color=new Re(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new wn,this.combine=qu,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},Fn=Df();function Df(){let i=new ArrayBuffer(4),e=new Float32Array(i),t=new Uint32Array(i),n=new Uint32Array(512),s=new Uint32Array(512);for(let l=0;l<256;++l){let c=l-127;c<-27?(n[l]=0,n[l|256]=32768,s[l]=24,s[l|256]=24):c<-14?(n[l]=1024>>-c-14,n[l|256]=1024>>-c-14|32768,s[l]=-c-1,s[l|256]=-c-1):c<=15?(n[l]=c+15<<10,n[l|256]=c+15<<10|32768,s[l]=13,s[l|256]=13):c<128?(n[l]=31744,n[l|256]=64512,s[l]=24,s[l|256]=24):(n[l]=31744,n[l|256]=64512,s[l]=13,s[l|256]=13)}let r=new Uint32Array(2048),a=new Uint32Array(64),o=new Uint32Array(64);for(let l=1;l<1024;++l){let c=l<<13,h=0;for(;!(c&8388608);)c<<=1,h-=8388608;c&=-8388609,h+=947912704,r[l]=c|h}for(let l=1024;l<2048;++l)r[l]=939524096+(l-1024<<13);for(let l=1;l<31;++l)a[l]=l<<23;a[31]=1199570944,a[32]=2147483648;for(let l=33;l<63;++l)a[l]=2147483648+(l-32<<23);a[63]=3347054592;for(let l=1;l<64;++l)l!==32&&(o[l]=1024);return{floatView:e,uint32View:t,baseTable:n,shiftTable:s,mantissaTable:r,exponentTable:a,offsetTable:o}}function Lf(i){Math.abs(i)>65504&&console.warn("THREE.DataUtils.toHalfFloat(): Value out of range."),i=_t(i,-65504,65504),Fn.floatView[0]=i;let e=Fn.uint32View[0],t=e>>23&511;return Fn.baseTable[t]+((e&8388607)>>Fn.shiftTable[t])}function Uf(i){let e=i>>10;return Fn.uint32View[0]=Fn.mantissaTable[Fn.offsetTable[e]+(i&1023)]+Fn.exponentTable[e],Fn.floatView[0]}var Nu={toHalfFloat:Lf,fromHalfFloat:Uf},yt=new P,kr=new K,nn=class{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=vh,this.updateRanges=[],this.gpuType=Tn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)kr.fromBufferAttribute(this,t),kr.applyMatrix3(e),this.setXY(t,kr.x,kr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)yt.fromBufferAttribute(this,t),yt.applyMatrix3(e),this.setXYZ(t,yt.x,yt.y,yt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)yt.fromBufferAttribute(this,t),yt.applyMatrix4(e),this.setXYZ(t,yt.x,yt.y,yt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)yt.fromBufferAttribute(this,t),yt.applyNormalMatrix(e),this.setXYZ(t,yt.x,yt.y,yt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)yt.fromBufferAttribute(this,t),yt.transformDirection(e),this.setXYZ(t,yt.x,yt.y,yt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=as(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Ht(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=as(t,this.array)),t}setX(e,t){return this.normalized&&(t=Ht(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=as(t,this.array)),t}setY(e,t){return this.normalized&&(t=Ht(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=as(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Ht(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=as(t,this.array)),t}setW(e,t){return this.normalized&&(t=Ht(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Ht(t,this.array),n=Ht(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=Ht(t,this.array),n=Ht(n,this.array),s=Ht(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=Ht(t,this.array),n=Ht(n,this.array),s=Ht(s,this.array),r=Ht(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==vh&&(e.usage=this.usage),e}};var ga=class extends nn{constructor(e,t,n){super(new Uint16Array(e),t,n)}};var xa=class extends nn{constructor(e,t,n){super(new Uint32Array(e),t,n)}};var je=class extends nn{constructor(e,t,n){super(new Float32Array(e),t,n)}},Nf=0,an=new ut,Lo=new Mt,ts=new P,en=new ln,Xs=new ln,Tt=new P,Rt=class i extends kn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Nf++}),this.uuid=Bi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Lu(e)?xa:ga)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new ze().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return an.makeRotationFromQuaternion(e),this.applyMatrix4(an),this}rotateX(e){return an.makeRotationX(e),this.applyMatrix4(an),this}rotateY(e){return an.makeRotationY(e),this.applyMatrix4(an),this}rotateZ(e){return an.makeRotationZ(e),this.applyMatrix4(an),this}translate(e,t,n){return an.makeTranslation(e,t,n),this.applyMatrix4(an),this}scale(e,t,n){return an.makeScale(e,t,n),this.applyMatrix4(an),this}lookAt(e){return Lo.lookAt(e),Lo.updateMatrix(),this.applyMatrix4(Lo.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ts).negate(),this.translate(ts.x,ts.y,ts.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let n=[];for(let s=0,r=e.length;s<r;s++){let a=e[s];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new je(n,3))}else{for(let n=0,s=t.count;n<s;n++){let r=e[n];t.setXYZ(n,r.x,r.y,r.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ln);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new P(-1/0,-1/0,-1/0),new P(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){let r=t[n];en.setFromBufferAttribute(r),this.morphTargetsRelative?(Tt.addVectors(this.boundingBox.min,en.min),this.boundingBox.expandByPoint(Tt),Tt.addVectors(this.boundingBox.max,en.max),this.boundingBox.expandByPoint(Tt)):(this.boundingBox.expandByPoint(en.min),this.boundingBox.expandByPoint(en.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ai);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new P,1/0);return}if(e){let n=this.boundingSphere.center;if(en.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){let o=t[r];Xs.setFromBufferAttribute(o),this.morphTargetsRelative?(Tt.addVectors(en.min,Xs.min),en.expandByPoint(Tt),Tt.addVectors(en.max,Xs.max),en.expandByPoint(Tt)):(en.expandByPoint(Xs.min),en.expandByPoint(Xs.max))}en.getCenter(n);let s=0;for(let r=0,a=e.count;r<a;r++)Tt.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(Tt));if(t)for(let r=0,a=t.length;r<a;r++){let o=t[r],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)Tt.fromBufferAttribute(o,c),l&&(ts.fromBufferAttribute(e,c),Tt.add(ts)),s=Math.max(s,n.distanceToSquared(Tt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=t.position,s=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new nn(new Float32Array(4*n.count),4));let a=this.getAttribute("tangent"),o=[],l=[];for(let R=0;R<n.count;R++)o[R]=new P,l[R]=new P;let c=new P,h=new P,u=new P,f=new K,p=new K,g=new K,x=new P,m=new P;function d(R,b,q){c.fromBufferAttribute(n,R),h.fromBufferAttribute(n,b),u.fromBufferAttribute(n,q),f.fromBufferAttribute(r,R),p.fromBufferAttribute(r,b),g.fromBufferAttribute(r,q),h.sub(c),u.sub(c),p.sub(f),g.sub(f);let C=1/(p.x*g.y-g.x*p.y);isFinite(C)&&(x.copy(h).multiplyScalar(g.y).addScaledVector(u,-p.y).multiplyScalar(C),m.copy(u).multiplyScalar(p.x).addScaledVector(h,-g.x).multiplyScalar(C),o[R].add(x),o[b].add(x),o[q].add(x),l[R].add(m),l[b].add(m),l[q].add(m))}let S=this.groups;S.length===0&&(S=[{start:0,count:e.count}]);for(let R=0,b=S.length;R<b;++R){let q=S[R],C=q.start,O=q.count;for(let N=C,B=C+O;N<B;N+=3)d(e.getX(N+0),e.getX(N+1),e.getX(N+2))}let y=new P,v=new P,D=new P,T=new P;function A(R){D.fromBufferAttribute(s,R),T.copy(D);let b=o[R];y.copy(b),y.sub(D.multiplyScalar(D.dot(b))).normalize(),v.crossVectors(T,b);let C=v.dot(l[R])<0?-1:1;a.setXYZW(R,y.x,y.y,y.z,C)}for(let R=0,b=S.length;R<b;++R){let q=S[R],C=q.start,O=q.count;for(let N=C,B=C+O;N<B;N+=3)A(e.getX(N+0)),A(e.getX(N+1)),A(e.getX(N+2))}}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new nn(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let f=0,p=n.count;f<p;f++)n.setXYZ(f,0,0,0);let s=new P,r=new P,a=new P,o=new P,l=new P,c=new P,h=new P,u=new P;if(e)for(let f=0,p=e.count;f<p;f+=3){let g=e.getX(f+0),x=e.getX(f+1),m=e.getX(f+2);s.fromBufferAttribute(t,g),r.fromBufferAttribute(t,x),a.fromBufferAttribute(t,m),h.subVectors(a,r),u.subVectors(s,r),h.cross(u),o.fromBufferAttribute(n,g),l.fromBufferAttribute(n,x),c.fromBufferAttribute(n,m),o.add(h),l.add(h),c.add(h),n.setXYZ(g,o.x,o.y,o.z),n.setXYZ(x,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let f=0,p=t.count;f<p;f+=3)s.fromBufferAttribute(t,f+0),r.fromBufferAttribute(t,f+1),a.fromBufferAttribute(t,f+2),h.subVectors(a,r),u.subVectors(s,r),h.cross(u),n.setXYZ(f+0,h.x,h.y,h.z),n.setXYZ(f+1,h.x,h.y,h.z),n.setXYZ(f+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Tt.fromBufferAttribute(e,t),Tt.normalize(),e.setXYZ(t,Tt.x,Tt.y,Tt.z)}toNonIndexed(){function e(o,l){let c=o.array,h=o.itemSize,u=o.normalized,f=new c.constructor(l.length*h),p=0,g=0;for(let x=0,m=l.length;x<m;x++){o.isInterleavedBufferAttribute?p=l[x]*o.data.stride+o.offset:p=l[x]*h;for(let d=0;d<h;d++)f[g++]=c[p++]}return new nn(f,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new i,n=this.index.array,s=this.attributes;for(let o in s){let l=s[o],c=e(l,n);t.setAttribute(o,c)}let r=this.morphAttributes;for(let o in r){let l=[],c=r[o];for(let h=0,u=c.length;h<u;h++){let f=c[h],p=e(f,n);l.push(p)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,l=a.length;o<l;o++){let c=a[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){let e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let l in n){let c=n[l];e.data.attributes[l]=c.toJSON(e.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let u=0,f=c.length;u<f;u++){let p=c[u];h.push(p.toJSON(e.data))}h.length>0&&(s[l]=h,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone(t));let s=e.attributes;for(let c in s){let h=s[c];this.setAttribute(c,h.clone(t))}let r=e.morphAttributes;for(let c in r){let h=[],u=r[c];for(let f=0,p=u.length;f<p;f++)h.push(u[f].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let c=0,h=a.length;c<h;c++){let u=a[c];this.addGroup(u.start,u.count,u.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},Nh=new ut,xi=new rr,Vr=new Ai,Oh=new P,Gr=new P,Wr=new P,Xr=new P,Uo=new P,Yr=new P,Fh=new P,Zr=new P,xt=class extends Mt{constructor(e=new Rt,t=new An){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(e,t){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(s,e);let o=this.morphTargetInfluences;if(r&&o){Yr.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=o[l],u=r[l];h!==0&&(Uo.fromBufferAttribute(u,e),a?Yr.addScaledVector(Uo,h):Yr.addScaledVector(Uo.sub(t),h))}t.add(Yr)}return t}raycast(e,t){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Vr.copy(n.boundingSphere),Vr.applyMatrix4(r),xi.copy(e.ray).recast(e.near),!(Vr.containsPoint(xi.origin)===!1&&(xi.intersectSphere(Vr,Oh)===null||xi.origin.distanceToSquared(Oh)>(e.far-e.near)**2))&&(Nh.copy(r).invert(),xi.copy(e.ray).applyMatrix4(Nh),!(n.boundingBox!==null&&xi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,xi)))}_computeIntersections(e,t,n){let s,r=this.geometry,a=this.material,o=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,f=r.groups,p=r.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,x=f.length;g<x;g++){let m=f[g],d=a[m.materialIndex],S=Math.max(m.start,p.start),y=Math.min(o.count,Math.min(m.start+m.count,p.start+p.count));for(let v=S,D=y;v<D;v+=3){let T=o.getX(v),A=o.getX(v+1),R=o.getX(v+2);s=jr(this,d,e,n,c,h,u,T,A,R),s&&(s.faceIndex=Math.floor(v/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{let g=Math.max(0,p.start),x=Math.min(o.count,p.start+p.count);for(let m=g,d=x;m<d;m+=3){let S=o.getX(m),y=o.getX(m+1),v=o.getX(m+2);s=jr(this,a,e,n,c,h,u,S,y,v),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(a))for(let g=0,x=f.length;g<x;g++){let m=f[g],d=a[m.materialIndex],S=Math.max(m.start,p.start),y=Math.min(l.count,Math.min(m.start+m.count,p.start+p.count));for(let v=S,D=y;v<D;v+=3){let T=v,A=v+1,R=v+2;s=jr(this,d,e,n,c,h,u,T,A,R),s&&(s.faceIndex=Math.floor(v/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{let g=Math.max(0,p.start),x=Math.min(l.count,p.start+p.count);for(let m=g,d=x;m<d;m+=3){let S=m,y=m+1,v=m+2;s=jr(this,a,e,n,c,h,u,S,y,v),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}}};function Of(i,e,t,n,s,r,a,o){let l;if(e.side===zt?l=n.intersectTriangle(a,r,s,!0,o):l=n.intersectTriangle(s,r,a,e.side===ai,o),l===null)return null;Zr.copy(o),Zr.applyMatrix4(i.matrixWorld);let c=t.ray.origin.distanceTo(Zr);return c<t.near||c>t.far?null:{distance:c,point:Zr.clone(),object:i}}function jr(i,e,t,n,s,r,a,o,l,c){i.getVertexPosition(o,Gr),i.getVertexPosition(l,Wr),i.getVertexPosition(c,Xr);let h=Of(i,e,t,n,Gr,Wr,Xr,Fh);if(h){let u=new P;Si.getBarycoord(Fh,Gr,Wr,Xr,u),s&&(h.uv=Si.getInterpolatedAttribute(s,o,l,c,u,new K)),r&&(h.uv1=Si.getInterpolatedAttribute(r,o,l,c,u,new K)),a&&(h.normal=Si.getInterpolatedAttribute(a,o,l,c,u,new P),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let f={a:o,b:l,c,normal:new P,materialIndex:0};Si.getNormal(Gr,Wr,Xr,f.normal),h.face=f,h.barycoord=u}return h}var Ri=class i extends Rt{constructor(e=1,t=1,n=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:a};let o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);let l=[],c=[],h=[],u=[],f=0,p=0;g("z","y","x",-1,-1,n,t,e,a,r,0),g("z","y","x",1,-1,n,t,-e,a,r,1),g("x","z","y",1,1,e,n,t,s,a,2),g("x","z","y",1,-1,e,n,-t,s,a,3),g("x","y","z",1,-1,e,t,n,s,r,4),g("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new je(c,3)),this.setAttribute("normal",new je(h,3)),this.setAttribute("uv",new je(u,2));function g(x,m,d,S,y,v,D,T,A,R,b){let q=v/A,C=D/R,O=v/2,N=D/2,B=T/2,W=A+1,k=R+1,ee=0,V=0,ae=new P;for(let ue=0;ue<k;ue++){let ge=ue*C-N;for(let Ue=0;Ue<W;Ue++){let Ke=Ue*q-O;ae[x]=Ke*S,ae[m]=ge*y,ae[d]=B,c.push(ae.x,ae.y,ae.z),ae[x]=0,ae[m]=0,ae[d]=T>0?1:-1,h.push(ae.x,ae.y,ae.z),u.push(Ue/A),u.push(1-ue/R),ee+=1}}for(let ue=0;ue<R;ue++)for(let ge=0;ge<A;ge++){let Ue=f+ge+W*ue,Ke=f+ge+W*(ue+1),Y=f+(ge+1)+W*(ue+1),se=f+(ge+1)+W*ue;l.push(Ue,Ke,se),l.push(Ke,Y,se),V+=6}o.addGroup(p,V,b),p+=V,f+=ee}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};function Ms(i){let e={};for(let t in i){e[t]={};for(let n in i[t]){let s=i[t][n];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone():Array.isArray(s)?e[t][n]=s.slice():e[t][n]=s}}return e}function kt(i){let e={};for(let t=0;t<i.length;t++){let n=Ms(i[t]);for(let s in n)e[s]=n[s]}return e}function Ff(i){let e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Ou(i){let e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Ge.workingColorSpace}var Zt={clone:Ms,merge:kt},Bf=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,zf=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,nt=class extends Ci{static get type(){return"ShaderMaterial"}constructor(e){super(),this.isShaderMaterial=!0,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Bf,this.fragmentShader=zf,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Ms(e.uniforms),this.uniformsGroups=Ff(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let s in this.uniforms){let a=this.uniforms[s].value;a&&a.isTexture?t.uniforms[s]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[s]={type:"m4",value:a.toArray()}:t.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}},va=class extends Mt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ut,this.projectionMatrix=new ut,this.projectionMatrixInverse=new ut,this.coordinateSystem=Bn}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},ii=new P,Bh=new K,zh=new K,Bt=class extends va{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=qs*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(Js*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return qs*2*Math.atan(Math.tan(Js*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){ii.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(ii.x,ii.y).multiplyScalar(-e/ii.z),ii.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(ii.x,ii.y).multiplyScalar(-e/ii.z)}getViewSize(e,t){return this.getViewBounds(e,Bh,zh),t.subVectors(zh,Bh)}setViewOffset(e,t,n,s,r,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(Js*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s,a=this.view;if(this.view!==null&&this.view.enabled){let l=a.fullWidth,c=a.fullHeight;r+=a.offsetX*s/l,t-=a.offsetY*n/c,s*=a.width/l,n*=a.height/c}let o=this.filmOffset;o!==0&&(r+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},ns=-90,is=1,Ll=class extends Mt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new Bt(ns,is,e,t);s.layers=this.layers,this.add(s);let r=new Bt(ns,is,e,t);r.layers=this.layers,this.add(r);let a=new Bt(ns,is,e,t);a.layers=this.layers,this.add(a);let o=new Bt(ns,is,e,t);o.layers=this.layers,this.add(o);let l=new Bt(ns,is,e,t);l.layers=this.layers,this.add(l);let c=new Bt(ns,is,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,s,r,a,o,l]=t;for(let c of t)this.remove(c);if(e===Bn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===da)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[r,a,o,l,c,h]=this.children,u=e.getRenderTarget(),f=e.getActiveCubeFace(),p=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;let x=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,s),e.render(t,r),e.setRenderTarget(n,1,s),e.render(t,a),e.setRenderTarget(n,2,s),e.render(t,o),e.setRenderTarget(n,3,s),e.render(t,l),e.setRenderTarget(n,4,s),e.render(t,c),n.texture.generateMipmaps=x,e.setRenderTarget(n,5,s),e.render(t,h),e.setRenderTarget(u,f,p),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}},_a=class extends wt{constructor(e,t,n,s,r,a,o,l,c,h){e=e!==void 0?e:[],t=t!==void 0?t:gs,super(e,t,n,s,r,a,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Ul=class extends pt{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];this.texture=new _a(s,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:Vt}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new Ri(5,5,5),r=new nt({name:"CubemapFromEquirect",uniforms:Ms(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:zt,blending:on});r.uniforms.tEquirect.value=t;let a=new xt(s,r),o=t.minFilter;return t.minFilter===Ti&&(t.minFilter=Vt),new Ll(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t,n,s){let r=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,s);e.setRenderTarget(r)}},No=new P,Hf=new P,kf=new ze,_n=class{constructor(e=new P(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let s=No.subVectors(n,t).cross(Hf.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){let n=e.delta(No),s=this.normal.dot(n);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let r=-(e.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:t.copy(e.start).addScaledVector(n,r)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||kf.getNormalMatrix(e),s=this.coplanarPoint(No).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},vi=new Ai,Kr=new P,ar=class{constructor(e=new _n,t=new _n,n=new _n,s=new _n,r=new _n,a=new _n){this.planes=[e,t,n,s,r,a]}set(e,t,n,s,r,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Bn){let n=this.planes,s=e.elements,r=s[0],a=s[1],o=s[2],l=s[3],c=s[4],h=s[5],u=s[6],f=s[7],p=s[8],g=s[9],x=s[10],m=s[11],d=s[12],S=s[13],y=s[14],v=s[15];if(n[0].setComponents(l-r,f-c,m-p,v-d).normalize(),n[1].setComponents(l+r,f+c,m+p,v+d).normalize(),n[2].setComponents(l+a,f+h,m+g,v+S).normalize(),n[3].setComponents(l-a,f-h,m-g,v-S).normalize(),n[4].setComponents(l-o,f-u,m-x,v-y).normalize(),t===Bn)n[5].setComponents(l+o,f+u,m+x,v+y).normalize();else if(t===da)n[5].setComponents(o,u,x,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),vi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),vi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(vi)}intersectsSprite(e){return vi.center.set(0,0,0),vi.radius=.7071067811865476,vi.applyMatrix4(e.matrixWorld),this.intersectsSphere(vi)}intersectsSphere(e){let t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let s=t[n];if(Kr.x=s.normal.x>0?e.max.x:e.min.x,Kr.y=s.normal.y>0?e.max.y:e.min.y,Kr.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(Kr)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};function Fu(){let i=null,e=!1,t=null,n=null;function s(r,a){t(r,a),n=i.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(s),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function Vf(i){let e=new WeakMap;function t(o,l){let c=o.array,h=o.usage,u=c.byteLength,f=i.createBuffer();i.bindBuffer(l,f),i.bufferData(l,c,h),o.onUploadCallback();let p;if(c instanceof Float32Array)p=i.FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?p=i.HALF_FLOAT:p=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)p=i.SHORT;else if(c instanceof Uint32Array)p=i.UNSIGNED_INT;else if(c instanceof Int32Array)p=i.INT;else if(c instanceof Int8Array)p=i.BYTE;else if(c instanceof Uint8Array)p=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)p=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:f,type:p,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:u}}function n(o,l,c){let h=l.array,u=l.updateRanges;if(i.bindBuffer(c,o),u.length===0)i.bufferSubData(c,0,h);else{u.sort((p,g)=>p.start-g.start);let f=0;for(let p=1;p<u.length;p++){let g=u[f],x=u[p];x.start<=g.start+g.count+1?g.count=Math.max(g.count,x.start+x.count-g.start):(++f,u[f]=x)}u.length=f+1;for(let p=0,g=u.length;p<g;p++){let x=u[p];i.bufferSubData(c,x.start*h.BYTES_PER_ELEMENT,h,x.start,x.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);let l=e.get(o);l&&(i.deleteBuffer(l.buffer),e.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let h=e.get(o);(!h||h.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let c=e.get(o);if(c===void 0)e.set(o,t(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,o,l),c.version=o.version}}return{get:s,remove:r,update:a}}var Pi=class i extends Rt{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};let r=e/2,a=t/2,o=Math.floor(n),l=Math.floor(s),c=o+1,h=l+1,u=e/o,f=t/l,p=[],g=[],x=[],m=[];for(let d=0;d<h;d++){let S=d*f-a;for(let y=0;y<c;y++){let v=y*u-r;g.push(v,-S,0),x.push(0,0,1),m.push(y/o),m.push(1-d/l)}}for(let d=0;d<l;d++)for(let S=0;S<o;S++){let y=S+c*d,v=S+c*(d+1),D=S+1+c*(d+1),T=S+1+c*d;p.push(y,v,T),p.push(v,D,T)}this.setIndex(p),this.setAttribute("position",new je(g,3)),this.setAttribute("normal",new je(x,3)),this.setAttribute("uv",new je(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.widthSegments,e.heightSegments)}},Gf=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Wf=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Xf=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Yf=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Zf=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,jf=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Kf=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Jf=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Qf=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,$f=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,ep=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,tp=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,np=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,ip=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,sp=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,rp=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,ap=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,op=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,lp=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,cp=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,hp=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,up=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,dp=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,fp=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,pp=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,mp=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,gp=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,xp=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,vp=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,_p=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,yp="gl_FragColor = linearToOutputTexel( gl_FragColor );",qp=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Mp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Sp=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,bp=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Ep=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Tp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,wp=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Ap=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Cp=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Rp=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Pp=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Ip=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Dp=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Lp=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Up=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Np=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Op=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Fp=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Bp=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,zp=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Hp=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,kp=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Vp=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Gp=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Wp=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Xp=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Yp=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Zp=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,jp=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Kp=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Jp=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Qp=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,$p=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,e1=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,t1=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,n1=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,i1=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,s1=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,r1=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,a1=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,o1=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,l1=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,c1=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,h1=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,u1=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,d1=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,f1=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,p1=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,m1=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,g1=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,x1=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,v1=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,_1=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,y1=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,q1=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,M1=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,S1=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,b1=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,E1=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,T1=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,w1=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,A1=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,C1=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,R1=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,P1=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,I1=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,D1=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,L1=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,U1=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,N1=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,O1=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,F1=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,B1=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,z1=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,H1=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,k1=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,V1=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,G1=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,W1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,X1=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Y1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Z1=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,j1=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,K1=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,J1=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Q1=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,$1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,e0=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,t0=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,n0=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,i0=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,s0=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,r0=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,a0=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,o0=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,l0=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,c0=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,h0=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,u0=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,d0=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,f0=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,p0=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,m0=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,g0=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,x0=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,v0=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,_0=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,y0=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,q0=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,M0=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,ke={alphahash_fragment:Gf,alphahash_pars_fragment:Wf,alphamap_fragment:Xf,alphamap_pars_fragment:Yf,alphatest_fragment:Zf,alphatest_pars_fragment:jf,aomap_fragment:Kf,aomap_pars_fragment:Jf,batching_pars_vertex:Qf,batching_vertex:$f,begin_vertex:ep,beginnormal_vertex:tp,bsdfs:np,iridescence_fragment:ip,bumpmap_pars_fragment:sp,clipping_planes_fragment:rp,clipping_planes_pars_fragment:ap,clipping_planes_pars_vertex:op,clipping_planes_vertex:lp,color_fragment:cp,color_pars_fragment:hp,color_pars_vertex:up,color_vertex:dp,common:fp,cube_uv_reflection_fragment:pp,defaultnormal_vertex:mp,displacementmap_pars_vertex:gp,displacementmap_vertex:xp,emissivemap_fragment:vp,emissivemap_pars_fragment:_p,colorspace_fragment:yp,colorspace_pars_fragment:qp,envmap_fragment:Mp,envmap_common_pars_fragment:Sp,envmap_pars_fragment:bp,envmap_pars_vertex:Ep,envmap_physical_pars_fragment:Np,envmap_vertex:Tp,fog_vertex:wp,fog_pars_vertex:Ap,fog_fragment:Cp,fog_pars_fragment:Rp,gradientmap_pars_fragment:Pp,lightmap_pars_fragment:Ip,lights_lambert_fragment:Dp,lights_lambert_pars_fragment:Lp,lights_pars_begin:Up,lights_toon_fragment:Op,lights_toon_pars_fragment:Fp,lights_phong_fragment:Bp,lights_phong_pars_fragment:zp,lights_physical_fragment:Hp,lights_physical_pars_fragment:kp,lights_fragment_begin:Vp,lights_fragment_maps:Gp,lights_fragment_end:Wp,logdepthbuf_fragment:Xp,logdepthbuf_pars_fragment:Yp,logdepthbuf_pars_vertex:Zp,logdepthbuf_vertex:jp,map_fragment:Kp,map_pars_fragment:Jp,map_particle_fragment:Qp,map_particle_pars_fragment:$p,metalnessmap_fragment:e1,metalnessmap_pars_fragment:t1,morphinstance_vertex:n1,morphcolor_vertex:i1,morphnormal_vertex:s1,morphtarget_pars_vertex:r1,morphtarget_vertex:a1,normal_fragment_begin:o1,normal_fragment_maps:l1,normal_pars_fragment:c1,normal_pars_vertex:h1,normal_vertex:u1,normalmap_pars_fragment:d1,clearcoat_normal_fragment_begin:f1,clearcoat_normal_fragment_maps:p1,clearcoat_pars_fragment:m1,iridescence_pars_fragment:g1,opaque_fragment:x1,packing:v1,premultiplied_alpha_fragment:_1,project_vertex:y1,dithering_fragment:q1,dithering_pars_fragment:M1,roughnessmap_fragment:S1,roughnessmap_pars_fragment:b1,shadowmap_pars_fragment:E1,shadowmap_pars_vertex:T1,shadowmap_vertex:w1,shadowmask_pars_fragment:A1,skinbase_vertex:C1,skinning_pars_vertex:R1,skinning_vertex:P1,skinnormal_vertex:I1,specularmap_fragment:D1,specularmap_pars_fragment:L1,tonemapping_fragment:U1,tonemapping_pars_fragment:N1,transmission_fragment:O1,transmission_pars_fragment:F1,uv_pars_fragment:B1,uv_pars_vertex:z1,uv_vertex:H1,worldpos_vertex:k1,background_vert:V1,background_frag:G1,backgroundCube_vert:W1,backgroundCube_frag:X1,cube_vert:Y1,cube_frag:Z1,depth_vert:j1,depth_frag:K1,distanceRGBA_vert:J1,distanceRGBA_frag:Q1,equirect_vert:$1,equirect_frag:e0,linedashed_vert:t0,linedashed_frag:n0,meshbasic_vert:i0,meshbasic_frag:s0,meshlambert_vert:r0,meshlambert_frag:a0,meshmatcap_vert:o0,meshmatcap_frag:l0,meshnormal_vert:c0,meshnormal_frag:h0,meshphong_vert:u0,meshphong_frag:d0,meshphysical_vert:f0,meshphysical_frag:p0,meshtoon_vert:m0,meshtoon_frag:g0,points_vert:x0,points_frag:v0,shadow_vert:_0,shadow_frag:y0,sprite_vert:q0,sprite_frag:M0},ce={common:{diffuse:{value:new Re(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new ze},alphaMap:{value:null},alphaMapTransform:{value:new ze},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new ze}},envmap:{envMap:{value:null},envMapRotation:{value:new ze},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new ze}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new ze}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new ze},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new ze},normalScale:{value:new K(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new ze},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new ze}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new ze}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new ze}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Re(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Re(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new ze},alphaTest:{value:0},uvTransform:{value:new ze}},sprite:{diffuse:{value:new Re(16777215)},opacity:{value:1},center:{value:new K(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new ze},alphaMap:{value:null},alphaMapTransform:{value:new ze},alphaTest:{value:0}}},En={basic:{uniforms:kt([ce.common,ce.specularmap,ce.envmap,ce.aomap,ce.lightmap,ce.fog]),vertexShader:ke.meshbasic_vert,fragmentShader:ke.meshbasic_frag},lambert:{uniforms:kt([ce.common,ce.specularmap,ce.envmap,ce.aomap,ce.lightmap,ce.emissivemap,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.fog,ce.lights,{emissive:{value:new Re(0)}}]),vertexShader:ke.meshlambert_vert,fragmentShader:ke.meshlambert_frag},phong:{uniforms:kt([ce.common,ce.specularmap,ce.envmap,ce.aomap,ce.lightmap,ce.emissivemap,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.fog,ce.lights,{emissive:{value:new Re(0)},specular:{value:new Re(1118481)},shininess:{value:30}}]),vertexShader:ke.meshphong_vert,fragmentShader:ke.meshphong_frag},standard:{uniforms:kt([ce.common,ce.envmap,ce.aomap,ce.lightmap,ce.emissivemap,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.roughnessmap,ce.metalnessmap,ce.fog,ce.lights,{emissive:{value:new Re(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ke.meshphysical_vert,fragmentShader:ke.meshphysical_frag},toon:{uniforms:kt([ce.common,ce.aomap,ce.lightmap,ce.emissivemap,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.gradientmap,ce.fog,ce.lights,{emissive:{value:new Re(0)}}]),vertexShader:ke.meshtoon_vert,fragmentShader:ke.meshtoon_frag},matcap:{uniforms:kt([ce.common,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.fog,{matcap:{value:null}}]),vertexShader:ke.meshmatcap_vert,fragmentShader:ke.meshmatcap_frag},points:{uniforms:kt([ce.points,ce.fog]),vertexShader:ke.points_vert,fragmentShader:ke.points_frag},dashed:{uniforms:kt([ce.common,ce.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ke.linedashed_vert,fragmentShader:ke.linedashed_frag},depth:{uniforms:kt([ce.common,ce.displacementmap]),vertexShader:ke.depth_vert,fragmentShader:ke.depth_frag},normal:{uniforms:kt([ce.common,ce.bumpmap,ce.normalmap,ce.displacementmap,{opacity:{value:1}}]),vertexShader:ke.meshnormal_vert,fragmentShader:ke.meshnormal_frag},sprite:{uniforms:kt([ce.sprite,ce.fog]),vertexShader:ke.sprite_vert,fragmentShader:ke.sprite_frag},background:{uniforms:{uvTransform:{value:new ze},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ke.background_vert,fragmentShader:ke.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new ze}},vertexShader:ke.backgroundCube_vert,fragmentShader:ke.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ke.cube_vert,fragmentShader:ke.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ke.equirect_vert,fragmentShader:ke.equirect_frag},distanceRGBA:{uniforms:kt([ce.common,ce.displacementmap,{referencePosition:{value:new P},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ke.distanceRGBA_vert,fragmentShader:ke.distanceRGBA_frag},shadow:{uniforms:kt([ce.lights,ce.fog,{color:{value:new Re(0)},opacity:{value:1}}]),vertexShader:ke.shadow_vert,fragmentShader:ke.shadow_frag}};En.physical={uniforms:kt([En.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new ze},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new ze},clearcoatNormalScale:{value:new K(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new ze},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new ze},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new ze},sheen:{value:0},sheenColor:{value:new Re(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new ze},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new ze},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new ze},transmissionSamplerSize:{value:new K},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new ze},attenuationDistance:{value:0},attenuationColor:{value:new Re(0)},specularColor:{value:new Re(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new ze},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new ze},anisotropyVector:{value:new K},anisotropyMap:{value:null},anisotropyMapTransform:{value:new ze}}]),vertexShader:ke.meshphysical_vert,fragmentShader:ke.meshphysical_frag};var Jr={r:0,b:0,g:0},_i=new wn,S0=new ut;function b0(i,e,t,n,s,r,a){let o=new Re(0),l=r===!0?0:1,c,h,u=null,f=0,p=null;function g(S){let y=S.isScene===!0?S.background:null;return y&&y.isTexture&&(y=(S.backgroundBlurriness>0?t:e).get(y)),y}function x(S){let y=!1,v=g(S);v===null?d(o,l):v&&v.isColor&&(d(v,1),y=!0);let D=i.xr.getEnvironmentBlendMode();D==="additive"?n.buffers.color.setClear(0,0,0,1,a):D==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(i.autoClear||y)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function m(S,y){let v=g(y);v&&(v.isCubeTexture||v.mapping===ka)?(h===void 0&&(h=new xt(new Ri(1,1,1),new nt({name:"BackgroundCubeMaterial",uniforms:Ms(En.backgroundCube.uniforms),vertexShader:En.backgroundCube.vertexShader,fragmentShader:En.backgroundCube.fragmentShader,side:zt,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(D,T,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(h)),_i.copy(y.backgroundRotation),_i.x*=-1,_i.y*=-1,_i.z*=-1,v.isCubeTexture&&v.isRenderTargetTexture===!1&&(_i.y*=-1,_i.z*=-1),h.material.uniforms.envMap.value=v,h.material.uniforms.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=y.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(S0.makeRotationFromEuler(_i)),h.material.toneMapped=Ge.getTransfer(v.colorSpace)!==et,(u!==v||f!==v.version||p!==i.toneMapping)&&(h.material.needsUpdate=!0,u=v,f=v.version,p=i.toneMapping),h.layers.enableAll(),S.unshift(h,h.geometry,h.material,0,0,null)):v&&v.isTexture&&(c===void 0&&(c=new xt(new Pi(2,2),new nt({name:"BackgroundMaterial",uniforms:Ms(En.background.uniforms),vertexShader:En.background.vertexShader,fragmentShader:En.background.fragmentShader,side:ai,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(c)),c.material.uniforms.t2D.value=v,c.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,c.material.toneMapped=Ge.getTransfer(v.colorSpace)!==et,v.matrixAutoUpdate===!0&&v.updateMatrix(),c.material.uniforms.uvTransform.value.copy(v.matrix),(u!==v||f!==v.version||p!==i.toneMapping)&&(c.material.needsUpdate=!0,u=v,f=v.version,p=i.toneMapping),c.layers.enableAll(),S.unshift(c,c.geometry,c.material,0,0,null))}function d(S,y){S.getRGB(Jr,Ou(i)),n.buffers.color.setClear(Jr.r,Jr.g,Jr.b,y,a)}return{getClearColor:function(){return o},setClearColor:function(S,y=1){o.set(S),l=y,d(o,l)},getClearAlpha:function(){return l},setClearAlpha:function(S){l=S,d(o,l)},render:x,addToRenderList:m}}function E0(i,e){let t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=f(null),r=s,a=!1;function o(q,C,O,N,B){let W=!1,k=u(N,O,C);r!==k&&(r=k,c(r.object)),W=p(q,N,O,B),W&&g(q,N,O,B),B!==null&&e.update(B,i.ELEMENT_ARRAY_BUFFER),(W||a)&&(a=!1,v(q,C,O,N),B!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(B).buffer))}function l(){return i.createVertexArray()}function c(q){return i.bindVertexArray(q)}function h(q){return i.deleteVertexArray(q)}function u(q,C,O){let N=O.wireframe===!0,B=n[q.id];B===void 0&&(B={},n[q.id]=B);let W=B[C.id];W===void 0&&(W={},B[C.id]=W);let k=W[N];return k===void 0&&(k=f(l()),W[N]=k),k}function f(q){let C=[],O=[],N=[];for(let B=0;B<t;B++)C[B]=0,O[B]=0,N[B]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:C,enabledAttributes:O,attributeDivisors:N,object:q,attributes:{},index:null}}function p(q,C,O,N){let B=r.attributes,W=C.attributes,k=0,ee=O.getAttributes();for(let V in ee)if(ee[V].location>=0){let ue=B[V],ge=W[V];if(ge===void 0&&(V==="instanceMatrix"&&q.instanceMatrix&&(ge=q.instanceMatrix),V==="instanceColor"&&q.instanceColor&&(ge=q.instanceColor)),ue===void 0||ue.attribute!==ge||ge&&ue.data!==ge.data)return!0;k++}return r.attributesNum!==k||r.index!==N}function g(q,C,O,N){let B={},W=C.attributes,k=0,ee=O.getAttributes();for(let V in ee)if(ee[V].location>=0){let ue=W[V];ue===void 0&&(V==="instanceMatrix"&&q.instanceMatrix&&(ue=q.instanceMatrix),V==="instanceColor"&&q.instanceColor&&(ue=q.instanceColor));let ge={};ge.attribute=ue,ue&&ue.data&&(ge.data=ue.data),B[V]=ge,k++}r.attributes=B,r.attributesNum=k,r.index=N}function x(){let q=r.newAttributes;for(let C=0,O=q.length;C<O;C++)q[C]=0}function m(q){d(q,0)}function d(q,C){let O=r.newAttributes,N=r.enabledAttributes,B=r.attributeDivisors;O[q]=1,N[q]===0&&(i.enableVertexAttribArray(q),N[q]=1),B[q]!==C&&(i.vertexAttribDivisor(q,C),B[q]=C)}function S(){let q=r.newAttributes,C=r.enabledAttributes;for(let O=0,N=C.length;O<N;O++)C[O]!==q[O]&&(i.disableVertexAttribArray(O),C[O]=0)}function y(q,C,O,N,B,W,k){k===!0?i.vertexAttribIPointer(q,C,O,B,W):i.vertexAttribPointer(q,C,O,N,B,W)}function v(q,C,O,N){x();let B=N.attributes,W=O.getAttributes(),k=C.defaultAttributeValues;for(let ee in W){let V=W[ee];if(V.location>=0){let ae=B[ee];if(ae===void 0&&(ee==="instanceMatrix"&&q.instanceMatrix&&(ae=q.instanceMatrix),ee==="instanceColor"&&q.instanceColor&&(ae=q.instanceColor)),ae!==void 0){let ue=ae.normalized,ge=ae.itemSize,Ue=e.get(ae);if(Ue===void 0)continue;let Ke=Ue.buffer,Y=Ue.type,se=Ue.bytesPerElement,Me=Y===i.INT||Y===i.UNSIGNED_INT||ae.gpuType===yc;if(ae.isInterleavedBufferAttribute){let oe=ae.data,Ce=oe.stride,Ne=ae.offset;if(oe.isInstancedInterleavedBuffer){for(let De=0;De<V.locationSize;De++)d(V.location+De,oe.meshPerAttribute);q.isInstancedMesh!==!0&&N._maxInstanceCount===void 0&&(N._maxInstanceCount=oe.meshPerAttribute*oe.count)}else for(let De=0;De<V.locationSize;De++)m(V.location+De);i.bindBuffer(i.ARRAY_BUFFER,Ke);for(let De=0;De<V.locationSize;De++)y(V.location+De,ge/V.locationSize,Y,ue,Ce*se,(Ne+ge/V.locationSize*De)*se,Me)}else{if(ae.isInstancedBufferAttribute){for(let oe=0;oe<V.locationSize;oe++)d(V.location+oe,ae.meshPerAttribute);q.isInstancedMesh!==!0&&N._maxInstanceCount===void 0&&(N._maxInstanceCount=ae.meshPerAttribute*ae.count)}else for(let oe=0;oe<V.locationSize;oe++)m(V.location+oe);i.bindBuffer(i.ARRAY_BUFFER,Ke);for(let oe=0;oe<V.locationSize;oe++)y(V.location+oe,ge/V.locationSize,Y,ue,ge*se,ge/V.locationSize*oe*se,Me)}}else if(k!==void 0){let ue=k[ee];if(ue!==void 0)switch(ue.length){case 2:i.vertexAttrib2fv(V.location,ue);break;case 3:i.vertexAttrib3fv(V.location,ue);break;case 4:i.vertexAttrib4fv(V.location,ue);break;default:i.vertexAttrib1fv(V.location,ue)}}}}S()}function D(){R();for(let q in n){let C=n[q];for(let O in C){let N=C[O];for(let B in N)h(N[B].object),delete N[B];delete C[O]}delete n[q]}}function T(q){if(n[q.id]===void 0)return;let C=n[q.id];for(let O in C){let N=C[O];for(let B in N)h(N[B].object),delete N[B];delete C[O]}delete n[q.id]}function A(q){for(let C in n){let O=n[C];if(O[q.id]===void 0)continue;let N=O[q.id];for(let B in N)h(N[B].object),delete N[B];delete O[q.id]}}function R(){b(),a=!0,r!==s&&(r=s,c(r.object))}function b(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:R,resetDefaultState:b,dispose:D,releaseStatesOfGeometry:T,releaseStatesOfProgram:A,initAttributes:x,enableAttribute:m,disableUnusedAttributes:S}}function T0(i,e,t){let n;function s(c){n=c}function r(c,h){i.drawArrays(n,c,h),t.update(h,n,1)}function a(c,h,u){u!==0&&(i.drawArraysInstanced(n,c,h,u),t.update(h,n,u))}function o(c,h,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,h,0,u);let p=0;for(let g=0;g<u;g++)p+=h[g];t.update(p,n,1)}function l(c,h,u,f){if(u===0)return;let p=e.get("WEBGL_multi_draw");if(p===null)for(let g=0;g<c.length;g++)a(c[g],h[g],f[g]);else{p.multiDrawArraysInstancedWEBGL(n,c,0,h,0,f,0,u);let g=0;for(let x=0;x<u;x++)g+=h[x]*f[x];t.update(g,n,1)}}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=l}function w0(i,e,t,n){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){let A=e.get("EXT_texture_filter_anisotropic");s=i.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(A){return!(A!==tn&&n.convert(A)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(A){let R=A===At&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(A!==Hn&&n.convert(A)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&A!==Tn&&!R)}function l(A){if(A==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp",h=l(c);h!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let u=t.logarithmicDepthBuffer===!0,f=t.reverseDepthBuffer===!0&&e.has("EXT_clip_control"),p=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),d=i.getParameter(i.MAX_VERTEX_ATTRIBS),S=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),y=i.getParameter(i.MAX_VARYING_VECTORS),v=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),D=g>0,T=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:u,reverseDepthBuffer:f,maxTextures:p,maxVertexTextures:g,maxTextureSize:x,maxCubemapSize:m,maxAttributes:d,maxVertexUniforms:S,maxVaryings:y,maxFragmentUniforms:v,vertexTextures:D,maxSamples:T}}function A0(i){let e=this,t=null,n=0,s=!1,r=!1,a=new _n,o=new ze,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,f){let p=u.length!==0||f||n!==0||s;return s=f,n=u.length,p},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,f){t=h(u,f,0)},this.setState=function(u,f,p){let g=u.clippingPlanes,x=u.clipIntersection,m=u.clipShadows,d=i.get(u);if(!s||g===null||g.length===0||r&&!m)r?h(null):c();else{let S=r?0:n,y=S*4,v=d.clippingState||null;l.value=v,v=h(g,f,y,p);for(let D=0;D!==y;++D)v[D]=t[D];d.clippingState=v,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=S}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(u,f,p,g){let x=u!==null?u.length:0,m=null;if(x!==0){if(m=l.value,g!==!0||m===null){let d=p+x*4,S=f.matrixWorldInverse;o.getNormalMatrix(S),(m===null||m.length<d)&&(m=new Float32Array(d));for(let y=0,v=p;y!==x;++y,v+=4)a.copy(u[y]).applyMatrix4(S,o),a.normal.toArray(m,v),m[v+3]=a.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=x,e.numIntersection=0,m}}function C0(i){let e=new WeakMap;function t(a,o){return o===nr?a.mapping=gs:o===nl&&(a.mapping=xs),a}function n(a){if(a&&a.isTexture){let o=a.mapping;if(o===nr||o===nl)if(e.has(a)){let l=e.get(a).texture;return t(l,a.mapping)}else{let l=a.image;if(l&&l.height>0){let c=new Ul(l.height);return c.fromEquirectangularTexture(i,a),e.set(a,c),a.addEventListener("dispose",s),t(c.texture,a.mapping)}else return null}}return a}function s(a){let o=a.target;o.removeEventListener("dispose",s);let l=e.get(o);l!==void 0&&(e.delete(o),l.dispose())}function r(){e=new WeakMap}return{get:n,dispose:r}}var oi=class extends va{constructor(e=-1,t=1,n=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-e,a=n+e,o=s+t,l=s-t;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,a=r+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},os=4,Hh=[.125,.215,.35,.446,.526,.582],bi=20,Oo=new oi,kh=new Re,Fo=null,Bo=0,zo=0,Ho=!1,qi=(1+Math.sqrt(5))/2,ss=1/qi,Vh=[new P(-qi,ss,0),new P(qi,ss,0),new P(-ss,0,qi),new P(ss,0,qi),new P(0,qi,-ss),new P(0,qi,ss),new P(-1,1,-1),new P(1,1,-1),new P(-1,1,1),new P(1,1,1)],Ss=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,s=100){Fo=this._renderer.getRenderTarget(),Bo=this._renderer.getActiveCubeFace(),zo=this._renderer.getActiveMipmapLevel(),Ho=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);let r=this._allocateTargets();return r.depthBuffer=!0,this._sceneToCubeUV(e,n,s,r),t>0&&this._blur(r,0,0,t),this._applyPMREM(r),this._cleanup(r),r}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Xh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Wh(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(Fo,Bo,zo),this._renderer.xr.enabled=Ho,e.scissorTest=!1,Qr(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===gs||e.mapping===xs?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Fo=this._renderer.getRenderTarget(),Bo=this._renderer.getActiveCubeFace(),zo=this._renderer.getActiveMipmapLevel(),Ho=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Vt,minFilter:Vt,generateMipmaps:!1,type:At,format:tn,colorSpace:ci,depthBuffer:!1},s=Gh(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Gh(e,t,n);let{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=R0(r)),this._blurMaterial=P0(r,e,t)}return s}_compileMaterial(e){let t=new xt(this._lodPlanes[0],e);this._renderer.compile(t,Oo)}_sceneToCubeUV(e,t,n,s){let o=new Bt(90,1,t,n),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],h=this._renderer,u=h.autoClear,f=h.toneMapping;h.getClearColor(kh),h.toneMapping=ri,h.autoClear=!1;let p=new An({name:"PMREM.Background",side:zt,depthWrite:!1,depthTest:!1}),g=new xt(new Ri,p),x=!1,m=e.background;m?m.isColor&&(p.color.copy(m),e.background=null,x=!0):(p.color.copy(kh),x=!0);for(let d=0;d<6;d++){let S=d%3;S===0?(o.up.set(0,l[d],0),o.lookAt(c[d],0,0)):S===1?(o.up.set(0,0,l[d]),o.lookAt(0,c[d],0)):(o.up.set(0,l[d],0),o.lookAt(0,0,c[d]));let y=this._cubeSize;Qr(s,S*y,d>2?y:0,y,y),h.setRenderTarget(s),x&&h.render(g,o),h.render(e,o)}g.geometry.dispose(),g.material.dispose(),h.toneMapping=f,h.autoClear=u,e.background=m}_textureToCubeUV(e,t){let n=this._renderer,s=e.mapping===gs||e.mapping===xs;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Xh()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Wh());let r=s?this._cubemapMaterial:this._equirectMaterial,a=new xt(this._lodPlanes[0],r),o=r.uniforms;o.envMap.value=e;let l=this._cubeSize;Qr(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(a,Oo)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let s=this._lodPlanes.length;for(let r=1;r<s;r++){let a=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),o=Vh[(s-r-1)%Vh.length];this._blur(e,r-1,r,a,o)}t.autoClear=n}_blur(e,t,n,s,r){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,s,"latitudinal",r),this._halfBlur(a,e,n,n,s,"longitudinal",r)}_halfBlur(e,t,n,s,r,a,o){let l=this._renderer,c=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");let h=3,u=new xt(this._lodPlanes[s],c),f=c.uniforms,p=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*p):2*Math.PI/(2*bi-1),x=r/g,m=isFinite(r)?1+Math.floor(h*x):bi;m>bi&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${bi}`);let d=[],S=0;for(let A=0;A<bi;++A){let R=A/x,b=Math.exp(-R*R/2);d.push(b),A===0?S+=b:A<m&&(S+=2*b)}for(let A=0;A<d.length;A++)d[A]=d[A]/S;f.envMap.value=e.texture,f.samples.value=m,f.weights.value=d,f.latitudinal.value=a==="latitudinal",o&&(f.poleAxis.value=o);let{_lodMax:y}=this;f.dTheta.value=g,f.mipInt.value=y-n;let v=this._sizeLods[s],D=3*v*(s>y-os?s-y+os:0),T=4*(this._cubeSize-v);Qr(t,D,T,3*v,2*v),l.setRenderTarget(t),l.render(u,Oo)}};function R0(i){let e=[],t=[],n=[],s=i,r=i-os+1+Hh.length;for(let a=0;a<r;a++){let o=Math.pow(2,s);t.push(o);let l=1/o;a>i-os?l=Hh[a-i+os-1]:a===0&&(l=0),n.push(l);let c=1/(o-2),h=-c,u=1+c,f=[h,h,u,h,u,u,h,h,u,u,h,u],p=6,g=6,x=3,m=2,d=1,S=new Float32Array(x*g*p),y=new Float32Array(m*g*p),v=new Float32Array(d*g*p);for(let T=0;T<p;T++){let A=T%3*2/3-1,R=T>2?0:-1,b=[A,R,0,A+2/3,R,0,A+2/3,R+1,0,A,R,0,A+2/3,R+1,0,A,R+1,0];S.set(b,x*g*T),y.set(f,m*g*T);let q=[T,T,T,T,T,T];v.set(q,d*g*T)}let D=new Rt;D.setAttribute("position",new nn(S,x)),D.setAttribute("uv",new nn(y,m)),D.setAttribute("faceIndex",new nn(v,d)),e.push(D),s>os&&s--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function Gh(i,e,t){let n=new pt(i,e,t);return n.texture.mapping=ka,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Qr(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}function P0(i,e,t){let n=new Float32Array(bi),s=new P(0,1,0);return new nt({name:"SphericalGaussianBlur",defines:{n:bi,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Cc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:on,depthTest:!1,depthWrite:!1})}function Wh(){return new nt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Cc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:on,depthTest:!1,depthWrite:!1})}function Xh(){return new nt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Cc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:on,depthTest:!1,depthWrite:!1})}function Cc(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function I0(i){let e=new WeakMap,t=null;function n(o){if(o&&o.isTexture){let l=o.mapping,c=l===nr||l===nl,h=l===gs||l===xs;if(c||h){let u=e.get(o),f=u!==void 0?u.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==f)return t===null&&(t=new Ss(i)),u=c?t.fromEquirectangular(o,u):t.fromCubemap(o,u),u.texture.pmremVersion=o.pmremVersion,e.set(o,u),u.texture;if(u!==void 0)return u.texture;{let p=o.image;return c&&p&&p.height>0||h&&p&&s(p)?(t===null&&(t=new Ss(i)),u=c?t.fromEquirectangular(o):t.fromCubemap(o),u.texture.pmremVersion=o.pmremVersion,e.set(o,u),o.addEventListener("dispose",r),u.texture):null}}}return o}function s(o){let l=0,c=6;for(let h=0;h<c;h++)o[h]!==void 0&&l++;return l===c}function r(o){let l=o.target;l.removeEventListener("dispose",r);let c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:a}}function D0(i){let e={};function t(n){if(e[n]!==void 0)return e[n];let s;switch(n){case"WEBGL_depth_texture":s=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=i.getExtension(n)}return e[n]=s,s}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){let s=t(n);return s===null&&js("THREE.WebGLRenderer: "+n+" extension not supported."),s}}}function L0(i,e,t,n){let s={},r=new WeakMap;function a(u){let f=u.target;f.index!==null&&e.remove(f.index);for(let g in f.attributes)e.remove(f.attributes[g]);for(let g in f.morphAttributes){let x=f.morphAttributes[g];for(let m=0,d=x.length;m<d;m++)e.remove(x[m])}f.removeEventListener("dispose",a),delete s[f.id];let p=r.get(f);p&&(e.remove(p),r.delete(f)),n.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,t.memory.geometries--}function o(u,f){return s[f.id]===!0||(f.addEventListener("dispose",a),s[f.id]=!0,t.memory.geometries++),f}function l(u){let f=u.attributes;for(let g in f)e.update(f[g],i.ARRAY_BUFFER);let p=u.morphAttributes;for(let g in p){let x=p[g];for(let m=0,d=x.length;m<d;m++)e.update(x[m],i.ARRAY_BUFFER)}}function c(u){let f=[],p=u.index,g=u.attributes.position,x=0;if(p!==null){let S=p.array;x=p.version;for(let y=0,v=S.length;y<v;y+=3){let D=S[y+0],T=S[y+1],A=S[y+2];f.push(D,T,T,A,A,D)}}else if(g!==void 0){let S=g.array;x=g.version;for(let y=0,v=S.length/3-1;y<v;y+=3){let D=y+0,T=y+1,A=y+2;f.push(D,T,T,A,A,D)}}else return;let m=new(Lu(f)?xa:ga)(f,1);m.version=x;let d=r.get(u);d&&e.remove(d),r.set(u,m)}function h(u){let f=r.get(u);if(f){let p=u.index;p!==null&&f.version<p.version&&c(u)}else c(u);return r.get(u)}return{get:o,update:l,getWireframeAttribute:h}}function U0(i,e,t){let n;function s(f){n=f}let r,a;function o(f){r=f.type,a=f.bytesPerElement}function l(f,p){i.drawElements(n,p,r,f*a),t.update(p,n,1)}function c(f,p,g){g!==0&&(i.drawElementsInstanced(n,p,r,f*a,g),t.update(p,n,g))}function h(f,p,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,p,0,r,f,0,g);let m=0;for(let d=0;d<g;d++)m+=p[d];t.update(m,n,1)}function u(f,p,g,x){if(g===0)return;let m=e.get("WEBGL_multi_draw");if(m===null)for(let d=0;d<f.length;d++)c(f[d]/a,p[d],x[d]);else{m.multiDrawElementsInstancedWEBGL(n,p,0,r,f,0,x,0,g);let d=0;for(let S=0;S<g;S++)d+=p[S]*x[S];t.update(d,n,1)}}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function N0(i){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(t.calls++,a){case i.TRIANGLES:t.triangles+=o*(r/3);break;case i.LINES:t.lines+=o*(r/2);break;case i.LINE_STRIP:t.lines+=o*(r-1);break;case i.LINE_LOOP:t.lines+=o*r;break;case i.POINTS:t.points+=o*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}function O0(i,e,t){let n=new WeakMap,s=new gt;function r(a,o,l){let c=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=h!==void 0?h.length:0,f=n.get(o);if(f===void 0||f.count!==u){let b=function(){A.dispose(),n.delete(o),o.removeEventListener("dispose",b)};f!==void 0&&f.texture.dispose();let p=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,x=o.morphAttributes.color!==void 0,m=o.morphAttributes.position||[],d=o.morphAttributes.normal||[],S=o.morphAttributes.color||[],y=0;p===!0&&(y=1),g===!0&&(y=2),x===!0&&(y=3);let v=o.attributes.position.count*y,D=1;v>e.maxTextureSize&&(D=Math.ceil(v/e.maxTextureSize),v=e.maxTextureSize);let T=new Float32Array(v*D*4*u),A=new pa(T,v,D,u);A.type=Tn,A.needsUpdate=!0;let R=y*4;for(let q=0;q<u;q++){let C=m[q],O=d[q],N=S[q],B=v*D*4*q;for(let W=0;W<C.count;W++){let k=W*R;p===!0&&(s.fromBufferAttribute(C,W),T[B+k+0]=s.x,T[B+k+1]=s.y,T[B+k+2]=s.z,T[B+k+3]=0),g===!0&&(s.fromBufferAttribute(O,W),T[B+k+4]=s.x,T[B+k+5]=s.y,T[B+k+6]=s.z,T[B+k+7]=0),x===!0&&(s.fromBufferAttribute(N,W),T[B+k+8]=s.x,T[B+k+9]=s.y,T[B+k+10]=s.z,T[B+k+11]=N.itemSize===4?s.w:1)}}f={count:u,texture:A,size:new K(v,D)},n.set(o,f),o.addEventListener("dispose",b)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",a.morphTexture,t);else{let p=0;for(let x=0;x<c.length;x++)p+=c[x];let g=o.morphTargetsRelative?1:1-p;l.getUniforms().setValue(i,"morphTargetBaseInfluence",g),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",f.texture,t),l.getUniforms().setValue(i,"morphTargetsTextureSize",f.size)}return{update:r}}function F0(i,e,t,n){let s=new WeakMap;function r(l){let c=n.render.frame,h=l.geometry,u=e.get(l,h);if(s.get(u)!==c&&(e.update(u),s.set(u,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",o)===!1&&l.addEventListener("dispose",o),s.get(l)!==c&&(t.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,i.ARRAY_BUFFER),s.set(l,c))),l.isSkinnedMesh){let f=l.skeleton;s.get(f)!==c&&(f.update(),s.set(f,c))}return u}function a(){s=new WeakMap}function o(l){let c=l.target;c.removeEventListener("dispose",o),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:r,dispose:a}}var ya=class extends wt{constructor(e,t,n,s,r,a,o,l,c,h=hs){if(h!==hs&&h!==ys)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&h===hs&&(n=wi),n===void 0&&h===ys&&(n=_s),super(null,s,r,a,o,l,h,n,c),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=o!==void 0?o:qt,this.minFilter=l!==void 0?l:qt,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},Bu=new wt,Yh=new ya(1,1),zu=new pa,Hu=new Dl,ku=new _a,Zh=[],jh=[],Kh=new Float32Array(16),Jh=new Float32Array(9),Qh=new Float32Array(4);function As(i,e,t){let n=i[0];if(n<=0||n>0)return i;let s=e*t,r=Zh[s];if(r===void 0&&(r=new Float32Array(s),Zh[s]=r),e!==0){n.toArray(r,0);for(let a=1,o=0;a!==e;++a)o+=t,i[a].toArray(r,o)}return r}function St(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function bt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Ga(i,e){let t=jh[e];t===void 0&&(t=new Int32Array(e),jh[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function B0(i,e){let t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function z0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(St(t,e))return;i.uniform2fv(this.addr,e),bt(t,e)}}function H0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(St(t,e))return;i.uniform3fv(this.addr,e),bt(t,e)}}function k0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(St(t,e))return;i.uniform4fv(this.addr,e),bt(t,e)}}function V0(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(St(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),bt(t,e)}else{if(St(t,n))return;Qh.set(n),i.uniformMatrix2fv(this.addr,!1,Qh),bt(t,n)}}function G0(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(St(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),bt(t,e)}else{if(St(t,n))return;Jh.set(n),i.uniformMatrix3fv(this.addr,!1,Jh),bt(t,n)}}function W0(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(St(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),bt(t,e)}else{if(St(t,n))return;Kh.set(n),i.uniformMatrix4fv(this.addr,!1,Kh),bt(t,n)}}function X0(i,e){let t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function Y0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(St(t,e))return;i.uniform2iv(this.addr,e),bt(t,e)}}function Z0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(St(t,e))return;i.uniform3iv(this.addr,e),bt(t,e)}}function j0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(St(t,e))return;i.uniform4iv(this.addr,e),bt(t,e)}}function K0(i,e){let t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function J0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(St(t,e))return;i.uniform2uiv(this.addr,e),bt(t,e)}}function Q0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(St(t,e))return;i.uniform3uiv(this.addr,e),bt(t,e)}}function $0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(St(t,e))return;i.uniform4uiv(this.addr,e),bt(t,e)}}function em(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(Yh.compareFunction=Du,r=Yh):r=Bu,t.setTexture2D(e||r,s)}function tm(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||Hu,s)}function nm(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||ku,s)}function im(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||zu,s)}function sm(i){switch(i){case 5126:return B0;case 35664:return z0;case 35665:return H0;case 35666:return k0;case 35674:return V0;case 35675:return G0;case 35676:return W0;case 5124:case 35670:return X0;case 35667:case 35671:return Y0;case 35668:case 35672:return Z0;case 35669:case 35673:return j0;case 5125:return K0;case 36294:return J0;case 36295:return Q0;case 36296:return $0;case 35678:case 36198:case 36298:case 36306:case 35682:return em;case 35679:case 36299:case 36307:return tm;case 35680:case 36300:case 36308:case 36293:return nm;case 36289:case 36303:case 36311:case 36292:return im}}function rm(i,e){i.uniform1fv(this.addr,e)}function am(i,e){let t=As(e,this.size,2);i.uniform2fv(this.addr,t)}function om(i,e){let t=As(e,this.size,3);i.uniform3fv(this.addr,t)}function lm(i,e){let t=As(e,this.size,4);i.uniform4fv(this.addr,t)}function cm(i,e){let t=As(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function hm(i,e){let t=As(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function um(i,e){let t=As(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function dm(i,e){i.uniform1iv(this.addr,e)}function fm(i,e){i.uniform2iv(this.addr,e)}function pm(i,e){i.uniform3iv(this.addr,e)}function mm(i,e){i.uniform4iv(this.addr,e)}function gm(i,e){i.uniform1uiv(this.addr,e)}function xm(i,e){i.uniform2uiv(this.addr,e)}function vm(i,e){i.uniform3uiv(this.addr,e)}function _m(i,e){i.uniform4uiv(this.addr,e)}function ym(i,e,t){let n=this.cache,s=e.length,r=Ga(t,s);St(n,r)||(i.uniform1iv(this.addr,r),bt(n,r));for(let a=0;a!==s;++a)t.setTexture2D(e[a]||Bu,r[a])}function qm(i,e,t){let n=this.cache,s=e.length,r=Ga(t,s);St(n,r)||(i.uniform1iv(this.addr,r),bt(n,r));for(let a=0;a!==s;++a)t.setTexture3D(e[a]||Hu,r[a])}function Mm(i,e,t){let n=this.cache,s=e.length,r=Ga(t,s);St(n,r)||(i.uniform1iv(this.addr,r),bt(n,r));for(let a=0;a!==s;++a)t.setTextureCube(e[a]||ku,r[a])}function Sm(i,e,t){let n=this.cache,s=e.length,r=Ga(t,s);St(n,r)||(i.uniform1iv(this.addr,r),bt(n,r));for(let a=0;a!==s;++a)t.setTexture2DArray(e[a]||zu,r[a])}function bm(i){switch(i){case 5126:return rm;case 35664:return am;case 35665:return om;case 35666:return lm;case 35674:return cm;case 35675:return hm;case 35676:return um;case 5124:case 35670:return dm;case 35667:case 35671:return fm;case 35668:case 35672:return pm;case 35669:case 35673:return mm;case 5125:return gm;case 36294:return xm;case 36295:return vm;case 36296:return _m;case 35678:case 36198:case 36298:case 36306:case 35682:return ym;case 35679:case 36299:case 36307:return qm;case 35680:case 36300:case 36308:case 36293:return Mm;case 36289:case 36303:case 36311:case 36292:return Sm}}var Nl=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=sm(t.type)}},Ol=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=bm(t.type)}},Fl=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let s=this.seq;for(let r=0,a=s.length;r!==a;++r){let o=s[r];o.setValue(e,t[o.id],n)}}},ko=/(\w+)(\])?(\[|\.)?/g;function $h(i,e){i.seq.push(e),i.map[e.id]=e}function Em(i,e,t){let n=i.name,s=n.length;for(ko.lastIndex=0;;){let r=ko.exec(n),a=ko.lastIndex,o=r[1],l=r[2]==="]",c=r[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===s){$h(t,c===void 0?new Nl(o,i,e):new Ol(o,i,e));break}else{let u=t.map[o];u===void 0&&(u=new Fl(o),$h(t,u)),t=u}}}var ds=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<n;++s){let r=e.getActiveUniform(t,s),a=e.getUniformLocation(t,r.name);Em(r,a,this)}}setValue(e,t,n,s){let r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){let s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,a=t.length;r!==a;++r){let o=t[r],l=n[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,s)}}static seqWithValue(e,t){let n=[];for(let s=0,r=e.length;s!==r;++s){let a=e[s];a.id in t&&n.push(a)}return n}};function eu(i,e,t){let n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}var Tm=37297,wm=0;function Am(i,e){let t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let a=s;a<r;a++){let o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}var tu=new ze;function Cm(i){Ge._getMatrix(tu,Ge.workingColorSpace,i);let e=`mat3( ${tu.elements.map(t=>t.toFixed(4))} )`;switch(Ge.getTransfer(i)){case Va:return[e,"LinearTransferOETF"];case et:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function nu(i,e,t){let n=i.getShaderParameter(e,i.COMPILE_STATUS),s=i.getShaderInfoLog(e).trim();if(n&&s==="")return"";let r=/ERROR: 0:(\d+)/.exec(s);if(r){let a=parseInt(r[1]);return t.toUpperCase()+`

`+s+`

`+Am(i.getShaderSource(e),a)}else return s}function Rm(i,e){let t=Cm(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function Pm(i,e){let t;switch(e){case mc:t="Linear";break;case gc:t="Reinhard";break;case xc:t="Cineon";break;case vc:t="ACESFilmic";break;case _c:t="AgX";break;case xr:t="Neutral";break;case Wd:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}var $r=new P;function Im(){Ge.getLuminanceCoefficients($r);let i=$r.x.toFixed(4),e=$r.y.toFixed(4),t=$r.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Dm(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ks).join(`
`)}function Lm(i){let e=[];for(let t in i){let n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function Um(i,e){let t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(e,s),a=r.name,o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),t[a]={type:r.type,location:i.getAttribLocation(e,a),locationSize:o}}return t}function Ks(i){return i!==""}function iu(i,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function su(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var Nm=/^[ \t]*#include +<([\w\d./]+)>/gm;function Bl(i){return i.replace(Nm,Fm)}var Om=new Map;function Fm(i,e){let t=ke[e];if(t===void 0){let n=Om.get(e);if(n!==void 0)t=ke[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return Bl(t)}var Bm=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ru(i){return i.replace(Bm,zm)}function zm(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function au(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function Hm(i){let e="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===yu?e="SHADOWMAP_TYPE_PCF":i.shadowMapType===bd?e="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===vn&&(e="SHADOWMAP_TYPE_VSM"),e}function km(i){let e="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case gs:case xs:e="ENVMAP_TYPE_CUBE";break;case ka:e="ENVMAP_TYPE_CUBE_UV";break}return e}function Vm(i){let e="ENVMAP_MODE_REFLECTION";if(i.envMap)switch(i.envMapMode){case xs:e="ENVMAP_MODE_REFRACTION";break}return e}function Gm(i){let e="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case qu:e="ENVMAP_BLENDING_MULTIPLY";break;case Vd:e="ENVMAP_BLENDING_MIX";break;case Gd:e="ENVMAP_BLENDING_ADD";break}return e}function Wm(i){let e=i.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:n,maxMip:t}}function Xm(i,e,t,n){let s=i.getContext(),r=t.defines,a=t.vertexShader,o=t.fragmentShader,l=Hm(t),c=km(t),h=Vm(t),u=Gm(t),f=Wm(t),p=Dm(t),g=Lm(r),x=s.createProgram(),m,d,S=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Ks).join(`
`),m.length>0&&(m+=`
`),d=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Ks).join(`
`),d.length>0&&(d+=`
`)):(m=[au(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ks).join(`
`),d=[au(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==ri?"#define TONE_MAPPING":"",t.toneMapping!==ri?ke.tonemapping_pars_fragment:"",t.toneMapping!==ri?Pm("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",ke.colorspace_pars_fragment,Rm("linearToOutputTexel",t.outputColorSpace),Im(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Ks).join(`
`)),a=Bl(a),a=iu(a,t),a=su(a,t),o=Bl(o),o=iu(o,t),o=su(o,t),a=ru(a),o=ru(o),t.isRawShaderMaterial!==!0&&(S=`#version 300 es
`,m=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,d=["#define varying in",t.glslVersion===_h?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===_h?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+d);let y=S+m+a,v=S+d+o,D=eu(s,s.VERTEX_SHADER,y),T=eu(s,s.FRAGMENT_SHADER,v);s.attachShader(x,D),s.attachShader(x,T),t.index0AttributeName!==void 0?s.bindAttribLocation(x,0,t.index0AttributeName):t.morphTargets===!0&&s.bindAttribLocation(x,0,"position"),s.linkProgram(x);function A(C){if(i.debug.checkShaderErrors){let O=s.getProgramInfoLog(x).trim(),N=s.getShaderInfoLog(D).trim(),B=s.getShaderInfoLog(T).trim(),W=!0,k=!0;if(s.getProgramParameter(x,s.LINK_STATUS)===!1)if(W=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,x,D,T);else{let ee=nu(s,D,"vertex"),V=nu(s,T,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(x,s.VALIDATE_STATUS)+`

Material Name: `+C.name+`
Material Type: `+C.type+`

Program Info Log: `+O+`
`+ee+`
`+V)}else O!==""?console.warn("THREE.WebGLProgram: Program Info Log:",O):(N===""||B==="")&&(k=!1);k&&(C.diagnostics={runnable:W,programLog:O,vertexShader:{log:N,prefix:m},fragmentShader:{log:B,prefix:d}})}s.deleteShader(D),s.deleteShader(T),R=new ds(s,x),b=Um(s,x)}let R;this.getUniforms=function(){return R===void 0&&A(this),R};let b;this.getAttributes=function(){return b===void 0&&A(this),b};let q=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return q===!1&&(q=s.getProgramParameter(x,Tm)),q},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(x),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=wm++,this.cacheKey=e,this.usedTimes=1,this.program=x,this.vertexShader=D,this.fragmentShader=T,this}var Ym=0,zl=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){let t=e.vertexShader,n=e.fragmentShader,s=this._getShaderStage(t),r=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(s)===!1&&(a.add(s),s.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Hl(e),t.set(e,n)),n}},Hl=class{constructor(e){this.id=Ym++,this.code=e,this.usedTimes=0}};function Zm(i,e,t,n,s,r,a){let o=new ma,l=new zl,c=new Set,h=[],u=s.logarithmicDepthBuffer,f=s.vertexTextures,p=s.precision,g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(b){return c.add(b),b===0?"uv":`uv${b}`}function m(b,q,C,O,N){let B=O.fog,W=N.geometry,k=b.isMeshStandardMaterial?O.environment:null,ee=(b.isMeshStandardMaterial?t:e).get(b.envMap||k),V=ee&&ee.mapping===ka?ee.image.height:null,ae=g[b.type];b.precision!==null&&(p=s.getMaxPrecision(b.precision),p!==b.precision&&console.warn("THREE.WebGLProgram.getParameters:",b.precision,"not supported, using",p,"instead."));let ue=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,ge=ue!==void 0?ue.length:0,Ue=0;W.morphAttributes.position!==void 0&&(Ue=1),W.morphAttributes.normal!==void 0&&(Ue=2),W.morphAttributes.color!==void 0&&(Ue=3);let Ke,Y,se,Me;if(ae){let tt=En[ae];Ke=tt.vertexShader,Y=tt.fragmentShader}else Ke=b.vertexShader,Y=b.fragmentShader,l.update(b),se=l.getVertexShaderID(b),Me=l.getFragmentShaderID(b);let oe=i.getRenderTarget(),Ce=i.state.buffers.depth.getReversed(),Ne=N.isInstancedMesh===!0,De=N.isBatchedMesh===!0,Ye=!!b.map,Q=!!b.matcap,ie=!!ee,w=!!b.aoMap,we=!!b.lightMap,te=!!b.bumpMap,_e=!!b.normalMap,le=!!b.displacementMap,Pe=!!b.emissiveMap,xe=!!b.metalnessMap,E=!!b.roughnessMap,_=b.anisotropy>0,F=b.clearcoat>0,Z=b.dispersion>0,$=b.iridescence>0,j=b.sheen>0,Se=b.transmission>0,he=_&&!!b.anisotropyMap,ve=F&&!!b.clearcoatMap,Ve=F&&!!b.clearcoatNormalMap,ne=F&&!!b.clearcoatRoughnessMap,ye=$&&!!b.iridescenceMap,Ie=$&&!!b.iridescenceThicknessMap,Le=j&&!!b.sheenColorMap,qe=j&&!!b.sheenRoughnessMap,Xe=!!b.specularMap,He=!!b.specularColorMap,ot=!!b.specularIntensityMap,I=Se&&!!b.transmissionMap,de=Se&&!!b.thicknessMap,G=!!b.gradientMap,J=!!b.alphaMap,me=b.alphaTest>0,fe=!!b.alphaHash,Fe=!!b.extensions,mt=ri;b.toneMapped&&(oe===null||oe.isXRRenderTarget===!0)&&(mt=i.toneMapping);let Ut={shaderID:ae,shaderType:b.type,shaderName:b.name,vertexShader:Ke,fragmentShader:Y,defines:b.defines,customVertexShaderID:se,customFragmentShaderID:Me,isRawShaderMaterial:b.isRawShaderMaterial===!0,glslVersion:b.glslVersion,precision:p,batching:De,batchingColor:De&&N._colorsTexture!==null,instancing:Ne,instancingColor:Ne&&N.instanceColor!==null,instancingMorph:Ne&&N.morphTexture!==null,supportsVertexTextures:f,outputColorSpace:oe===null?i.outputColorSpace:oe.isXRRenderTarget===!0?oe.texture.colorSpace:ci,alphaToCoverage:!!b.alphaToCoverage,map:Ye,matcap:Q,envMap:ie,envMapMode:ie&&ee.mapping,envMapCubeUVHeight:V,aoMap:w,lightMap:we,bumpMap:te,normalMap:_e,displacementMap:f&&le,emissiveMap:Pe,normalMapObjectSpace:_e&&b.normalMapType===Zd,normalMapTangentSpace:_e&&b.normalMapType===Iu,metalnessMap:xe,roughnessMap:E,anisotropy:_,anisotropyMap:he,clearcoat:F,clearcoatMap:ve,clearcoatNormalMap:Ve,clearcoatRoughnessMap:ne,dispersion:Z,iridescence:$,iridescenceMap:ye,iridescenceThicknessMap:Ie,sheen:j,sheenColorMap:Le,sheenRoughnessMap:qe,specularMap:Xe,specularColorMap:He,specularIntensityMap:ot,transmission:Se,transmissionMap:I,thicknessMap:de,gradientMap:G,opaque:b.transparent===!1&&b.blending===cs&&b.alphaToCoverage===!1,alphaMap:J,alphaTest:me,alphaHash:fe,combine:b.combine,mapUv:Ye&&x(b.map.channel),aoMapUv:w&&x(b.aoMap.channel),lightMapUv:we&&x(b.lightMap.channel),bumpMapUv:te&&x(b.bumpMap.channel),normalMapUv:_e&&x(b.normalMap.channel),displacementMapUv:le&&x(b.displacementMap.channel),emissiveMapUv:Pe&&x(b.emissiveMap.channel),metalnessMapUv:xe&&x(b.metalnessMap.channel),roughnessMapUv:E&&x(b.roughnessMap.channel),anisotropyMapUv:he&&x(b.anisotropyMap.channel),clearcoatMapUv:ve&&x(b.clearcoatMap.channel),clearcoatNormalMapUv:Ve&&x(b.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ne&&x(b.clearcoatRoughnessMap.channel),iridescenceMapUv:ye&&x(b.iridescenceMap.channel),iridescenceThicknessMapUv:Ie&&x(b.iridescenceThicknessMap.channel),sheenColorMapUv:Le&&x(b.sheenColorMap.channel),sheenRoughnessMapUv:qe&&x(b.sheenRoughnessMap.channel),specularMapUv:Xe&&x(b.specularMap.channel),specularColorMapUv:He&&x(b.specularColorMap.channel),specularIntensityMapUv:ot&&x(b.specularIntensityMap.channel),transmissionMapUv:I&&x(b.transmissionMap.channel),thicknessMapUv:de&&x(b.thicknessMap.channel),alphaMapUv:J&&x(b.alphaMap.channel),vertexTangents:!!W.attributes.tangent&&(_e||_),vertexColors:b.vertexColors,vertexAlphas:b.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,pointsUvs:N.isPoints===!0&&!!W.attributes.uv&&(Ye||J),fog:!!B,useFog:b.fog===!0,fogExp2:!!B&&B.isFogExp2,flatShading:b.flatShading===!0,sizeAttenuation:b.sizeAttenuation===!0,logarithmicDepthBuffer:u,reverseDepthBuffer:Ce,skinning:N.isSkinnedMesh===!0,morphTargets:W.morphAttributes.position!==void 0,morphNormals:W.morphAttributes.normal!==void 0,morphColors:W.morphAttributes.color!==void 0,morphTargetsCount:ge,morphTextureStride:Ue,numDirLights:q.directional.length,numPointLights:q.point.length,numSpotLights:q.spot.length,numSpotLightMaps:q.spotLightMap.length,numRectAreaLights:q.rectArea.length,numHemiLights:q.hemi.length,numDirLightShadows:q.directionalShadowMap.length,numPointLightShadows:q.pointShadowMap.length,numSpotLightShadows:q.spotShadowMap.length,numSpotLightShadowsWithMaps:q.numSpotLightShadowsWithMaps,numLightProbes:q.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:b.dithering,shadowMapEnabled:i.shadowMap.enabled&&C.length>0,shadowMapType:i.shadowMap.type,toneMapping:mt,decodeVideoTexture:Ye&&b.map.isVideoTexture===!0&&Ge.getTransfer(b.map.colorSpace)===et,decodeVideoTextureEmissive:Pe&&b.emissiveMap.isVideoTexture===!0&&Ge.getTransfer(b.emissiveMap.colorSpace)===et,premultipliedAlpha:b.premultipliedAlpha,doubleSided:b.side===Xt,flipSided:b.side===zt,useDepthPacking:b.depthPacking>=0,depthPacking:b.depthPacking||0,index0AttributeName:b.index0AttributeName,extensionClipCullDistance:Fe&&b.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Fe&&b.extensions.multiDraw===!0||De)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:b.customProgramCacheKey()};return Ut.vertexUv1s=c.has(1),Ut.vertexUv2s=c.has(2),Ut.vertexUv3s=c.has(3),c.clear(),Ut}function d(b){let q=[];if(b.shaderID?q.push(b.shaderID):(q.push(b.customVertexShaderID),q.push(b.customFragmentShaderID)),b.defines!==void 0)for(let C in b.defines)q.push(C),q.push(b.defines[C]);return b.isRawShaderMaterial===!1&&(S(q,b),y(q,b),q.push(i.outputColorSpace)),q.push(b.customProgramCacheKey),q.join()}function S(b,q){b.push(q.precision),b.push(q.outputColorSpace),b.push(q.envMapMode),b.push(q.envMapCubeUVHeight),b.push(q.mapUv),b.push(q.alphaMapUv),b.push(q.lightMapUv),b.push(q.aoMapUv),b.push(q.bumpMapUv),b.push(q.normalMapUv),b.push(q.displacementMapUv),b.push(q.emissiveMapUv),b.push(q.metalnessMapUv),b.push(q.roughnessMapUv),b.push(q.anisotropyMapUv),b.push(q.clearcoatMapUv),b.push(q.clearcoatNormalMapUv),b.push(q.clearcoatRoughnessMapUv),b.push(q.iridescenceMapUv),b.push(q.iridescenceThicknessMapUv),b.push(q.sheenColorMapUv),b.push(q.sheenRoughnessMapUv),b.push(q.specularMapUv),b.push(q.specularColorMapUv),b.push(q.specularIntensityMapUv),b.push(q.transmissionMapUv),b.push(q.thicknessMapUv),b.push(q.combine),b.push(q.fogExp2),b.push(q.sizeAttenuation),b.push(q.morphTargetsCount),b.push(q.morphAttributeCount),b.push(q.numDirLights),b.push(q.numPointLights),b.push(q.numSpotLights),b.push(q.numSpotLightMaps),b.push(q.numHemiLights),b.push(q.numRectAreaLights),b.push(q.numDirLightShadows),b.push(q.numPointLightShadows),b.push(q.numSpotLightShadows),b.push(q.numSpotLightShadowsWithMaps),b.push(q.numLightProbes),b.push(q.shadowMapType),b.push(q.toneMapping),b.push(q.numClippingPlanes),b.push(q.numClipIntersection),b.push(q.depthPacking)}function y(b,q){o.disableAll(),q.supportsVertexTextures&&o.enable(0),q.instancing&&o.enable(1),q.instancingColor&&o.enable(2),q.instancingMorph&&o.enable(3),q.matcap&&o.enable(4),q.envMap&&o.enable(5),q.normalMapObjectSpace&&o.enable(6),q.normalMapTangentSpace&&o.enable(7),q.clearcoat&&o.enable(8),q.iridescence&&o.enable(9),q.alphaTest&&o.enable(10),q.vertexColors&&o.enable(11),q.vertexAlphas&&o.enable(12),q.vertexUv1s&&o.enable(13),q.vertexUv2s&&o.enable(14),q.vertexUv3s&&o.enable(15),q.vertexTangents&&o.enable(16),q.anisotropy&&o.enable(17),q.alphaHash&&o.enable(18),q.batching&&o.enable(19),q.dispersion&&o.enable(20),q.batchingColor&&o.enable(21),b.push(o.mask),o.disableAll(),q.fog&&o.enable(0),q.useFog&&o.enable(1),q.flatShading&&o.enable(2),q.logarithmicDepthBuffer&&o.enable(3),q.reverseDepthBuffer&&o.enable(4),q.skinning&&o.enable(5),q.morphTargets&&o.enable(6),q.morphNormals&&o.enable(7),q.morphColors&&o.enable(8),q.premultipliedAlpha&&o.enable(9),q.shadowMapEnabled&&o.enable(10),q.doubleSided&&o.enable(11),q.flipSided&&o.enable(12),q.useDepthPacking&&o.enable(13),q.dithering&&o.enable(14),q.transmission&&o.enable(15),q.sheen&&o.enable(16),q.opaque&&o.enable(17),q.pointsUvs&&o.enable(18),q.decodeVideoTexture&&o.enable(19),q.decodeVideoTextureEmissive&&o.enable(20),q.alphaToCoverage&&o.enable(21),b.push(o.mask)}function v(b){let q=g[b.type],C;if(q){let O=En[q];C=Zt.clone(O.uniforms)}else C=b.uniforms;return C}function D(b,q){let C;for(let O=0,N=h.length;O<N;O++){let B=h[O];if(B.cacheKey===q){C=B,++C.usedTimes;break}}return C===void 0&&(C=new Xm(i,q,b,r),h.push(C)),C}function T(b){if(--b.usedTimes===0){let q=h.indexOf(b);h[q]=h[h.length-1],h.pop(),b.destroy()}}function A(b){l.remove(b)}function R(){l.dispose()}return{getParameters:m,getProgramCacheKey:d,getUniforms:v,acquireProgram:D,releaseProgram:T,releaseShaderCache:A,programs:h,dispose:R}}function jm(){let i=new WeakMap;function e(a){return i.has(a)}function t(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function s(a,o,l){i.get(a)[o]=l}function r(){i=new WeakMap}return{has:e,get:t,remove:n,update:s,dispose:r}}function Km(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.z!==e.z?i.z-e.z:i.id-e.id}function ou(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function lu(){let i=[],e=0,t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}function a(u,f,p,g,x,m){let d=i[e];return d===void 0?(d={id:u.id,object:u,geometry:f,material:p,groupOrder:g,renderOrder:u.renderOrder,z:x,group:m},i[e]=d):(d.id=u.id,d.object=u,d.geometry=f,d.material=p,d.groupOrder=g,d.renderOrder=u.renderOrder,d.z=x,d.group=m),e++,d}function o(u,f,p,g,x,m){let d=a(u,f,p,g,x,m);p.transmission>0?n.push(d):p.transparent===!0?s.push(d):t.push(d)}function l(u,f,p,g,x,m){let d=a(u,f,p,g,x,m);p.transmission>0?n.unshift(d):p.transparent===!0?s.unshift(d):t.unshift(d)}function c(u,f){t.length>1&&t.sort(u||Km),n.length>1&&n.sort(f||ou),s.length>1&&s.sort(f||ou)}function h(){for(let u=e,f=i.length;u<f;u++){let p=i[u];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:t,transmissive:n,transparent:s,init:r,push:o,unshift:l,finish:h,sort:c}}function Jm(){let i=new WeakMap;function e(n,s){let r=i.get(n),a;return r===void 0?(a=new lu,i.set(n,[a])):s>=r.length?(a=new lu,r.push(a)):a=r[s],a}function t(){i=new WeakMap}return{get:e,dispose:t}}function Qm(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new P,color:new Re};break;case"SpotLight":t={position:new P,direction:new P,color:new Re,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new P,color:new Re,distance:0,decay:0};break;case"HemisphereLight":t={direction:new P,skyColor:new Re,groundColor:new Re};break;case"RectAreaLight":t={color:new Re,position:new P,halfWidth:new P,halfHeight:new P};break}return i[e.id]=t,t}}}function $m(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new K};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new K};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new K,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}var e2=0;function t2(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function n2(i){let e=new Qm,t=$m(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new P);let s=new P,r=new ut,a=new ut;function o(c){let h=0,u=0,f=0;for(let b=0;b<9;b++)n.probe[b].set(0,0,0);let p=0,g=0,x=0,m=0,d=0,S=0,y=0,v=0,D=0,T=0,A=0;c.sort(t2);for(let b=0,q=c.length;b<q;b++){let C=c[b],O=C.color,N=C.intensity,B=C.distance,W=C.shadow&&C.shadow.map?C.shadow.map.texture:null;if(C.isAmbientLight)h+=O.r*N,u+=O.g*N,f+=O.b*N;else if(C.isLightProbe){for(let k=0;k<9;k++)n.probe[k].addScaledVector(C.sh.coefficients[k],N);A++}else if(C.isDirectionalLight){let k=e.get(C);if(k.color.copy(C.color).multiplyScalar(C.intensity),C.castShadow){let ee=C.shadow,V=t.get(C);V.shadowIntensity=ee.intensity,V.shadowBias=ee.bias,V.shadowNormalBias=ee.normalBias,V.shadowRadius=ee.radius,V.shadowMapSize=ee.mapSize,n.directionalShadow[p]=V,n.directionalShadowMap[p]=W,n.directionalShadowMatrix[p]=C.shadow.matrix,S++}n.directional[p]=k,p++}else if(C.isSpotLight){let k=e.get(C);k.position.setFromMatrixPosition(C.matrixWorld),k.color.copy(O).multiplyScalar(N),k.distance=B,k.coneCos=Math.cos(C.angle),k.penumbraCos=Math.cos(C.angle*(1-C.penumbra)),k.decay=C.decay,n.spot[x]=k;let ee=C.shadow;if(C.map&&(n.spotLightMap[D]=C.map,D++,ee.updateMatrices(C),C.castShadow&&T++),n.spotLightMatrix[x]=ee.matrix,C.castShadow){let V=t.get(C);V.shadowIntensity=ee.intensity,V.shadowBias=ee.bias,V.shadowNormalBias=ee.normalBias,V.shadowRadius=ee.radius,V.shadowMapSize=ee.mapSize,n.spotShadow[x]=V,n.spotShadowMap[x]=W,v++}x++}else if(C.isRectAreaLight){let k=e.get(C);k.color.copy(O).multiplyScalar(N),k.halfWidth.set(C.width*.5,0,0),k.halfHeight.set(0,C.height*.5,0),n.rectArea[m]=k,m++}else if(C.isPointLight){let k=e.get(C);if(k.color.copy(C.color).multiplyScalar(C.intensity),k.distance=C.distance,k.decay=C.decay,C.castShadow){let ee=C.shadow,V=t.get(C);V.shadowIntensity=ee.intensity,V.shadowBias=ee.bias,V.shadowNormalBias=ee.normalBias,V.shadowRadius=ee.radius,V.shadowMapSize=ee.mapSize,V.shadowCameraNear=ee.camera.near,V.shadowCameraFar=ee.camera.far,n.pointShadow[g]=V,n.pointShadowMap[g]=W,n.pointShadowMatrix[g]=C.shadow.matrix,y++}n.point[g]=k,g++}else if(C.isHemisphereLight){let k=e.get(C);k.skyColor.copy(C.color).multiplyScalar(N),k.groundColor.copy(C.groundColor).multiplyScalar(N),n.hemi[d]=k,d++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ce.LTC_FLOAT_1,n.rectAreaLTC2=ce.LTC_FLOAT_2):(n.rectAreaLTC1=ce.LTC_HALF_1,n.rectAreaLTC2=ce.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=f;let R=n.hash;(R.directionalLength!==p||R.pointLength!==g||R.spotLength!==x||R.rectAreaLength!==m||R.hemiLength!==d||R.numDirectionalShadows!==S||R.numPointShadows!==y||R.numSpotShadows!==v||R.numSpotMaps!==D||R.numLightProbes!==A)&&(n.directional.length=p,n.spot.length=x,n.rectArea.length=m,n.point.length=g,n.hemi.length=d,n.directionalShadow.length=S,n.directionalShadowMap.length=S,n.pointShadow.length=y,n.pointShadowMap.length=y,n.spotShadow.length=v,n.spotShadowMap.length=v,n.directionalShadowMatrix.length=S,n.pointShadowMatrix.length=y,n.spotLightMatrix.length=v+D-T,n.spotLightMap.length=D,n.numSpotLightShadowsWithMaps=T,n.numLightProbes=A,R.directionalLength=p,R.pointLength=g,R.spotLength=x,R.rectAreaLength=m,R.hemiLength=d,R.numDirectionalShadows=S,R.numPointShadows=y,R.numSpotShadows=v,R.numSpotMaps=D,R.numLightProbes=A,n.version=e2++)}function l(c,h){let u=0,f=0,p=0,g=0,x=0,m=h.matrixWorldInverse;for(let d=0,S=c.length;d<S;d++){let y=c[d];if(y.isDirectionalLight){let v=n.directional[u];v.direction.setFromMatrixPosition(y.matrixWorld),s.setFromMatrixPosition(y.target.matrixWorld),v.direction.sub(s),v.direction.transformDirection(m),u++}else if(y.isSpotLight){let v=n.spot[p];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(m),v.direction.setFromMatrixPosition(y.matrixWorld),s.setFromMatrixPosition(y.target.matrixWorld),v.direction.sub(s),v.direction.transformDirection(m),p++}else if(y.isRectAreaLight){let v=n.rectArea[g];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(m),a.identity(),r.copy(y.matrixWorld),r.premultiply(m),a.extractRotation(r),v.halfWidth.set(y.width*.5,0,0),v.halfHeight.set(0,y.height*.5,0),v.halfWidth.applyMatrix4(a),v.halfHeight.applyMatrix4(a),g++}else if(y.isPointLight){let v=n.point[f];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(m),f++}else if(y.isHemisphereLight){let v=n.hemi[x];v.direction.setFromMatrixPosition(y.matrixWorld),v.direction.transformDirection(m),x++}}}return{setup:o,setupView:l,state:n}}function cu(i){let e=new n2(i),t=[],n=[];function s(h){c.camera=h,t.length=0,n.length=0}function r(h){t.push(h)}function a(h){n.push(h)}function o(){e.setup(t)}function l(h){e.setupView(t,h)}let c={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:s,state:c,setupLights:o,setupLightsView:l,pushLight:r,pushShadow:a}}function i2(i){let e=new WeakMap;function t(s,r=0){let a=e.get(s),o;return a===void 0?(o=new cu(i),e.set(s,[o])):r>=a.length?(o=new cu(i),a.push(o)):o=a[r],o}function n(){e=new WeakMap}return{get:t,dispose:n}}var Ii=class extends Ci{static get type(){return"MeshDepthMaterial"}constructor(e){super(),this.isMeshDepthMaterial=!0,this.depthPacking=Yd,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},kl=class extends Ci{static get type(){return"MeshDistanceMaterial"}constructor(e){super(),this.isMeshDistanceMaterial=!0,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}},s2=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,r2=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function a2(i,e,t){let n=new ar,s=new K,r=new K,a=new gt,o=new Ii({depthPacking:wc}),l=new kl,c={},h=t.maxTextureSize,u={[ai]:zt,[zt]:ai,[Xt]:Xt},f=new nt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new K},radius:{value:4}},vertexShader:s2,fragmentShader:r2}),p=f.clone();p.defines.HORIZONTAL_PASS=1;let g=new Rt;g.setAttribute("position",new nn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let x=new xt(g,f),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=yu;let d=this.type;this.render=function(T,A,R){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||T.length===0)return;let b=i.getRenderTarget(),q=i.getActiveCubeFace(),C=i.getActiveMipmapLevel(),O=i.state;O.setBlending(on),O.buffers.color.setClear(1,1,1,1),O.buffers.depth.setTest(!0),O.setScissorTest(!1);let N=d!==vn&&this.type===vn,B=d===vn&&this.type!==vn;for(let W=0,k=T.length;W<k;W++){let ee=T[W],V=ee.shadow;if(V===void 0){console.warn("THREE.WebGLShadowMap:",ee,"has no shadow.");continue}if(V.autoUpdate===!1&&V.needsUpdate===!1)continue;s.copy(V.mapSize);let ae=V.getFrameExtents();if(s.multiply(ae),r.copy(V.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/ae.x),s.x=r.x*ae.x,V.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/ae.y),s.y=r.y*ae.y,V.mapSize.y=r.y)),V.map===null||N===!0||B===!0){let ge=this.type!==vn?{minFilter:qt,magFilter:qt}:{};V.map!==null&&V.map.dispose(),V.map=new pt(s.x,s.y,ge),V.map.texture.name=ee.name+".shadowMap",V.camera.updateProjectionMatrix()}i.setRenderTarget(V.map),i.clear();let ue=V.getViewportCount();for(let ge=0;ge<ue;ge++){let Ue=V.getViewport(ge);a.set(r.x*Ue.x,r.y*Ue.y,r.x*Ue.z,r.y*Ue.w),O.viewport(a),V.updateMatrices(ee,ge),n=V.getFrustum(),v(A,R,V.camera,ee,this.type)}V.isPointLightShadow!==!0&&this.type===vn&&S(V,R),V.needsUpdate=!1}d=this.type,m.needsUpdate=!1,i.setRenderTarget(b,q,C)};function S(T,A){let R=e.update(x);f.defines.VSM_SAMPLES!==T.blurSamples&&(f.defines.VSM_SAMPLES=T.blurSamples,p.defines.VSM_SAMPLES=T.blurSamples,f.needsUpdate=!0,p.needsUpdate=!0),T.mapPass===null&&(T.mapPass=new pt(s.x,s.y)),f.uniforms.shadow_pass.value=T.map.texture,f.uniforms.resolution.value=T.mapSize,f.uniforms.radius.value=T.radius,i.setRenderTarget(T.mapPass),i.clear(),i.renderBufferDirect(A,null,R,f,x,null),p.uniforms.shadow_pass.value=T.mapPass.texture,p.uniforms.resolution.value=T.mapSize,p.uniforms.radius.value=T.radius,i.setRenderTarget(T.map),i.clear(),i.renderBufferDirect(A,null,R,p,x,null)}function y(T,A,R,b){let q=null,C=R.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(C!==void 0)q=C;else if(q=R.isPointLight===!0?l:o,i.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0){let O=q.uuid,N=A.uuid,B=c[O];B===void 0&&(B={},c[O]=B);let W=B[N];W===void 0&&(W=q.clone(),B[N]=W,A.addEventListener("dispose",D)),q=W}if(q.visible=A.visible,q.wireframe=A.wireframe,b===vn?q.side=A.shadowSide!==null?A.shadowSide:A.side:q.side=A.shadowSide!==null?A.shadowSide:u[A.side],q.alphaMap=A.alphaMap,q.alphaTest=A.alphaTest,q.map=A.map,q.clipShadows=A.clipShadows,q.clippingPlanes=A.clippingPlanes,q.clipIntersection=A.clipIntersection,q.displacementMap=A.displacementMap,q.displacementScale=A.displacementScale,q.displacementBias=A.displacementBias,q.wireframeLinewidth=A.wireframeLinewidth,q.linewidth=A.linewidth,R.isPointLight===!0&&q.isMeshDistanceMaterial===!0){let O=i.properties.get(q);O.light=R}return q}function v(T,A,R,b,q){if(T.visible===!1)return;if(T.layers.test(A.layers)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&q===vn)&&(!T.frustumCulled||n.intersectsObject(T))){T.modelViewMatrix.multiplyMatrices(R.matrixWorldInverse,T.matrixWorld);let N=e.update(T),B=T.material;if(Array.isArray(B)){let W=N.groups;for(let k=0,ee=W.length;k<ee;k++){let V=W[k],ae=B[V.materialIndex];if(ae&&ae.visible){let ue=y(T,ae,b,q);T.onBeforeShadow(i,T,A,R,N,ue,V),i.renderBufferDirect(R,null,N,ue,T,V),T.onAfterShadow(i,T,A,R,N,ue,V)}}}else if(B.visible){let W=y(T,B,b,q);T.onBeforeShadow(i,T,A,R,N,W,null),i.renderBufferDirect(R,null,N,W,T,null),T.onAfterShadow(i,T,A,R,N,W,null)}}let O=T.children;for(let N=0,B=O.length;N<B;N++)v(O[N],A,R,b,q)}function D(T){T.target.removeEventListener("dispose",D);for(let R in c){let b=c[R],q=T.target.uuid;q in b&&(b[q].dispose(),delete b[q])}}}var o2={[jo]:Ko,[Jo]:el,[Qo]:tl,[ms]:$o,[Ko]:jo,[el]:Jo,[tl]:Qo,[$o]:ms};function l2(i,e){function t(){let I=!1,de=new gt,G=null,J=new gt(0,0,0,0);return{setMask:function(me){G!==me&&!I&&(i.colorMask(me,me,me,me),G=me)},setLocked:function(me){I=me},setClear:function(me,fe,Fe,mt,Ut){Ut===!0&&(me*=mt,fe*=mt,Fe*=mt),de.set(me,fe,Fe,mt),J.equals(de)===!1&&(i.clearColor(me,fe,Fe,mt),J.copy(de))},reset:function(){I=!1,G=null,J.set(-1,0,0,0)}}}function n(){let I=!1,de=!1,G=null,J=null,me=null;return{setReversed:function(fe){if(de!==fe){let Fe=e.get("EXT_clip_control");de?Fe.clipControlEXT(Fe.LOWER_LEFT_EXT,Fe.ZERO_TO_ONE_EXT):Fe.clipControlEXT(Fe.LOWER_LEFT_EXT,Fe.NEGATIVE_ONE_TO_ONE_EXT);let mt=me;me=null,this.setClear(mt)}de=fe},getReversed:function(){return de},setTest:function(fe){fe?oe(i.DEPTH_TEST):Ce(i.DEPTH_TEST)},setMask:function(fe){G!==fe&&!I&&(i.depthMask(fe),G=fe)},setFunc:function(fe){if(de&&(fe=o2[fe]),J!==fe){switch(fe){case jo:i.depthFunc(i.NEVER);break;case Ko:i.depthFunc(i.ALWAYS);break;case Jo:i.depthFunc(i.LESS);break;case ms:i.depthFunc(i.LEQUAL);break;case Qo:i.depthFunc(i.EQUAL);break;case $o:i.depthFunc(i.GEQUAL);break;case el:i.depthFunc(i.GREATER);break;case tl:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}J=fe}},setLocked:function(fe){I=fe},setClear:function(fe){me!==fe&&(de&&(fe=1-fe),i.clearDepth(fe),me=fe)},reset:function(){I=!1,G=null,J=null,me=null,de=!1}}}function s(){let I=!1,de=null,G=null,J=null,me=null,fe=null,Fe=null,mt=null,Ut=null;return{setTest:function(tt){I||(tt?oe(i.STENCIL_TEST):Ce(i.STENCIL_TEST))},setMask:function(tt){de!==tt&&!I&&(i.stencilMask(tt),de=tt)},setFunc:function(tt,fn,Rn){(G!==tt||J!==fn||me!==Rn)&&(i.stencilFunc(tt,fn,Rn),G=tt,J=fn,me=Rn)},setOp:function(tt,fn,Rn){(fe!==tt||Fe!==fn||mt!==Rn)&&(i.stencilOp(tt,fn,Rn),fe=tt,Fe=fn,mt=Rn)},setLocked:function(tt){I=tt},setClear:function(tt){Ut!==tt&&(i.clearStencil(tt),Ut=tt)},reset:function(){I=!1,de=null,G=null,J=null,me=null,fe=null,Fe=null,mt=null,Ut=null}}}let r=new t,a=new n,o=new s,l=new WeakMap,c=new WeakMap,h={},u={},f=new WeakMap,p=[],g=null,x=!1,m=null,d=null,S=null,y=null,v=null,D=null,T=null,A=new Re(0,0,0),R=0,b=!1,q=null,C=null,O=null,N=null,B=null,W=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),k=!1,ee=0,V=i.getParameter(i.VERSION);V.indexOf("WebGL")!==-1?(ee=parseFloat(/^WebGL (\d)/.exec(V)[1]),k=ee>=1):V.indexOf("OpenGL ES")!==-1&&(ee=parseFloat(/^OpenGL ES (\d)/.exec(V)[1]),k=ee>=2);let ae=null,ue={},ge=i.getParameter(i.SCISSOR_BOX),Ue=i.getParameter(i.VIEWPORT),Ke=new gt().fromArray(ge),Y=new gt().fromArray(Ue);function se(I,de,G,J){let me=new Uint8Array(4),fe=i.createTexture();i.bindTexture(I,fe),i.texParameteri(I,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(I,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Fe=0;Fe<G;Fe++)I===i.TEXTURE_3D||I===i.TEXTURE_2D_ARRAY?i.texImage3D(de,0,i.RGBA,1,1,J,0,i.RGBA,i.UNSIGNED_BYTE,me):i.texImage2D(de+Fe,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,me);return fe}let Me={};Me[i.TEXTURE_2D]=se(i.TEXTURE_2D,i.TEXTURE_2D,1),Me[i.TEXTURE_CUBE_MAP]=se(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Me[i.TEXTURE_2D_ARRAY]=se(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Me[i.TEXTURE_3D]=se(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),oe(i.DEPTH_TEST),a.setFunc(ms),te(!1),_e(uh),oe(i.CULL_FACE),w(on);function oe(I){h[I]!==!0&&(i.enable(I),h[I]=!0)}function Ce(I){h[I]!==!1&&(i.disable(I),h[I]=!1)}function Ne(I,de){return u[I]!==de?(i.bindFramebuffer(I,de),u[I]=de,I===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=de),I===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=de),!0):!1}function De(I,de){let G=p,J=!1;if(I){G=f.get(de),G===void 0&&(G=[],f.set(de,G));let me=I.textures;if(G.length!==me.length||G[0]!==i.COLOR_ATTACHMENT0){for(let fe=0,Fe=me.length;fe<Fe;fe++)G[fe]=i.COLOR_ATTACHMENT0+fe;G.length=me.length,J=!0}}else G[0]!==i.BACK&&(G[0]=i.BACK,J=!0);J&&i.drawBuffers(G)}function Ye(I){return g!==I?(i.useProgram(I),g=I,!0):!1}let Q={[Mi]:i.FUNC_ADD,[Td]:i.FUNC_SUBTRACT,[wd]:i.FUNC_REVERSE_SUBTRACT};Q[Ad]=i.MIN,Q[Cd]=i.MAX;let ie={[Rd]:i.ZERO,[Pd]:i.ONE,[Id]:i.SRC_COLOR,[Yo]:i.SRC_ALPHA,[Fd]:i.SRC_ALPHA_SATURATE,[Nd]:i.DST_COLOR,[Ld]:i.DST_ALPHA,[Dd]:i.ONE_MINUS_SRC_COLOR,[Zo]:i.ONE_MINUS_SRC_ALPHA,[Od]:i.ONE_MINUS_DST_COLOR,[Ud]:i.ONE_MINUS_DST_ALPHA,[Bd]:i.CONSTANT_COLOR,[zd]:i.ONE_MINUS_CONSTANT_COLOR,[Hd]:i.CONSTANT_ALPHA,[kd]:i.ONE_MINUS_CONSTANT_ALPHA};function w(I,de,G,J,me,fe,Fe,mt,Ut,tt){if(I===on){x===!0&&(Ce(i.BLEND),x=!1);return}if(x===!1&&(oe(i.BLEND),x=!0),I!==Ed){if(I!==m||tt!==b){if((d!==Mi||v!==Mi)&&(i.blendEquation(i.FUNC_ADD),d=Mi,v=Mi),tt)switch(I){case cs:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case ha:i.blendFunc(i.ONE,i.ONE);break;case dh:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case fh:i.blendFuncSeparate(i.ZERO,i.SRC_COLOR,i.ZERO,i.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}else switch(I){case cs:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case ha:i.blendFunc(i.SRC_ALPHA,i.ONE);break;case dh:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case fh:i.blendFunc(i.ZERO,i.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}S=null,y=null,D=null,T=null,A.set(0,0,0),R=0,m=I,b=tt}return}me=me||de,fe=fe||G,Fe=Fe||J,(de!==d||me!==v)&&(i.blendEquationSeparate(Q[de],Q[me]),d=de,v=me),(G!==S||J!==y||fe!==D||Fe!==T)&&(i.blendFuncSeparate(ie[G],ie[J],ie[fe],ie[Fe]),S=G,y=J,D=fe,T=Fe),(mt.equals(A)===!1||Ut!==R)&&(i.blendColor(mt.r,mt.g,mt.b,Ut),A.copy(mt),R=Ut),m=I,b=!1}function we(I,de){I.side===Xt?Ce(i.CULL_FACE):oe(i.CULL_FACE);let G=I.side===zt;de&&(G=!G),te(G),I.blending===cs&&I.transparent===!1?w(on):w(I.blending,I.blendEquation,I.blendSrc,I.blendDst,I.blendEquationAlpha,I.blendSrcAlpha,I.blendDstAlpha,I.blendColor,I.blendAlpha,I.premultipliedAlpha),a.setFunc(I.depthFunc),a.setTest(I.depthTest),a.setMask(I.depthWrite),r.setMask(I.colorWrite);let J=I.stencilWrite;o.setTest(J),J&&(o.setMask(I.stencilWriteMask),o.setFunc(I.stencilFunc,I.stencilRef,I.stencilFuncMask),o.setOp(I.stencilFail,I.stencilZFail,I.stencilZPass)),Pe(I.polygonOffset,I.polygonOffsetFactor,I.polygonOffsetUnits),I.alphaToCoverage===!0?oe(i.SAMPLE_ALPHA_TO_COVERAGE):Ce(i.SAMPLE_ALPHA_TO_COVERAGE)}function te(I){q!==I&&(I?i.frontFace(i.CW):i.frontFace(i.CCW),q=I)}function _e(I){I!==Md?(oe(i.CULL_FACE),I!==C&&(I===uh?i.cullFace(i.BACK):I===Sd?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Ce(i.CULL_FACE),C=I}function le(I){I!==O&&(k&&i.lineWidth(I),O=I)}function Pe(I,de,G){I?(oe(i.POLYGON_OFFSET_FILL),(N!==de||B!==G)&&(i.polygonOffset(de,G),N=de,B=G)):Ce(i.POLYGON_OFFSET_FILL)}function xe(I){I?oe(i.SCISSOR_TEST):Ce(i.SCISSOR_TEST)}function E(I){I===void 0&&(I=i.TEXTURE0+W-1),ae!==I&&(i.activeTexture(I),ae=I)}function _(I,de,G){G===void 0&&(ae===null?G=i.TEXTURE0+W-1:G=ae);let J=ue[G];J===void 0&&(J={type:void 0,texture:void 0},ue[G]=J),(J.type!==I||J.texture!==de)&&(ae!==G&&(i.activeTexture(G),ae=G),i.bindTexture(I,de||Me[I]),J.type=I,J.texture=de)}function F(){let I=ue[ae];I!==void 0&&I.type!==void 0&&(i.bindTexture(I.type,null),I.type=void 0,I.texture=void 0)}function Z(){try{i.compressedTexImage2D.apply(i,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function $(){try{i.compressedTexImage3D.apply(i,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function j(){try{i.texSubImage2D.apply(i,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Se(){try{i.texSubImage3D.apply(i,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function he(){try{i.compressedTexSubImage2D.apply(i,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function ve(){try{i.compressedTexSubImage3D.apply(i,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Ve(){try{i.texStorage2D.apply(i,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function ne(){try{i.texStorage3D.apply(i,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function ye(){try{i.texImage2D.apply(i,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Ie(){try{i.texImage3D.apply(i,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Le(I){Ke.equals(I)===!1&&(i.scissor(I.x,I.y,I.z,I.w),Ke.copy(I))}function qe(I){Y.equals(I)===!1&&(i.viewport(I.x,I.y,I.z,I.w),Y.copy(I))}function Xe(I,de){let G=c.get(de);G===void 0&&(G=new WeakMap,c.set(de,G));let J=G.get(I);J===void 0&&(J=i.getUniformBlockIndex(de,I.name),G.set(I,J))}function He(I,de){let J=c.get(de).get(I);l.get(de)!==J&&(i.uniformBlockBinding(de,J,I.__bindingPointIndex),l.set(de,J))}function ot(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),h={},ae=null,ue={},u={},f=new WeakMap,p=[],g=null,x=!1,m=null,d=null,S=null,y=null,v=null,D=null,T=null,A=new Re(0,0,0),R=0,b=!1,q=null,C=null,O=null,N=null,B=null,Ke.set(0,0,i.canvas.width,i.canvas.height),Y.set(0,0,i.canvas.width,i.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:oe,disable:Ce,bindFramebuffer:Ne,drawBuffers:De,useProgram:Ye,setBlending:w,setMaterial:we,setFlipSided:te,setCullFace:_e,setLineWidth:le,setPolygonOffset:Pe,setScissorTest:xe,activeTexture:E,bindTexture:_,unbindTexture:F,compressedTexImage2D:Z,compressedTexImage3D:$,texImage2D:ye,texImage3D:Ie,updateUBOMapping:Xe,uniformBlockBinding:He,texStorage2D:Ve,texStorage3D:ne,texSubImage2D:j,texSubImage3D:Se,compressedTexSubImage2D:he,compressedTexSubImage3D:ve,scissor:Le,viewport:qe,reset:ot}}function hu(i,e,t,n){let s=c2(n);switch(t){case Tu:return i*e;case Au:return i*e;case Cu:return i*e*2;case Sc:return i*e/s.components*s.byteLength;case bc:return i*e/s.components*s.byteLength;case Ru:return i*e*2/s.components*s.byteLength;case Ec:return i*e*2/s.components*s.byteLength;case wu:return i*e*3/s.components*s.byteLength;case tn:return i*e*4/s.components*s.byteLength;case Tc:return i*e*4/s.components*s.byteLength;case ra:case aa:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case oa:case la:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case rl:case ol:return Math.max(i,16)*Math.max(e,8)/4;case sl:case al:return Math.max(i,8)*Math.max(e,8)/2;case ll:case cl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case hl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case ul:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case dl:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case fl:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case pl:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case ml:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case gl:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case xl:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case vl:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case _l:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case yl:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case ql:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Ml:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Sl:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case bl:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case ca:case El:case Tl:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Pu:case wl:return Math.ceil(i/4)*Math.ceil(e/4)*8;case Al:case Cl:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function c2(i){switch(i){case Hn:case Su:return{byteLength:1,components:1};case ir:case bu:case At:return{byteLength:2,components:1};case qc:case Mc:return{byteLength:2,components:4};case wi:case yc:case Tn:return{byteLength:4,components:1};case Eu:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}function h2(i,e,t,n,s,r,a){let o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new K,h=new WeakMap,u,f=new WeakMap,p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(E,_){return p?new OffscreenCanvas(E,_):sr("canvas")}function x(E,_,F){let Z=1,$=xe(E);if(($.width>F||$.height>F)&&(Z=F/Math.max($.width,$.height)),Z<1)if(typeof HTMLImageElement<"u"&&E instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&E instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&E instanceof ImageBitmap||typeof VideoFrame<"u"&&E instanceof VideoFrame){let j=Math.floor(Z*$.width),Se=Math.floor(Z*$.height);u===void 0&&(u=g(j,Se));let he=_?g(j,Se):u;return he.width=j,he.height=Se,he.getContext("2d").drawImage(E,0,0,j,Se),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+$.width+"x"+$.height+") to ("+j+"x"+Se+")."),he}else return"data"in E&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+$.width+"x"+$.height+")."),E;return E}function m(E){return E.generateMipmaps}function d(E){i.generateMipmap(E)}function S(E){return E.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:E.isWebGL3DRenderTarget?i.TEXTURE_3D:E.isWebGLArrayRenderTarget||E.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function y(E,_,F,Z,$=!1){if(E!==null){if(i[E]!==void 0)return i[E];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+E+"'")}let j=_;if(_===i.RED&&(F===i.FLOAT&&(j=i.R32F),F===i.HALF_FLOAT&&(j=i.R16F),F===i.UNSIGNED_BYTE&&(j=i.R8)),_===i.RED_INTEGER&&(F===i.UNSIGNED_BYTE&&(j=i.R8UI),F===i.UNSIGNED_SHORT&&(j=i.R16UI),F===i.UNSIGNED_INT&&(j=i.R32UI),F===i.BYTE&&(j=i.R8I),F===i.SHORT&&(j=i.R16I),F===i.INT&&(j=i.R32I)),_===i.RG&&(F===i.FLOAT&&(j=i.RG32F),F===i.HALF_FLOAT&&(j=i.RG16F),F===i.UNSIGNED_BYTE&&(j=i.RG8)),_===i.RG_INTEGER&&(F===i.UNSIGNED_BYTE&&(j=i.RG8UI),F===i.UNSIGNED_SHORT&&(j=i.RG16UI),F===i.UNSIGNED_INT&&(j=i.RG32UI),F===i.BYTE&&(j=i.RG8I),F===i.SHORT&&(j=i.RG16I),F===i.INT&&(j=i.RG32I)),_===i.RGB_INTEGER&&(F===i.UNSIGNED_BYTE&&(j=i.RGB8UI),F===i.UNSIGNED_SHORT&&(j=i.RGB16UI),F===i.UNSIGNED_INT&&(j=i.RGB32UI),F===i.BYTE&&(j=i.RGB8I),F===i.SHORT&&(j=i.RGB16I),F===i.INT&&(j=i.RGB32I)),_===i.RGBA_INTEGER&&(F===i.UNSIGNED_BYTE&&(j=i.RGBA8UI),F===i.UNSIGNED_SHORT&&(j=i.RGBA16UI),F===i.UNSIGNED_INT&&(j=i.RGBA32UI),F===i.BYTE&&(j=i.RGBA8I),F===i.SHORT&&(j=i.RGBA16I),F===i.INT&&(j=i.RGBA32I)),_===i.RGB&&F===i.UNSIGNED_INT_5_9_9_9_REV&&(j=i.RGB9_E5),_===i.RGBA){let Se=$?Va:Ge.getTransfer(Z);F===i.FLOAT&&(j=i.RGBA32F),F===i.HALF_FLOAT&&(j=i.RGBA16F),F===i.UNSIGNED_BYTE&&(j=Se===et?i.SRGB8_ALPHA8:i.RGBA8),F===i.UNSIGNED_SHORT_4_4_4_4&&(j=i.RGBA4),F===i.UNSIGNED_SHORT_5_5_5_1&&(j=i.RGB5_A1)}return(j===i.R16F||j===i.R32F||j===i.RG16F||j===i.RG32F||j===i.RGBA16F||j===i.RGBA32F)&&e.get("EXT_color_buffer_float"),j}function v(E,_){let F;return E?_===null||_===wi||_===_s?F=i.DEPTH24_STENCIL8:_===Tn?F=i.DEPTH32F_STENCIL8:_===ir&&(F=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):_===null||_===wi||_===_s?F=i.DEPTH_COMPONENT24:_===Tn?F=i.DEPTH_COMPONENT32F:_===ir&&(F=i.DEPTH_COMPONENT16),F}function D(E,_){return m(E)===!0||E.isFramebufferTexture&&E.minFilter!==qt&&E.minFilter!==Vt?Math.log2(Math.max(_.width,_.height))+1:E.mipmaps!==void 0&&E.mipmaps.length>0?E.mipmaps.length:E.isCompressedTexture&&Array.isArray(E.image)?_.mipmaps.length:1}function T(E){let _=E.target;_.removeEventListener("dispose",T),R(_),_.isVideoTexture&&h.delete(_)}function A(E){let _=E.target;_.removeEventListener("dispose",A),q(_)}function R(E){let _=n.get(E);if(_.__webglInit===void 0)return;let F=E.source,Z=f.get(F);if(Z){let $=Z[_.__cacheKey];$.usedTimes--,$.usedTimes===0&&b(E),Object.keys(Z).length===0&&f.delete(F)}n.remove(E)}function b(E){let _=n.get(E);i.deleteTexture(_.__webglTexture);let F=E.source,Z=f.get(F);delete Z[_.__cacheKey],a.memory.textures--}function q(E){let _=n.get(E);if(E.depthTexture&&(E.depthTexture.dispose(),n.remove(E.depthTexture)),E.isWebGLCubeRenderTarget)for(let Z=0;Z<6;Z++){if(Array.isArray(_.__webglFramebuffer[Z]))for(let $=0;$<_.__webglFramebuffer[Z].length;$++)i.deleteFramebuffer(_.__webglFramebuffer[Z][$]);else i.deleteFramebuffer(_.__webglFramebuffer[Z]);_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer[Z])}else{if(Array.isArray(_.__webglFramebuffer))for(let Z=0;Z<_.__webglFramebuffer.length;Z++)i.deleteFramebuffer(_.__webglFramebuffer[Z]);else i.deleteFramebuffer(_.__webglFramebuffer);if(_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer),_.__webglMultisampledFramebuffer&&i.deleteFramebuffer(_.__webglMultisampledFramebuffer),_.__webglColorRenderbuffer)for(let Z=0;Z<_.__webglColorRenderbuffer.length;Z++)_.__webglColorRenderbuffer[Z]&&i.deleteRenderbuffer(_.__webglColorRenderbuffer[Z]);_.__webglDepthRenderbuffer&&i.deleteRenderbuffer(_.__webglDepthRenderbuffer)}let F=E.textures;for(let Z=0,$=F.length;Z<$;Z++){let j=n.get(F[Z]);j.__webglTexture&&(i.deleteTexture(j.__webglTexture),a.memory.textures--),n.remove(F[Z])}n.remove(E)}let C=0;function O(){C=0}function N(){let E=C;return E>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+E+" texture units while this GPU supports only "+s.maxTextures),C+=1,E}function B(E){let _=[];return _.push(E.wrapS),_.push(E.wrapT),_.push(E.wrapR||0),_.push(E.magFilter),_.push(E.minFilter),_.push(E.anisotropy),_.push(E.internalFormat),_.push(E.format),_.push(E.type),_.push(E.generateMipmaps),_.push(E.premultiplyAlpha),_.push(E.flipY),_.push(E.unpackAlignment),_.push(E.colorSpace),_.join()}function W(E,_){let F=n.get(E);if(E.isVideoTexture&&le(E),E.isRenderTargetTexture===!1&&E.version>0&&F.__version!==E.version){let Z=E.image;if(Z===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(Z.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{Y(F,E,_);return}}t.bindTexture(i.TEXTURE_2D,F.__webglTexture,i.TEXTURE0+_)}function k(E,_){let F=n.get(E);if(E.version>0&&F.__version!==E.version){Y(F,E,_);return}t.bindTexture(i.TEXTURE_2D_ARRAY,F.__webglTexture,i.TEXTURE0+_)}function ee(E,_){let F=n.get(E);if(E.version>0&&F.__version!==E.version){Y(F,E,_);return}t.bindTexture(i.TEXTURE_3D,F.__webglTexture,i.TEXTURE0+_)}function V(E,_){let F=n.get(E);if(E.version>0&&F.__version!==E.version){se(F,E,_);return}t.bindTexture(i.TEXTURE_CUBE_MAP,F.__webglTexture,i.TEXTURE0+_)}let ae={[vs]:i.REPEAT,[Ei]:i.CLAMP_TO_EDGE,[il]:i.MIRRORED_REPEAT},ue={[qt]:i.NEAREST,[Xd]:i.NEAREST_MIPMAP_NEAREST,[Dr]:i.NEAREST_MIPMAP_LINEAR,[Vt]:i.LINEAR,[mo]:i.LINEAR_MIPMAP_NEAREST,[Ti]:i.LINEAR_MIPMAP_LINEAR},ge={[jd]:i.NEVER,[tf]:i.ALWAYS,[Kd]:i.LESS,[Du]:i.LEQUAL,[Jd]:i.EQUAL,[ef]:i.GEQUAL,[Qd]:i.GREATER,[$d]:i.NOTEQUAL};function Ue(E,_){if(_.type===Tn&&e.has("OES_texture_float_linear")===!1&&(_.magFilter===Vt||_.magFilter===mo||_.magFilter===Dr||_.magFilter===Ti||_.minFilter===Vt||_.minFilter===mo||_.minFilter===Dr||_.minFilter===Ti)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(E,i.TEXTURE_WRAP_S,ae[_.wrapS]),i.texParameteri(E,i.TEXTURE_WRAP_T,ae[_.wrapT]),(E===i.TEXTURE_3D||E===i.TEXTURE_2D_ARRAY)&&i.texParameteri(E,i.TEXTURE_WRAP_R,ae[_.wrapR]),i.texParameteri(E,i.TEXTURE_MAG_FILTER,ue[_.magFilter]),i.texParameteri(E,i.TEXTURE_MIN_FILTER,ue[_.minFilter]),_.compareFunction&&(i.texParameteri(E,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(E,i.TEXTURE_COMPARE_FUNC,ge[_.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(_.magFilter===qt||_.minFilter!==Dr&&_.minFilter!==Ti||_.type===Tn&&e.has("OES_texture_float_linear")===!1)return;if(_.anisotropy>1||n.get(_).__currentAnisotropy){let F=e.get("EXT_texture_filter_anisotropic");i.texParameterf(E,F.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(_.anisotropy,s.getMaxAnisotropy())),n.get(_).__currentAnisotropy=_.anisotropy}}}function Ke(E,_){let F=!1;E.__webglInit===void 0&&(E.__webglInit=!0,_.addEventListener("dispose",T));let Z=_.source,$=f.get(Z);$===void 0&&($={},f.set(Z,$));let j=B(_);if(j!==E.__cacheKey){$[j]===void 0&&($[j]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,F=!0),$[j].usedTimes++;let Se=$[E.__cacheKey];Se!==void 0&&($[E.__cacheKey].usedTimes--,Se.usedTimes===0&&b(_)),E.__cacheKey=j,E.__webglTexture=$[j].texture}return F}function Y(E,_,F){let Z=i.TEXTURE_2D;(_.isDataArrayTexture||_.isCompressedArrayTexture)&&(Z=i.TEXTURE_2D_ARRAY),_.isData3DTexture&&(Z=i.TEXTURE_3D);let $=Ke(E,_),j=_.source;t.bindTexture(Z,E.__webglTexture,i.TEXTURE0+F);let Se=n.get(j);if(j.version!==Se.__version||$===!0){t.activeTexture(i.TEXTURE0+F);let he=Ge.getPrimaries(Ge.workingColorSpace),ve=_.colorSpace===si?null:Ge.getPrimaries(_.colorSpace),Ve=_.colorSpace===si||he===ve?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ve);let ne=x(_.image,!1,s.maxTextureSize);ne=Pe(_,ne);let ye=r.convert(_.format,_.colorSpace),Ie=r.convert(_.type),Le=y(_.internalFormat,ye,Ie,_.colorSpace,_.isVideoTexture);Ue(Z,_);let qe,Xe=_.mipmaps,He=_.isVideoTexture!==!0,ot=Se.__version===void 0||$===!0,I=j.dataReady,de=D(_,ne);if(_.isDepthTexture)Le=v(_.format===ys,_.type),ot&&(He?t.texStorage2D(i.TEXTURE_2D,1,Le,ne.width,ne.height):t.texImage2D(i.TEXTURE_2D,0,Le,ne.width,ne.height,0,ye,Ie,null));else if(_.isDataTexture)if(Xe.length>0){He&&ot&&t.texStorage2D(i.TEXTURE_2D,de,Le,Xe[0].width,Xe[0].height);for(let G=0,J=Xe.length;G<J;G++)qe=Xe[G],He?I&&t.texSubImage2D(i.TEXTURE_2D,G,0,0,qe.width,qe.height,ye,Ie,qe.data):t.texImage2D(i.TEXTURE_2D,G,Le,qe.width,qe.height,0,ye,Ie,qe.data);_.generateMipmaps=!1}else He?(ot&&t.texStorage2D(i.TEXTURE_2D,de,Le,ne.width,ne.height),I&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,ne.width,ne.height,ye,Ie,ne.data)):t.texImage2D(i.TEXTURE_2D,0,Le,ne.width,ne.height,0,ye,Ie,ne.data);else if(_.isCompressedTexture)if(_.isCompressedArrayTexture){He&&ot&&t.texStorage3D(i.TEXTURE_2D_ARRAY,de,Le,Xe[0].width,Xe[0].height,ne.depth);for(let G=0,J=Xe.length;G<J;G++)if(qe=Xe[G],_.format!==tn)if(ye!==null)if(He){if(I)if(_.layerUpdates.size>0){let me=hu(qe.width,qe.height,_.format,_.type);for(let fe of _.layerUpdates){let Fe=qe.data.subarray(fe*me/qe.data.BYTES_PER_ELEMENT,(fe+1)*me/qe.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,G,0,0,fe,qe.width,qe.height,1,ye,Fe)}_.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,G,0,0,0,qe.width,qe.height,ne.depth,ye,qe.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,G,Le,qe.width,qe.height,ne.depth,0,qe.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else He?I&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,G,0,0,0,qe.width,qe.height,ne.depth,ye,Ie,qe.data):t.texImage3D(i.TEXTURE_2D_ARRAY,G,Le,qe.width,qe.height,ne.depth,0,ye,Ie,qe.data)}else{He&&ot&&t.texStorage2D(i.TEXTURE_2D,de,Le,Xe[0].width,Xe[0].height);for(let G=0,J=Xe.length;G<J;G++)qe=Xe[G],_.format!==tn?ye!==null?He?I&&t.compressedTexSubImage2D(i.TEXTURE_2D,G,0,0,qe.width,qe.height,ye,qe.data):t.compressedTexImage2D(i.TEXTURE_2D,G,Le,qe.width,qe.height,0,qe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):He?I&&t.texSubImage2D(i.TEXTURE_2D,G,0,0,qe.width,qe.height,ye,Ie,qe.data):t.texImage2D(i.TEXTURE_2D,G,Le,qe.width,qe.height,0,ye,Ie,qe.data)}else if(_.isDataArrayTexture)if(He){if(ot&&t.texStorage3D(i.TEXTURE_2D_ARRAY,de,Le,ne.width,ne.height,ne.depth),I)if(_.layerUpdates.size>0){let G=hu(ne.width,ne.height,_.format,_.type);for(let J of _.layerUpdates){let me=ne.data.subarray(J*G/ne.data.BYTES_PER_ELEMENT,(J+1)*G/ne.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,J,ne.width,ne.height,1,ye,Ie,me)}_.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ne.width,ne.height,ne.depth,ye,Ie,ne.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,Le,ne.width,ne.height,ne.depth,0,ye,Ie,ne.data);else if(_.isData3DTexture)He?(ot&&t.texStorage3D(i.TEXTURE_3D,de,Le,ne.width,ne.height,ne.depth),I&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ne.width,ne.height,ne.depth,ye,Ie,ne.data)):t.texImage3D(i.TEXTURE_3D,0,Le,ne.width,ne.height,ne.depth,0,ye,Ie,ne.data);else if(_.isFramebufferTexture){if(ot)if(He)t.texStorage2D(i.TEXTURE_2D,de,Le,ne.width,ne.height);else{let G=ne.width,J=ne.height;for(let me=0;me<de;me++)t.texImage2D(i.TEXTURE_2D,me,Le,G,J,0,ye,Ie,null),G>>=1,J>>=1}}else if(Xe.length>0){if(He&&ot){let G=xe(Xe[0]);t.texStorage2D(i.TEXTURE_2D,de,Le,G.width,G.height)}for(let G=0,J=Xe.length;G<J;G++)qe=Xe[G],He?I&&t.texSubImage2D(i.TEXTURE_2D,G,0,0,ye,Ie,qe):t.texImage2D(i.TEXTURE_2D,G,Le,ye,Ie,qe);_.generateMipmaps=!1}else if(He){if(ot){let G=xe(ne);t.texStorage2D(i.TEXTURE_2D,de,Le,G.width,G.height)}I&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,ye,Ie,ne)}else t.texImage2D(i.TEXTURE_2D,0,Le,ye,Ie,ne);m(_)&&d(Z),Se.__version=j.version,_.onUpdate&&_.onUpdate(_)}E.__version=_.version}function se(E,_,F){if(_.image.length!==6)return;let Z=Ke(E,_),$=_.source;t.bindTexture(i.TEXTURE_CUBE_MAP,E.__webglTexture,i.TEXTURE0+F);let j=n.get($);if($.version!==j.__version||Z===!0){t.activeTexture(i.TEXTURE0+F);let Se=Ge.getPrimaries(Ge.workingColorSpace),he=_.colorSpace===si?null:Ge.getPrimaries(_.colorSpace),ve=_.colorSpace===si||Se===he?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ve);let Ve=_.isCompressedTexture||_.image[0].isCompressedTexture,ne=_.image[0]&&_.image[0].isDataTexture,ye=[];for(let J=0;J<6;J++)!Ve&&!ne?ye[J]=x(_.image[J],!0,s.maxCubemapSize):ye[J]=ne?_.image[J].image:_.image[J],ye[J]=Pe(_,ye[J]);let Ie=ye[0],Le=r.convert(_.format,_.colorSpace),qe=r.convert(_.type),Xe=y(_.internalFormat,Le,qe,_.colorSpace),He=_.isVideoTexture!==!0,ot=j.__version===void 0||Z===!0,I=$.dataReady,de=D(_,Ie);Ue(i.TEXTURE_CUBE_MAP,_);let G;if(Ve){He&&ot&&t.texStorage2D(i.TEXTURE_CUBE_MAP,de,Xe,Ie.width,Ie.height);for(let J=0;J<6;J++){G=ye[J].mipmaps;for(let me=0;me<G.length;me++){let fe=G[me];_.format!==tn?Le!==null?He?I&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,me,0,0,fe.width,fe.height,Le,fe.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,me,Xe,fe.width,fe.height,0,fe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):He?I&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,me,0,0,fe.width,fe.height,Le,qe,fe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,me,Xe,fe.width,fe.height,0,Le,qe,fe.data)}}}else{if(G=_.mipmaps,He&&ot){G.length>0&&de++;let J=xe(ye[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,de,Xe,J.width,J.height)}for(let J=0;J<6;J++)if(ne){He?I&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,0,0,0,ye[J].width,ye[J].height,Le,qe,ye[J].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,0,Xe,ye[J].width,ye[J].height,0,Le,qe,ye[J].data);for(let me=0;me<G.length;me++){let Fe=G[me].image[J].image;He?I&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,me+1,0,0,Fe.width,Fe.height,Le,qe,Fe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,me+1,Xe,Fe.width,Fe.height,0,Le,qe,Fe.data)}}else{He?I&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,0,0,0,Le,qe,ye[J]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,0,Xe,Le,qe,ye[J]);for(let me=0;me<G.length;me++){let fe=G[me];He?I&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,me+1,0,0,Le,qe,fe.image[J]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,me+1,Xe,Le,qe,fe.image[J])}}}m(_)&&d(i.TEXTURE_CUBE_MAP),j.__version=$.version,_.onUpdate&&_.onUpdate(_)}E.__version=_.version}function Me(E,_,F,Z,$,j){let Se=r.convert(F.format,F.colorSpace),he=r.convert(F.type),ve=y(F.internalFormat,Se,he,F.colorSpace),Ve=n.get(_),ne=n.get(F);if(ne.__renderTarget=_,!Ve.__hasExternalTextures){let ye=Math.max(1,_.width>>j),Ie=Math.max(1,_.height>>j);$===i.TEXTURE_3D||$===i.TEXTURE_2D_ARRAY?t.texImage3D($,j,ve,ye,Ie,_.depth,0,Se,he,null):t.texImage2D($,j,ve,ye,Ie,0,Se,he,null)}t.bindFramebuffer(i.FRAMEBUFFER,E),_e(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Z,$,ne.__webglTexture,0,te(_)):($===i.TEXTURE_2D||$>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&$<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,Z,$,ne.__webglTexture,j),t.bindFramebuffer(i.FRAMEBUFFER,null)}function oe(E,_,F){if(i.bindRenderbuffer(i.RENDERBUFFER,E),_.depthBuffer){let Z=_.depthTexture,$=Z&&Z.isDepthTexture?Z.type:null,j=v(_.stencilBuffer,$),Se=_.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,he=te(_);_e(_)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,he,j,_.width,_.height):F?i.renderbufferStorageMultisample(i.RENDERBUFFER,he,j,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,j,_.width,_.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Se,i.RENDERBUFFER,E)}else{let Z=_.textures;for(let $=0;$<Z.length;$++){let j=Z[$],Se=r.convert(j.format,j.colorSpace),he=r.convert(j.type),ve=y(j.internalFormat,Se,he,j.colorSpace),Ve=te(_);F&&_e(_)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ve,ve,_.width,_.height):_e(_)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ve,ve,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,ve,_.width,_.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Ce(E,_){if(_&&_.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(i.FRAMEBUFFER,E),!(_.depthTexture&&_.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let Z=n.get(_.depthTexture);Z.__renderTarget=_,(!Z.__webglTexture||_.depthTexture.image.width!==_.width||_.depthTexture.image.height!==_.height)&&(_.depthTexture.image.width=_.width,_.depthTexture.image.height=_.height,_.depthTexture.needsUpdate=!0),W(_.depthTexture,0);let $=Z.__webglTexture,j=te(_);if(_.depthTexture.format===hs)_e(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,$,0,j):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,$,0);else if(_.depthTexture.format===ys)_e(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,$,0,j):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,$,0);else throw new Error("Unknown depthTexture format")}function Ne(E){let _=n.get(E),F=E.isWebGLCubeRenderTarget===!0;if(_.__boundDepthTexture!==E.depthTexture){let Z=E.depthTexture;if(_.__depthDisposeCallback&&_.__depthDisposeCallback(),Z){let $=()=>{delete _.__boundDepthTexture,delete _.__depthDisposeCallback,Z.removeEventListener("dispose",$)};Z.addEventListener("dispose",$),_.__depthDisposeCallback=$}_.__boundDepthTexture=Z}if(E.depthTexture&&!_.__autoAllocateDepthBuffer){if(F)throw new Error("target.depthTexture not supported in Cube render targets");Ce(_.__webglFramebuffer,E)}else if(F){_.__webglDepthbuffer=[];for(let Z=0;Z<6;Z++)if(t.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[Z]),_.__webglDepthbuffer[Z]===void 0)_.__webglDepthbuffer[Z]=i.createRenderbuffer(),oe(_.__webglDepthbuffer[Z],E,!1);else{let $=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,j=_.__webglDepthbuffer[Z];i.bindRenderbuffer(i.RENDERBUFFER,j),i.framebufferRenderbuffer(i.FRAMEBUFFER,$,i.RENDERBUFFER,j)}}else if(t.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer),_.__webglDepthbuffer===void 0)_.__webglDepthbuffer=i.createRenderbuffer(),oe(_.__webglDepthbuffer,E,!1);else{let Z=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,$=_.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,$),i.framebufferRenderbuffer(i.FRAMEBUFFER,Z,i.RENDERBUFFER,$)}t.bindFramebuffer(i.FRAMEBUFFER,null)}function De(E,_,F){let Z=n.get(E);_!==void 0&&Me(Z.__webglFramebuffer,E,E.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),F!==void 0&&Ne(E)}function Ye(E){let _=E.texture,F=n.get(E),Z=n.get(_);E.addEventListener("dispose",A);let $=E.textures,j=E.isWebGLCubeRenderTarget===!0,Se=$.length>1;if(Se||(Z.__webglTexture===void 0&&(Z.__webglTexture=i.createTexture()),Z.__version=_.version,a.memory.textures++),j){F.__webglFramebuffer=[];for(let he=0;he<6;he++)if(_.mipmaps&&_.mipmaps.length>0){F.__webglFramebuffer[he]=[];for(let ve=0;ve<_.mipmaps.length;ve++)F.__webglFramebuffer[he][ve]=i.createFramebuffer()}else F.__webglFramebuffer[he]=i.createFramebuffer()}else{if(_.mipmaps&&_.mipmaps.length>0){F.__webglFramebuffer=[];for(let he=0;he<_.mipmaps.length;he++)F.__webglFramebuffer[he]=i.createFramebuffer()}else F.__webglFramebuffer=i.createFramebuffer();if(Se)for(let he=0,ve=$.length;he<ve;he++){let Ve=n.get($[he]);Ve.__webglTexture===void 0&&(Ve.__webglTexture=i.createTexture(),a.memory.textures++)}if(E.samples>0&&_e(E)===!1){F.__webglMultisampledFramebuffer=i.createFramebuffer(),F.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,F.__webglMultisampledFramebuffer);for(let he=0;he<$.length;he++){let ve=$[he];F.__webglColorRenderbuffer[he]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,F.__webglColorRenderbuffer[he]);let Ve=r.convert(ve.format,ve.colorSpace),ne=r.convert(ve.type),ye=y(ve.internalFormat,Ve,ne,ve.colorSpace,E.isXRRenderTarget===!0),Ie=te(E);i.renderbufferStorageMultisample(i.RENDERBUFFER,Ie,ye,E.width,E.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+he,i.RENDERBUFFER,F.__webglColorRenderbuffer[he])}i.bindRenderbuffer(i.RENDERBUFFER,null),E.depthBuffer&&(F.__webglDepthRenderbuffer=i.createRenderbuffer(),oe(F.__webglDepthRenderbuffer,E,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(j){t.bindTexture(i.TEXTURE_CUBE_MAP,Z.__webglTexture),Ue(i.TEXTURE_CUBE_MAP,_);for(let he=0;he<6;he++)if(_.mipmaps&&_.mipmaps.length>0)for(let ve=0;ve<_.mipmaps.length;ve++)Me(F.__webglFramebuffer[he][ve],E,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+he,ve);else Me(F.__webglFramebuffer[he],E,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+he,0);m(_)&&d(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Se){for(let he=0,ve=$.length;he<ve;he++){let Ve=$[he],ne=n.get(Ve);t.bindTexture(i.TEXTURE_2D,ne.__webglTexture),Ue(i.TEXTURE_2D,Ve),Me(F.__webglFramebuffer,E,Ve,i.COLOR_ATTACHMENT0+he,i.TEXTURE_2D,0),m(Ve)&&d(i.TEXTURE_2D)}t.unbindTexture()}else{let he=i.TEXTURE_2D;if((E.isWebGL3DRenderTarget||E.isWebGLArrayRenderTarget)&&(he=E.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(he,Z.__webglTexture),Ue(he,_),_.mipmaps&&_.mipmaps.length>0)for(let ve=0;ve<_.mipmaps.length;ve++)Me(F.__webglFramebuffer[ve],E,_,i.COLOR_ATTACHMENT0,he,ve);else Me(F.__webglFramebuffer,E,_,i.COLOR_ATTACHMENT0,he,0);m(_)&&d(he),t.unbindTexture()}E.depthBuffer&&Ne(E)}function Q(E){let _=E.textures;for(let F=0,Z=_.length;F<Z;F++){let $=_[F];if(m($)){let j=S(E),Se=n.get($).__webglTexture;t.bindTexture(j,Se),d(j),t.unbindTexture()}}}let ie=[],w=[];function we(E){if(E.samples>0){if(_e(E)===!1){let _=E.textures,F=E.width,Z=E.height,$=i.COLOR_BUFFER_BIT,j=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Se=n.get(E),he=_.length>1;if(he)for(let ve=0;ve<_.length;ve++)t.bindFramebuffer(i.FRAMEBUFFER,Se.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ve,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Se.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ve,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Se.__webglMultisampledFramebuffer),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Se.__webglFramebuffer);for(let ve=0;ve<_.length;ve++){if(E.resolveDepthBuffer&&(E.depthBuffer&&($|=i.DEPTH_BUFFER_BIT),E.stencilBuffer&&E.resolveStencilBuffer&&($|=i.STENCIL_BUFFER_BIT)),he){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Se.__webglColorRenderbuffer[ve]);let Ve=n.get(_[ve]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Ve,0)}i.blitFramebuffer(0,0,F,Z,0,0,F,Z,$,i.NEAREST),l===!0&&(ie.length=0,w.length=0,ie.push(i.COLOR_ATTACHMENT0+ve),E.depthBuffer&&E.resolveDepthBuffer===!1&&(ie.push(j),w.push(j),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,w)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,ie))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),he)for(let ve=0;ve<_.length;ve++){t.bindFramebuffer(i.FRAMEBUFFER,Se.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ve,i.RENDERBUFFER,Se.__webglColorRenderbuffer[ve]);let Ve=n.get(_[ve]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Se.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ve,i.TEXTURE_2D,Ve,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Se.__webglMultisampledFramebuffer)}else if(E.depthBuffer&&E.resolveDepthBuffer===!1&&l){let _=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[_])}}}function te(E){return Math.min(s.maxSamples,E.samples)}function _e(E){let _=n.get(E);return E.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&_.__useRenderToTexture!==!1}function le(E){let _=a.render.frame;h.get(E)!==_&&(h.set(E,_),E.update())}function Pe(E,_){let F=E.colorSpace,Z=E.format,$=E.type;return E.isCompressedTexture===!0||E.isVideoTexture===!0||F!==ci&&F!==si&&(Ge.getTransfer(F)===et?(Z!==tn||$!==Hn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",F)),_}function xe(E){return typeof HTMLImageElement<"u"&&E instanceof HTMLImageElement?(c.width=E.naturalWidth||E.width,c.height=E.naturalHeight||E.height):typeof VideoFrame<"u"&&E instanceof VideoFrame?(c.width=E.displayWidth,c.height=E.displayHeight):(c.width=E.width,c.height=E.height),c}this.allocateTextureUnit=N,this.resetTextureUnits=O,this.setTexture2D=W,this.setTexture2DArray=k,this.setTexture3D=ee,this.setTextureCube=V,this.rebindTextures=De,this.setupRenderTarget=Ye,this.updateRenderTargetMipmap=Q,this.updateMultisampleRenderTarget=we,this.setupDepthRenderbuffer=Ne,this.setupFrameBufferTexture=Me,this.useMultisampledRTT=_e}function u2(i,e){function t(n,s=si){let r,a=Ge.getTransfer(s);if(n===Hn)return i.UNSIGNED_BYTE;if(n===qc)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Mc)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Eu)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Su)return i.BYTE;if(n===bu)return i.SHORT;if(n===ir)return i.UNSIGNED_SHORT;if(n===yc)return i.INT;if(n===wi)return i.UNSIGNED_INT;if(n===Tn)return i.FLOAT;if(n===At)return i.HALF_FLOAT;if(n===Tu)return i.ALPHA;if(n===wu)return i.RGB;if(n===tn)return i.RGBA;if(n===Au)return i.LUMINANCE;if(n===Cu)return i.LUMINANCE_ALPHA;if(n===hs)return i.DEPTH_COMPONENT;if(n===ys)return i.DEPTH_STENCIL;if(n===Sc)return i.RED;if(n===bc)return i.RED_INTEGER;if(n===Ru)return i.RG;if(n===Ec)return i.RG_INTEGER;if(n===Tc)return i.RGBA_INTEGER;if(n===ra||n===aa||n===oa||n===la)if(a===et)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===ra)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===aa)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===oa)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===la)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===ra)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===aa)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===oa)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===la)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===sl||n===rl||n===al||n===ol)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===sl)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===rl)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===al)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===ol)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===ll||n===cl||n===hl)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===ll||n===cl)return a===et?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===hl)return a===et?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===ul||n===dl||n===fl||n===pl||n===ml||n===gl||n===xl||n===vl||n===_l||n===yl||n===ql||n===Ml||n===Sl||n===bl)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===ul)return a===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===dl)return a===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===fl)return a===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===pl)return a===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===ml)return a===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===gl)return a===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===xl)return a===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===vl)return a===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===_l)return a===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===yl)return a===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===ql)return a===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Ml)return a===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Sl)return a===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===bl)return a===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===ca||n===El||n===Tl)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===ca)return a===et?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===El)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Tl)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Pu||n===wl||n===Al||n===Cl)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===ca)return r.COMPRESSED_RED_RGTC1_EXT;if(n===wl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Al)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Cl)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===_s?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}var Vl=class extends Bt{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}},Yt=class extends Mt{constructor(){super(),this.isGroup=!0,this.type="Group"}},d2={type:"move"},$s=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Yt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Yt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new P,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new P),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Yt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new P,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new P),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,a=null,o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){a=!0;for(let x of e.hand.values()){let m=t.getJointPose(x,n),d=this._getHandJoint(c,x);m!==null&&(d.matrix.fromArray(m.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,d.jointRadius=m.radius),d.visible=m!==null}let h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],f=h.position.distanceTo(u.position),p=.02,g=.005;c.inputState.pinching&&f>p+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&f<=p-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1));o!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(d2)))}return o!==null&&(o.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new Yt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},f2=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,p2=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Gl=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t,n){if(this.texture===null){let s=new wt,r=e.properties.get(s);r.__webglTexture=t.texture,(t.depthNear!=n.depthNear||t.depthFar!=n.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=s}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new nt({vertexShader:f2,fragmentShader:p2,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new xt(new Pi(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Wl=class extends kn{constructor(e,t){super();let n=this,s=null,r=1,a=null,o="local-floor",l=1,c=null,h=null,u=null,f=null,p=null,g=null,x=new Gl,m=t.getContextAttributes(),d=null,S=null,y=[],v=[],D=new K,T=null,A=new Bt;A.viewport=new gt;let R=new Bt;R.viewport=new gt;let b=[A,R],q=new Vl,C=null,O=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Y){let se=y[Y];return se===void 0&&(se=new $s,y[Y]=se),se.getTargetRaySpace()},this.getControllerGrip=function(Y){let se=y[Y];return se===void 0&&(se=new $s,y[Y]=se),se.getGripSpace()},this.getHand=function(Y){let se=y[Y];return se===void 0&&(se=new $s,y[Y]=se),se.getHandSpace()};function N(Y){let se=v.indexOf(Y.inputSource);if(se===-1)return;let Me=y[se];Me!==void 0&&(Me.update(Y.inputSource,Y.frame,c||a),Me.dispatchEvent({type:Y.type,data:Y.inputSource}))}function B(){s.removeEventListener("select",N),s.removeEventListener("selectstart",N),s.removeEventListener("selectend",N),s.removeEventListener("squeeze",N),s.removeEventListener("squeezestart",N),s.removeEventListener("squeezeend",N),s.removeEventListener("end",B),s.removeEventListener("inputsourceschange",W);for(let Y=0;Y<y.length;Y++){let se=v[Y];se!==null&&(v[Y]=null,y[Y].disconnect(se))}C=null,O=null,x.reset(),e.setRenderTarget(d),p=null,f=null,u=null,s=null,S=null,Ke.stop(),n.isPresenting=!1,e.setPixelRatio(T),e.setSize(D.width,D.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Y){r=Y,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Y){o=Y,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(Y){c=Y},this.getBaseLayer=function(){return f!==null?f:p},this.getBinding=function(){return u},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(Y){if(s=Y,s!==null){if(d=e.getRenderTarget(),s.addEventListener("select",N),s.addEventListener("selectstart",N),s.addEventListener("selectend",N),s.addEventListener("squeeze",N),s.addEventListener("squeezestart",N),s.addEventListener("squeezeend",N),s.addEventListener("end",B),s.addEventListener("inputsourceschange",W),m.xrCompatible!==!0&&await t.makeXRCompatible(),T=e.getPixelRatio(),e.getSize(D),s.renderState.layers===void 0){let se={antialias:m.antialias,alpha:!0,depth:m.depth,stencil:m.stencil,framebufferScaleFactor:r};p=new XRWebGLLayer(s,t,se),s.updateRenderState({baseLayer:p}),e.setPixelRatio(1),e.setSize(p.framebufferWidth,p.framebufferHeight,!1),S=new pt(p.framebufferWidth,p.framebufferHeight,{format:tn,type:Hn,colorSpace:e.outputColorSpace,stencilBuffer:m.stencil})}else{let se=null,Me=null,oe=null;m.depth&&(oe=m.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,se=m.stencil?ys:hs,Me=m.stencil?_s:wi);let Ce={colorFormat:t.RGBA8,depthFormat:oe,scaleFactor:r};u=new XRWebGLBinding(s,t),f=u.createProjectionLayer(Ce),s.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),S=new pt(f.textureWidth,f.textureHeight,{format:tn,type:Hn,depthTexture:new ya(f.textureWidth,f.textureHeight,Me,void 0,void 0,void 0,void 0,void 0,void 0,se),stencilBuffer:m.stencil,colorSpace:e.outputColorSpace,samples:m.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1})}S.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await s.requestReferenceSpace(o),Ke.setContext(s),Ke.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return x.getDepthTexture()};function W(Y){for(let se=0;se<Y.removed.length;se++){let Me=Y.removed[se],oe=v.indexOf(Me);oe>=0&&(v[oe]=null,y[oe].disconnect(Me))}for(let se=0;se<Y.added.length;se++){let Me=Y.added[se],oe=v.indexOf(Me);if(oe===-1){for(let Ne=0;Ne<y.length;Ne++)if(Ne>=v.length){v.push(Me),oe=Ne;break}else if(v[Ne]===null){v[Ne]=Me,oe=Ne;break}if(oe===-1)break}let Ce=y[oe];Ce&&Ce.connect(Me)}}let k=new P,ee=new P;function V(Y,se,Me){k.setFromMatrixPosition(se.matrixWorld),ee.setFromMatrixPosition(Me.matrixWorld);let oe=k.distanceTo(ee),Ce=se.projectionMatrix.elements,Ne=Me.projectionMatrix.elements,De=Ce[14]/(Ce[10]-1),Ye=Ce[14]/(Ce[10]+1),Q=(Ce[9]+1)/Ce[5],ie=(Ce[9]-1)/Ce[5],w=(Ce[8]-1)/Ce[0],we=(Ne[8]+1)/Ne[0],te=De*w,_e=De*we,le=oe/(-w+we),Pe=le*-w;if(se.matrixWorld.decompose(Y.position,Y.quaternion,Y.scale),Y.translateX(Pe),Y.translateZ(le),Y.matrixWorld.compose(Y.position,Y.quaternion,Y.scale),Y.matrixWorldInverse.copy(Y.matrixWorld).invert(),Ce[10]===-1)Y.projectionMatrix.copy(se.projectionMatrix),Y.projectionMatrixInverse.copy(se.projectionMatrixInverse);else{let xe=De+le,E=Ye+le,_=te-Pe,F=_e+(oe-Pe),Z=Q*Ye/E*xe,$=ie*Ye/E*xe;Y.projectionMatrix.makePerspective(_,F,Z,$,xe,E),Y.projectionMatrixInverse.copy(Y.projectionMatrix).invert()}}function ae(Y,se){se===null?Y.matrixWorld.copy(Y.matrix):Y.matrixWorld.multiplyMatrices(se.matrixWorld,Y.matrix),Y.matrixWorldInverse.copy(Y.matrixWorld).invert()}this.updateCamera=function(Y){if(s===null)return;let se=Y.near,Me=Y.far;x.texture!==null&&(x.depthNear>0&&(se=x.depthNear),x.depthFar>0&&(Me=x.depthFar)),q.near=R.near=A.near=se,q.far=R.far=A.far=Me,(C!==q.near||O!==q.far)&&(s.updateRenderState({depthNear:q.near,depthFar:q.far}),C=q.near,O=q.far),A.layers.mask=Y.layers.mask|2,R.layers.mask=Y.layers.mask|4,q.layers.mask=A.layers.mask|R.layers.mask;let oe=Y.parent,Ce=q.cameras;ae(q,oe);for(let Ne=0;Ne<Ce.length;Ne++)ae(Ce[Ne],oe);Ce.length===2?V(q,A,R):q.projectionMatrix.copy(A.projectionMatrix),ue(Y,q,oe)};function ue(Y,se,Me){Me===null?Y.matrix.copy(se.matrixWorld):(Y.matrix.copy(Me.matrixWorld),Y.matrix.invert(),Y.matrix.multiply(se.matrixWorld)),Y.matrix.decompose(Y.position,Y.quaternion,Y.scale),Y.updateMatrixWorld(!0),Y.projectionMatrix.copy(se.projectionMatrix),Y.projectionMatrixInverse.copy(se.projectionMatrixInverse),Y.isPerspectiveCamera&&(Y.fov=qs*2*Math.atan(1/Y.projectionMatrix.elements[5]),Y.zoom=1)}this.getCamera=function(){return q},this.getFoveation=function(){if(!(f===null&&p===null))return l},this.setFoveation=function(Y){l=Y,f!==null&&(f.fixedFoveation=Y),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=Y)},this.hasDepthSensing=function(){return x.texture!==null},this.getDepthSensingMesh=function(){return x.getMesh(q)};let ge=null;function Ue(Y,se){if(h=se.getViewerPose(c||a),g=se,h!==null){let Me=h.views;p!==null&&(e.setRenderTargetFramebuffer(S,p.framebuffer),e.setRenderTarget(S));let oe=!1;Me.length!==q.cameras.length&&(q.cameras.length=0,oe=!0);for(let Ne=0;Ne<Me.length;Ne++){let De=Me[Ne],Ye=null;if(p!==null)Ye=p.getViewport(De);else{let ie=u.getViewSubImage(f,De);Ye=ie.viewport,Ne===0&&(e.setRenderTargetTextures(S,ie.colorTexture,f.ignoreDepthValues?void 0:ie.depthStencilTexture),e.setRenderTarget(S))}let Q=b[Ne];Q===void 0&&(Q=new Bt,Q.layers.enable(Ne),Q.viewport=new gt,b[Ne]=Q),Q.matrix.fromArray(De.transform.matrix),Q.matrix.decompose(Q.position,Q.quaternion,Q.scale),Q.projectionMatrix.fromArray(De.projectionMatrix),Q.projectionMatrixInverse.copy(Q.projectionMatrix).invert(),Q.viewport.set(Ye.x,Ye.y,Ye.width,Ye.height),Ne===0&&(q.matrix.copy(Q.matrix),q.matrix.decompose(q.position,q.quaternion,q.scale)),oe===!0&&q.cameras.push(Q)}let Ce=s.enabledFeatures;if(Ce&&Ce.includes("depth-sensing")){let Ne=u.getDepthInformation(Me[0]);Ne&&Ne.isValid&&Ne.texture&&x.init(e,Ne,s.renderState)}}for(let Me=0;Me<y.length;Me++){let oe=v[Me],Ce=y[Me];oe!==null&&Ce!==void 0&&Ce.update(oe,se,c||a)}ge&&ge(Y,se),se.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:se}),g=null}let Ke=new Fu;Ke.setAnimationLoop(Ue),this.setAnimationLoop=function(Y){ge=Y},this.dispose=function(){}}},yi=new wn,m2=new ut;function g2(i,e){function t(m,d){m.matrixAutoUpdate===!0&&m.updateMatrix(),d.value.copy(m.matrix)}function n(m,d){d.color.getRGB(m.fogColor.value,Ou(i)),d.isFog?(m.fogNear.value=d.near,m.fogFar.value=d.far):d.isFogExp2&&(m.fogDensity.value=d.density)}function s(m,d,S,y,v){d.isMeshBasicMaterial||d.isMeshLambertMaterial?r(m,d):d.isMeshToonMaterial?(r(m,d),u(m,d)):d.isMeshPhongMaterial?(r(m,d),h(m,d)):d.isMeshStandardMaterial?(r(m,d),f(m,d),d.isMeshPhysicalMaterial&&p(m,d,v)):d.isMeshMatcapMaterial?(r(m,d),g(m,d)):d.isMeshDepthMaterial?r(m,d):d.isMeshDistanceMaterial?(r(m,d),x(m,d)):d.isMeshNormalMaterial?r(m,d):d.isLineBasicMaterial?(a(m,d),d.isLineDashedMaterial&&o(m,d)):d.isPointsMaterial?l(m,d,S,y):d.isSpriteMaterial?c(m,d):d.isShadowMaterial?(m.color.value.copy(d.color),m.opacity.value=d.opacity):d.isShaderMaterial&&(d.uniformsNeedUpdate=!1)}function r(m,d){m.opacity.value=d.opacity,d.color&&m.diffuse.value.copy(d.color),d.emissive&&m.emissive.value.copy(d.emissive).multiplyScalar(d.emissiveIntensity),d.map&&(m.map.value=d.map,t(d.map,m.mapTransform)),d.alphaMap&&(m.alphaMap.value=d.alphaMap,t(d.alphaMap,m.alphaMapTransform)),d.bumpMap&&(m.bumpMap.value=d.bumpMap,t(d.bumpMap,m.bumpMapTransform),m.bumpScale.value=d.bumpScale,d.side===zt&&(m.bumpScale.value*=-1)),d.normalMap&&(m.normalMap.value=d.normalMap,t(d.normalMap,m.normalMapTransform),m.normalScale.value.copy(d.normalScale),d.side===zt&&m.normalScale.value.negate()),d.displacementMap&&(m.displacementMap.value=d.displacementMap,t(d.displacementMap,m.displacementMapTransform),m.displacementScale.value=d.displacementScale,m.displacementBias.value=d.displacementBias),d.emissiveMap&&(m.emissiveMap.value=d.emissiveMap,t(d.emissiveMap,m.emissiveMapTransform)),d.specularMap&&(m.specularMap.value=d.specularMap,t(d.specularMap,m.specularMapTransform)),d.alphaTest>0&&(m.alphaTest.value=d.alphaTest);let S=e.get(d),y=S.envMap,v=S.envMapRotation;y&&(m.envMap.value=y,yi.copy(v),yi.x*=-1,yi.y*=-1,yi.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(yi.y*=-1,yi.z*=-1),m.envMapRotation.value.setFromMatrix4(m2.makeRotationFromEuler(yi)),m.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=d.reflectivity,m.ior.value=d.ior,m.refractionRatio.value=d.refractionRatio),d.lightMap&&(m.lightMap.value=d.lightMap,m.lightMapIntensity.value=d.lightMapIntensity,t(d.lightMap,m.lightMapTransform)),d.aoMap&&(m.aoMap.value=d.aoMap,m.aoMapIntensity.value=d.aoMapIntensity,t(d.aoMap,m.aoMapTransform))}function a(m,d){m.diffuse.value.copy(d.color),m.opacity.value=d.opacity,d.map&&(m.map.value=d.map,t(d.map,m.mapTransform))}function o(m,d){m.dashSize.value=d.dashSize,m.totalSize.value=d.dashSize+d.gapSize,m.scale.value=d.scale}function l(m,d,S,y){m.diffuse.value.copy(d.color),m.opacity.value=d.opacity,m.size.value=d.size*S,m.scale.value=y*.5,d.map&&(m.map.value=d.map,t(d.map,m.uvTransform)),d.alphaMap&&(m.alphaMap.value=d.alphaMap,t(d.alphaMap,m.alphaMapTransform)),d.alphaTest>0&&(m.alphaTest.value=d.alphaTest)}function c(m,d){m.diffuse.value.copy(d.color),m.opacity.value=d.opacity,m.rotation.value=d.rotation,d.map&&(m.map.value=d.map,t(d.map,m.mapTransform)),d.alphaMap&&(m.alphaMap.value=d.alphaMap,t(d.alphaMap,m.alphaMapTransform)),d.alphaTest>0&&(m.alphaTest.value=d.alphaTest)}function h(m,d){m.specular.value.copy(d.specular),m.shininess.value=Math.max(d.shininess,1e-4)}function u(m,d){d.gradientMap&&(m.gradientMap.value=d.gradientMap)}function f(m,d){m.metalness.value=d.metalness,d.metalnessMap&&(m.metalnessMap.value=d.metalnessMap,t(d.metalnessMap,m.metalnessMapTransform)),m.roughness.value=d.roughness,d.roughnessMap&&(m.roughnessMap.value=d.roughnessMap,t(d.roughnessMap,m.roughnessMapTransform)),d.envMap&&(m.envMapIntensity.value=d.envMapIntensity)}function p(m,d,S){m.ior.value=d.ior,d.sheen>0&&(m.sheenColor.value.copy(d.sheenColor).multiplyScalar(d.sheen),m.sheenRoughness.value=d.sheenRoughness,d.sheenColorMap&&(m.sheenColorMap.value=d.sheenColorMap,t(d.sheenColorMap,m.sheenColorMapTransform)),d.sheenRoughnessMap&&(m.sheenRoughnessMap.value=d.sheenRoughnessMap,t(d.sheenRoughnessMap,m.sheenRoughnessMapTransform))),d.clearcoat>0&&(m.clearcoat.value=d.clearcoat,m.clearcoatRoughness.value=d.clearcoatRoughness,d.clearcoatMap&&(m.clearcoatMap.value=d.clearcoatMap,t(d.clearcoatMap,m.clearcoatMapTransform)),d.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=d.clearcoatRoughnessMap,t(d.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),d.clearcoatNormalMap&&(m.clearcoatNormalMap.value=d.clearcoatNormalMap,t(d.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(d.clearcoatNormalScale),d.side===zt&&m.clearcoatNormalScale.value.negate())),d.dispersion>0&&(m.dispersion.value=d.dispersion),d.iridescence>0&&(m.iridescence.value=d.iridescence,m.iridescenceIOR.value=d.iridescenceIOR,m.iridescenceThicknessMinimum.value=d.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=d.iridescenceThicknessRange[1],d.iridescenceMap&&(m.iridescenceMap.value=d.iridescenceMap,t(d.iridescenceMap,m.iridescenceMapTransform)),d.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=d.iridescenceThicknessMap,t(d.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),d.transmission>0&&(m.transmission.value=d.transmission,m.transmissionSamplerMap.value=S.texture,m.transmissionSamplerSize.value.set(S.width,S.height),d.transmissionMap&&(m.transmissionMap.value=d.transmissionMap,t(d.transmissionMap,m.transmissionMapTransform)),m.thickness.value=d.thickness,d.thicknessMap&&(m.thicknessMap.value=d.thicknessMap,t(d.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=d.attenuationDistance,m.attenuationColor.value.copy(d.attenuationColor)),d.anisotropy>0&&(m.anisotropyVector.value.set(d.anisotropy*Math.cos(d.anisotropyRotation),d.anisotropy*Math.sin(d.anisotropyRotation)),d.anisotropyMap&&(m.anisotropyMap.value=d.anisotropyMap,t(d.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=d.specularIntensity,m.specularColor.value.copy(d.specularColor),d.specularColorMap&&(m.specularColorMap.value=d.specularColorMap,t(d.specularColorMap,m.specularColorMapTransform)),d.specularIntensityMap&&(m.specularIntensityMap.value=d.specularIntensityMap,t(d.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,d){d.matcap&&(m.matcap.value=d.matcap)}function x(m,d){let S=e.get(d).light;m.referencePosition.value.setFromMatrixPosition(S.matrixWorld),m.nearDistance.value=S.shadow.camera.near,m.farDistance.value=S.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function x2(i,e,t,n){let s={},r={},a=[],o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(S,y){let v=y.program;n.uniformBlockBinding(S,v)}function c(S,y){let v=s[S.id];v===void 0&&(g(S),v=h(S),s[S.id]=v,S.addEventListener("dispose",m));let D=y.program;n.updateUBOMapping(S,D);let T=e.render.frame;r[S.id]!==T&&(f(S),r[S.id]=T)}function h(S){let y=u();S.__bindingPointIndex=y;let v=i.createBuffer(),D=S.__size,T=S.usage;return i.bindBuffer(i.UNIFORM_BUFFER,v),i.bufferData(i.UNIFORM_BUFFER,D,T),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,y,v),v}function u(){for(let S=0;S<o;S++)if(a.indexOf(S)===-1)return a.push(S),S;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(S){let y=s[S.id],v=S.uniforms,D=S.__cache;i.bindBuffer(i.UNIFORM_BUFFER,y);for(let T=0,A=v.length;T<A;T++){let R=Array.isArray(v[T])?v[T]:[v[T]];for(let b=0,q=R.length;b<q;b++){let C=R[b];if(p(C,T,b,D)===!0){let O=C.__offset,N=Array.isArray(C.value)?C.value:[C.value],B=0;for(let W=0;W<N.length;W++){let k=N[W],ee=x(k);typeof k=="number"||typeof k=="boolean"?(C.__data[0]=k,i.bufferSubData(i.UNIFORM_BUFFER,O+B,C.__data)):k.isMatrix3?(C.__data[0]=k.elements[0],C.__data[1]=k.elements[1],C.__data[2]=k.elements[2],C.__data[3]=0,C.__data[4]=k.elements[3],C.__data[5]=k.elements[4],C.__data[6]=k.elements[5],C.__data[7]=0,C.__data[8]=k.elements[6],C.__data[9]=k.elements[7],C.__data[10]=k.elements[8],C.__data[11]=0):(k.toArray(C.__data,B),B+=ee.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,O,C.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function p(S,y,v,D){let T=S.value,A=y+"_"+v;if(D[A]===void 0)return typeof T=="number"||typeof T=="boolean"?D[A]=T:D[A]=T.clone(),!0;{let R=D[A];if(typeof T=="number"||typeof T=="boolean"){if(R!==T)return D[A]=T,!0}else if(R.equals(T)===!1)return R.copy(T),!0}return!1}function g(S){let y=S.uniforms,v=0,D=16;for(let A=0,R=y.length;A<R;A++){let b=Array.isArray(y[A])?y[A]:[y[A]];for(let q=0,C=b.length;q<C;q++){let O=b[q],N=Array.isArray(O.value)?O.value:[O.value];for(let B=0,W=N.length;B<W;B++){let k=N[B],ee=x(k),V=v%D,ae=V%ee.boundary,ue=V+ae;v+=ae,ue!==0&&D-ue<ee.storage&&(v+=D-ue),O.__data=new Float32Array(ee.storage/Float32Array.BYTES_PER_ELEMENT),O.__offset=v,v+=ee.storage}}}let T=v%D;return T>0&&(v+=D-T),S.__size=v,S.__cache={},this}function x(S){let y={boundary:0,storage:0};return typeof S=="number"||typeof S=="boolean"?(y.boundary=4,y.storage=4):S.isVector2?(y.boundary=8,y.storage=8):S.isVector3||S.isColor?(y.boundary=16,y.storage=12):S.isVector4?(y.boundary=16,y.storage=16):S.isMatrix3?(y.boundary=48,y.storage=48):S.isMatrix4?(y.boundary=64,y.storage=64):S.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",S),y}function m(S){let y=S.target;y.removeEventListener("dispose",m);let v=a.indexOf(y.__bindingPointIndex);a.splice(v,1),i.deleteBuffer(s[y.id]),delete s[y.id],delete r[y.id]}function d(){for(let S in s)i.deleteBuffer(s[S]);a=[],s={},r={}}return{bind:l,update:c,dispose:d}}var qa=class{constructor(e={}){let{canvas:t=_f(),context:n=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reverseDepthBuffer:f=!1}=e;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");p=n.getContextAttributes().alpha}else p=a;let g=new Uint32Array(4),x=new Int32Array(4),m=null,d=null,S=[],y=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=Ft,this.toneMapping=ri,this.toneMappingExposure=1;let v=this,D=!1,T=0,A=0,R=null,b=-1,q=null,C=new gt,O=new gt,N=null,B=new Re(0),W=0,k=t.width,ee=t.height,V=1,ae=null,ue=null,ge=new gt(0,0,k,ee),Ue=new gt(0,0,k,ee),Ke=!1,Y=new ar,se=!1,Me=!1,oe=new ut,Ce=new ut,Ne=new P,De=new gt,Ye={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Q=!1;function ie(){return R===null?V:1}let w=n;function we(M,L){return t.getContext(M,L)}try{let M={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${pc}`),t.addEventListener("webglcontextlost",J,!1),t.addEventListener("webglcontextrestored",me,!1),t.addEventListener("webglcontextcreationerror",fe,!1),w===null){let L="webgl2";if(w=we(L,M),w===null)throw we(L)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(M){throw console.error("THREE.WebGLRenderer: "+M.message),M}let te,_e,le,Pe,xe,E,_,F,Z,$,j,Se,he,ve,Ve,ne,ye,Ie,Le,qe,Xe,He,ot,I;function de(){te=new D0(w),te.init(),He=new u2(w,te),_e=new w0(w,te,e,He),le=new l2(w,te),_e.reverseDepthBuffer&&f&&le.buffers.depth.setReversed(!0),Pe=new N0(w),xe=new jm,E=new h2(w,te,le,xe,_e,He,Pe),_=new C0(v),F=new I0(v),Z=new Vf(w),ot=new E0(w,Z),$=new L0(w,Z,Pe,ot),j=new F0(w,$,Z,Pe),Le=new O0(w,_e,E),ne=new A0(xe),Se=new Zm(v,_,F,te,_e,ot,ne),he=new g2(v,xe),ve=new Jm,Ve=new i2(te),Ie=new b0(v,_,F,le,j,p,l),ye=new a2(v,j,_e),I=new x2(w,Pe,_e,le),qe=new T0(w,te,Pe),Xe=new U0(w,te,Pe),Pe.programs=Se.programs,v.capabilities=_e,v.extensions=te,v.properties=xe,v.renderLists=ve,v.shadowMap=ye,v.state=le,v.info=Pe}de();let G=new Wl(v,w);this.xr=G,this.getContext=function(){return w},this.getContextAttributes=function(){return w.getContextAttributes()},this.forceContextLoss=function(){let M=te.get("WEBGL_lose_context");M&&M.loseContext()},this.forceContextRestore=function(){let M=te.get("WEBGL_lose_context");M&&M.restoreContext()},this.getPixelRatio=function(){return V},this.setPixelRatio=function(M){M!==void 0&&(V=M,this.setSize(k,ee,!1))},this.getSize=function(M){return M.set(k,ee)},this.setSize=function(M,L,z=!0){if(G.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}k=M,ee=L,t.width=Math.floor(M*V),t.height=Math.floor(L*V),z===!0&&(t.style.width=M+"px",t.style.height=L+"px"),this.setViewport(0,0,M,L)},this.getDrawingBufferSize=function(M){return M.set(k*V,ee*V).floor()},this.setDrawingBufferSize=function(M,L,z){k=M,ee=L,V=z,t.width=Math.floor(M*z),t.height=Math.floor(L*z),this.setViewport(0,0,M,L)},this.getCurrentViewport=function(M){return M.copy(C)},this.getViewport=function(M){return M.copy(ge)},this.setViewport=function(M,L,z,H){M.isVector4?ge.set(M.x,M.y,M.z,M.w):ge.set(M,L,z,H),le.viewport(C.copy(ge).multiplyScalar(V).round())},this.getScissor=function(M){return M.copy(Ue)},this.setScissor=function(M,L,z,H){M.isVector4?Ue.set(M.x,M.y,M.z,M.w):Ue.set(M,L,z,H),le.scissor(O.copy(Ue).multiplyScalar(V).round())},this.getScissorTest=function(){return Ke},this.setScissorTest=function(M){le.setScissorTest(Ke=M)},this.setOpaqueSort=function(M){ae=M},this.setTransparentSort=function(M){ue=M},this.getClearColor=function(M){return M.copy(Ie.getClearColor())},this.setClearColor=function(){Ie.setClearColor.apply(Ie,arguments)},this.getClearAlpha=function(){return Ie.getClearAlpha()},this.setClearAlpha=function(){Ie.setClearAlpha.apply(Ie,arguments)},this.clear=function(M=!0,L=!0,z=!0){let H=0;if(M){let U=!1;if(R!==null){let re=R.texture.format;U=re===Tc||re===Ec||re===bc}if(U){let re=R.texture.type,pe=re===Hn||re===wi||re===ir||re===_s||re===qc||re===Mc,be=Ie.getClearColor(),Ee=Ie.getClearAlpha(),Oe=be.r,Be=be.g,Te=be.b;pe?(g[0]=Oe,g[1]=Be,g[2]=Te,g[3]=Ee,w.clearBufferuiv(w.COLOR,0,g)):(x[0]=Oe,x[1]=Be,x[2]=Te,x[3]=Ee,w.clearBufferiv(w.COLOR,0,x))}else H|=w.COLOR_BUFFER_BIT}L&&(H|=w.DEPTH_BUFFER_BIT),z&&(H|=w.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),w.clear(H)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",J,!1),t.removeEventListener("webglcontextrestored",me,!1),t.removeEventListener("webglcontextcreationerror",fe,!1),ve.dispose(),Ve.dispose(),xe.dispose(),_.dispose(),F.dispose(),j.dispose(),ot.dispose(),I.dispose(),Se.dispose(),G.dispose(),G.removeEventListener("sessionstart",ih),G.removeEventListener("sessionend",sh),pi.stop()};function J(M){M.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),D=!0}function me(){console.log("THREE.WebGLRenderer: Context Restored."),D=!1;let M=Pe.autoReset,L=ye.enabled,z=ye.autoUpdate,H=ye.needsUpdate,U=ye.type;de(),Pe.autoReset=M,ye.enabled=L,ye.autoUpdate=z,ye.needsUpdate=H,ye.type=U}function fe(M){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",M.statusMessage)}function Fe(M){let L=M.target;L.removeEventListener("dispose",Fe),mt(L)}function mt(M){Ut(M),xe.remove(M)}function Ut(M){let L=xe.get(M).programs;L!==void 0&&(L.forEach(function(z){Se.releaseProgram(z)}),M.isShaderMaterial&&Se.releaseShaderCache(M))}this.renderBufferDirect=function(M,L,z,H,U,re){L===null&&(L=Ye);let pe=U.isMesh&&U.matrixWorld.determinant()<0,be=_d(M,L,z,H,U);le.setMaterial(H,pe);let Ee=z.index,Oe=1;if(H.wireframe===!0){if(Ee=$.getWireframeAttribute(z),Ee===void 0)return;Oe=2}let Be=z.drawRange,Te=z.attributes.position,Ze=Be.start*Oe,lt=(Be.start+Be.count)*Oe;re!==null&&(Ze=Math.max(Ze,re.start*Oe),lt=Math.min(lt,(re.start+re.count)*Oe)),Ee!==null?(Ze=Math.max(Ze,0),lt=Math.min(lt,Ee.count)):Te!=null&&(Ze=Math.max(Ze,0),lt=Math.min(lt,Te.count));let ct=lt-Ze;if(ct<0||ct===1/0)return;ot.setup(U,H,be,z,Ee);let Wt,Qe=qe;if(Ee!==null&&(Wt=Z.get(Ee),Qe=Xe,Qe.setIndex(Wt)),U.isMesh)H.wireframe===!0?(le.setLineWidth(H.wireframeLinewidth*ie()),Qe.setMode(w.LINES)):Qe.setMode(w.TRIANGLES);else if(U.isLine){let Ae=H.linewidth;Ae===void 0&&(Ae=1),le.setLineWidth(Ae*ie()),U.isLineSegments?Qe.setMode(w.LINES):U.isLineLoop?Qe.setMode(w.LINE_LOOP):Qe.setMode(w.LINE_STRIP)}else U.isPoints?Qe.setMode(w.POINTS):U.isSprite&&Qe.setMode(w.TRIANGLES);if(U.isBatchedMesh)if(U._multiDrawInstances!==null)Qe.renderMultiDrawInstances(U._multiDrawStarts,U._multiDrawCounts,U._multiDrawCount,U._multiDrawInstances);else if(te.get("WEBGL_multi_draw"))Qe.renderMultiDraw(U._multiDrawStarts,U._multiDrawCounts,U._multiDrawCount);else{let Ae=U._multiDrawStarts,Pn=U._multiDrawCounts,$e=U._multiDrawCount,pn=Ee?Z.get(Ee).bytesPerElement:1,Gi=xe.get(H).currentProgram.getUniforms();for(let Qt=0;Qt<$e;Qt++)Gi.setValue(w,"_gl_DrawID",Qt),Qe.render(Ae[Qt]/pn,Pn[Qt])}else if(U.isInstancedMesh)Qe.renderInstances(Ze,ct,U.count);else if(z.isInstancedBufferGeometry){let Ae=z._maxInstanceCount!==void 0?z._maxInstanceCount:1/0,Pn=Math.min(z.instanceCount,Ae);Qe.renderInstances(Ze,ct,Pn)}else Qe.render(Ze,ct)};function tt(M,L,z){M.transparent===!0&&M.side===Xt&&M.forceSinglePass===!1?(M.side=zt,M.needsUpdate=!0,Ir(M,L,z),M.side=ai,M.needsUpdate=!0,Ir(M,L,z),M.side=Xt):Ir(M,L,z)}this.compile=function(M,L,z=null){z===null&&(z=M),d=Ve.get(z),d.init(L),y.push(d),z.traverseVisible(function(U){U.isLight&&U.layers.test(L.layers)&&(d.pushLight(U),U.castShadow&&d.pushShadow(U))}),M!==z&&M.traverseVisible(function(U){U.isLight&&U.layers.test(L.layers)&&(d.pushLight(U),U.castShadow&&d.pushShadow(U))}),d.setupLights();let H=new Set;return M.traverse(function(U){if(!(U.isMesh||U.isPoints||U.isLine||U.isSprite))return;let re=U.material;if(re)if(Array.isArray(re))for(let pe=0;pe<re.length;pe++){let be=re[pe];tt(be,z,U),H.add(be)}else tt(re,z,U),H.add(re)}),y.pop(),d=null,H},this.compileAsync=function(M,L,z=null){let H=this.compile(M,L,z);return new Promise(U=>{function re(){if(H.forEach(function(pe){xe.get(pe).currentProgram.isReady()&&H.delete(pe)}),H.size===0){U(M);return}setTimeout(re,10)}te.get("KHR_parallel_shader_compile")!==null?re():setTimeout(re,10)})};let fn=null;function Rn(M){fn&&fn(M)}function ih(){pi.stop()}function sh(){pi.start()}let pi=new Fu;pi.setAnimationLoop(Rn),typeof self<"u"&&pi.setContext(self),this.setAnimationLoop=function(M){fn=M,G.setAnimationLoop(M),M===null?pi.stop():pi.start()},G.addEventListener("sessionstart",ih),G.addEventListener("sessionend",sh),this.render=function(M,L){if(L!==void 0&&L.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(D===!0)return;if(M.matrixWorldAutoUpdate===!0&&M.updateMatrixWorld(),L.parent===null&&L.matrixWorldAutoUpdate===!0&&L.updateMatrixWorld(),G.enabled===!0&&G.isPresenting===!0&&(G.cameraAutoUpdate===!0&&G.updateCamera(L),L=G.getCamera()),M.isScene===!0&&M.onBeforeRender(v,M,L,R),d=Ve.get(M,y.length),d.init(L),y.push(d),Ce.multiplyMatrices(L.projectionMatrix,L.matrixWorldInverse),Y.setFromProjectionMatrix(Ce),Me=this.localClippingEnabled,se=ne.init(this.clippingPlanes,Me),m=ve.get(M,S.length),m.init(),S.push(m),G.enabled===!0&&G.isPresenting===!0){let re=v.xr.getDepthSensingMesh();re!==null&&po(re,L,-1/0,v.sortObjects)}po(M,L,0,v.sortObjects),m.finish(),v.sortObjects===!0&&m.sort(ae,ue),Q=G.enabled===!1||G.isPresenting===!1||G.hasDepthSensing()===!1,Q&&Ie.addToRenderList(m,M),this.info.render.frame++,se===!0&&ne.beginShadows();let z=d.state.shadowsArray;ye.render(z,M,L),se===!0&&ne.endShadows(),this.info.autoReset===!0&&this.info.reset();let H=m.opaque,U=m.transmissive;if(d.setupLights(),L.isArrayCamera){let re=L.cameras;if(U.length>0)for(let pe=0,be=re.length;pe<be;pe++){let Ee=re[pe];ah(H,U,M,Ee)}Q&&Ie.render(M);for(let pe=0,be=re.length;pe<be;pe++){let Ee=re[pe];rh(m,M,Ee,Ee.viewport)}}else U.length>0&&ah(H,U,M,L),Q&&Ie.render(M),rh(m,M,L);R!==null&&(E.updateMultisampleRenderTarget(R),E.updateRenderTargetMipmap(R)),M.isScene===!0&&M.onAfterRender(v,M,L),ot.resetDefaultState(),b=-1,q=null,y.pop(),y.length>0?(d=y[y.length-1],se===!0&&ne.setGlobalState(v.clippingPlanes,d.state.camera)):d=null,S.pop(),S.length>0?m=S[S.length-1]:m=null};function po(M,L,z,H){if(M.visible===!1)return;if(M.layers.test(L.layers)){if(M.isGroup)z=M.renderOrder;else if(M.isLOD)M.autoUpdate===!0&&M.update(L);else if(M.isLight)d.pushLight(M),M.castShadow&&d.pushShadow(M);else if(M.isSprite){if(!M.frustumCulled||Y.intersectsSprite(M)){H&&De.setFromMatrixPosition(M.matrixWorld).applyMatrix4(Ce);let pe=j.update(M),be=M.material;be.visible&&m.push(M,pe,be,z,De.z,null)}}else if((M.isMesh||M.isLine||M.isPoints)&&(!M.frustumCulled||Y.intersectsObject(M))){let pe=j.update(M),be=M.material;if(H&&(M.boundingSphere!==void 0?(M.boundingSphere===null&&M.computeBoundingSphere(),De.copy(M.boundingSphere.center)):(pe.boundingSphere===null&&pe.computeBoundingSphere(),De.copy(pe.boundingSphere.center)),De.applyMatrix4(M.matrixWorld).applyMatrix4(Ce)),Array.isArray(be)){let Ee=pe.groups;for(let Oe=0,Be=Ee.length;Oe<Be;Oe++){let Te=Ee[Oe],Ze=be[Te.materialIndex];Ze&&Ze.visible&&m.push(M,pe,Ze,z,De.z,Te)}}else be.visible&&m.push(M,pe,be,z,De.z,null)}}let re=M.children;for(let pe=0,be=re.length;pe<be;pe++)po(re[pe],L,z,H)}function rh(M,L,z,H){let U=M.opaque,re=M.transmissive,pe=M.transparent;d.setupLightsView(z),se===!0&&ne.setGlobalState(v.clippingPlanes,z),H&&le.viewport(C.copy(H)),U.length>0&&Pr(U,L,z),re.length>0&&Pr(re,L,z),pe.length>0&&Pr(pe,L,z),le.buffers.depth.setTest(!0),le.buffers.depth.setMask(!0),le.buffers.color.setMask(!0),le.setPolygonOffset(!1)}function ah(M,L,z,H){if((z.isScene===!0?z.overrideMaterial:null)!==null)return;d.state.transmissionRenderTarget[H.id]===void 0&&(d.state.transmissionRenderTarget[H.id]=new pt(1,1,{generateMipmaps:!0,type:te.has("EXT_color_buffer_half_float")||te.has("EXT_color_buffer_float")?At:Hn,minFilter:Ti,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Ge.workingColorSpace}));let re=d.state.transmissionRenderTarget[H.id],pe=H.viewport||C;re.setSize(pe.z,pe.w);let be=v.getRenderTarget();v.setRenderTarget(re),v.getClearColor(B),W=v.getClearAlpha(),W<1&&v.setClearColor(16777215,.5),v.clear(),Q&&Ie.render(z);let Ee=v.toneMapping;v.toneMapping=ri;let Oe=H.viewport;if(H.viewport!==void 0&&(H.viewport=void 0),d.setupLightsView(H),se===!0&&ne.setGlobalState(v.clippingPlanes,H),Pr(M,z,H),E.updateMultisampleRenderTarget(re),E.updateRenderTargetMipmap(re),te.has("WEBGL_multisampled_render_to_texture")===!1){let Be=!1;for(let Te=0,Ze=L.length;Te<Ze;Te++){let lt=L[Te],ct=lt.object,Wt=lt.geometry,Qe=lt.material,Ae=lt.group;if(Qe.side===Xt&&ct.layers.test(H.layers)){let Pn=Qe.side;Qe.side=zt,Qe.needsUpdate=!0,oh(ct,z,H,Wt,Qe,Ae),Qe.side=Pn,Qe.needsUpdate=!0,Be=!0}}Be===!0&&(E.updateMultisampleRenderTarget(re),E.updateRenderTargetMipmap(re))}v.setRenderTarget(be),v.setClearColor(B,W),Oe!==void 0&&(H.viewport=Oe),v.toneMapping=Ee}function Pr(M,L,z){let H=L.isScene===!0?L.overrideMaterial:null;for(let U=0,re=M.length;U<re;U++){let pe=M[U],be=pe.object,Ee=pe.geometry,Oe=H===null?pe.material:H,Be=pe.group;be.layers.test(z.layers)&&oh(be,L,z,Ee,Oe,Be)}}function oh(M,L,z,H,U,re){M.onBeforeRender(v,L,z,H,U,re),M.modelViewMatrix.multiplyMatrices(z.matrixWorldInverse,M.matrixWorld),M.normalMatrix.getNormalMatrix(M.modelViewMatrix),U.onBeforeRender(v,L,z,H,M,re),U.transparent===!0&&U.side===Xt&&U.forceSinglePass===!1?(U.side=zt,U.needsUpdate=!0,v.renderBufferDirect(z,L,H,U,M,re),U.side=ai,U.needsUpdate=!0,v.renderBufferDirect(z,L,H,U,M,re),U.side=Xt):v.renderBufferDirect(z,L,H,U,M,re),M.onAfterRender(v,L,z,H,U,re)}function Ir(M,L,z){L.isScene!==!0&&(L=Ye);let H=xe.get(M),U=d.state.lights,re=d.state.shadowsArray,pe=U.state.version,be=Se.getParameters(M,U.state,re,L,z),Ee=Se.getProgramCacheKey(be),Oe=H.programs;H.environment=M.isMeshStandardMaterial?L.environment:null,H.fog=L.fog,H.envMap=(M.isMeshStandardMaterial?F:_).get(M.envMap||H.environment),H.envMapRotation=H.environment!==null&&M.envMap===null?L.environmentRotation:M.envMapRotation,Oe===void 0&&(M.addEventListener("dispose",Fe),Oe=new Map,H.programs=Oe);let Be=Oe.get(Ee);if(Be!==void 0){if(H.currentProgram===Be&&H.lightsStateVersion===pe)return ch(M,be),Be}else be.uniforms=Se.getUniforms(M),M.onBeforeCompile(be,v),Be=Se.acquireProgram(be,Ee),Oe.set(Ee,Be),H.uniforms=be.uniforms;let Te=H.uniforms;return(!M.isShaderMaterial&&!M.isRawShaderMaterial||M.clipping===!0)&&(Te.clippingPlanes=ne.uniform),ch(M,be),H.needsLights=qd(M),H.lightsStateVersion=pe,H.needsLights&&(Te.ambientLightColor.value=U.state.ambient,Te.lightProbe.value=U.state.probe,Te.directionalLights.value=U.state.directional,Te.directionalLightShadows.value=U.state.directionalShadow,Te.spotLights.value=U.state.spot,Te.spotLightShadows.value=U.state.spotShadow,Te.rectAreaLights.value=U.state.rectArea,Te.ltc_1.value=U.state.rectAreaLTC1,Te.ltc_2.value=U.state.rectAreaLTC2,Te.pointLights.value=U.state.point,Te.pointLightShadows.value=U.state.pointShadow,Te.hemisphereLights.value=U.state.hemi,Te.directionalShadowMap.value=U.state.directionalShadowMap,Te.directionalShadowMatrix.value=U.state.directionalShadowMatrix,Te.spotShadowMap.value=U.state.spotShadowMap,Te.spotLightMatrix.value=U.state.spotLightMatrix,Te.spotLightMap.value=U.state.spotLightMap,Te.pointShadowMap.value=U.state.pointShadowMap,Te.pointShadowMatrix.value=U.state.pointShadowMatrix),H.currentProgram=Be,H.uniformsList=null,Be}function lh(M){if(M.uniformsList===null){let L=M.currentProgram.getUniforms();M.uniformsList=ds.seqWithValue(L.seq,M.uniforms)}return M.uniformsList}function ch(M,L){let z=xe.get(M);z.outputColorSpace=L.outputColorSpace,z.batching=L.batching,z.batchingColor=L.batchingColor,z.instancing=L.instancing,z.instancingColor=L.instancingColor,z.instancingMorph=L.instancingMorph,z.skinning=L.skinning,z.morphTargets=L.morphTargets,z.morphNormals=L.morphNormals,z.morphColors=L.morphColors,z.morphTargetsCount=L.morphTargetsCount,z.numClippingPlanes=L.numClippingPlanes,z.numIntersection=L.numClipIntersection,z.vertexAlphas=L.vertexAlphas,z.vertexTangents=L.vertexTangents,z.toneMapping=L.toneMapping}function _d(M,L,z,H,U){L.isScene!==!0&&(L=Ye),E.resetTextureUnits();let re=L.fog,pe=H.isMeshStandardMaterial?L.environment:null,be=R===null?v.outputColorSpace:R.isXRRenderTarget===!0?R.texture.colorSpace:ci,Ee=(H.isMeshStandardMaterial?F:_).get(H.envMap||pe),Oe=H.vertexColors===!0&&!!z.attributes.color&&z.attributes.color.itemSize===4,Be=!!z.attributes.tangent&&(!!H.normalMap||H.anisotropy>0),Te=!!z.morphAttributes.position,Ze=!!z.morphAttributes.normal,lt=!!z.morphAttributes.color,ct=ri;H.toneMapped&&(R===null||R.isXRRenderTarget===!0)&&(ct=v.toneMapping);let Wt=z.morphAttributes.position||z.morphAttributes.normal||z.morphAttributes.color,Qe=Wt!==void 0?Wt.length:0,Ae=xe.get(H),Pn=d.state.lights;if(se===!0&&(Me===!0||M!==q)){let rn=M===q&&H.id===b;ne.setState(H,M,rn)}let $e=!1;H.version===Ae.__version?(Ae.needsLights&&Ae.lightsStateVersion!==Pn.state.version||Ae.outputColorSpace!==be||U.isBatchedMesh&&Ae.batching===!1||!U.isBatchedMesh&&Ae.batching===!0||U.isBatchedMesh&&Ae.batchingColor===!0&&U.colorTexture===null||U.isBatchedMesh&&Ae.batchingColor===!1&&U.colorTexture!==null||U.isInstancedMesh&&Ae.instancing===!1||!U.isInstancedMesh&&Ae.instancing===!0||U.isSkinnedMesh&&Ae.skinning===!1||!U.isSkinnedMesh&&Ae.skinning===!0||U.isInstancedMesh&&Ae.instancingColor===!0&&U.instanceColor===null||U.isInstancedMesh&&Ae.instancingColor===!1&&U.instanceColor!==null||U.isInstancedMesh&&Ae.instancingMorph===!0&&U.morphTexture===null||U.isInstancedMesh&&Ae.instancingMorph===!1&&U.morphTexture!==null||Ae.envMap!==Ee||H.fog===!0&&Ae.fog!==re||Ae.numClippingPlanes!==void 0&&(Ae.numClippingPlanes!==ne.numPlanes||Ae.numIntersection!==ne.numIntersection)||Ae.vertexAlphas!==Oe||Ae.vertexTangents!==Be||Ae.morphTargets!==Te||Ae.morphNormals!==Ze||Ae.morphColors!==lt||Ae.toneMapping!==ct||Ae.morphTargetsCount!==Qe)&&($e=!0):($e=!0,Ae.__version=H.version);let pn=Ae.currentProgram;$e===!0&&(pn=Ir(H,L,U));let Gi=!1,Qt=!1,Hs=!1,ht=pn.getUniforms(),bn=Ae.uniforms;if(le.useProgram(pn.program)&&(Gi=!0,Qt=!0,Hs=!0),H.id!==b&&(b=H.id,Qt=!0),Gi||q!==M){le.buffers.depth.getReversed()?(oe.copy(M.projectionMatrix),qf(oe),Mf(oe),ht.setValue(w,"projectionMatrix",oe)):ht.setValue(w,"projectionMatrix",M.projectionMatrix),ht.setValue(w,"viewMatrix",M.matrixWorldInverse);let Kn=ht.map.cameraPosition;Kn!==void 0&&Kn.setValue(w,Ne.setFromMatrixPosition(M.matrixWorld)),_e.logarithmicDepthBuffer&&ht.setValue(w,"logDepthBufFC",2/(Math.log(M.far+1)/Math.LN2)),(H.isMeshPhongMaterial||H.isMeshToonMaterial||H.isMeshLambertMaterial||H.isMeshBasicMaterial||H.isMeshStandardMaterial||H.isShaderMaterial)&&ht.setValue(w,"isOrthographic",M.isOrthographicCamera===!0),q!==M&&(q=M,Qt=!0,Hs=!0)}if(U.isSkinnedMesh){ht.setOptional(w,U,"bindMatrix"),ht.setOptional(w,U,"bindMatrixInverse");let rn=U.skeleton;rn&&(rn.boneTexture===null&&rn.computeBoneTexture(),ht.setValue(w,"boneTexture",rn.boneTexture,E))}U.isBatchedMesh&&(ht.setOptional(w,U,"batchingTexture"),ht.setValue(w,"batchingTexture",U._matricesTexture,E),ht.setOptional(w,U,"batchingIdTexture"),ht.setValue(w,"batchingIdTexture",U._indirectTexture,E),ht.setOptional(w,U,"batchingColorTexture"),U._colorsTexture!==null&&ht.setValue(w,"batchingColorTexture",U._colorsTexture,E));let ks=z.morphAttributes;if((ks.position!==void 0||ks.normal!==void 0||ks.color!==void 0)&&Le.update(U,z,pn),(Qt||Ae.receiveShadow!==U.receiveShadow)&&(Ae.receiveShadow=U.receiveShadow,ht.setValue(w,"receiveShadow",U.receiveShadow)),H.isMeshGouraudMaterial&&H.envMap!==null&&(bn.envMap.value=Ee,bn.flipEnvMap.value=Ee.isCubeTexture&&Ee.isRenderTargetTexture===!1?-1:1),H.isMeshStandardMaterial&&H.envMap===null&&L.environment!==null&&(bn.envMapIntensity.value=L.environmentIntensity),Qt&&(ht.setValue(w,"toneMappingExposure",v.toneMappingExposure),Ae.needsLights&&yd(bn,Hs),re&&H.fog===!0&&he.refreshFogUniforms(bn,re),he.refreshMaterialUniforms(bn,H,V,ee,d.state.transmissionRenderTarget[M.id]),ds.upload(w,lh(Ae),bn,E)),H.isShaderMaterial&&H.uniformsNeedUpdate===!0&&(ds.upload(w,lh(Ae),bn,E),H.uniformsNeedUpdate=!1),H.isSpriteMaterial&&ht.setValue(w,"center",U.center),ht.setValue(w,"modelViewMatrix",U.modelViewMatrix),ht.setValue(w,"normalMatrix",U.normalMatrix),ht.setValue(w,"modelMatrix",U.matrixWorld),H.isShaderMaterial||H.isRawShaderMaterial){let rn=H.uniformsGroups;for(let Kn=0,Jn=rn.length;Kn<Jn;Kn++){let hh=rn[Kn];I.update(hh,pn),I.bind(hh,pn)}}return pn}function yd(M,L){M.ambientLightColor.needsUpdate=L,M.lightProbe.needsUpdate=L,M.directionalLights.needsUpdate=L,M.directionalLightShadows.needsUpdate=L,M.pointLights.needsUpdate=L,M.pointLightShadows.needsUpdate=L,M.spotLights.needsUpdate=L,M.spotLightShadows.needsUpdate=L,M.rectAreaLights.needsUpdate=L,M.hemisphereLights.needsUpdate=L}function qd(M){return M.isMeshLambertMaterial||M.isMeshToonMaterial||M.isMeshPhongMaterial||M.isMeshStandardMaterial||M.isShadowMaterial||M.isShaderMaterial&&M.lights===!0}this.getActiveCubeFace=function(){return T},this.getActiveMipmapLevel=function(){return A},this.getRenderTarget=function(){return R},this.setRenderTargetTextures=function(M,L,z){xe.get(M.texture).__webglTexture=L,xe.get(M.depthTexture).__webglTexture=z;let H=xe.get(M);H.__hasExternalTextures=!0,H.__autoAllocateDepthBuffer=z===void 0,H.__autoAllocateDepthBuffer||te.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),H.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(M,L){let z=xe.get(M);z.__webglFramebuffer=L,z.__useDefaultFramebuffer=L===void 0},this.setRenderTarget=function(M,L=0,z=0){R=M,T=L,A=z;let H=!0,U=null,re=!1,pe=!1;if(M){let Ee=xe.get(M);if(Ee.__useDefaultFramebuffer!==void 0)le.bindFramebuffer(w.FRAMEBUFFER,null),H=!1;else if(Ee.__webglFramebuffer===void 0)E.setupRenderTarget(M);else if(Ee.__hasExternalTextures)E.rebindTextures(M,xe.get(M.texture).__webglTexture,xe.get(M.depthTexture).__webglTexture);else if(M.depthBuffer){let Te=M.depthTexture;if(Ee.__boundDepthTexture!==Te){if(Te!==null&&xe.has(Te)&&(M.width!==Te.image.width||M.height!==Te.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");E.setupDepthRenderbuffer(M)}}let Oe=M.texture;(Oe.isData3DTexture||Oe.isDataArrayTexture||Oe.isCompressedArrayTexture)&&(pe=!0);let Be=xe.get(M).__webglFramebuffer;M.isWebGLCubeRenderTarget?(Array.isArray(Be[L])?U=Be[L][z]:U=Be[L],re=!0):M.samples>0&&E.useMultisampledRTT(M)===!1?U=xe.get(M).__webglMultisampledFramebuffer:Array.isArray(Be)?U=Be[z]:U=Be,C.copy(M.viewport),O.copy(M.scissor),N=M.scissorTest}else C.copy(ge).multiplyScalar(V).floor(),O.copy(Ue).multiplyScalar(V).floor(),N=Ke;if(le.bindFramebuffer(w.FRAMEBUFFER,U)&&H&&le.drawBuffers(M,U),le.viewport(C),le.scissor(O),le.setScissorTest(N),re){let Ee=xe.get(M.texture);w.framebufferTexture2D(w.FRAMEBUFFER,w.COLOR_ATTACHMENT0,w.TEXTURE_CUBE_MAP_POSITIVE_X+L,Ee.__webglTexture,z)}else if(pe){let Ee=xe.get(M.texture),Oe=L||0;w.framebufferTextureLayer(w.FRAMEBUFFER,w.COLOR_ATTACHMENT0,Ee.__webglTexture,z||0,Oe)}b=-1},this.readRenderTargetPixels=function(M,L,z,H,U,re,pe){if(!(M&&M.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let be=xe.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&pe!==void 0&&(be=be[pe]),be){le.bindFramebuffer(w.FRAMEBUFFER,be);try{let Ee=M.texture,Oe=Ee.format,Be=Ee.type;if(!_e.textureFormatReadable(Oe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!_e.textureTypeReadable(Be)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}L>=0&&L<=M.width-H&&z>=0&&z<=M.height-U&&w.readPixels(L,z,H,U,He.convert(Oe),He.convert(Be),re)}finally{let Ee=R!==null?xe.get(R).__webglFramebuffer:null;le.bindFramebuffer(w.FRAMEBUFFER,Ee)}}},this.readRenderTargetPixelsAsync=async function(M,L,z,H,U,re,pe){if(!(M&&M.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let be=xe.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&pe!==void 0&&(be=be[pe]),be){let Ee=M.texture,Oe=Ee.format,Be=Ee.type;if(!_e.textureFormatReadable(Oe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!_e.textureTypeReadable(Be))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(L>=0&&L<=M.width-H&&z>=0&&z<=M.height-U){le.bindFramebuffer(w.FRAMEBUFFER,be);let Te=w.createBuffer();w.bindBuffer(w.PIXEL_PACK_BUFFER,Te),w.bufferData(w.PIXEL_PACK_BUFFER,re.byteLength,w.STREAM_READ),w.readPixels(L,z,H,U,He.convert(Oe),He.convert(Be),0);let Ze=R!==null?xe.get(R).__webglFramebuffer:null;le.bindFramebuffer(w.FRAMEBUFFER,Ze);let lt=w.fenceSync(w.SYNC_GPU_COMMANDS_COMPLETE,0);return w.flush(),await yf(w,lt,4),w.bindBuffer(w.PIXEL_PACK_BUFFER,Te),w.getBufferSubData(w.PIXEL_PACK_BUFFER,0,re),w.deleteBuffer(Te),w.deleteSync(lt),re}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(M,L=null,z=0){M.isTexture!==!0&&(js("WebGLRenderer: copyFramebufferToTexture function signature has changed."),L=arguments[0]||null,M=arguments[1]);let H=Math.pow(2,-z),U=Math.floor(M.image.width*H),re=Math.floor(M.image.height*H),pe=L!==null?L.x:0,be=L!==null?L.y:0;E.setTexture2D(M,0),w.copyTexSubImage2D(w.TEXTURE_2D,z,0,0,pe,be,U,re),le.unbindTexture()},this.copyTextureToTexture=function(M,L,z=null,H=null,U=0){M.isTexture!==!0&&(js("WebGLRenderer: copyTextureToTexture function signature has changed."),H=arguments[0]||null,M=arguments[1],L=arguments[2],U=arguments[3]||0,z=null);let re,pe,be,Ee,Oe,Be,Te,Ze,lt,ct=M.isCompressedTexture?M.mipmaps[U]:M.image;z!==null?(re=z.max.x-z.min.x,pe=z.max.y-z.min.y,be=z.isBox3?z.max.z-z.min.z:1,Ee=z.min.x,Oe=z.min.y,Be=z.isBox3?z.min.z:0):(re=ct.width,pe=ct.height,be=ct.depth||1,Ee=0,Oe=0,Be=0),H!==null?(Te=H.x,Ze=H.y,lt=H.z):(Te=0,Ze=0,lt=0);let Wt=He.convert(L.format),Qe=He.convert(L.type),Ae;L.isData3DTexture?(E.setTexture3D(L,0),Ae=w.TEXTURE_3D):L.isDataArrayTexture||L.isCompressedArrayTexture?(E.setTexture2DArray(L,0),Ae=w.TEXTURE_2D_ARRAY):(E.setTexture2D(L,0),Ae=w.TEXTURE_2D),w.pixelStorei(w.UNPACK_FLIP_Y_WEBGL,L.flipY),w.pixelStorei(w.UNPACK_PREMULTIPLY_ALPHA_WEBGL,L.premultiplyAlpha),w.pixelStorei(w.UNPACK_ALIGNMENT,L.unpackAlignment);let Pn=w.getParameter(w.UNPACK_ROW_LENGTH),$e=w.getParameter(w.UNPACK_IMAGE_HEIGHT),pn=w.getParameter(w.UNPACK_SKIP_PIXELS),Gi=w.getParameter(w.UNPACK_SKIP_ROWS),Qt=w.getParameter(w.UNPACK_SKIP_IMAGES);w.pixelStorei(w.UNPACK_ROW_LENGTH,ct.width),w.pixelStorei(w.UNPACK_IMAGE_HEIGHT,ct.height),w.pixelStorei(w.UNPACK_SKIP_PIXELS,Ee),w.pixelStorei(w.UNPACK_SKIP_ROWS,Oe),w.pixelStorei(w.UNPACK_SKIP_IMAGES,Be);let Hs=M.isDataArrayTexture||M.isData3DTexture,ht=L.isDataArrayTexture||L.isData3DTexture;if(M.isRenderTargetTexture||M.isDepthTexture){let bn=xe.get(M),ks=xe.get(L),rn=xe.get(bn.__renderTarget),Kn=xe.get(ks.__renderTarget);le.bindFramebuffer(w.READ_FRAMEBUFFER,rn.__webglFramebuffer),le.bindFramebuffer(w.DRAW_FRAMEBUFFER,Kn.__webglFramebuffer);for(let Jn=0;Jn<be;Jn++)Hs&&w.framebufferTextureLayer(w.READ_FRAMEBUFFER,w.COLOR_ATTACHMENT0,xe.get(M).__webglTexture,U,Be+Jn),M.isDepthTexture?(ht&&w.framebufferTextureLayer(w.DRAW_FRAMEBUFFER,w.COLOR_ATTACHMENT0,xe.get(L).__webglTexture,U,lt+Jn),w.blitFramebuffer(Ee,Oe,re,pe,Te,Ze,re,pe,w.DEPTH_BUFFER_BIT,w.NEAREST)):ht?w.copyTexSubImage3D(Ae,U,Te,Ze,lt+Jn,Ee,Oe,re,pe):w.copyTexSubImage2D(Ae,U,Te,Ze,lt+Jn,Ee,Oe,re,pe);le.bindFramebuffer(w.READ_FRAMEBUFFER,null),le.bindFramebuffer(w.DRAW_FRAMEBUFFER,null)}else ht?M.isDataTexture||M.isData3DTexture?w.texSubImage3D(Ae,U,Te,Ze,lt,re,pe,be,Wt,Qe,ct.data):L.isCompressedArrayTexture?w.compressedTexSubImage3D(Ae,U,Te,Ze,lt,re,pe,be,Wt,ct.data):w.texSubImage3D(Ae,U,Te,Ze,lt,re,pe,be,Wt,Qe,ct):M.isDataTexture?w.texSubImage2D(w.TEXTURE_2D,U,Te,Ze,re,pe,Wt,Qe,ct.data):M.isCompressedTexture?w.compressedTexSubImage2D(w.TEXTURE_2D,U,Te,Ze,ct.width,ct.height,Wt,ct.data):w.texSubImage2D(w.TEXTURE_2D,U,Te,Ze,re,pe,Wt,Qe,ct);w.pixelStorei(w.UNPACK_ROW_LENGTH,Pn),w.pixelStorei(w.UNPACK_IMAGE_HEIGHT,$e),w.pixelStorei(w.UNPACK_SKIP_PIXELS,pn),w.pixelStorei(w.UNPACK_SKIP_ROWS,Gi),w.pixelStorei(w.UNPACK_SKIP_IMAGES,Qt),U===0&&L.generateMipmaps&&w.generateMipmap(Ae),le.unbindTexture()},this.copyTextureToTexture3D=function(M,L,z=null,H=null,U=0){return M.isTexture!==!0&&(js("WebGLRenderer: copyTextureToTexture3D function signature has changed."),z=arguments[0]||null,H=arguments[1]||null,M=arguments[2],L=arguments[3],U=arguments[4]||0),js('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(M,L,z,H,U)},this.initRenderTarget=function(M){xe.get(M).__webglFramebuffer===void 0&&E.setupRenderTarget(M)},this.initTexture=function(M){M.isCubeTexture?E.setTextureCube(M,0):M.isData3DTexture?E.setTexture3D(M,0):M.isDataArrayTexture||M.isCompressedArrayTexture?E.setTexture2DArray(M,0):E.setTexture2D(M,0),le.unbindTexture()},this.resetState=function(){T=0,A=0,R=null,le.reset(),ot.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Bn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorspace=Ge._getDrawingBufferColorSpace(e),t.unpackColorSpace=Ge._getUnpackColorSpace()}};var or=class extends Mt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new wn,this.environmentIntensity=1,this.environmentRotation=new wn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}};var lr=class extends wt{constructor(e=null,t=1,n=1,s,r,a,o,l,c=qt,h=qt,u,f){super(null,a,o,l,c,h,s,r,u,f),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Ma=class extends nn{constructor(e,t,n,s=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},rs=new ut,uu=new ut,ea=[],du=new ln,v2=new ut,Ys=new xt,Zs=new Ai,cr=class extends xt{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Ma(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,v2)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new ln),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,rs),du.copy(e.boundingBox).applyMatrix4(rs),this.boundingBox.union(du)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Ai),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,rs),Zs.copy(e.boundingSphere).applyMatrix4(rs),this.boundingSphere.union(Zs)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,a=e*r+1;for(let o=0;o<n.length;o++)n[o]=s[a+o]}raycast(e,t){let n=this.matrixWorld,s=this.count;if(Ys.geometry=this.geometry,Ys.material=this.material,Ys.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Zs.copy(this.boundingSphere),Zs.applyMatrix4(n),e.ray.intersectsSphere(Zs)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,rs),uu.multiplyMatrices(n,rs),Ys.matrixWorld=uu,Ys.raycast(e,ea);for(let a=0,o=ea.length;a<o;a++){let l=ea[a];l.instanceId=r,l.object=this,t.push(l)}ea.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new Ma(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){let n=t.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new lr(new Float32Array(s*this.count),s,this.count,Sc,Tn));let r=this.morphTexture.source.data.data,a=0;for(let c=0;c<n.length;c++)a+=n[c];let o=this.geometry.morphTargetsRelative?1:1-a,l=s*e;r[l]=o,r.set(n,l+1)}updateMorphTargets(){}dispose(){return this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null),this}};var Sa=class extends wt{constructor(e,t,n,s,r,a,o,l,c){super(e,t,n,s,r,a,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}},cn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,s=this.getPoint(0),r=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),r+=n.distanceTo(s),t.push(r),s=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t){let n=this.getLengths(),s=0,r=n.length,a;t?a=t:a=e*n[r-1];let o=0,l=r-1,c;for(;o<=l;)if(s=Math.floor(o+(l-o)/2),c=n[s]-a,c<0)o=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,n[s]===a)return s/(r-1);let h=n[s],f=n[s+1]-h,p=(a-h)/f;return(s+p)/(r-1)}getTangent(e,t){let s=e-1e-4,r=e+1e-4;s<0&&(s=0),r>1&&(r=1);let a=this.getPoint(s),o=this.getPoint(r),l=t||(a.isVector2?new K:new P);return l.copy(o).sub(a).normalize(),l}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t){let n=new P,s=[],r=[],a=[],o=new P,l=new ut;for(let p=0;p<=e;p++){let g=p/e;s[p]=this.getTangentAt(g,new P)}r[0]=new P,a[0]=new P;let c=Number.MAX_VALUE,h=Math.abs(s[0].x),u=Math.abs(s[0].y),f=Math.abs(s[0].z);h<=c&&(c=h,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),f<=c&&n.set(0,0,1),o.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],o),a[0].crossVectors(s[0],r[0]);for(let p=1;p<=e;p++){if(r[p]=r[p-1].clone(),a[p]=a[p-1].clone(),o.crossVectors(s[p-1],s[p]),o.length()>Number.EPSILON){o.normalize();let g=Math.acos(_t(s[p-1].dot(s[p]),-1,1));r[p].applyMatrix4(l.makeRotationAxis(o,g))}a[p].crossVectors(s[p],r[p])}if(t===!0){let p=Math.acos(_t(r[0].dot(r[e]),-1,1));p/=e,s[0].dot(o.crossVectors(r[0],r[e]))>0&&(p=-p);for(let g=1;g<=e;g++)r[g].applyMatrix4(l.makeRotationAxis(s[g],p*g)),a[g].crossVectors(s[g],r[g])}return{tangents:s,normals:r,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},hr=class extends cn{constructor(e=0,t=0,n=1,s=1,r=0,a=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=a,this.aClockwise=o,this.aRotation=l}getPoint(e,t=new K){let n=t,s=Math.PI*2,r=this.aEndAngle-this.aStartAngle,a=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(a?r=0:r=s),this.aClockwise===!0&&!a&&(r===s?r=-s:r=r-s);let o=this.aStartAngle+e*r,l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),f=l-this.aX,p=c-this.aY;l=f*h-p*u+this.aX,c=f*u+p*h+this.aY}return n.set(l,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},Xl=class extends hr{constructor(e,t,n,s,r,a){super(e,t,n,n,s,r,a),this.isArcCurve=!0,this.type="ArcCurve"}};function Rc(){let i=0,e=0,t=0,n=0;function s(r,a,o,l){i=r,e=o,t=-3*r+3*a-2*o-l,n=2*r-2*a+o+l}return{initCatmullRom:function(r,a,o,l,c){s(a,o,c*(o-r),c*(l-a))},initNonuniformCatmullRom:function(r,a,o,l,c,h,u){let f=(a-r)/c-(o-r)/(c+h)+(o-a)/h,p=(o-a)/h-(l-a)/(h+u)+(l-o)/u;f*=h,p*=h,s(a,o,f,p)},calc:function(r){let a=r*r,o=a*r;return i+e*r+t*a+n*o}}}var ta=new P,Vo=new Rc,Go=new Rc,Wo=new Rc,Yl=class extends cn{constructor(e=[],t=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=s}getPoint(e,t=new P){let n=t,s=this.points,r=s.length,a=(r-(this.closed?0:1))*e,o=Math.floor(a),l=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/r)+1)*r:l===0&&o===r-1&&(o=r-2,l=1);let c,h;this.closed||o>0?c=s[(o-1)%r]:(ta.subVectors(s[0],s[1]).add(s[0]),c=ta);let u=s[o%r],f=s[(o+1)%r];if(this.closed||o+2<r?h=s[(o+2)%r]:(ta.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=ta),this.curveType==="centripetal"||this.curveType==="chordal"){let p=this.curveType==="chordal"?.5:.25,g=Math.pow(c.distanceToSquared(u),p),x=Math.pow(u.distanceToSquared(f),p),m=Math.pow(f.distanceToSquared(h),p);x<1e-4&&(x=1),g<1e-4&&(g=x),m<1e-4&&(m=x),Vo.initNonuniformCatmullRom(c.x,u.x,f.x,h.x,g,x,m),Go.initNonuniformCatmullRom(c.y,u.y,f.y,h.y,g,x,m),Wo.initNonuniformCatmullRom(c.z,u.z,f.z,h.z,g,x,m)}else this.curveType==="catmullrom"&&(Vo.initCatmullRom(c.x,u.x,f.x,h.x,this.tension),Go.initCatmullRom(c.y,u.y,f.y,h.y,this.tension),Wo.initCatmullRom(c.z,u.z,f.z,h.z,this.tension));return n.set(Vo.calc(l),Go.calc(l),Wo.calc(l)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(s.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let s=this.points[t];e.points.push(s.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(new P().fromArray(s))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function fu(i,e,t,n,s){let r=(n-e)*.5,a=(s-t)*.5,o=i*i,l=i*o;return(2*t-2*n+r+a)*l+(-3*t+3*n-2*r-a)*o+r*i+t}function _2(i,e){let t=1-i;return t*t*e}function y2(i,e){return 2*(1-i)*i*e}function q2(i,e){return i*i*e}function er(i,e,t,n){return _2(i,e)+y2(i,t)+q2(i,n)}function M2(i,e){let t=1-i;return t*t*t*e}function S2(i,e){let t=1-i;return 3*t*t*i*e}function b2(i,e){return 3*(1-i)*i*i*e}function E2(i,e){return i*i*i*e}function tr(i,e,t,n,s){return M2(i,e)+S2(i,t)+b2(i,n)+E2(i,s)}var ba=class extends cn{constructor(e=new K,t=new K,n=new K,s=new K){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new K){let n=t,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(tr(e,s.x,r.x,a.x,o.x),tr(e,s.y,r.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Zl=class extends cn{constructor(e=new P,t=new P,n=new P,s=new P){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new P){let n=t,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(tr(e,s.x,r.x,a.x,o.x),tr(e,s.y,r.y,a.y,o.y),tr(e,s.z,r.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Ea=class extends cn{constructor(e=new K,t=new K){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new K){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new K){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},jl=class extends cn{constructor(e=new P,t=new P){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new P){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new P){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ta=class extends cn{constructor(e=new K,t=new K,n=new K){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new K){let n=t,s=this.v0,r=this.v1,a=this.v2;return n.set(er(e,s.x,r.x,a.x),er(e,s.y,r.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Kl=class extends cn{constructor(e=new P,t=new P,n=new P){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new P){let n=t,s=this.v0,r=this.v1,a=this.v2;return n.set(er(e,s.x,r.x,a.x),er(e,s.y,r.y,a.y),er(e,s.z,r.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},bs=class extends cn{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new K){let n=t,s=this.points,r=(s.length-1)*e,a=Math.floor(r),o=r-a,l=s[a===0?a:a-1],c=s[a],h=s[a>s.length-2?s.length-1:a+1],u=s[a>s.length-3?s.length-1:a+2];return n.set(fu(o,l.x,c.x,h.x,u.x),fu(o,l.y,c.y,h.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(s.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let s=this.points[t];e.points.push(s.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(new K().fromArray(s))}return this}},Jl=Object.freeze({__proto__:null,ArcCurve:Xl,CatmullRomCurve3:Yl,CubicBezierCurve:ba,CubicBezierCurve3:Zl,EllipseCurve:hr,LineCurve:Ea,LineCurve3:jl,QuadraticBezierCurve:Ta,QuadraticBezierCurve3:Kl,SplineCurve:bs}),Ql=class extends cn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let n=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Jl[n](t,e))}return this}getPoint(e,t){let n=e*this.getLength(),s=this.getCurveLengths(),r=0;for(;r<s.length;){if(s[r]>=n){let a=s[r]-n,o=this.curves[r],l=o.getLength(),c=l===0?0:1-a/l;return o.getPointAt(c,t)}r++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let n=0,s=this.curves.length;n<s;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],n;for(let s=0,r=this.curves;s<r.length;s++){let a=r[s],o=a.isEllipseCurve?e*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?e*a.points.length:e,l=a.getPoints(o);for(let c=0;c<l.length;c++){let h=l[c];n&&n.equals(h)||(t.push(h),n=h)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let s=e.curves[t];this.curves.push(s.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){let s=this.curves[t];e.curves.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let s=e.curves[t];this.curves.push(new Jl[s.type]().fromJSON(s))}return this}},Es=class extends Ql{constructor(e){super(),this.type="Path",this.currentPoint=new K,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let n=new Ea(this.currentPoint.clone(),new K(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,s){let r=new Ta(this.currentPoint.clone(),new K(e,t),new K(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(e,t,n,s,r,a){let o=new ba(this.currentPoint.clone(),new K(e,t),new K(n,s),new K(r,a));return this.curves.push(o),this.currentPoint.set(r,a),this}splineThru(e){let t=[this.currentPoint.clone()].concat(e),n=new bs(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,s,r,a){let o=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(e+o,t+l,n,s,r,a),this}absarc(e,t,n,s,r,a){return this.absellipse(e,t,n,n,s,r,a),this}ellipse(e,t,n,s,r,a,o,l){let c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(e+c,t+h,n,s,r,a,o,l),this}absellipse(e,t,n,s,r,a,o,l){let c=new hr(e,t,n,s,r,a,o,l);if(this.curves.length>0){let u=c.getPoint(0);u.equals(this.currentPoint)||this.lineTo(u.x,u.y)}this.curves.push(c);let h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},Ts=class i extends Rt{constructor(e=[new K(0,-.5),new K(.5,0),new K(0,.5)],t=12,n=0,s=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:e,segments:t,phiStart:n,phiLength:s},t=Math.floor(t),s=_t(s,0,Math.PI*2);let r=[],a=[],o=[],l=[],c=[],h=1/t,u=new P,f=new K,p=new P,g=new P,x=new P,m=0,d=0;for(let S=0;S<=e.length-1;S++)switch(S){case 0:m=e[S+1].x-e[S].x,d=e[S+1].y-e[S].y,p.x=d*1,p.y=-m,p.z=d*0,x.copy(p),p.normalize(),l.push(p.x,p.y,p.z);break;case e.length-1:l.push(x.x,x.y,x.z);break;default:m=e[S+1].x-e[S].x,d=e[S+1].y-e[S].y,p.x=d*1,p.y=-m,p.z=d*0,g.copy(p),p.x+=x.x,p.y+=x.y,p.z+=x.z,p.normalize(),l.push(p.x,p.y,p.z),x.copy(g)}for(let S=0;S<=t;S++){let y=n+S*h*s,v=Math.sin(y),D=Math.cos(y);for(let T=0;T<=e.length-1;T++){u.x=e[T].x*v,u.y=e[T].y,u.z=e[T].x*D,a.push(u.x,u.y,u.z),f.x=S/t,f.y=T/(e.length-1),o.push(f.x,f.y);let A=l[3*T+0]*v,R=l[3*T+1],b=l[3*T+0]*D;c.push(A,R,b)}}for(let S=0;S<t;S++)for(let y=0;y<e.length-1;y++){let v=y+S*e.length,D=v,T=v+e.length,A=v+e.length+1,R=v+1;r.push(D,T,R),r.push(A,R,T)}this.setIndex(r),this.setAttribute("position",new je(a,3)),this.setAttribute("uv",new je(o,2)),this.setAttribute("normal",new je(c,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.points,e.segments,e.phiStart,e.phiLength)}},wa=class i extends Ts{constructor(e=1,t=1,n=4,s=8){let r=new Es;r.absarc(0,-t/2,e,Math.PI*1.5,0),r.absarc(0,t/2,e,0,Math.PI*.5),super(r.getPoints(n),s),this.type="CapsuleGeometry",this.parameters={radius:e,length:t,capSegments:n,radialSegments:s}}static fromJSON(e){return new i(e.radius,e.length,e.capSegments,e.radialSegments)}},Aa=class i extends Rt{constructor(e=1,t=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:s},t=Math.max(3,t);let r=[],a=[],o=[],l=[],c=new P,h=new K;a.push(0,0,0),o.push(0,0,1),l.push(.5,.5);for(let u=0,f=3;u<=t;u++,f+=3){let p=n+u/t*s;c.x=e*Math.cos(p),c.y=e*Math.sin(p),a.push(c.x,c.y,c.z),o.push(0,0,1),h.x=(a[f]/e+1)/2,h.y=(a[f+1]/e+1)/2,l.push(h.x,h.y)}for(let u=1;u<=t;u++)r.push(u,u+1,0);this.setIndex(r),this.setAttribute("position",new je(a,3)),this.setAttribute("normal",new je(o,3)),this.setAttribute("uv",new je(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.segments,e.thetaStart,e.thetaLength)}},Vn=class i extends Rt{constructor(e=1,t=1,n=1,s=32,r=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:s,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:l};let c=this;s=Math.floor(s),r=Math.floor(r);let h=[],u=[],f=[],p=[],g=0,x=[],m=n/2,d=0;S(),a===!1&&(e>0&&y(!0),t>0&&y(!1)),this.setIndex(h),this.setAttribute("position",new je(u,3)),this.setAttribute("normal",new je(f,3)),this.setAttribute("uv",new je(p,2));function S(){let v=new P,D=new P,T=0,A=(t-e)/n;for(let R=0;R<=r;R++){let b=[],q=R/r,C=q*(t-e)+e;for(let O=0;O<=s;O++){let N=O/s,B=N*l+o,W=Math.sin(B),k=Math.cos(B);D.x=C*W,D.y=-q*n+m,D.z=C*k,u.push(D.x,D.y,D.z),v.set(W,A,k).normalize(),f.push(v.x,v.y,v.z),p.push(N,1-q),b.push(g++)}x.push(b)}for(let R=0;R<s;R++)for(let b=0;b<r;b++){let q=x[b][R],C=x[b+1][R],O=x[b+1][R+1],N=x[b][R+1];(e>0||b!==0)&&(h.push(q,C,N),T+=3),(t>0||b!==r-1)&&(h.push(C,O,N),T+=3)}c.addGroup(d,T,0),d+=T}function y(v){let D=g,T=new K,A=new P,R=0,b=v===!0?e:t,q=v===!0?1:-1;for(let O=1;O<=s;O++)u.push(0,m*q,0),f.push(0,q,0),p.push(.5,.5),g++;let C=g;for(let O=0;O<=s;O++){let B=O/s*l+o,W=Math.cos(B),k=Math.sin(B);A.x=b*k,A.y=m*q,A.z=b*W,u.push(A.x,A.y,A.z),f.push(0,q,0),T.x=W*.5+.5,T.y=k*.5*q+.5,p.push(T.x,T.y),g++}for(let O=0;O<s;O++){let N=D+O,B=C+O;v===!0?h.push(B,B+1,N):h.push(B+1,B,N),R+=3}c.addGroup(d,R,v===!0?1:2),d+=R}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}};var fs=class extends Es{constructor(e){super(e),this.uuid=Bi(),this.type="Shape",this.holes=[]}getPointsHoles(e){let t=[];for(let n=0,s=this.holes.length;n<s;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let s=e.holes[t];this.holes.push(s.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){let s=this.holes[t];e.holes.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let s=e.holes[t];this.holes.push(new Es().fromJSON(s))}return this}},T2={triangulate:function(i,e,t=2){let n=e&&e.length,s=n?e[0]*t:i.length,r=Vu(i,0,s,t,!0),a=[];if(!r||r.next===r.prev)return a;let o,l,c,h,u,f,p;if(n&&(r=P2(i,e,r,t)),i.length>80*t){o=c=i[0],l=h=i[1];for(let g=t;g<s;g+=t)u=i[g],f=i[g+1],u<o&&(o=u),f<l&&(l=f),u>c&&(c=u),f>h&&(h=f);p=Math.max(c-o,h-l),p=p!==0?32767/p:0}return ur(r,a,t,o,l,p,0),a}};function Vu(i,e,t,n,s){let r,a;if(s===k2(i,e,t,n)>0)for(r=e;r<t;r+=n)a=pu(r,i[r],i[r+1],a);else for(r=t-n;r>=e;r-=n)a=pu(r,i[r],i[r+1],a);return a&&Wa(a,a.next)&&(fr(a),a=a.next),a}function Di(i,e){if(!i)return i;e||(e=i);let t=i,n;do if(n=!1,!t.steiner&&(Wa(t,t.next)||ft(t.prev,t,t.next)===0)){if(fr(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function ur(i,e,t,n,s,r,a){if(!i)return;!a&&r&&N2(i,n,s,r);let o=i,l,c;for(;i.prev!==i.next;){if(l=i.prev,c=i.next,r?A2(i,n,s,r):w2(i)){e.push(l.i/t|0),e.push(i.i/t|0),e.push(c.i/t|0),fr(i),i=c.next,o=c.next;continue}if(i=c,i===o){a?a===1?(i=C2(Di(i),e,t),ur(i,e,t,n,s,r,2)):a===2&&R2(i,e,t,n,s,r):ur(Di(i),e,t,n,s,r,1);break}}}function w2(i){let e=i.prev,t=i,n=i.next;if(ft(e,t,n)>=0)return!1;let s=e.x,r=t.x,a=n.x,o=e.y,l=t.y,c=n.y,h=s<r?s<a?s:a:r<a?r:a,u=o<l?o<c?o:c:l<c?l:c,f=s>r?s>a?s:a:r>a?r:a,p=o>l?o>c?o:c:l>c?l:c,g=n.next;for(;g!==e;){if(g.x>=h&&g.x<=f&&g.y>=u&&g.y<=p&&ls(s,o,r,l,a,c,g.x,g.y)&&ft(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function A2(i,e,t,n){let s=i.prev,r=i,a=i.next;if(ft(s,r,a)>=0)return!1;let o=s.x,l=r.x,c=a.x,h=s.y,u=r.y,f=a.y,p=o<l?o<c?o:c:l<c?l:c,g=h<u?h<f?h:f:u<f?u:f,x=o>l?o>c?o:c:l>c?l:c,m=h>u?h>f?h:f:u>f?u:f,d=$l(p,g,e,t,n),S=$l(x,m,e,t,n),y=i.prevZ,v=i.nextZ;for(;y&&y.z>=d&&v&&v.z<=S;){if(y.x>=p&&y.x<=x&&y.y>=g&&y.y<=m&&y!==s&&y!==a&&ls(o,h,l,u,c,f,y.x,y.y)&&ft(y.prev,y,y.next)>=0||(y=y.prevZ,v.x>=p&&v.x<=x&&v.y>=g&&v.y<=m&&v!==s&&v!==a&&ls(o,h,l,u,c,f,v.x,v.y)&&ft(v.prev,v,v.next)>=0))return!1;v=v.nextZ}for(;y&&y.z>=d;){if(y.x>=p&&y.x<=x&&y.y>=g&&y.y<=m&&y!==s&&y!==a&&ls(o,h,l,u,c,f,y.x,y.y)&&ft(y.prev,y,y.next)>=0)return!1;y=y.prevZ}for(;v&&v.z<=S;){if(v.x>=p&&v.x<=x&&v.y>=g&&v.y<=m&&v!==s&&v!==a&&ls(o,h,l,u,c,f,v.x,v.y)&&ft(v.prev,v,v.next)>=0)return!1;v=v.nextZ}return!0}function C2(i,e,t){let n=i;do{let s=n.prev,r=n.next.next;!Wa(s,r)&&Gu(s,n,n.next,r)&&dr(s,r)&&dr(r,s)&&(e.push(s.i/t|0),e.push(n.i/t|0),e.push(r.i/t|0),fr(n),fr(n.next),n=i=r),n=n.next}while(n!==i);return Di(n)}function R2(i,e,t,n,s,r){let a=i;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&B2(a,o)){let l=Wu(a,o);a=Di(a,a.next),l=Di(l,l.next),ur(a,e,t,n,s,r,0),ur(l,e,t,n,s,r,0);return}o=o.next}a=a.next}while(a!==i)}function P2(i,e,t,n){let s=[],r,a,o,l,c;for(r=0,a=e.length;r<a;r++)o=e[r]*n,l=r<a-1?e[r+1]*n:i.length,c=Vu(i,o,l,n,!1),c===c.next&&(c.steiner=!0),s.push(F2(c));for(s.sort(I2),r=0;r<s.length;r++)t=D2(s[r],t);return t}function I2(i,e){return i.x-e.x}function D2(i,e){let t=L2(i,e);if(!t)return e;let n=Wu(t,i);return Di(n,n.next),Di(t,t.next)}function L2(i,e){let t=e,n=-1/0,s,r=i.x,a=i.y;do{if(a<=t.y&&a>=t.next.y&&t.next.y!==t.y){let f=t.x+(a-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(f<=r&&f>n&&(n=f,s=t.x<t.next.x?t:t.next,f===r))return s}t=t.next}while(t!==e);if(!s)return null;let o=s,l=s.x,c=s.y,h=1/0,u;t=s;do r>=t.x&&t.x>=l&&r!==t.x&&ls(a<c?r:n,a,l,c,a<c?n:r,a,t.x,t.y)&&(u=Math.abs(a-t.y)/(r-t.x),dr(t,i)&&(u<h||u===h&&(t.x>s.x||t.x===s.x&&U2(s,t)))&&(s=t,h=u)),t=t.next;while(t!==o);return s}function U2(i,e){return ft(i.prev,i,e.prev)<0&&ft(e.next,i,i.next)<0}function N2(i,e,t,n){let s=i;do s.z===0&&(s.z=$l(s.x,s.y,e,t,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,O2(s)}function O2(i){let e,t,n,s,r,a,o,l,c=1;do{for(t=i,i=null,r=null,a=0;t;){for(a++,n=t,o=0,e=0;e<c&&(o++,n=n.nextZ,!!n);e++);for(l=c;o>0||l>0&&n;)o!==0&&(l===0||!n||t.z<=n.z)?(s=t,t=t.nextZ,o--):(s=n,n=n.nextZ,l--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;t=n}r.nextZ=null,c*=2}while(a>1);return i}function $l(i,e,t,n,s){return i=(i-t)*s|0,e=(e-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,i|e<<1}function F2(i){let e=i,t=i;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==i);return t}function ls(i,e,t,n,s,r,a,o){return(s-a)*(e-o)>=(i-a)*(r-o)&&(i-a)*(n-o)>=(t-a)*(e-o)&&(t-a)*(r-o)>=(s-a)*(n-o)}function B2(i,e){return i.next.i!==e.i&&i.prev.i!==e.i&&!z2(i,e)&&(dr(i,e)&&dr(e,i)&&H2(i,e)&&(ft(i.prev,i,e.prev)||ft(i,e.prev,e))||Wa(i,e)&&ft(i.prev,i,i.next)>0&&ft(e.prev,e,e.next)>0)}function ft(i,e,t){return(e.y-i.y)*(t.x-e.x)-(e.x-i.x)*(t.y-e.y)}function Wa(i,e){return i.x===e.x&&i.y===e.y}function Gu(i,e,t,n){let s=ia(ft(i,e,t)),r=ia(ft(i,e,n)),a=ia(ft(t,n,i)),o=ia(ft(t,n,e));return!!(s!==r&&a!==o||s===0&&na(i,t,e)||r===0&&na(i,n,e)||a===0&&na(t,i,n)||o===0&&na(t,e,n))}function na(i,e,t){return e.x<=Math.max(i.x,t.x)&&e.x>=Math.min(i.x,t.x)&&e.y<=Math.max(i.y,t.y)&&e.y>=Math.min(i.y,t.y)}function ia(i){return i>0?1:i<0?-1:0}function z2(i,e){let t=i;do{if(t.i!==i.i&&t.next.i!==i.i&&t.i!==e.i&&t.next.i!==e.i&&Gu(t,t.next,i,e))return!0;t=t.next}while(t!==i);return!1}function dr(i,e){return ft(i.prev,i,i.next)<0?ft(i,e,i.next)>=0&&ft(i,i.prev,e)>=0:ft(i,e,i.prev)<0||ft(i,i.next,e)<0}function H2(i,e){let t=i,n=!1,s=(i.x+e.x)/2,r=(i.y+e.y)/2;do t.y>r!=t.next.y>r&&t.next.y!==t.y&&s<(t.next.x-t.x)*(r-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==i);return n}function Wu(i,e){let t=new ec(i.i,i.x,i.y),n=new ec(e.i,e.x,e.y),s=i.next,r=e.prev;return i.next=e,e.prev=i,t.next=s,s.prev=t,n.next=t,t.prev=n,r.next=n,n.prev=r,n}function pu(i,e,t,n){let s=new ec(i,e,t);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function fr(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function ec(i,e,t){this.i=i,this.x=e,this.y=t,this.prev=null,this.next=null,this.z=0,this.prevZ=null,this.nextZ=null,this.steiner=!1}function k2(i,e,t,n){let s=0;for(let r=e,a=t-n;r<t;r+=n)s+=(i[a]-i[r])*(i[r+1]+i[a+1]),a=r;return s}var ps=class i{static area(e){let t=e.length,n=0;for(let s=t-1,r=0;r<t;s=r++)n+=e[s].x*e[r].y-e[r].x*e[s].y;return n*.5}static isClockWise(e){return i.area(e)<0}static triangulateShape(e,t){let n=[],s=[],r=[];mu(e),gu(n,e);let a=e.length;t.forEach(mu);for(let l=0;l<t.length;l++)s.push(a),a+=t[l].length,gu(n,t[l]);let o=T2.triangulate(n,s);for(let l=0;l<o.length;l+=3)r.push(o.slice(l,l+3));return r}};function mu(i){let e=i.length;e>2&&i[e-1].equals(i[0])&&i.pop()}function gu(i,e){for(let t=0;t<e.length;t++)i.push(e[t].x),i.push(e[t].y)}var Ca=class i extends Rt{constructor(e=new fs([new K(.5,.5),new K(-.5,.5),new K(-.5,-.5),new K(.5,-.5)]),t={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];let n=this,s=[],r=[];for(let o=0,l=e.length;o<l;o++){let c=e[o];a(c)}this.setAttribute("position",new je(s,3)),this.setAttribute("uv",new je(r,2)),this.computeVertexNormals();function a(o){let l=[],c=t.curveSegments!==void 0?t.curveSegments:12,h=t.steps!==void 0?t.steps:1,u=t.depth!==void 0?t.depth:1,f=t.bevelEnabled!==void 0?t.bevelEnabled:!0,p=t.bevelThickness!==void 0?t.bevelThickness:.2,g=t.bevelSize!==void 0?t.bevelSize:p-.1,x=t.bevelOffset!==void 0?t.bevelOffset:0,m=t.bevelSegments!==void 0?t.bevelSegments:3,d=t.extrudePath,S=t.UVGenerator!==void 0?t.UVGenerator:V2,y,v=!1,D,T,A,R;d&&(y=d.getSpacedPoints(h),v=!0,f=!1,D=d.computeFrenetFrames(h,!1),T=new P,A=new P,R=new P),f||(m=0,p=0,g=0,x=0);let b=o.extractPoints(c),q=b.shape,C=b.holes;if(!ps.isClockWise(q)){q=q.reverse();for(let Q=0,ie=C.length;Q<ie;Q++){let w=C[Q];ps.isClockWise(w)&&(C[Q]=w.reverse())}}let N=ps.triangulateShape(q,C),B=q;for(let Q=0,ie=C.length;Q<ie;Q++){let w=C[Q];q=q.concat(w)}function W(Q,ie,w){return ie||console.error("THREE.ExtrudeGeometry: vec does not exist"),Q.clone().addScaledVector(ie,w)}let k=q.length,ee=N.length;function V(Q,ie,w){let we,te,_e,le=Q.x-ie.x,Pe=Q.y-ie.y,xe=w.x-Q.x,E=w.y-Q.y,_=le*le+Pe*Pe,F=le*E-Pe*xe;if(Math.abs(F)>Number.EPSILON){let Z=Math.sqrt(_),$=Math.sqrt(xe*xe+E*E),j=ie.x-Pe/Z,Se=ie.y+le/Z,he=w.x-E/$,ve=w.y+xe/$,Ve=((he-j)*E-(ve-Se)*xe)/(le*E-Pe*xe);we=j+le*Ve-Q.x,te=Se+Pe*Ve-Q.y;let ne=we*we+te*te;if(ne<=2)return new K(we,te);_e=Math.sqrt(ne/2)}else{let Z=!1;le>Number.EPSILON?xe>Number.EPSILON&&(Z=!0):le<-Number.EPSILON?xe<-Number.EPSILON&&(Z=!0):Math.sign(Pe)===Math.sign(E)&&(Z=!0),Z?(we=-Pe,te=le,_e=Math.sqrt(_)):(we=le,te=Pe,_e=Math.sqrt(_/2))}return new K(we/_e,te/_e)}let ae=[];for(let Q=0,ie=B.length,w=ie-1,we=Q+1;Q<ie;Q++,w++,we++)w===ie&&(w=0),we===ie&&(we=0),ae[Q]=V(B[Q],B[w],B[we]);let ue=[],ge,Ue=ae.concat();for(let Q=0,ie=C.length;Q<ie;Q++){let w=C[Q];ge=[];for(let we=0,te=w.length,_e=te-1,le=we+1;we<te;we++,_e++,le++)_e===te&&(_e=0),le===te&&(le=0),ge[we]=V(w[we],w[_e],w[le]);ue.push(ge),Ue=Ue.concat(ge)}for(let Q=0;Q<m;Q++){let ie=Q/m,w=p*Math.cos(ie*Math.PI/2),we=g*Math.sin(ie*Math.PI/2)+x;for(let te=0,_e=B.length;te<_e;te++){let le=W(B[te],ae[te],we);oe(le.x,le.y,-w)}for(let te=0,_e=C.length;te<_e;te++){let le=C[te];ge=ue[te];for(let Pe=0,xe=le.length;Pe<xe;Pe++){let E=W(le[Pe],ge[Pe],we);oe(E.x,E.y,-w)}}}let Ke=g+x;for(let Q=0;Q<k;Q++){let ie=f?W(q[Q],Ue[Q],Ke):q[Q];v?(A.copy(D.normals[0]).multiplyScalar(ie.x),T.copy(D.binormals[0]).multiplyScalar(ie.y),R.copy(y[0]).add(A).add(T),oe(R.x,R.y,R.z)):oe(ie.x,ie.y,0)}for(let Q=1;Q<=h;Q++)for(let ie=0;ie<k;ie++){let w=f?W(q[ie],Ue[ie],Ke):q[ie];v?(A.copy(D.normals[Q]).multiplyScalar(w.x),T.copy(D.binormals[Q]).multiplyScalar(w.y),R.copy(y[Q]).add(A).add(T),oe(R.x,R.y,R.z)):oe(w.x,w.y,u/h*Q)}for(let Q=m-1;Q>=0;Q--){let ie=Q/m,w=p*Math.cos(ie*Math.PI/2),we=g*Math.sin(ie*Math.PI/2)+x;for(let te=0,_e=B.length;te<_e;te++){let le=W(B[te],ae[te],we);oe(le.x,le.y,u+w)}for(let te=0,_e=C.length;te<_e;te++){let le=C[te];ge=ue[te];for(let Pe=0,xe=le.length;Pe<xe;Pe++){let E=W(le[Pe],ge[Pe],we);v?oe(E.x,E.y+y[h-1].y,y[h-1].x+w):oe(E.x,E.y,u+w)}}}Y(),se();function Y(){let Q=s.length/3;if(f){let ie=0,w=k*ie;for(let we=0;we<ee;we++){let te=N[we];Ce(te[2]+w,te[1]+w,te[0]+w)}ie=h+m*2,w=k*ie;for(let we=0;we<ee;we++){let te=N[we];Ce(te[0]+w,te[1]+w,te[2]+w)}}else{for(let ie=0;ie<ee;ie++){let w=N[ie];Ce(w[2],w[1],w[0])}for(let ie=0;ie<ee;ie++){let w=N[ie];Ce(w[0]+k*h,w[1]+k*h,w[2]+k*h)}}n.addGroup(Q,s.length/3-Q,0)}function se(){let Q=s.length/3,ie=0;Me(B,ie),ie+=B.length;for(let w=0,we=C.length;w<we;w++){let te=C[w];Me(te,ie),ie+=te.length}n.addGroup(Q,s.length/3-Q,1)}function Me(Q,ie){let w=Q.length;for(;--w>=0;){let we=w,te=w-1;te<0&&(te=Q.length-1);for(let _e=0,le=h+m*2;_e<le;_e++){let Pe=k*_e,xe=k*(_e+1),E=ie+we+Pe,_=ie+te+Pe,F=ie+te+xe,Z=ie+we+xe;Ne(E,_,F,Z)}}}function oe(Q,ie,w){l.push(Q),l.push(ie),l.push(w)}function Ce(Q,ie,w){De(Q),De(ie),De(w);let we=s.length/3,te=S.generateTopUV(n,s,we-3,we-2,we-1);Ye(te[0]),Ye(te[1]),Ye(te[2])}function Ne(Q,ie,w,we){De(Q),De(ie),De(we),De(ie),De(w),De(we);let te=s.length/3,_e=S.generateSideWallUV(n,s,te-6,te-3,te-2,te-1);Ye(_e[0]),Ye(_e[1]),Ye(_e[3]),Ye(_e[1]),Ye(_e[2]),Ye(_e[3])}function De(Q){s.push(l[Q*3+0]),s.push(l[Q*3+1]),s.push(l[Q*3+2])}function Ye(Q){r.push(Q.x),r.push(Q.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes,n=this.parameters.options;return G2(t,n,e)}static fromJSON(e,t){let n=[];for(let r=0,a=e.shapes.length;r<a;r++){let o=t[e.shapes[r]];n.push(o)}let s=e.options.extrudePath;return s!==void 0&&(e.options.extrudePath=new Jl[s.type]().fromJSON(s)),new i(n,e.options)}},V2={generateTopUV:function(i,e,t,n,s){let r=e[t*3],a=e[t*3+1],o=e[n*3],l=e[n*3+1],c=e[s*3],h=e[s*3+1];return[new K(r,a),new K(o,l),new K(c,h)]},generateSideWallUV:function(i,e,t,n,s,r){let a=e[t*3],o=e[t*3+1],l=e[t*3+2],c=e[n*3],h=e[n*3+1],u=e[n*3+2],f=e[s*3],p=e[s*3+1],g=e[s*3+2],x=e[r*3],m=e[r*3+1],d=e[r*3+2];return Math.abs(o-h)<Math.abs(a-c)?[new K(a,1-l),new K(c,1-u),new K(f,1-g),new K(x,1-d)]:[new K(o,1-l),new K(h,1-u),new K(p,1-g),new K(m,1-d)]}};function G2(i,e,t){if(t.shapes=[],Array.isArray(i))for(let n=0,s=i.length;n<s;n++){let r=i[n];t.shapes.push(r.uuid)}else t.shapes.push(i.uuid);return t.options=Object.assign({},e),e.extrudePath!==void 0&&(t.options.extrudePath=e.extrudePath.toJSON()),t}var Gn=class i extends Rt{constructor(e=1,t=32,n=16,s=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:s,phiLength:r,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let l=Math.min(a+o,Math.PI),c=0,h=[],u=new P,f=new P,p=[],g=[],x=[],m=[];for(let d=0;d<=n;d++){let S=[],y=d/n,v=0;d===0&&a===0?v=.5/t:d===n&&l===Math.PI&&(v=-.5/t);for(let D=0;D<=t;D++){let T=D/t;u.x=-e*Math.cos(s+T*r)*Math.sin(a+y*o),u.y=e*Math.cos(a+y*o),u.z=e*Math.sin(s+T*r)*Math.sin(a+y*o),g.push(u.x,u.y,u.z),f.copy(u).normalize(),x.push(f.x,f.y,f.z),m.push(T+v,1-y),S.push(c++)}h.push(S)}for(let d=0;d<n;d++)for(let S=0;S<t;S++){let y=h[d][S+1],v=h[d][S],D=h[d+1][S],T=h[d+1][S+1];(d!==0||a>0)&&p.push(y,v,T),(d!==n-1||l<Math.PI)&&p.push(v,D,T)}this.setIndex(p),this.setAttribute("position",new je(g,3)),this.setAttribute("normal",new je(x,3)),this.setAttribute("uv",new je(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}};var Ra=class i extends Rt{constructor(e=1,t=.4,n=12,s=48,r=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:s,arc:r},n=Math.floor(n),s=Math.floor(s);let a=[],o=[],l=[],c=[],h=new P,u=new P,f=new P;for(let p=0;p<=n;p++)for(let g=0;g<=s;g++){let x=g/s*r,m=p/n*Math.PI*2;u.x=(e+t*Math.cos(m))*Math.cos(x),u.y=(e+t*Math.cos(m))*Math.sin(x),u.z=t*Math.sin(m),o.push(u.x,u.y,u.z),h.x=e*Math.cos(x),h.y=e*Math.sin(x),f.subVectors(u,h).normalize(),l.push(f.x,f.y,f.z),c.push(g/s),c.push(p/n)}for(let p=1;p<=n;p++)for(let g=1;g<=s;g++){let x=(s+1)*p+g-1,m=(s+1)*(p-1)+g-1,d=(s+1)*(p-1)+g,S=(s+1)*p+g;a.push(x,m,S),a.push(m,d,S)}this.setIndex(a),this.setAttribute("position",new je(o,3)),this.setAttribute("normal",new je(l,3)),this.setAttribute("uv",new je(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}};var Pa=class extends nt{static get type(){return"RawShaderMaterial"}constructor(e){super(e),this.isRawShaderMaterial=!0}},pr=class extends Ci{static get type(){return"MeshStandardMaterial"}constructor(e){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.color=new Re(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Re(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Iu,this.normalScale=new K(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new wn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},mr=class extends pr{static get type(){return"MeshPhysicalMaterial"}constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new K(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return _t(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Re(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Re(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Re(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}};function sa(i,e,t){return!i||!t&&i.constructor===e?i:typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i)}function W2(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}var ws=class{constructor(e,t,n,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,s=t[n],r=t[n-1];n:{e:{let a;t:{i:if(!(e<s)){for(let o=n+2;;){if(s===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(r=s,s=t[++n],e<s)break e}a=t.length;break t}if(!(e>=r)){let o=t[1];e<o&&(n=2,r=o);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=t[--n-1],e>=r)break e}a=n,n=0;break t}break n}for(;n<a;){let o=n+a>>>1;e<t[o]?a=o:n=o+1}if(s=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s;for(let a=0;a!==s;++a)t[a]=n[r+a];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},tc=class extends ws{constructor(e,t,n,s){super(e,t,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:ph,endingEnd:ph}}intervalChanged_(e,t,n){let s=this.parameterPositions,r=e-2,a=e+1,o=s[r],l=s[a];if(o===void 0)switch(this.getSettings_().endingStart){case mh:r=e,o=2*t-n;break;case gh:r=s.length-2,o=t+s[r]-s[r+1];break;default:r=e,o=n}if(l===void 0)switch(this.getSettings_().endingEnd){case mh:a=e,l=2*n-t;break;case gh:a=1,l=n+s[1]-s[0];break;default:a=e-1,l=t}let c=(n-t)*.5,h=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(l-n),this._offsetPrev=r*h,this._offsetNext=a*h}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=this._offsetPrev,u=this._offsetNext,f=this._weightPrev,p=this._weightNext,g=(n-t)/(s-t),x=g*g,m=x*g,d=-f*m+2*f*x-f*g,S=(1+f)*m+(-1.5-2*f)*x+(-.5+f)*g+1,y=(-1-p)*m+(1.5+p)*x+.5*g,v=p*m-p*x;for(let D=0;D!==o;++D)r[D]=d*a[h+D]+S*a[c+D]+y*a[l+D]+v*a[u+D];return r}},nc=class extends ws{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,h=(n-t)/(s-t),u=1-h;for(let f=0;f!==o;++f)r[f]=a[c+f]*u+a[l+f]*h;return r}},ic=class extends ws{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e){return this.copySampleValue_(e-1)}},qn=class{constructor(e,t,n,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=sa(t,this.TimeBufferType),this.values=sa(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:sa(e.times,Array),values:sa(e.values,Array)};let s=e.getInterpolation();s!==e.DefaultInterpolation&&(n.interpolation=s)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new ic(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new nc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new tc(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case ua:t=this.InterpolantFactoryMethodDiscrete;break;case Rl:t=this.InterpolantFactoryMethodLinear;break;case go:t=this.InterpolantFactoryMethodSmooth;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return console.warn("THREE.KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return ua;case this.InterpolantFactoryMethodLinear:return Rl;case this.InterpolantFactoryMethodSmooth:return go}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]*=e}return this}trim(e,t){let n=this.times,s=n.length,r=0,a=s-1;for(;r!==s&&n[r]<e;)++r;for(;a!==-1&&n[a]>t;)--a;if(++a,r!==0||a!==s){r>=a&&(a=Math.max(a,1),r=a-1);let o=this.getValueSize();this.times=n.slice(r,a),this.values=this.values.slice(r*o,a*o)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,s=this.values,r=n.length;r===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let a=null;for(let o=0;o!==r;o++){let l=n[o];if(typeof l=="number"&&isNaN(l)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,o,l),e=!1;break}if(a!==null&&a>l){console.error("THREE.KeyframeTrack: Out of order keys.",this,o,l,a),e=!1;break}a=l}if(s!==void 0&&W2(s))for(let o=0,l=s.length;o!==l;++o){let c=s[o];if(isNaN(c)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,o,c),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===go,r=e.length-1,a=1;for(let o=1;o<r;++o){let l=!1,c=e[o],h=e[o+1];if(c!==h&&(o!==1||c!==e[0]))if(s)l=!0;else{let u=o*n,f=u-n,p=u+n;for(let g=0;g!==n;++g){let x=t[u+g];if(x!==t[f+g]||x!==t[p+g]){l=!0;break}}}if(l){if(o!==a){e[a]=e[o];let u=o*n,f=a*n;for(let p=0;p!==n;++p)t[f+p]=t[u+p]}++a}}if(r>0){e[a]=e[r];for(let o=r*n,l=a*n,c=0;c!==n;++c)t[l+c]=t[o+c];++a}return a!==e.length?(this.times=e.slice(0,a),this.values=t.slice(0,a*n)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,s=new n(this.name,e,t);return s.createInterpolant=this.createInterpolant,s}};qn.prototype.TimeBufferType=Float32Array;qn.prototype.ValueBufferType=Float32Array;qn.prototype.DefaultInterpolation=Rl;var Li=class extends qn{constructor(e,t,n){super(e,t,n)}};Li.prototype.ValueTypeName="bool";Li.prototype.ValueBufferType=Array;Li.prototype.DefaultInterpolation=ua;Li.prototype.InterpolantFactoryMethodLinear=void 0;Li.prototype.InterpolantFactoryMethodSmooth=void 0;var sc=class extends qn{};sc.prototype.ValueTypeName="color";var rc=class extends qn{};rc.prototype.ValueTypeName="number";var ac=class extends ws{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=(n-t)/(s-t),c=e*o;for(let h=c+o;c!==h;c+=4)yn.slerpFlat(r,0,a,c-o,a,c,l);return r}},Ia=class extends qn{InterpolantFactoryMethodLinear(e){return new ac(this.times,this.values,this.getValueSize(),e)}};Ia.prototype.ValueTypeName="quaternion";Ia.prototype.InterpolantFactoryMethodSmooth=void 0;var Ui=class extends qn{constructor(e,t,n){super(e,t,n)}};Ui.prototype.ValueTypeName="string";Ui.prototype.ValueBufferType=Array;Ui.prototype.DefaultInterpolation=ua;Ui.prototype.InterpolantFactoryMethodLinear=void 0;Ui.prototype.InterpolantFactoryMethodSmooth=void 0;var oc=class extends qn{};oc.prototype.ValueTypeName="vector";var Da={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(this.files[i]=e)},get:function(i){if(this.enabled!==!1)return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}},lc=class{constructor(e,t,n){let s=this,r=!1,a=0,o=0,l,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this.itemStart=function(h){o++,r===!1&&s.onStart!==void 0&&s.onStart(h,a,o),r=!0},this.itemEnd=function(h){a++,s.onProgress!==void 0&&s.onProgress(h,a,o),a===o&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){let u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,f=c.length;u<f;u+=2){let p=c[u],g=c[u+1];if(p.global&&(p.lastIndex=0),p.test(h))return g}return null}}},X2=new lc,li=class{constructor(e){this.manager=e!==void 0?e:X2,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){let n=this;return new Promise(function(s,r){n.load(e,s,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}};li.DEFAULT_MATERIAL_NAME="__DEFAULT";var On={},cc=class extends Error{constructor(e,t){super(e),this.response=t}},La=class extends li{constructor(e){super(e)}load(e,t,n,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=Da.get(e);if(r!==void 0)return this.manager.itemStart(e),setTimeout(()=>{t&&t(r),this.manager.itemEnd(e)},0),r;if(On[e]!==void 0){On[e].push({onLoad:t,onProgress:n,onError:s});return}On[e]=[],On[e].push({onLoad:t,onProgress:n,onError:s});let a=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin"}),o=this.mimeType,l=this.responseType;fetch(a).then(c=>{if(c.status===200||c.status===0){if(c.status===0&&console.warn("THREE.FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||c.body===void 0||c.body.getReader===void 0)return c;let h=On[e],u=c.body.getReader(),f=c.headers.get("X-File-Size")||c.headers.get("Content-Length"),p=f?parseInt(f):0,g=p!==0,x=0,m=new ReadableStream({start(d){S();function S(){u.read().then(({done:y,value:v})=>{if(y)d.close();else{x+=v.byteLength;let D=new ProgressEvent("progress",{lengthComputable:g,loaded:x,total:p});for(let T=0,A=h.length;T<A;T++){let R=h[T];R.onProgress&&R.onProgress(D)}d.enqueue(v),S()}},y=>{d.error(y)})}}});return new Response(m)}else throw new cc(`fetch for "${c.url}" responded with ${c.status}: ${c.statusText}`,c)}).then(c=>{switch(l){case"arraybuffer":return c.arrayBuffer();case"blob":return c.blob();case"document":return c.text().then(h=>new DOMParser().parseFromString(h,o));case"json":return c.json();default:if(o===void 0)return c.text();{let u=/charset="?([^;"\s]*)"?/i.exec(o),f=u&&u[1]?u[1].toLowerCase():void 0,p=new TextDecoder(f);return c.arrayBuffer().then(g=>p.decode(g))}}}).then(c=>{Da.add(e,c);let h=On[e];delete On[e];for(let u=0,f=h.length;u<f;u++){let p=h[u];p.onLoad&&p.onLoad(c)}}).catch(c=>{let h=On[e];if(h===void 0)throw this.manager.itemError(e),c;delete On[e];for(let u=0,f=h.length;u<f;u++){let p=h[u];p.onError&&p.onError(c)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}};var hc=class extends li{constructor(e){super(e)}load(e,t,n,s){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=this,a=Da.get(e);if(a!==void 0)return r.manager.itemStart(e),setTimeout(function(){t&&t(a),r.manager.itemEnd(e)},0),a;let o=sr("img");function l(){h(),Da.add(e,this),t&&t(this),r.manager.itemEnd(e)}function c(u){h(),s&&s(u),r.manager.itemError(e),r.manager.itemEnd(e)}function h(){o.removeEventListener("load",l,!1),o.removeEventListener("error",c,!1)}return o.addEventListener("load",l,!1),o.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),r.manager.itemStart(e),o.src=e,o}};var Ua=class extends li{constructor(e){super(e)}load(e,t,n,s){let r=new wt,a=new hc(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(o){r.image=o,r.needsUpdate=!0,t!==void 0&&t(r)},n,s),r}},Na=class extends Mt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Re(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}};var Xo=new ut,xu=new P,vu=new P,Oa=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new K(512,512),this.map=null,this.mapPass=null,this.matrix=new ut,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ar,this._frameExtents=new K(1,1),this._viewportCount=1,this._viewports=[new gt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,n=this.matrix;xu.setFromMatrixPosition(e.matrixWorld),t.position.copy(xu),vu.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(vu),t.updateMatrixWorld(),Xo.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Xo),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Xo)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},uc=class extends Oa{constructor(){super(new Bt(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1}updateMatrices(e){let t=this.camera,n=qs*2*e.angle*this.focus,s=this.mapSize.width/this.mapSize.height,r=e.distance||t.far;(n!==t.fov||s!==t.aspect||r!==t.far)&&(t.fov=n,t.aspect=s,t.far=r,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}},Fa=class extends Na{constructor(e,t,n=0,s=Math.PI/3,r=0,a=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(Mt.DEFAULT_UP),this.updateMatrix(),this.target=new Mt,this.distance=n,this.angle=s,this.penumbra=r,this.decay=a,this.map=null,this.shadow=new uc}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}};var dc=class extends Oa{constructor(){super(new oi(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Ni=class extends Na{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Mt.DEFAULT_UP),this.updateMatrix(),this.target=new Mt,this.shadow=new dc}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}};var Ba=class{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=_u(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){let t=_u();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}};function _u(){return performance.now()}var Pc="\\[\\]\\.:\\/",Y2=new RegExp("["+Pc+"]","g"),Ic="[^"+Pc+"]",Z2="[^"+Pc.replace("\\.","")+"]",j2=/((?:WC+[\/:])*)/.source.replace("WC",Ic),K2=/(WCOD+)?/.source.replace("WCOD",Z2),J2=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Ic),Q2=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Ic),$2=new RegExp("^"+j2+K2+J2+Q2+"$"),e3=["material","materials","bones","map"],fc=class{constructor(e,t,n){let s=n||dt.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},dt=class i{constructor(e,t,n){this.path=t,this.parsedPath=n||i.parseTrackName(t),this.node=i.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new i.Composite(e,t,n):new i(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(Y2,"")}static parseTrackName(e){let t=$2.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);e3.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(r){for(let a=0;a<r.length;a++){let o=r[a];if(o.name===t||o.uuid===t)return o;let l=n(o.children);if(l)return l}return null},s=n(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)e[t++]=n[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,s=t.propertyName,r=t.propertyIndex;if(e||(e=i.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=t.objectIndex;switch(n){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===c){c=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(c!==void 0){if(e[c]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}let a=e[s];if(a===void 0){let c=t.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.needsUpdate!==void 0?o=this.Versioning.NeedsUpdate:e.matrixWorldNeedsUpdate!==void 0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=r}else a.fromArray!==void 0&&a.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(l=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};dt.Composite=fc;dt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};dt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};dt.prototype.GetterByBindingType=[dt.prototype._getValue_direct,dt.prototype._getValue_array,dt.prototype._getValue_arrayElement,dt.prototype._getValue_toArray];dt.prototype.SetterByBindingTypeAndVersioning=[[dt.prototype._setValue_direct,dt.prototype._setValue_direct_setNeedsUpdate,dt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[dt.prototype._setValue_array,dt.prototype._setValue_array_setNeedsUpdate,dt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[dt.prototype._setValue_arrayElement,dt.prototype._setValue_arrayElement_setNeedsUpdate,dt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[dt.prototype._setValue_fromArray,dt.prototype._setValue_fromArray_setNeedsUpdate,dt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Y3=new Float32Array(1);var gr=class{constructor(e=1,t=0,n=0){return this.radius=e,this.phi=t,this.theta=n,this}set(e,t,n){return this.radius=e,this.phi=t,this.theta=n,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Math.max(1e-6,Math.min(Math.PI-1e-6,this.phi)),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,n){return this.radius=Math.sqrt(e*e+t*t+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,n),this.phi=Math.acos(_t(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var za=class{constructor(){this.type="ShapePath",this.color=new Re,this.subPaths=[],this.currentPath=null}moveTo(e,t){return this.currentPath=new Es,this.subPaths.push(this.currentPath),this.currentPath.moveTo(e,t),this}lineTo(e,t){return this.currentPath.lineTo(e,t),this}quadraticCurveTo(e,t,n,s){return this.currentPath.quadraticCurveTo(e,t,n,s),this}bezierCurveTo(e,t,n,s,r,a){return this.currentPath.bezierCurveTo(e,t,n,s,r,a),this}splineThru(e){return this.currentPath.splineThru(e),this}toShapes(e){function t(d){let S=[];for(let y=0,v=d.length;y<v;y++){let D=d[y],T=new fs;T.curves=D.curves,S.push(T)}return S}function n(d,S){let y=S.length,v=!1;for(let D=y-1,T=0;T<y;D=T++){let A=S[D],R=S[T],b=R.x-A.x,q=R.y-A.y;if(Math.abs(q)>Number.EPSILON){if(q<0&&(A=S[T],b=-b,R=S[D],q=-q),d.y<A.y||d.y>R.y)continue;if(d.y===A.y){if(d.x===A.x)return!0}else{let C=q*(d.x-A.x)-b*(d.y-A.y);if(C===0)return!0;if(C<0)continue;v=!v}}else{if(d.y!==A.y)continue;if(R.x<=d.x&&d.x<=A.x||A.x<=d.x&&d.x<=R.x)return!0}}return v}let s=ps.isClockWise,r=this.subPaths;if(r.length===0)return[];let a,o,l,c=[];if(r.length===1)return o=r[0],l=new fs,l.curves=o.curves,c.push(l),c;let h=!s(r[0].getPoints());h=e?!h:h;let u=[],f=[],p=[],g=0,x;f[g]=void 0,p[g]=[];for(let d=0,S=r.length;d<S;d++)o=r[d],x=o.getPoints(),a=s(x),a=e?!a:a,a?(!h&&f[g]&&g++,f[g]={s:new fs,p:x},f[g].s.curves=o.curves,h&&g++,p[g]=[]):p[g].push({h:o,p:x[0]});if(!f[0])return t(r);if(f.length>1){let d=!1,S=0;for(let y=0,v=f.length;y<v;y++)u[y]=[];for(let y=0,v=f.length;y<v;y++){let D=p[y];for(let T=0;T<D.length;T++){let A=D[T],R=!0;for(let b=0;b<f.length;b++)n(A.p,f[b].p)&&(y!==b&&S++,R?(R=!1,u[b].push(A)):d=!0);R&&u[y].push(A)}}S>0&&d===!1&&(p=u)}let m;for(let d=0,S=f.length;d<S;d++){l=f[d].s,c.push(l),m=p[d];for(let y=0,v=m.length;y<v;y++)l.holes.push(m[y].h)}return c}},Ha=class extends kn{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(){}disconnect(){}dispose(){}update(){}};typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:pc}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=pc);var Xu={type:"change"},Lc={type:"start"},Zu={type:"end"},Xa=new rr,Yu=new _n,n3=Math.cos(70*zi.DEG2RAD),Et=new P,jt=2*Math.PI,it={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Dc=1e-6,Ya=class extends Ha{constructor(e,t=null){super(e,t),this.state=it.NONE,this.enabled=!0,this.target=new P,this.cursor=new P,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Oi.ROTATE,MIDDLE:Oi.DOLLY,RIGHT:Oi.PAN},this.touches={ONE:Fi.ROTATE,TWO:Fi.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new P,this._lastQuaternion=new yn,this._lastTargetPosition=new P,this._quat=new yn().setFromUnitVectors(e.up,new P(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new gr,this._sphericalDelta=new gr,this._scale=1,this._panOffset=new P,this._rotateStart=new K,this._rotateEnd=new K,this._rotateDelta=new K,this._panStart=new K,this._panEnd=new K,this._panDelta=new K,this._dollyStart=new K,this._dollyEnd=new K,this._dollyDelta=new K,this._dollyDirection=new P,this._mouse=new K,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=s3.bind(this),this._onPointerDown=i3.bind(this),this._onPointerUp=r3.bind(this),this._onContextMenu=d3.bind(this),this._onMouseWheel=l3.bind(this),this._onKeyDown=c3.bind(this),this._onTouchStart=h3.bind(this),this._onTouchMove=u3.bind(this),this._onMouseDown=a3.bind(this),this._onMouseMove=o3.bind(this),this._interceptControlDown=f3.bind(this),this._interceptControlUp=p3.bind(this),this.domElement!==null&&this.connect(),this.update()}connect(){this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Xu),this.update(),this.state=it.NONE}update(e=null){let t=this.object.position;Et.copy(t).sub(this.target),Et.applyQuaternion(this._quat),this._spherical.setFromVector3(Et),this.autoRotate&&this.state===it.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=jt:n>Math.PI&&(n-=jt),s<-Math.PI?s+=jt:s>Math.PI&&(s-=jt),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let a=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=a!=this._spherical.radius}if(Et.setFromSpherical(this._spherical),Et.applyQuaternion(this._quatInverse),t.copy(this.target).add(Et),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let a=null;if(this.object.isPerspectiveCamera){let o=Et.length();a=this._clampDistance(o*this._scale);let l=o-a;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){let o=new P(this._mouse.x,this._mouse.y,0);o.unproject(this.object);let l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;let c=new P(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(o),this.object.updateMatrixWorld(),a=Et.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;a!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(a).add(this.object.position):(Xa.origin.copy(this.object.position),Xa.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Xa.direction))<n3?this.object.lookAt(this.target):(Yu.setFromNormalAndCoplanarPoint(this.object.up,this.target),Xa.intersectPlane(Yu,this.target))))}else if(this.object.isOrthographicCamera){let a=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),a!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>Dc||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Dc||this._lastTargetPosition.distanceToSquared(this.target)>Dc?(this.dispatchEvent(Xu),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?jt/60*this.autoRotateSpeed*e:jt/60/60*this.autoRotateSpeed}_getZoomScale(e){let t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Et.setFromMatrixColumn(t,0),Et.multiplyScalar(-e),this._panOffset.add(Et)}_panUp(e,t){this.screenSpacePanning===!0?Et.setFromMatrixColumn(t,1):(Et.setFromMatrixColumn(t,0),Et.crossVectors(this.object.up,Et)),Et.multiplyScalar(e),this._panOffset.add(Et)}_pan(e,t){let n=this.domElement;if(this.object.isPerspectiveCamera){let s=this.object.position;Et.copy(s).sub(this.target);let r=Et.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*r/n.clientHeight,this.object.matrix),this._panUp(2*t*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),s=e-n.left,r=t-n.top,a=n.width,o=n.height;this._mouse.x=s/a*2-1,this._mouse.y=-(r/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(jt*this._rotateDelta.x/t.clientHeight),this._rotateUp(jt*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateUp(jt*this.rotateSpeed/this.domElement.clientHeight):this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateUp(-jt*this.rotateSpeed/this.domElement.clientHeight):this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateLeft(jt*this.rotateSpeed/this.domElement.clientHeight):this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateLeft(-jt*this.rotateSpeed/this.domElement.clientHeight):this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panStart.set(n,s)}}_handleTouchStartDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let n=this._getSecondPointerPosition(e),s=.5*(e.pageX+n.x),r=.5*(e.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(jt*this._rotateDelta.x/t.clientHeight),this._rotateUp(jt*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let a=(e.pageX+t.x)*.5,o=(e.pageY+t.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new K,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){let t=e.deltaMode,n={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function i3(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i)))}function s3(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function r3(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Zu),this.state=it.NONE;break;case 1:let e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function a3(i){let e;switch(i.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case Oi.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=it.DOLLY;break;case Oi.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=it.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=it.ROTATE}break;case Oi.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=it.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=it.PAN}break;default:this.state=it.NONE}this.state!==it.NONE&&this.dispatchEvent(Lc)}function o3(i){switch(this.state){case it.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case it.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case it.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function l3(i){this.enabled===!1||this.enableZoom===!1||this.state!==it.NONE||(i.preventDefault(),this.dispatchEvent(Lc),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Zu))}function c3(i){this.enabled===!1||this.enablePan===!1||this._handleKeyDown(i)}function h3(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case Fi.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=it.TOUCH_ROTATE;break;case Fi.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=it.TOUCH_PAN;break;default:this.state=it.NONE}break;case 2:switch(this.touches.TWO){case Fi.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=it.TOUCH_DOLLY_PAN;break;case Fi.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=it.TOUCH_DOLLY_ROTATE;break;default:this.state=it.NONE}break;default:this.state=it.NONE}this.state!==it.NONE&&this.dispatchEvent(Lc)}function u3(i){switch(this._trackPointer(i),this.state){case it.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case it.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case it.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case it.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=it.NONE}}function d3(i){this.enabled!==!1&&i.preventDefault()}function f3(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function p3(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var vr=new P;function hn(i,e,t,n,s,r){let a=2*Math.PI*s/4,o=Math.max(r-2*s,0),l=Math.PI/4;vr.copy(e),vr[n]=0,vr.normalize();let c=.5*a/(a+o),h=1-vr.angleTo(i)/l;return Math.sign(vr[t])===1?h*c:o/(a+o)+c+c*(1-h)}var Hi=class extends Ri{constructor(e=1,t=1,n=1,s=2,r=.1){if(s=s*2+1,r=Math.min(e/2,t/2,n/2,r),super(1,1,1,s,s,s),s===1)return;let a=this.toNonIndexed();this.index=null,this.attributes.position=a.attributes.position,this.attributes.normal=a.attributes.normal,this.attributes.uv=a.attributes.uv;let o=new P,l=new P,c=new P(e,t,n).divideScalar(2).subScalar(r),h=this.attributes.position.array,u=this.attributes.normal.array,f=this.attributes.uv.array,p=h.length/6,g=new P,x=.5/s;for(let m=0,d=0;m<h.length;m+=3,d+=2)switch(o.fromArray(h,m),l.copy(o),l.x-=Math.sign(l.x)*x,l.y-=Math.sign(l.y)*x,l.z-=Math.sign(l.z)*x,l.normalize(),h[m+0]=c.x*Math.sign(o.x)+l.x*r,h[m+1]=c.y*Math.sign(o.y)+l.y*r,h[m+2]=c.z*Math.sign(o.z)+l.z*r,u[m+0]=l.x,u[m+1]=l.y,u[m+2]=l.z,Math.floor(m/p)){case 0:g.set(1,0,0),f[d+0]=hn(g,l,"z","y",r,n),f[d+1]=1-hn(g,l,"y","z",r,t);break;case 1:g.set(-1,0,0),f[d+0]=1-hn(g,l,"z","y",r,n),f[d+1]=1-hn(g,l,"y","z",r,t);break;case 2:g.set(0,1,0),f[d+0]=1-hn(g,l,"x","z",r,e),f[d+1]=hn(g,l,"z","x",r,n);break;case 3:g.set(0,-1,0),f[d+0]=1-hn(g,l,"x","z",r,e),f[d+1]=1-hn(g,l,"z","x",r,n);break;case 4:g.set(0,0,1),f[d+0]=1-hn(g,l,"x","y",r,e),f[d+1]=1-hn(g,l,"y","x",r,t);break;case 5:g.set(0,0,-1),f[d+0]=hn(g,l,"x","y",r,e),f[d+1]=1-hn(g,l,"y","x",r,t);break}}};var Za=class extends Ca{constructor(e,t={}){let n=t.font;if(n===void 0)super();else{let s=n.generateShapes(e,t.size);t.depth===void 0&&t.height!==void 0&&console.warn("THREE.TextGeometry: .height is now depreciated. Please use .depth instead"),t.depth=t.depth!==void 0?t.depth:t.height!==void 0?t.height:50,t.bevelThickness===void 0&&(t.bevelThickness=10),t.bevelSize===void 0&&(t.bevelSize=8),t.bevelEnabled===void 0&&(t.bevelEnabled=!1),super(s,t)}this.type="TextGeometry"}};var ja=class extends li{constructor(e){super(e)}load(e,t,n,s){let r=this,a=new La(this.manager);a.setPath(this.path),a.setRequestHeader(this.requestHeader),a.setWithCredentials(this.withCredentials),a.load(e,function(o){let l=r.parse(JSON.parse(o));t&&t(l)},n,s)}parse(e){return new Uc(e)}},Uc=class{constructor(e){this.isFont=!0,this.type="Font",this.data=e}generateShapes(e,t=100){let n=[],s=m3(e,t,this.data);for(let r=0,a=s.length;r<a;r++)n.push(...s[r].toShapes());return n}};function m3(i,e,t){let n=Array.from(i),s=e/t.resolution,r=(t.boundingBox.yMax-t.boundingBox.yMin+t.underlineThickness)*s,a=[],o=0,l=0;for(let c=0;c<n.length;c++){let h=n[c];if(h===`
`)o=0,l-=r;else{let u=g3(h,s,o,l,t);o+=u.offsetX,a.push(u.path)}}return a}function g3(i,e,t,n,s){let r=s.glyphs[i]||s.glyphs["?"];if(!r){console.error('THREE.Font: character "'+i+'" does not exists in font family '+s.familyName+".");return}let a=new za,o,l,c,h,u,f,p,g;if(r.o){let x=r._cachedOutline||(r._cachedOutline=r.o.split(" "));for(let m=0,d=x.length;m<d;)switch(x[m++]){case"m":o=x[m++]*e+t,l=x[m++]*e+n,a.moveTo(o,l);break;case"l":o=x[m++]*e+t,l=x[m++]*e+n,a.lineTo(o,l);break;case"q":c=x[m++]*e+t,h=x[m++]*e+n,u=x[m++]*e+t,f=x[m++]*e+n,a.quadraticCurveTo(u,f,c,h);break;case"b":c=x[m++]*e+t,h=x[m++]*e+n,u=x[m++]*e+t,f=x[m++]*e+n,p=x[m++]*e+t,g=x[m++]*e+n,a.bezierCurveTo(u,f,p,g,c,h);break}}return{offsetX:r.ha*e,path:a}}var Ka={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};var Pt=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},x3=new oi(-1,1,1,-1,0,1),Nc=class extends Rt{constructor(){super(),this.setAttribute("position",new je([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new je([0,2,0,0,2,0],2))}},v3=new Nc,Kt=class{constructor(e){this._mesh=new xt(v3,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,x3)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}};var Cs=class extends Pt{constructor(e,t){super(),this.textureID=t!==void 0?t:"tDiffuse",e instanceof nt?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=Zt.clone(e.uniforms),this.material=new nt({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new Kt(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}};var _r=class extends Pt{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){let s=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),r.buffers.stencil.setFunc(s.ALWAYS,a,4294967295),r.buffers.stencil.setClear(o),r.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(s.EQUAL,1,4294967295),r.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),r.buffers.stencil.setLocked(!0)}},Ja=class extends Pt{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}};var Qa=class{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){let n=e.getSize(new K);this._width=n.width,this._height=n.height,t=new pt(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:At}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Cs(Ka),this.copyPass.material.blending=on,this.clock=new Ba}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());let t=this.renderer.getRenderTarget(),n=!1;for(let s=0,r=this.passes.length;s<r;s++){let a=this.passes[s];if(a.enabled!==!1){if(a.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),a.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),a.needsSwap){if(n){let o=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(o.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(o.EQUAL,1,4294967295)}this.swapBuffers()}_r!==void 0&&(a instanceof _r?n=!0:a instanceof Ja&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){let t=this.renderer.getSize(new K);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let n=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(n,s),this.renderTarget2.setSize(n,s);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(n,s)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};var $a=class extends Pt{constructor(e,t,n=null,s=null,r=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=s,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Re}render(e,t,n){let s=e.autoClear;e.autoClear=!1;let r,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=s}};var ju={name:"LuminosityHighPassShader",shaderID:"luminosityHighPass",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Re(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};var Rs=class i extends Pt{constructor(e,t,n,s){super(),this.strength=t!==void 0?t:1,this.radius=n,this.threshold=s,this.resolution=e!==void 0?new K(e.x,e.y):new K(256,256),this.clearColor=new Re(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);this.renderTargetBright=new pt(r,a,{type:At}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let u=0;u<this.nMips;u++){let f=new pt(r,a,{type:At});f.texture.name="UnrealBloomPass.h"+u,f.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(f);let p=new pt(r,a,{type:At});p.texture.name="UnrealBloomPass.v"+u,p.texture.generateMipmaps=!1,this.renderTargetsVertical.push(p),r=Math.round(r/2),a=Math.round(a/2)}let o=ju;this.highPassUniforms=Zt.clone(o.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new nt({uniforms:this.highPassUniforms,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.separableBlurMaterials=[];let l=[3,5,7,9,11];r=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);for(let u=0;u<this.nMips;u++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(l[u])),this.separableBlurMaterials[u].uniforms.invSize.value=new K(1/r,1/a),r=Math.round(r/2),a=Math.round(a/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;let c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new P(1,1,1),new P(1,1,1),new P(1,1,1),new P(1,1,1),new P(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;let h=Ka;this.copyUniforms=Zt.clone(h.uniforms),this.blendMaterial=new nt({uniforms:this.copyUniforms,vertexShader:h.vertexShader,fragmentShader:h.fragmentShader,blending:ha,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new Re,this.oldClearAlpha=1,this.basic=new An,this.fsQuad=new Kt(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),s=Math.round(t/2);this.renderTargetBright.setSize(n,s);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(n,s),this.renderTargetsVertical[r].setSize(n,s),this.separableBlurMaterials[r].uniforms.invSize.value=new K(1/n,1/s),n=Math.round(n/2),s=Math.round(s/2)}render(e,t,n,s,r){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();let a=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),r&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=n.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let o=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this.fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=o.texture,this.separableBlurMaterials[l].uniforms.direction.value=i.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=i.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this.fsQuad.render(e),o=this.renderTargetsVertical[l];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(n),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=a}getSeperableBlurMaterial(e){let t=[];for(let n=0;n<e;n++)t.push(.39894*Math.exp(-.5*n*n/(e*e))/e);return new nt({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new K(.5,.5)},direction:{value:new K(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}getCompositeMaterial(e){return new nt({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}};Rs.BlurDirectionX=new K(1,0);Rs.BlurDirectionY=new K(0,1);var Ku={name:"BokehShader",defines:{DEPTH_PACKING:1,PERSPECTIVE_CAMERA:1},uniforms:{tColor:{value:null},tDepth:{value:null},focus:{value:1},aspect:{value:1},aperture:{value:.025},maxblur:{value:.01},nearClip:{value:1},farClip:{value:1e3}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		#include <common>

		varying vec2 vUv;

		uniform sampler2D tColor;
		uniform sampler2D tDepth;

		uniform float maxblur; // max blur amount
		uniform float aperture; // aperture - bigger values for shallower depth of field

		uniform float nearClip;
		uniform float farClip;

		uniform float focus;
		uniform float aspect;

		#include <packing>

		float getDepth( const in vec2 screenPosition ) {
			#if DEPTH_PACKING == 1
			return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );
			#else
			return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		float getViewZ( const in float depth ) {
			#if PERSPECTIVE_CAMERA == 1
			return perspectiveDepthToViewZ( depth, nearClip, farClip );
			#else
			return orthographicDepthToViewZ( depth, nearClip, farClip );
			#endif
		}


		void main() {

			vec2 aspectcorrect = vec2( 1.0, aspect );

			float viewZ = getViewZ( getDepth( vUv ) );

			float factor = ( focus + viewZ ); // viewZ is <= 0, so this is a difference equation

			vec2 dofblur = vec2 ( clamp( factor * aperture, -maxblur, maxblur ) );

			vec2 dofblur9 = dofblur * 0.9;
			vec2 dofblur7 = dofblur * 0.7;
			vec2 dofblur4 = dofblur * 0.4;

			vec4 col = vec4( 0.0 );

			col += texture2D( tColor, vUv.xy );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur9 );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur7 );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.4,   0.0  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur4 );

			gl_FragColor = col / 41.0;
			gl_FragColor.a = 1.0;

		}`};var eo=class extends Pt{constructor(e,t,n){super(),this.scene=e,this.camera=t;let s=n.focus!==void 0?n.focus:1,r=n.aperture!==void 0?n.aperture:.025,a=n.maxblur!==void 0?n.maxblur:1;this.renderTargetDepth=new pt(1,1,{minFilter:qt,magFilter:qt,type:At}),this.renderTargetDepth.texture.name="BokehPass.depth",this.materialDepth=new Ii,this.materialDepth.depthPacking=wc,this.materialDepth.blending=on;let o=Ku,l=Zt.clone(o.uniforms);l.tDepth.value=this.renderTargetDepth.texture,l.focus.value=s,l.aspect.value=t.aspect,l.aperture.value=r,l.maxblur.value=a,l.nearClip.value=t.near,l.farClip.value=t.far,this.materialBokeh=new nt({defines:Object.assign({},o.defines),uniforms:l,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.uniforms=l,this.fsQuad=new Kt(this.materialBokeh),this._oldClearColor=new Re}render(e,t,n){this.scene.overrideMaterial=this.materialDepth,e.getClearColor(this._oldClearColor);let s=e.getClearAlpha(),r=e.autoClear;e.autoClear=!1,e.setClearColor(16777215),e.setClearAlpha(1),e.setRenderTarget(this.renderTargetDepth),e.clear(),e.render(this.scene,this.camera),this.uniforms.tColor.value=n.texture,this.uniforms.nearClip.value=this.camera.near,this.uniforms.farClip.value=this.camera.far,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),e.clear(),this.fsQuad.render(e)),this.scene.overrideMaterial=null,e.setClearColor(this._oldClearColor),e.setClearAlpha(s),e.autoClear=r}setSize(e,t){this.materialBokeh.uniforms.aspect.value=e/t,this.renderTargetDepth.setSize(e,t)}dispose(){this.renderTargetDepth.dispose(),this.materialDepth.dispose(),this.materialBokeh.dispose(),this.fsQuad.dispose()}};var yr={name:"SMAAEdgesShader",defines:{SMAA_THRESHOLD:"0.1"},uniforms:{tDiffuse:{value:null},resolution:{value:new K(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];

		void SMAAEdgeDetectionVS( vec2 texcoord ) {
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0,  1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4(  1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 2 ] = texcoord.xyxy + resolution.xyxy * vec4( -2.0, 0.0, 0.0,  2.0 ); // WebGL port note: Changed sign in W component
		}

		void main() {

			vUv = uv;

			SMAAEdgeDetectionVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];

		vec4 SMAAColorEdgeDetectionPS( vec2 texcoord, vec4 offset[3], sampler2D colorTex ) {
			vec2 threshold = vec2( SMAA_THRESHOLD, SMAA_THRESHOLD );

			// Calculate color deltas:
			vec4 delta;
			vec3 C = texture2D( colorTex, texcoord ).rgb;

			vec3 Cleft = texture2D( colorTex, offset[0].xy ).rgb;
			vec3 t = abs( C - Cleft );
			delta.x = max( max( t.r, t.g ), t.b );

			vec3 Ctop = texture2D( colorTex, offset[0].zw ).rgb;
			t = abs( C - Ctop );
			delta.y = max( max( t.r, t.g ), t.b );

			// We do the usual threshold:
			vec2 edges = step( threshold, delta.xy );

			// Then discard if there is no edge:
			if ( dot( edges, vec2( 1.0, 1.0 ) ) == 0.0 )
				discard;

			// Calculate right and bottom deltas:
			vec3 Cright = texture2D( colorTex, offset[1].xy ).rgb;
			t = abs( C - Cright );
			delta.z = max( max( t.r, t.g ), t.b );

			vec3 Cbottom  = texture2D( colorTex, offset[1].zw ).rgb;
			t = abs( C - Cbottom );
			delta.w = max( max( t.r, t.g ), t.b );

			// Calculate the maximum delta in the direct neighborhood:
			float maxDelta = max( max( max( delta.x, delta.y ), delta.z ), delta.w );

			// Calculate left-left and top-top deltas:
			vec3 Cleftleft  = texture2D( colorTex, offset[2].xy ).rgb;
			t = abs( C - Cleftleft );
			delta.z = max( max( t.r, t.g ), t.b );

			vec3 Ctoptop = texture2D( colorTex, offset[2].zw ).rgb;
			t = abs( C - Ctoptop );
			delta.w = max( max( t.r, t.g ), t.b );

			// Calculate the final maximum delta:
			maxDelta = max( max( maxDelta, delta.z ), delta.w );

			// Local contrast adaptation in action:
			edges.xy *= step( 0.5 * maxDelta, delta.xy );

			return vec4( edges, 0.0, 0.0 );
		}

		void main() {

			gl_FragColor = SMAAColorEdgeDetectionPS( vUv, vOffset, tDiffuse );

		}`},qr={name:"SMAAWeightsShader",defines:{SMAA_MAX_SEARCH_STEPS:"8",SMAA_AREATEX_MAX_DISTANCE:"16",SMAA_AREATEX_PIXEL_SIZE:"( 1.0 / vec2( 160.0, 560.0 ) )",SMAA_AREATEX_SUBTEX_SIZE:"( 1.0 / 7.0 )"},uniforms:{tDiffuse:{value:null},tArea:{value:null},tSearch:{value:null},resolution:{value:new K(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];
		varying vec2 vPixcoord;

		void SMAABlendingWeightCalculationVS( vec2 texcoord ) {
			vPixcoord = texcoord / resolution;

			// We will use these offsets for the searches later on (see @PSEUDO_GATHER4):
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -0.25, 0.125, 1.25, 0.125 ); // WebGL port note: Changed sign in Y and W components
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4( -0.125, 0.25, -0.125, -1.25 ); // WebGL port note: Changed sign in Y and W components

			// And these for the searches, they indicate the ends of the loops:
			vOffset[ 2 ] = vec4( vOffset[ 0 ].xz, vOffset[ 1 ].yw ) + vec4( -2.0, 2.0, -2.0, 2.0 ) * resolution.xxyy * float( SMAA_MAX_SEARCH_STEPS );

		}

		void main() {

			vUv = uv;

			SMAABlendingWeightCalculationVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		#define SMAASampleLevelZeroOffset( tex, coord, offset ) texture2D( tex, coord + float( offset ) * resolution, 0.0 )

		uniform sampler2D tDiffuse;
		uniform sampler2D tArea;
		uniform sampler2D tSearch;
		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[3];
		varying vec2 vPixcoord;

		#if __VERSION__ == 100
		vec2 round( vec2 x ) {
			return sign( x ) * floor( abs( x ) + 0.5 );
		}
		#endif

		float SMAASearchLength( sampler2D searchTex, vec2 e, float bias, float scale ) {
			// Not required if searchTex accesses are set to point:
			// float2 SEARCH_TEX_PIXEL_SIZE = 1.0 / float2(66.0, 33.0);
			// e = float2(bias, 0.0) + 0.5 * SEARCH_TEX_PIXEL_SIZE +
			//     e * float2(scale, 1.0) * float2(64.0, 32.0) * SEARCH_TEX_PIXEL_SIZE;
			e.r = bias + e.r * scale;
			return 255.0 * texture2D( searchTex, e, 0.0 ).r;
		}

		float SMAASearchXLeft( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			/**
				* @PSEUDO_GATHER4
				* This texcoord has been offset by (-0.25, -0.125) in the vertex shader to
				* sample between edge, thus fetching four edges in a row.
				* Sampling with different offsets in each direction allows to disambiguate
				* which edges are active from the four fetched ones.
				*/
			vec2 e = vec2( 0.0, 1.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord -= vec2( 2.0, 0.0 ) * resolution;
				if ( ! ( texcoord.x > end && e.g > 0.8281 && e.r == 0.0 ) ) break;
			}

			// We correct the previous (-0.25, -0.125) offset we applied:
			texcoord.x += 0.25 * resolution.x;

			// The searches are bias by 1, so adjust the coords accordingly:
			texcoord.x += resolution.x;

			// Disambiguate the length added by the last step:
			texcoord.x += 2.0 * resolution.x; // Undo last step
			texcoord.x -= resolution.x * SMAASearchLength(searchTex, e, 0.0, 0.5);

			return texcoord.x;
		}

		float SMAASearchXRight( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 0.0, 1.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord += vec2( 2.0, 0.0 ) * resolution;
				if ( ! ( texcoord.x < end && e.g > 0.8281 && e.r == 0.0 ) ) break;
			}

			texcoord.x -= 0.25 * resolution.x;
			texcoord.x -= resolution.x;
			texcoord.x -= 2.0 * resolution.x;
			texcoord.x += resolution.x * SMAASearchLength( searchTex, e, 0.5, 0.5 );

			return texcoord.x;
		}

		float SMAASearchYUp( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 1.0, 0.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord += vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
				if ( ! ( texcoord.y > end && e.r > 0.8281 && e.g == 0.0 ) ) break;
			}

			texcoord.y -= 0.25 * resolution.y; // WebGL port note: Changed sign
			texcoord.y -= resolution.y; // WebGL port note: Changed sign
			texcoord.y -= 2.0 * resolution.y; // WebGL port note: Changed sign
			texcoord.y += resolution.y * SMAASearchLength( searchTex, e.gr, 0.0, 0.5 ); // WebGL port note: Changed sign

			return texcoord.y;
		}

		float SMAASearchYDown( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 1.0, 0.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord -= vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
				if ( ! ( texcoord.y < end && e.r > 0.8281 && e.g == 0.0 ) ) break;
			}

			texcoord.y += 0.25 * resolution.y; // WebGL port note: Changed sign
			texcoord.y += resolution.y; // WebGL port note: Changed sign
			texcoord.y += 2.0 * resolution.y; // WebGL port note: Changed sign
			texcoord.y -= resolution.y * SMAASearchLength( searchTex, e.gr, 0.5, 0.5 ); // WebGL port note: Changed sign

			return texcoord.y;
		}

		vec2 SMAAArea( sampler2D areaTex, vec2 dist, float e1, float e2, float offset ) {
			// Rounding prevents precision errors of bilinear filtering:
			vec2 texcoord = float( SMAA_AREATEX_MAX_DISTANCE ) * round( 4.0 * vec2( e1, e2 ) ) + dist;

			// We do a scale and bias for mapping to texel space:
			texcoord = SMAA_AREATEX_PIXEL_SIZE * texcoord + ( 0.5 * SMAA_AREATEX_PIXEL_SIZE );

			// Move to proper place, according to the subpixel offset:
			texcoord.y += SMAA_AREATEX_SUBTEX_SIZE * offset;

			return texture2D( areaTex, texcoord, 0.0 ).rg;
		}

		vec4 SMAABlendingWeightCalculationPS( vec2 texcoord, vec2 pixcoord, vec4 offset[ 3 ], sampler2D edgesTex, sampler2D areaTex, sampler2D searchTex, ivec4 subsampleIndices ) {
			vec4 weights = vec4( 0.0, 0.0, 0.0, 0.0 );

			vec2 e = texture2D( edgesTex, texcoord ).rg;

			if ( e.g > 0.0 ) { // Edge at north
				vec2 d;

				// Find the distance to the left:
				vec2 coords;
				coords.x = SMAASearchXLeft( edgesTex, searchTex, offset[ 0 ].xy, offset[ 2 ].x );
				coords.y = offset[ 1 ].y; // offset[1].y = texcoord.y - 0.25 * resolution.y (@CROSSING_OFFSET)
				d.x = coords.x;

				// Now fetch the left crossing edges, two at a time using bilinear
				// filtering. Sampling at -0.25 (see @CROSSING_OFFSET) enables to
				// discern what value each edge has:
				float e1 = texture2D( edgesTex, coords, 0.0 ).r;

				// Find the distance to the right:
				coords.x = SMAASearchXRight( edgesTex, searchTex, offset[ 0 ].zw, offset[ 2 ].y );
				d.y = coords.x;

				// We want the distances to be in pixel units (doing this here allow to
				// better interleave arithmetic and memory accesses):
				d = d / resolution.x - pixcoord.x;

				// SMAAArea below needs a sqrt, as the areas texture is compressed
				// quadratically:
				vec2 sqrt_d = sqrt( abs( d ) );

				// Fetch the right crossing edges:
				coords.y -= 1.0 * resolution.y; // WebGL port note: Added
				float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 1, 0 ) ).r;

				// Ok, we know how this pattern looks like, now it is time for getting
				// the actual area:
				weights.rg = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.y ) );
			}

			if ( e.r > 0.0 ) { // Edge at west
				vec2 d;

				// Find the distance to the top:
				vec2 coords;

				coords.y = SMAASearchYUp( edgesTex, searchTex, offset[ 1 ].xy, offset[ 2 ].z );
				coords.x = offset[ 0 ].x; // offset[1].x = texcoord.x - 0.25 * resolution.x;
				d.x = coords.y;

				// Fetch the top crossing edges:
				float e1 = texture2D( edgesTex, coords, 0.0 ).g;

				// Find the distance to the bottom:
				coords.y = SMAASearchYDown( edgesTex, searchTex, offset[ 1 ].zw, offset[ 2 ].w );
				d.y = coords.y;

				// We want the distances to be in pixel units:
				d = d / resolution.y - pixcoord.y;

				// SMAAArea below needs a sqrt, as the areas texture is compressed
				// quadratically:
				vec2 sqrt_d = sqrt( abs( d ) );

				// Fetch the bottom crossing edges:
				coords.y -= 1.0 * resolution.y; // WebGL port note: Added
				float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 0, 1 ) ).g;

				// Get the area for this direction:
				weights.ba = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.x ) );
			}

			return weights;
		}

		void main() {

			gl_FragColor = SMAABlendingWeightCalculationPS( vUv, vPixcoord, vOffset, tDiffuse, tArea, tSearch, ivec4( 0.0 ) );

		}`},to={name:"SMAABlendShader",uniforms:{tDiffuse:{value:null},tColor:{value:null},resolution:{value:new K(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 2 ];

		void SMAANeighborhoodBlendingVS( vec2 texcoord ) {
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0, 1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4( 1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
		}

		void main() {

			vUv = uv;

			SMAANeighborhoodBlendingVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform sampler2D tColor;
		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 2 ];

		vec4 SMAANeighborhoodBlendingPS( vec2 texcoord, vec4 offset[ 2 ], sampler2D colorTex, sampler2D blendTex ) {
			// Fetch the blending weights for current pixel:
			vec4 a;
			a.xz = texture2D( blendTex, texcoord ).xz;
			a.y = texture2D( blendTex, offset[ 1 ].zw ).g;
			a.w = texture2D( blendTex, offset[ 1 ].xy ).a;

			// Is there any blending weight with a value greater than 0.0?
			if ( dot(a, vec4( 1.0, 1.0, 1.0, 1.0 )) < 1e-5 ) {
				return texture2D( colorTex, texcoord, 0.0 );
			} else {
				// Up to 4 lines can be crossing a pixel (one through each edge). We
				// favor blending by choosing the line with the maximum weight for each
				// direction:
				vec2 offset;
				offset.x = a.a > a.b ? a.a : -a.b; // left vs. right
				offset.y = a.g > a.r ? -a.g : a.r; // top vs. bottom // WebGL port note: Changed signs

				// Then we go in the direction that has the maximum weight:
				if ( abs( offset.x ) > abs( offset.y )) { // horizontal vs. vertical
					offset.y = 0.0;
				} else {
					offset.x = 0.0;
				}

				// Fetch the opposite color and lerp by hand:
				vec4 C = texture2D( colorTex, texcoord, 0.0 );
				texcoord += sign( offset ) * resolution;
				vec4 Cop = texture2D( colorTex, texcoord, 0.0 );
				float s = abs( offset.x ) > abs( offset.y ) ? abs( offset.x ) : abs( offset.y );

				// WebGL port note: Added gamma correction
				C.xyz = pow(C.xyz, vec3(2.2));
				Cop.xyz = pow(Cop.xyz, vec3(2.2));
				vec4 mixed = mix(C, Cop, s);
				mixed.xyz = pow(mixed.xyz, vec3(1.0 / 2.2));

				return mixed;
			}
		}

		void main() {

			gl_FragColor = SMAANeighborhoodBlendingPS( vUv, vOffset, tColor, tDiffuse );

		}`};var no=class extends Pt{constructor(e,t){super(),this.edgesRT=new pt(e,t,{depthBuffer:!1,type:At}),this.edgesRT.texture.name="SMAAPass.edges",this.weightsRT=new pt(e,t,{depthBuffer:!1,type:At}),this.weightsRT.texture.name="SMAAPass.weights";let n=this,s=new Image;s.src=this.getAreaTexture(),s.onload=function(){n.areaTexture.needsUpdate=!0},this.areaTexture=new wt,this.areaTexture.name="SMAAPass.area",this.areaTexture.image=s,this.areaTexture.minFilter=Vt,this.areaTexture.generateMipmaps=!1,this.areaTexture.flipY=!1;let r=new Image;r.src=this.getSearchTexture(),r.onload=function(){n.searchTexture.needsUpdate=!0},this.searchTexture=new wt,this.searchTexture.name="SMAAPass.search",this.searchTexture.image=r,this.searchTexture.magFilter=qt,this.searchTexture.minFilter=qt,this.searchTexture.generateMipmaps=!1,this.searchTexture.flipY=!1,this.uniformsEdges=Zt.clone(yr.uniforms),this.uniformsEdges.resolution.value.set(1/e,1/t),this.materialEdges=new nt({defines:Object.assign({},yr.defines),uniforms:this.uniformsEdges,vertexShader:yr.vertexShader,fragmentShader:yr.fragmentShader}),this.uniformsWeights=Zt.clone(qr.uniforms),this.uniformsWeights.resolution.value.set(1/e,1/t),this.uniformsWeights.tDiffuse.value=this.edgesRT.texture,this.uniformsWeights.tArea.value=this.areaTexture,this.uniformsWeights.tSearch.value=this.searchTexture,this.materialWeights=new nt({defines:Object.assign({},qr.defines),uniforms:this.uniformsWeights,vertexShader:qr.vertexShader,fragmentShader:qr.fragmentShader}),this.uniformsBlend=Zt.clone(to.uniforms),this.uniformsBlend.resolution.value.set(1/e,1/t),this.uniformsBlend.tDiffuse.value=this.weightsRT.texture,this.materialBlend=new nt({uniforms:this.uniformsBlend,vertexShader:to.vertexShader,fragmentShader:to.fragmentShader}),this.fsQuad=new Kt(null)}render(e,t,n){this.uniformsEdges.tDiffuse.value=n.texture,this.fsQuad.material=this.materialEdges,e.setRenderTarget(this.edgesRT),this.clear&&e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.materialWeights,e.setRenderTarget(this.weightsRT),this.clear&&e.clear(),this.fsQuad.render(e),this.uniformsBlend.tColor.value=n.texture,this.fsQuad.material=this.materialBlend,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(),this.fsQuad.render(e))}setSize(e,t){this.edgesRT.setSize(e,t),this.weightsRT.setSize(e,t),this.materialEdges.uniforms.resolution.value.set(1/e,1/t),this.materialWeights.uniforms.resolution.value.set(1/e,1/t),this.materialBlend.uniforms.resolution.value.set(1/e,1/t)}getAreaTexture(){return"data:image/png;base64,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"}getSearchTexture(){return"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAAAhCAAAAABIXyLAAAAAOElEQVRIx2NgGAWjYBSMglEwEICREYRgFBZBqDCSLA2MGPUIVQETE9iNUAqLR5gIeoQKRgwXjwAAGn4AtaFeYLEAAAAASUVORK5CYII="}dispose(){this.edgesRT.dispose(),this.weightsRT.dispose(),this.areaTexture.dispose(),this.searchTexture.dispose(),this.materialEdges.dispose(),this.materialWeights.dispose(),this.materialBlend.dispose(),this.fsQuad.dispose()}};var Ju={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`
	
		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};var io=class extends Pt{constructor(){super();let e=Ju;this.uniforms=Zt.clone(e.uniforms),this.material=new Pa({name:e.name,uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader}),this.fsQuad=new Kt(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},Ge.getTransfer(this._outputColorSpace)===et&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===mc?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===gc?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===xc?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===vc?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===_c?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===xr&&(this.material.defines.NEUTRAL_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}};var Qu={name:"HorizontalBlurShader",uniforms:{tDiffuse:{value:null},h:{value:.001953125}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform float h;

		varying vec2 vUv;

		void main() {

			vec4 sum = vec4( 0.0 );

			sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051;
			sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
			sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051;

			gl_FragColor = sum;

		}`};var $u={name:"VerticalBlurShader",uniforms:{tDiffuse:{value:null},v:{value:.001953125}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform float v;

		varying vec2 vUv;

		void main() {

			vec4 sum = vec4( 0.0 );

			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;

			gl_FragColor = sum;

		}`};var ed={glyphs:{\u03BF:{x_min:30,x_max:741,ha:774,o:"m 395 683 q 645 587 550 683 q 741 337 741 492 q 646 79 741 173 q 385 -15 552 -15 q 127 78 225 -15 q 30 333 30 172 q 129 590 30 498 q 395 683 228 683 m 269 174 q 305 85 275 119 q 386 52 335 52 q 464 85 436 52 q 503 172 491 119 q 510 237 506 194 q 515 336 515 279 q 510 431 515 391 q 503 494 506 472 q 464 581 491 548 q 385 615 436 615 q 291 563 315 615 q 261 459 267 512 q 256 333 256 407 q 269 174 256 248 "},S:{x_min:55,x_max:687,ha:742,o:"m 95 251 l 116 251 q 188 116 145 158 q 322 75 231 75 q 438 113 385 75 q 491 211 491 151 q 382 350 491 294 q 168 461 273 407 q 55 664 55 539 q 159 875 55 801 q 409 949 264 949 q 653 891 535 949 q 622 805 635 848 q 598 712 609 762 l 583 712 q 509 818 559 779 q 391 857 459 857 q 283 827 328 857 q 238 738 238 797 q 349 609 238 666 q 570 497 461 551 q 687 295 687 416 q 570 62 687 143 q 292 -18 453 -18 q 171 -8 229 -18 q 55 26 113 1 q 72 116 64 68 q 95 251 80 165 "},"/":{x_min:-32.953125,x_max:420,ha:383,o:"m 339 1023 l 420 1024 l 47 -126 l -32 -126 l 339 1023 "},\u03A4:{x_min:8,x_max:738,ha:749,o:"m 493 818 q 490 723 493 790 q 487 652 487 656 q 490 427 487 529 q 498 201 494 326 q 503 0 503 77 q 438 2 482 0 q 374 5 395 5 q 317 3 351 5 q 244 0 284 1 q 252 266 244 88 q 261 476 261 444 q 258 670 261 533 q 255 818 255 808 q 158 815 188 818 q 8 801 128 813 l 12 872 l 8 932 q 198 927 70 932 q 373 922 327 922 q 572 927 445 922 q 738 932 700 932 l 733 870 l 738 801 q 493 818 614 818 "},\u03D5:{x_min:32,x_max:997,ha:1028,o:"m 418 -6 q 146 79 261 -6 q 32 322 32 165 q 143 560 32 474 q 418 664 254 646 q 411 819 418 715 q 404 978 404 923 q 483 970 445 970 q 622 977 556 970 q 616 829 622 938 q 611 664 611 719 q 882 573 768 664 q 997 328 997 483 q 886 90 997 171 q 611 -6 776 9 q 616 -197 611 -68 q 622 -374 622 -326 l 544 -365 q 471 -366 503 -365 q 404 -373 438 -368 q 411 -183 404 -315 q 418 -6 418 -51 m 611 328 l 611 61 q 742 147 704 72 q 780 328 780 222 q 741 510 780 433 q 612 601 703 588 l 611 328 m 418 601 q 287 510 326 588 q 249 328 249 433 q 286 147 249 223 q 416 61 324 72 l 418 328 l 418 601 "},y:{x_min:0,x_max:669.453125,ha:653,o:"m 269 -16 l 76 481 q 37 579 58 529 q 0 667 16 629 q 66 664 22 667 q 134 661 111 661 q 201 664 154 661 q 251 667 248 667 q 308 465 277 561 q 380 256 338 368 l 452 463 q 482 562 462 493 q 512 667 502 631 l 577 661 q 623 664 593 661 q 669 667 654 667 q 438 139 536 375 q 244 -373 341 -97 q 165 -368 206 -368 q 132 -368 145 -368 q 86 -373 119 -368 q 145 -277 119 -323 q 195 -176 170 -230 l 269 -16 "},"\u2248":{x_min:118.0625,x_max:1019.453125,ha:1139,o:"m 1019 527 q 894 458 956 483 q 766 433 831 433 q 570 477 698 433 q 373 522 443 522 q 238 489 297 522 q 118 417 179 457 l 118 563 q 254 632 187 607 q 391 658 320 658 q 577 614 450 658 q 761 571 704 571 q 886 596 826 571 q 1019 671 945 622 l 1019 527 m 1019 251 q 892 182 952 207 q 766 158 831 158 q 568 202 697 158 q 373 246 440 246 q 251 219 308 246 q 118 140 194 192 l 118 286 q 252 358 187 331 q 387 385 318 385 q 575 339 447 385 q 761 294 704 294 q 886 321 825 294 q 1019 397 947 348 l 1019 251 "},\u03A0:{x_min:91,x_max:957,ha:1049,o:"m 105 284 l 105 461 q 102 651 105 534 q 99 784 99 768 l 91 932 q 210 926 129 932 q 331 921 290 921 l 711 921 q 833 926 751 921 q 957 932 915 932 q 948 692 957 857 q 939 465 939 527 q 942 221 939 315 q 957 0 945 127 l 829 5 q 756 2 808 5 q 698 0 703 0 q 707 63 704 33 q 710 130 710 93 l 713 504 l 710 813 l 515 818 l 336 813 q 333 643 336 762 q 331 516 331 523 l 336 130 q 345 0 336 59 q 278 2 322 0 q 215 5 234 5 l 91 0 q 98 146 91 40 q 105 284 105 252 "},\u0390:{x_min:-147,x_max:552,ha:396,o:"m 92 126 l 92 543 l 80 666 q 139 661 105 663 q 197 658 173 658 q 265 660 239 658 q 315 666 292 663 q 305 586 308 616 q 302 523 302 557 l 302 113 q 303 72 302 88 q 315 0 305 56 l 196 4 l 82 0 q 88 67 85 30 q 92 126 92 104 m -65 961 q -7 935 -31 961 q 17 877 17 909 q -8 820 17 844 q -65 797 -33 797 q -121 820 -96 797 q -147 879 -147 844 q -123 935 -147 910 q -65 961 -99 961 m 275 1017 q 316 998 298 1017 q 334 957 334 980 q 321 919 334 935 q 283 886 307 903 l 94 755 l 36 755 l 182 950 q 225 998 204 980 q 275 1017 247 1017 m 470 961 q 528 935 504 961 q 552 877 552 910 q 528 820 552 844 q 471 797 504 797 q 413 820 438 797 q 388 879 388 844 q 412 936 388 912 q 470 961 436 961 "},g:{x_min:23,x_max:714.671875,ha:700,o:"m 213 272 q 93 331 142 278 q 45 456 45 384 q 128 623 45 563 q 322 683 211 683 l 382 683 l 534 664 l 606 660 q 666 662 641 660 q 714 666 692 665 l 714 585 l 581 589 q 623 543 610 570 q 637 477 637 515 q 541 300 637 353 q 310 248 446 248 q 258 236 281 248 q 236 199 236 225 q 386 142 236 150 q 623 102 536 134 q 711 -68 711 71 q 591 -296 711 -218 q 313 -374 471 -374 q 111 -326 199 -374 q 23 -175 23 -279 q 63 -64 23 -110 q 171 -7 104 -19 l 171 0 q 103 39 130 7 q 76 112 76 70 q 117 201 76 163 q 213 251 159 239 l 213 272 m 169 -143 q 221 -255 169 -215 q 351 -295 274 -295 q 483 -254 427 -295 q 540 -139 540 -214 q 524 -81 540 -107 q 472 -40 508 -54 q 383 -19 437 -25 q 269 -13 330 -13 l 239 -12 q 169 -143 169 -54 m 332 304 q 411 351 392 304 q 431 472 431 399 q 413 581 431 536 q 341 626 395 626 q 267 578 287 626 q 247 466 247 530 q 262 350 247 396 q 332 304 277 304 "},"\xB2":{x_min:22,x_max:465.0625,ha:494,o:"m 22 401 q 156 502 102 456 q 248 607 210 548 q 287 742 287 667 q 267 825 287 802 q 216 848 248 848 q 146 816 167 848 q 110 725 126 785 l 102 725 l 30 800 q 245 901 116 901 q 385 864 327 901 q 444 751 444 827 q 411 643 444 681 q 201 471 378 604 l 284 471 q 387 473 314 471 q 465 476 459 476 q 456 413 456 439 q 459 383 456 401 q 465 354 462 365 q 331 356 412 354 q 249 358 251 358 l 27 354 l 22 401 "},\u039A:{x_min:90,x_max:892.78125,ha:856,o:"m 334 716 l 334 515 l 569 787 q 635 866 619 845 q 682 932 651 886 l 767 926 q 817 929 784 926 q 870 932 851 932 q 687 746 790 851 q 503 554 585 641 l 623 377 q 892 0 753 179 l 753 5 q 664 2 727 5 q 595 0 600 0 q 484 190 545 98 q 334 404 424 281 l 334 193 q 348 0 334 94 q 270 2 325 0 q 212 5 215 5 l 90 0 q 99 236 90 69 q 108 461 108 402 q 103 623 108 515 q 99 787 99 731 l 90 932 q 157 927 113 932 q 219 922 201 922 q 282 925 252 922 q 342 932 312 927 q 338 831 342 907 q 334 716 334 755 "},\u00EB:{x_min:41,x_max:684.046875,ha:729,o:"m 482 98 q 566 112 532 98 q 643 160 600 126 l 661 151 q 643 96 652 125 q 628 40 634 66 q 521 -1 577 11 q 403 -15 466 -15 q 141 79 241 -15 q 41 336 41 173 q 137 586 41 490 q 386 683 234 683 q 608 601 532 683 q 684 373 684 520 l 684 332 l 267 332 q 325 165 267 232 q 482 98 383 98 m 233 976 q 300 948 272 976 q 328 878 328 920 q 303 811 328 839 q 236 784 278 784 q 166 811 194 784 q 138 878 138 838 q 166 947 138 918 q 233 976 194 976 m 493 976 q 560 948 532 976 q 588 878 588 920 q 562 811 588 838 q 496 784 536 784 q 427 811 455 784 q 399 878 399 838 q 426 946 399 917 q 493 976 454 976 m 478 411 q 481 444 481 422 q 459 566 481 513 q 377 620 438 620 q 292 562 318 620 q 267 437 267 505 l 267 411 l 478 411 "},e:{x_min:43,x_max:686.046875,ha:729,o:"m 484 95 q 566 110 531 95 q 644 161 601 125 l 662 154 q 640 84 647 105 q 629 40 634 62 q 522 -1 577 11 q 404 -15 468 -15 q 141 77 240 -15 q 43 336 43 170 q 138 585 43 488 q 387 683 234 683 q 609 602 533 683 q 686 375 686 522 l 684 332 l 269 332 q 326 162 269 230 q 484 95 384 95 m 480 411 l 482 444 q 459 567 482 513 q 379 622 437 622 q 293 565 318 622 q 269 438 269 509 l 269 411 l 480 411 "},\u03CC:{x_min:30,x_max:741,ha:774,o:"m 395 683 q 645 587 550 683 q 741 337 741 492 q 646 79 741 173 q 385 -15 552 -15 q 127 78 225 -15 q 30 333 30 172 q 129 590 30 498 q 395 683 228 683 m 538 953 q 591 1001 571 986 q 639 1017 611 1017 q 692 994 671 1017 q 713 943 713 972 q 694 897 713 915 q 643 863 675 878 l 420 755 l 352 755 l 538 953 m 269 174 q 305 85 275 119 q 386 52 335 52 q 464 85 436 52 q 503 172 491 119 q 510 237 506 194 q 515 336 515 279 q 510 431 515 391 q 503 494 506 472 q 464 581 491 548 q 385 615 436 615 q 291 563 315 615 q 261 459 267 512 q 256 333 256 407 q 269 174 256 248 "},J:{x_min:-37,x_max:356,ha:447,o:"m 214 926 q 293 929 237 926 q 356 932 349 932 q 349 680 356 857 q 342 450 342 502 q 344 314 342 411 q 346 213 346 218 l 346 105 q 249 -128 346 -36 q 10 -221 153 -221 l -24 -216 l -37 -143 l 13 -145 q 97 -94 76 -145 q 118 28 118 -44 l 118 219 q 110 619 118 352 q 103 931 103 886 l 214 926 "},"\xBB":{x_min:54.5625,x_max:587.890625,ha:629,o:"m 187 330 l 54 604 l 110 656 l 339 333 l 110 9 l 54 66 l 187 330 m 437 330 l 304 604 l 358 656 l 587 333 l 358 9 l 304 66 l 437 330 "},"\xA9":{x_min:72,x_max:1064,ha:1138,o:"m 1064 486 q 918 139 1064 285 q 570 -6 772 -6 q 220 139 369 -6 q 72 488 72 285 q 219 836 72 688 q 568 985 367 985 q 916 836 769 985 q 1064 486 1064 687 m 155 490 q 276 199 155 323 q 566 75 398 75 q 858 197 734 75 q 982 487 982 319 q 861 781 982 659 q 567 904 740 904 q 276 781 398 904 q 155 490 155 658 m 683 597 q 649 666 683 637 q 573 696 616 696 q 470 636 501 696 q 439 499 439 577 q 468 354 439 421 q 563 288 497 288 q 687 397 664 288 l 815 397 q 735 247 805 303 q 570 191 666 191 q 374 273 448 191 q 301 481 301 356 q 371 696 301 604 q 559 788 441 788 q 726 737 655 788 q 808 597 796 686 l 683 597 "},\u03CE:{x_min:30,x_max:1059,ha:1093,o:"m 335 -15 q 111 79 192 -15 q 30 320 30 173 q 72 504 30 420 q 192 666 114 588 q 297 661 237 661 q 347 663 319 661 q 390 666 374 665 q 247 280 247 498 q 269 123 247 194 q 358 52 291 52 q 421 86 399 52 q 443 165 443 121 l 443 291 q 441 415 443 379 q 435 512 440 451 q 511 505 499 505 q 544 505 522 505 q 608 508 579 505 q 657 512 636 511 q 648 402 652 465 q 644 289 644 340 q 644 237 644 258 q 650 165 644 215 q 669 85 650 119 q 730 52 688 52 q 821 122 798 52 q 844 279 844 192 q 807 481 844 386 q 700 666 771 576 q 746 662 724 663 q 793 661 767 661 q 846 663 812 661 q 898 666 881 666 q 1016 508 974 594 q 1059 322 1059 422 q 974 83 1059 182 q 753 -15 890 -15 q 630 13 685 -15 q 545 100 575 41 q 459 14 516 44 q 335 -15 402 -15 m 684 953 q 737 1001 717 986 q 786 1017 757 1017 q 838 994 817 1017 q 859 943 859 972 q 840 897 859 915 q 790 863 821 878 l 567 755 l 498 755 l 684 953 "},"\u2265":{x_min:170.828125,x_max:965,ha:1139,o:"m 965 571 l 965 455 l 173 199 l 173 338 l 732 514 l 173 690 l 173 830 l 965 571 m 965 132 l 965 0 l 170 0 l 170 132 l 965 132 "},"^":{x_min:-3,x_max:425,ha:438,o:"m 148 1003 l 270 1003 l 425 755 l 357 755 l 210 878 l 62 755 l -3 755 l 148 1003 "},"\xAB":{x_min:40.28125,x_max:575,ha:629,o:"m 193 336 l 326 62 l 272 9 l 40 333 l 272 656 l 325 599 l 193 336 m 443 336 l 575 62 l 520 9 l 288 333 l 520 656 l 575 599 l 443 336 "},D:{x_min:87,x_max:987,ha:1032,o:"m 104 221 l 104 465 q 100 742 104 650 q 89 932 97 834 l 216 929 l 283 929 l 442 929 q 532 929 488 929 q 622 929 576 929 q 894 797 802 912 q 987 496 987 682 q 832 110 987 221 q 389 -1 677 -1 l 201 -1 l 87 -1 q 98 119 93 60 q 104 221 104 178 m 415 89 q 659 192 580 89 q 738 468 738 296 q 663 746 738 653 q 407 839 588 839 l 334 839 l 330 605 l 334 98 q 374 91 353 94 q 415 89 394 89 "},w:{x_min:6.9375,x_max:1048.625,ha:1042,o:"m 302 6 q 270 5 281 6 q 215 0 258 4 l 6 667 q 77 663 33 667 q 129 659 120 659 q 197 663 154 659 q 248 667 240 667 q 359 238 293 457 l 440 505 l 484 667 q 540 663 502 667 q 580 659 577 659 q 637 663 598 659 q 677 667 676 667 q 712 520 695 586 q 748 383 729 454 l 790 238 l 855 475 q 875 555 862 501 q 899 667 888 609 q 939 662 917 665 q 973 659 961 659 q 1017 662 998 659 q 1048 667 1036 665 l 956 423 l 812 0 q 759 4 776 3 q 727 6 743 6 q 678 3 712 6 q 643 0 644 0 l 562 288 l 522 423 q 391 0 455 221 q 336 4 354 3 q 302 6 318 6 "},$:{x_min:43,x_max:697,ha:749,o:"m 43 79 q 104 254 76 165 l 128 254 q 202 128 150 177 q 331 79 254 79 l 331 365 q 108 474 168 409 q 49 623 49 539 q 130 807 49 737 q 331 889 211 878 q 322 1010 331 949 q 344 1006 329 1008 q 371 1002 360 1004 q 393 1004 382 1004 q 417 1010 403 1005 q 410 955 412 983 q 409 892 409 926 q 555 868 502 880 q 662 823 607 855 q 601 665 626 746 l 570 665 q 409 817 538 789 l 409 554 q 637 445 577 511 q 697 289 697 379 q 615 91 697 168 q 409 0 534 15 l 409 -62 q 409 -97 409 -84 q 411 -136 410 -109 l 368 -133 l 325 -136 q 328 -69 328 -112 q 331 0 329 -26 q 43 79 173 0 m 331 817 q 243 778 278 817 q 209 686 209 739 q 245 615 209 644 q 331 577 282 586 l 331 817 m 534 212 q 499 299 534 267 q 405 347 464 330 l 405 78 q 497 123 461 89 q 534 212 534 157 "},"\u2027":{x_min:105,x_max:343,ha:447,o:"m 223 654 q 306 617 270 654 q 343 533 343 581 q 306 451 343 486 q 223 417 270 417 q 139 450 174 417 q 105 534 105 483 q 139 619 105 584 q 223 654 174 654 "},"\\":{x_min:-31.953125,x_max:422,ha:383,o:"m -31 1024 l 49 1024 l 422 -126 l 338 -126 l -31 1024 "},\u0399:{x_min:94,x_max:354,ha:447,o:"m 111 402 q 107 716 111 609 q 94 932 103 822 q 161 925 124 929 q 220 922 198 922 q 292 927 245 922 q 353 931 339 932 q 340 716 343 819 q 337 465 337 613 q 340 221 337 326 q 354 0 344 116 q 273 2 330 0 q 214 5 216 5 l 95 0 q 107 199 103 88 q 111 402 111 311 "},\u038E:{x_min:-28,x_max:1295.609375,ha:1247,o:"m 635 650 q 566 772 622 672 q 469 931 509 872 l 591 926 q 683 929 619 926 q 755 931 748 931 q 844 740 803 825 q 941 554 885 656 q 1040 730 991 636 q 1135 931 1088 825 l 1210 926 q 1252 929 1224 926 q 1295 931 1280 931 q 1142 689 1213 812 q 997 420 1072 566 l 1001 143 l 1007 0 l 913 5 l 755 0 q 761 138 755 50 q 768 237 768 226 l 768 402 l 635 650 m 158 953 q 211 1001 191 986 q 259 1017 231 1017 q 312 994 291 1017 q 333 943 333 972 q 314 897 333 916 q 264 863 295 878 l 40 755 l -28 755 l 158 953 "},"\u2019":{x_min:70.828125,x_max:337.5,ha:374,o:"m 70 528 l 151 848 q 183 919 158 889 q 244 949 208 949 q 310 924 283 949 q 337 862 337 900 q 331 829 337 845 q 316 797 326 813 l 111 511 l 70 528 "},\u039D:{x_min:86,x_max:930.453125,ha:1010,o:"m 101 444 q 97 645 101 523 q 94 787 94 768 l 90 931 l 177 926 l 268 934 q 526 623 395 775 q 792 327 657 470 l 792 584 q 787 766 792 643 q 782 931 782 888 q 825 927 811 929 q 854 926 838 926 q 890 927 876 926 q 930 934 904 929 q 919 838 923 889 q 915 738 915 788 q 913 461 915 600 q 911 184 912 322 q 913 106 911 147 q 920 0 915 66 q 876 4 901 2 q 838 6 851 6 q 794 4 812 6 q 756 0 777 2 q 495 309 631 151 q 220 618 359 466 l 220 241 l 227 0 q 194 4 213 1 q 159 6 175 6 q 119 4 134 6 q 86 0 103 2 q 97 208 94 105 q 101 444 101 311 "},"-":{x_min:58.71875,x_max:386.5,ha:447,o:"m 65 334 q 62 383 65 352 q 58 422 58 415 l 386 422 l 379 333 l 386 247 l 58 247 q 62 296 58 265 q 65 334 65 327 "},Q:{x_min:40,x_max:1098.328125,ha:1129,o:"m 40 456 q 190 819 40 689 q 577 949 340 949 q 945 829 804 949 q 1086 486 1086 709 q 1004 185 1086 313 q 759 10 922 56 l 883 -72 q 1098 -182 979 -129 l 1098 -200 q 1005 -241 1053 -216 q 906 -294 956 -265 q 737 -160 824 -226 q 533 -13 649 -94 q 174 110 308 -13 q 40 456 40 233 m 562 72 q 773 193 706 72 q 840 472 840 315 q 773 741 840 623 q 566 860 706 860 q 354 741 421 860 q 287 465 287 622 q 353 192 287 312 q 562 72 420 72 "},\u03C2:{x_min:48,x_max:647,ha:689,o:"m 421 600 q 306 538 350 600 q 263 404 263 477 q 357 244 263 304 q 532 151 445 197 q 627 -17 627 88 q 527 -214 627 -140 q 302 -288 427 -288 q 291 -198 302 -247 q 318 -203 296 -198 q 353 -207 341 -207 q 440 -176 402 -207 q 484 -95 478 -145 q 324 60 484 -17 q 106 179 164 139 q 48 353 48 219 q 153 590 48 500 q 409 681 259 681 q 527 666 470 681 q 647 623 584 651 q 616 532 626 561 q 597 465 606 504 l 559 465 q 513 563 546 526 q 421 600 479 600 "},M:{x_min:32,x_max:1165,ha:1217,o:"m 105 465 l 168 932 q 211 927 190 929 q 261 926 231 926 q 309 929 277 926 q 358 932 341 932 q 441 709 409 790 q 503 559 473 629 q 608 316 533 488 l 778 690 q 872 932 834 808 q 919 929 887 932 q 966 926 951 926 q 1027 929 1006 926 q 1059 932 1048 932 l 1105 473 q 1130 240 1117 354 q 1165 0 1144 127 q 1095 3 1140 0 q 1041 6 1051 6 q 969 3 1015 6 q 915 0 924 0 q 895 291 915 142 l 865 616 q 731 317 802 480 q 597 0 661 153 l 551 0 l 500 0 q 409 218 465 87 q 317 426 352 349 q 236 605 282 504 l 196 229 q 185 108 190 173 q 180 0 180 44 q 134 3 165 0 q 100 6 102 6 q 60 4 77 6 q 32 0 43 1 q 105 465 77 258 "},\u03A8:{x_min:84,x_max:1097.890625,ha:1185,o:"m 307 708 q 307 639 307 686 q 307 569 307 593 q 342 407 307 462 q 478 353 377 353 l 480 484 q 472 735 480 568 q 464 932 464 903 q 530 925 494 929 q 587 922 566 922 q 658 927 612 922 q 719 931 705 932 q 712 777 719 877 q 706 666 706 677 l 702 353 q 800 378 761 353 q 853 457 839 404 q 871 582 868 511 q 875 670 875 652 q 868 811 875 720 q 861 931 861 901 q 926 927 881 931 q 984 922 970 922 q 1039 926 1002 922 q 1097 930 1077 930 q 1093 869 1094 904 q 1092 801 1092 834 l 1092 738 l 1092 687 l 1092 610 q 992 354 1092 432 q 702 261 892 277 q 710 126 702 219 q 719 0 719 33 q 646 3 691 0 q 591 6 601 6 q 516 3 562 6 q 464 0 470 0 q 472 134 464 40 q 480 261 480 229 q 188 358 287 261 q 90 651 90 455 l 90 804 l 90 820 q 84 930 90 881 q 139 926 102 930 q 196 922 177 922 q 257 927 219 922 q 322 931 295 931 q 311 813 316 876 q 307 708 307 750 "},C:{x_min:43,x_max:891.84375,ha:900,o:"m 587 856 q 363 744 442 856 q 285 479 285 632 q 361 202 285 322 q 586 82 437 82 q 740 108 668 82 q 855 194 812 135 l 877 184 q 861 120 868 152 q 846 45 854 88 q 710 -2 786 12 q 555 -18 634 -18 q 184 109 326 -18 q 43 464 43 236 q 190 819 43 690 q 569 949 338 949 q 723 932 652 949 q 891 876 793 915 q 866 793 879 840 q 846 710 852 746 l 827 710 q 734 818 799 781 q 587 856 669 856 "},\u0153:{x_min:36,x_max:1154.0625,ha:1197,o:"m 387 -15 q 131 79 227 -15 q 36 334 36 173 q 131 586 36 490 q 383 683 226 683 q 630 606 515 683 q 735 664 677 645 q 859 683 792 683 q 1076 600 999 683 q 1154 377 1154 517 l 1152 332 l 736 332 q 793 165 736 232 q 951 98 851 98 q 1111 160 1042 98 l 1127 151 q 1111 101 1116 119 q 1094 40 1105 83 q 990 -1 1049 11 q 870 -15 931 -15 q 735 2 794 -15 q 628 68 676 20 q 521 4 584 23 q 387 -15 458 -15 m 949 411 l 949 445 q 921 580 949 541 q 844 620 893 620 q 756 557 777 620 q 736 411 736 494 l 949 411 m 276 171 q 315 80 286 115 q 395 45 344 45 q 453 62 424 45 q 498 115 481 79 q 520 204 514 151 q 526 329 526 257 q 516 475 526 408 q 476 577 506 542 q 394 612 445 612 q 294 552 327 612 q 271 470 279 520 q 264 329 264 420 q 266 244 264 269 q 276 171 268 219 "},"!":{x_min:103,x_max:341,ha:444,o:"m 222 221 q 306 187 271 221 q 341 104 341 154 q 306 19 341 54 q 222 -15 271 -15 q 138 19 173 -15 q 103 103 103 53 q 137 186 103 151 q 222 221 172 221 m 113 818 q 142 910 113 872 q 224 949 171 949 q 304 921 274 949 q 334 847 334 894 q 325 741 334 796 q 306 628 317 687 l 276 462 q 253 296 259 369 l 193 296 q 113 818 153 557 "},\u00E7:{x_min:36,x_max:622,ha:660,o:"m 423 600 q 306 528 346 600 q 267 373 267 457 q 313 176 267 265 q 459 88 359 88 q 542 99 500 88 q 612 133 584 111 l 622 126 l 590 19 q 502 -6 551 1 q 406 -15 453 -15 q 141 76 247 -15 q 36 325 36 168 q 140 583 36 485 q 408 681 245 681 q 622 637 519 681 q 590 459 602 550 l 565 459 q 519 561 555 522 q 423 600 483 600 m 175 -203 q 276 -231 251 -226 q 332 -236 301 -236 q 381 -223 361 -236 q 402 -184 402 -211 q 384 -144 402 -161 q 341 -128 366 -128 q 319 -130 328 -128 q 301 -135 310 -132 l 301 2 l 358 2 l 358 -77 l 418 -75 q 496 -108 465 -80 q 527 -183 527 -136 q 487 -274 527 -239 q 388 -310 448 -310 q 268 -299 326 -310 q 151 -265 211 -289 l 175 -203 "},"{":{x_min:104,x_max:587.328125,ha:683,o:"m 587 844 l 540 844 q 468 821 487 844 q 446 785 449 798 q 443 752 443 773 l 443 712 l 443 552 q 416 424 443 464 q 304 353 390 383 q 413 287 383 335 q 443 155 443 238 l 443 -5 q 465 -105 443 -74 q 555 -136 488 -136 l 587 -136 l 587 -277 l 481 -275 q 343 -234 396 -268 q 280 -122 289 -200 l 280 -50 l 280 116 q 246 238 280 194 q 137 283 212 283 l 104 283 l 104 422 q 240 458 201 422 q 280 588 280 494 l 280 756 l 280 831 q 355 951 292 919 q 517 983 417 983 l 587 983 l 587 844 "},X:{x_min:-1.390625,x_max:801.390625,ha:782,o:"m 169 241 l 301 436 l 15 932 q 94 929 38 932 q 155 926 150 926 q 235 929 179 926 q 298 932 291 932 q 314 893 308 907 q 358 802 320 880 l 445 638 q 547 805 513 748 q 613 932 581 862 q 655 929 627 932 q 698 926 683 926 q 740 929 712 926 q 783 932 768 932 q 685 800 709 833 q 616 701 661 766 l 502 531 l 801 0 q 713 2 776 0 q 647 5 651 5 l 516 0 l 470 108 l 356 326 q 265 174 316 263 q 170 0 215 84 q 118 3 154 0 q 77 6 81 6 q 31 4 52 6 q -1 0 11 1 l 169 241 "},\u00F4:{x_min:32,x_max:743,ha:775,o:"m 395 683 q 647 588 551 683 q 743 337 743 494 q 648 79 743 173 q 387 -15 554 -15 q 129 78 227 -15 q 32 333 32 172 q 130 590 32 497 q 395 683 229 683 m 325 1003 l 450 1003 l 601 755 l 534 755 l 387 878 l 238 755 l 174 755 l 325 1003 m 269 174 q 307 85 277 120 q 387 50 337 50 q 466 84 437 50 q 500 156 494 119 q 511 215 507 194 q 517 335 517 271 q 511 450 517 395 q 500 509 507 471 q 466 582 494 548 q 387 616 439 616 q 294 564 319 616 q 263 459 269 513 q 258 333 258 406 q 260 244 258 270 q 269 174 262 217 "},"#":{x_min:30,x_max:1019,ha:1049,o:"m 619 974 l 522 698 l 684 698 l 781 974 l 930 975 l 831 698 l 1019 699 l 970 564 l 783 563 l 725 403 l 920 403 l 873 271 l 678 271 l 579 -5 l 432 -5 l 530 271 l 367 271 l 270 -5 l 121 -5 l 220 270 l 30 271 l 79 403 l 268 403 l 326 563 l 127 564 l 174 699 l 374 698 l 472 975 l 619 974 m 414 402 l 582 402 l 639 563 l 470 563 l 414 402 "},\u03B9:{x_min:80,x_max:314.71875,ha:396,o:"m 91 126 l 91 543 l 80 667 q 139 661 105 664 q 196 658 173 658 q 264 661 238 658 q 314 666 291 663 q 304 587 307 616 q 301 523 301 558 l 301 113 q 302 72 301 88 q 314 0 304 56 l 195 4 l 81 0 q 87 67 84 30 q 91 126 91 104 "},\u0386:{x_min:-28,x_max:983.109375,ha:963,o:"m 242 322 q 326 529 276 400 q 411 751 377 659 q 484 948 445 843 l 553 944 l 623 948 q 805 450 717 684 q 983 0 892 215 l 849 4 l 713 0 l 684 91 l 630 259 q 531 261 581 259 q 433 264 481 262 l 335 259 q 245 0 295 134 l 155 4 l 103 0 l 242 322 m 158 953 q 211 1001 191 986 q 259 1017 231 1017 q 312 994 291 1017 q 333 943 333 972 q 314 897 333 916 q 265 863 295 878 l 40 755 l -28 755 l 158 953 m 487 368 l 597 368 q 549 509 573 446 q 488 662 526 572 q 376 370 428 519 l 487 368 "},")":{x_min:72.21875,x_max:383,ha:449,o:"m 227 366 q 191 656 227 521 q 76 906 156 792 l 120 949 q 317 691 252 826 q 383 382 383 555 q 317 63 383 201 q 115 -201 252 -75 l 72 -158 q 191 81 156 -48 q 227 366 227 211 "},\u03B5:{x_min:55,x_max:599,ha:657,o:"m 512 502 q 472 579 502 548 q 396 611 442 611 q 323 577 352 611 q 295 499 295 544 q 317 429 295 460 q 377 394 340 399 l 449 394 l 449 373 q 449 336 449 349 q 449 316 449 323 q 413 319 438 319 q 322 281 362 319 q 283 195 283 244 q 323 101 283 144 q 412 59 363 59 q 498 88 461 59 q 571 167 535 117 l 599 155 q 593 130 595 144 q 592 104 592 115 q 592 82 592 90 q 599 53 592 74 q 351 -15 485 -15 q 145 30 236 -15 q 55 176 55 75 q 105 289 55 244 q 232 360 155 335 q 127 421 166 385 q 88 516 88 456 q 165 643 88 603 q 340 683 243 683 q 592 612 479 683 q 565 556 576 583 q 551 502 554 530 l 512 502 "},\u0394:{x_min:11,x_max:958.328125,ha:972,o:"m 490 926 q 531 928 509 926 q 566 932 554 930 q 690 599 633 746 q 815 296 747 452 q 958 0 884 140 q 720 3 879 0 q 481 8 562 8 q 247 3 404 8 q 11 0 90 0 q 234 470 126 223 q 415 932 342 716 q 448 928 429 930 q 490 926 468 926 m 314 373 q 217 127 262 259 q 425 118 314 118 q 542 122 468 118 q 636 127 616 127 q 598 232 616 184 q 538 391 580 280 l 433 645 l 314 373 "},\u00E2:{x_min:44,x_max:706.78125,ha:706,o:"m 237 -15 q 98 35 153 -15 q 44 169 44 86 q 212 352 44 301 q 401 421 380 403 q 410 439 410 432 q 373 539 410 502 q 275 577 337 577 q 140 511 185 577 l 135 511 l 115 585 q 230 657 164 632 q 365 683 296 683 q 543 623 479 683 q 608 452 608 564 l 604 213 q 604 166 604 184 q 608 123 604 148 q 625 87 612 99 q 658 76 638 76 q 679 80 666 76 q 702 90 691 84 l 706 40 q 643 1 676 14 q 566 -15 610 -10 q 482 5 520 -15 q 421 64 443 25 q 237 -15 351 -15 m 291 1003 l 413 1003 l 566 755 l 501 755 l 350 878 l 203 755 l 138 755 l 291 1003 m 240 200 q 261 128 240 158 q 321 99 282 99 q 388 131 367 99 q 410 211 410 164 l 410 352 q 287 302 335 338 q 240 200 240 267 "},"}":{x_min:93,x_max:579,ha:683,o:"m 126 983 q 323 955 243 983 q 403 831 403 927 l 403 756 l 403 588 q 423 478 403 512 q 473 434 443 444 q 539 423 504 424 q 579 422 574 422 l 579 283 q 442 249 481 283 q 403 116 403 216 l 403 -50 q 373 -204 403 -147 q 284 -267 343 -260 q 179 -275 225 -274 q 93 -277 133 -277 l 93 -137 q 201 -121 163 -137 q 240 -43 240 -105 l 240 -4 l 240 155 q 269 285 240 241 q 380 353 298 328 q 268 421 296 378 q 240 553 240 463 l 240 713 q 227 805 240 771 q 166 844 215 838 l 93 844 l 93 983 l 126 983 "},"\u2030":{x_min:28,x_max:1618,ha:1647,o:"m 265 910 q 434 844 369 910 q 500 672 500 779 q 435 496 500 562 q 258 431 370 431 q 91 498 154 431 q 28 669 28 565 q 93 843 28 776 q 265 910 158 910 m 831 1015 l 917 1014 l 272 -125 l 184 -125 l 831 1015 m 850 463 q 1020 401 955 463 q 1085 230 1085 339 q 1023 51 1085 117 q 846 -15 961 -15 q 678 51 743 -15 q 613 222 613 118 q 676 398 613 333 q 850 463 739 463 m 1383 463 q 1554 400 1490 463 q 1618 229 1618 337 q 1556 51 1618 117 q 1378 -15 1494 -15 q 1209 51 1274 -15 q 1144 222 1144 118 q 1209 396 1144 329 q 1383 463 1274 463 m 780 112 q 798 57 780 83 q 847 31 817 31 q 895 59 874 31 q 916 114 916 87 q 922 222 922 162 q 922 275 922 248 q 915 338 917 312 q 896 389 912 364 q 848 414 880 414 q 813 404 828 414 q 792 375 797 394 q 777 312 781 347 q 773 241 773 276 l 773 222 q 773 183 773 201 q 780 112 774 165 m 196 561 q 214 505 196 532 q 261 478 232 478 q 297 489 280 478 q 323 525 314 501 q 335 586 332 548 q 339 669 339 625 q 337 723 339 697 q 332 780 336 749 q 311 836 327 811 q 264 861 296 861 q 204 820 222 861 q 191 752 194 786 q 188 669 188 719 q 196 561 188 615 m 1315 112 q 1333 56 1315 82 q 1381 31 1351 31 q 1417 42 1402 31 q 1442 76 1433 53 q 1454 138 1451 100 q 1458 222 1458 176 q 1458 275 1458 248 q 1449 344 1453 312 q 1426 395 1445 376 q 1383 414 1408 414 q 1327 379 1338 414 q 1311 301 1315 344 q 1307 222 1307 258 q 1308 164 1307 190 q 1315 112 1309 139 "},\u00C4:{x_min:-28,x_max:848.390625,ha:829,o:"m 109 323 q 187 512 148 413 q 274 740 225 611 q 350 948 323 870 l 420 945 l 492 948 q 666 463 583 687 q 848 0 749 240 l 718 2 l 579 0 l 551 91 l 497 259 q 399 261 448 259 q 300 264 349 262 l 202 259 l 113 0 q 74 2 95 2 q 42 2 53 2 l 21 2 l -28 0 l 109 323 m 284 1242 q 351 1214 323 1242 q 380 1148 380 1187 q 353 1079 380 1108 q 286 1050 327 1050 q 216 1077 245 1050 q 187 1148 187 1105 q 215 1214 187 1187 q 284 1242 243 1242 m 543 1242 q 611 1215 583 1242 q 639 1148 639 1189 q 613 1078 639 1107 q 546 1050 587 1050 q 478 1077 507 1050 q 449 1148 449 1105 q 476 1214 449 1186 q 543 1242 504 1242 m 352 368 l 462 368 q 414 511 437 450 q 350 662 390 571 q 243 370 296 516 l 352 368 "},a:{x_min:47,x_max:708.15625,ha:706,o:"m 237 -15 q 100 35 154 -15 q 47 169 47 86 q 213 352 47 301 q 403 422 380 404 q 410 440 410 433 q 373 541 410 504 q 273 579 337 579 q 197 561 232 579 q 140 509 162 544 l 135 509 l 114 585 q 364 683 218 683 q 541 624 478 683 q 604 452 604 566 l 604 214 q 604 169 604 191 q 606 119 604 148 q 656 76 616 76 q 677 79 665 76 q 702 89 690 83 l 708 40 q 563 -11 644 -11 q 479 7 516 -11 q 421 64 441 26 q 339 4 387 23 q 237 -15 291 -15 m 240 198 q 261 127 240 158 q 322 97 282 97 q 388 131 367 97 q 410 212 410 165 l 410 351 q 287 301 334 337 q 240 198 240 266 "},"\u2014":{x_min:226.390625,x_max:1138.890625,ha:1365,o:"m 226 421 l 1138 421 l 1138 278 l 226 278 l 226 421 "},"=":{x_min:169.4375,x_max:968.0625,ha:1138,o:"m 968 615 l 968 484 l 169 484 l 169 615 l 968 615 m 968 329 l 968 196 l 169 196 l 169 329 l 968 329 "},N:{x_min:86,x_max:930.453125,ha:1010,o:"m 101 444 q 97 645 101 523 q 94 787 94 768 l 90 931 l 177 926 l 268 934 q 526 623 395 775 q 792 327 657 470 l 792 584 q 787 766 792 643 q 782 931 782 888 q 825 927 811 929 q 854 926 838 926 q 890 927 876 926 q 930 934 904 929 q 919 838 923 889 q 915 738 915 788 q 913 461 915 600 q 911 184 912 322 q 913 106 911 147 q 920 0 915 66 q 876 4 901 2 q 838 6 851 6 q 794 4 812 6 q 756 0 777 2 q 495 309 631 151 q 220 618 359 466 l 220 241 l 227 0 q 194 4 213 1 q 159 6 175 6 q 119 4 134 6 q 86 0 103 2 q 97 208 94 105 q 101 444 101 311 "},\u03C1:{x_min:48,x_max:759,ha:793,o:"m 160 -366 q 48 -374 109 -366 q 52 -291 48 -343 q 56 -223 56 -239 l 56 169 l 48 314 q 139 585 48 488 q 403 683 231 683 q 661 589 563 683 q 759 336 759 495 q 681 89 759 194 q 465 -15 603 -15 q 266 65 346 -15 l 264 -208 q 265 -268 264 -241 q 275 -373 267 -295 q 197 -367 220 -368 q 160 -366 173 -366 m 275 347 q 284 196 275 264 q 324 109 295 142 q 404 77 352 77 q 494 120 473 77 q 522 212 514 164 q 531 347 531 260 q 526 431 531 388 q 517 511 522 473 q 483 582 512 549 q 401 615 453 615 q 309 566 340 615 q 279 452 279 517 q 275 372 275 412 l 275 347 "},"2":{x_min:33,x_max:706.625,ha:749,o:"m 33 75 q 236 249 152 168 q 379 431 321 330 q 438 652 438 533 q 413 772 438 723 q 325 822 389 822 q 220 767 251 822 q 170 616 189 712 l 155 616 q 44 743 107 691 q 189 867 105 823 q 373 911 273 911 q 586 847 500 911 q 673 658 673 783 q 619 480 673 548 q 304 196 566 411 l 430 195 l 553 195 l 706 201 q 689 94 689 148 q 696 38 689 66 q 706 0 703 11 q 514 3 630 0 q 380 7 399 7 q 181 3 302 7 q 44 0 60 0 l 33 75 "},\u00FC:{x_min:75,x_max:722,ha:808,o:"m 292 -15 q 142 41 202 -15 q 83 188 83 98 l 83 337 q 79 508 83 394 q 75 666 75 623 q 134 660 108 662 q 185 658 160 658 q 240 660 209 658 q 300 666 271 663 q 290 454 290 569 l 290 384 l 290 279 q 316 146 290 181 q 394 111 343 111 q 467 147 441 111 q 501 234 493 184 l 501 330 q 498 498 501 385 q 495 666 495 610 q 554 660 518 663 q 613 658 589 658 q 671 660 640 658 q 722 666 701 663 q 717 479 722 598 q 712 326 712 359 q 717 156 712 270 q 722 1 722 43 l 617 4 l 511 1 l 511 96 q 410 15 468 46 q 292 -15 353 -15 m 273 976 q 338 948 310 976 q 366 878 366 920 q 339 811 366 839 q 274 784 313 784 q 205 811 234 784 q 176 878 176 839 q 204 947 176 918 q 273 976 232 976 m 531 976 q 599 948 571 976 q 627 878 627 920 q 599 812 627 841 q 533 784 572 784 q 464 811 495 784 q 434 878 434 839 q 462 947 434 918 q 531 976 490 976 "},Z:{x_min:25,x_max:831.953125,ha:831,o:"m 25 54 q 186 311 81 142 q 354 582 291 480 q 495 813 418 685 l 294 813 q 98 801 186 813 l 105 852 q 98 932 105 894 l 444 926 q 657 928 509 926 q 815 931 805 931 l 815 903 q 573 517 695 715 q 331 119 451 320 l 566 119 q 706 122 654 119 q 831 136 758 125 q 826 43 826 96 l 827 0 q 606 3 761 0 q 443 6 451 6 q 203 3 370 6 q 25 0 36 0 l 25 54 "},u:{x_min:75,x_max:722,ha:808,o:"m 292 -15 q 141 41 200 -15 q 83 189 83 97 l 83 336 q 79 508 83 393 q 75 667 75 624 q 140 659 109 662 q 185 656 171 656 q 251 661 218 656 q 299 666 285 665 l 290 454 l 290 382 l 290 279 q 316 147 290 182 q 393 112 343 112 q 464 146 441 112 q 497 234 488 181 l 501 331 q 497 498 501 387 q 493 667 493 610 q 563 659 531 662 q 612 656 594 656 q 672 661 640 656 q 722 666 703 665 q 716 495 722 609 q 711 326 711 381 q 716 163 711 272 q 722 1 722 55 l 616 4 l 511 1 l 511 94 q 411 15 470 45 q 292 -15 353 -15 "},k:{x_min:80,x_max:732.765625,ha:756,o:"m 93 550 q 86 827 93 648 q 80 1024 80 1005 q 184 1018 125 1018 q 307 1023 252 1018 q 301 812 307 959 q 296 602 296 665 l 296 389 q 424 511 368 445 q 545 666 481 576 q 595 665 562 666 q 645 663 628 663 l 709 666 l 714 656 l 628 576 l 475 425 q 636 154 543 304 l 732 0 q 661 3 706 0 q 607 6 616 6 q 537 3 580 6 q 487 0 494 0 q 386 174 441 83 q 296 329 332 266 q 299 141 296 273 q 302 0 302 9 l 191 4 l 80 0 q 86 320 80 113 q 93 550 93 526 "},\u0397:{x_min:91,x_max:955,ha:1049,o:"m 105 286 l 105 459 q 101 650 105 533 q 98 784 98 766 l 91 932 q 156 926 125 929 q 214 923 187 923 q 277 926 241 923 q 344 931 314 929 q 339 818 344 894 q 334 713 334 741 l 334 563 l 514 561 l 710 561 l 710 712 q 707 812 710 778 q 697 932 705 846 q 764 926 727 929 q 828 923 800 923 q 889 926 854 923 q 955 931 924 929 q 948 690 955 856 q 941 465 941 523 q 948 225 941 391 q 955 0 955 58 l 828 5 q 764 2 807 5 q 698 0 721 0 q 707 99 704 47 q 710 202 710 152 l 710 444 q 595 447 665 444 q 514 451 525 451 q 411 447 475 451 q 334 444 346 444 l 334 202 q 339 97 334 167 q 344 0 344 26 q 270 2 323 0 q 214 5 218 5 l 91 0 q 98 146 91 40 q 105 286 105 252 "},\u0391:{x_min:-29.171875,x_max:850,ha:829,o:"m 109 322 q 193 530 143 400 q 278 751 244 660 q 351 949 312 843 l 420 944 l 490 949 q 672 450 584 685 q 850 0 759 215 l 716 4 l 580 0 l 551 91 l 497 259 q 398 261 448 259 q 300 264 348 262 l 202 259 q 112 0 162 134 l 22 4 l -29 0 l 109 322 m 354 368 l 464 368 q 416 509 440 446 q 355 662 393 572 q 243 370 295 519 l 354 368 "},\u00DF:{x_min:84,x_max:776,ha:811,o:"m 198 4 l 84 1 q 87 120 84 45 q 91 212 91 195 l 91 352 l 91 651 q 167 928 91 832 q 420 1024 243 1024 q 603 985 522 1024 q 684 854 684 946 q 607 713 684 786 q 530 601 530 640 q 543 563 530 583 q 574 533 556 543 l 688 447 q 776 275 776 379 q 690 67 776 150 q 478 -15 605 -15 q 373 8 428 -15 l 403 161 l 417 161 q 461 88 435 113 q 535 64 488 64 q 600 91 574 64 q 626 157 626 118 q 504 316 626 219 q 377 476 383 413 q 459 650 377 547 q 542 822 542 754 q 511 908 542 873 q 428 943 481 943 q 327 892 361 943 q 294 770 294 841 q 296 495 294 602 q 301 238 298 387 q 304 1 304 88 l 198 4 "},\u00E9:{x_min:41,x_max:684.046875,ha:729,o:"m 482 98 q 566 112 532 98 q 643 160 600 126 l 661 151 q 643 96 652 125 q 628 40 634 66 q 521 -1 577 11 q 403 -15 466 -15 q 141 79 241 -15 q 41 336 41 173 q 137 586 41 490 q 386 683 234 683 q 608 601 532 683 q 684 373 684 520 l 684 332 l 267 332 q 325 165 267 232 q 482 98 383 98 m 409 951 q 459 1000 436 983 q 511 1017 481 1017 q 563 994 542 1017 q 585 943 585 971 q 565 895 585 915 q 515 861 545 875 l 292 754 l 223 754 l 409 951 m 478 411 q 481 444 481 422 q 459 566 481 513 q 377 620 438 620 q 292 562 318 620 q 267 437 267 505 l 267 411 l 478 411 "},s:{x_min:43,x_max:543,ha:583,o:"m 95 197 q 155 95 115 133 q 256 57 195 57 q 338 77 300 57 q 376 140 376 98 q 213 259 376 195 q 51 456 51 323 q 129 623 51 563 q 319 683 208 683 q 411 671 366 683 q 515 638 455 660 l 464 485 l 450 485 q 397 575 433 542 q 303 608 362 608 q 234 588 264 608 q 205 530 205 569 q 374 417 205 478 q 543 227 543 356 q 464 48 543 112 q 266 -15 386 -15 q 148 -6 201 -15 q 43 26 95 3 l 76 197 l 95 197 "},B:{x_min:91,x_max:773,ha:815,o:"m 109 208 l 109 465 q 105 714 109 605 q 91 932 102 823 l 250 929 l 417 929 q 655 881 560 929 q 751 707 751 834 q 692 566 751 618 q 542 503 634 515 l 542 491 q 704 431 636 491 q 773 276 773 372 q 678 69 773 138 q 438 0 584 0 l 250 4 q 152 2 211 4 q 91 0 92 0 q 103 104 97 51 q 109 208 109 158 m 519 698 q 479 803 519 763 q 374 844 440 844 l 335 839 q 331 687 331 766 l 331 540 q 466 578 413 540 q 519 698 519 617 m 380 87 q 490 137 450 87 q 531 258 531 187 q 484 392 531 338 q 360 446 437 446 l 331 446 l 331 276 l 335 91 l 380 87 "},"\u2026":{x_min:93,x_max:1053,ha:1182,o:"m 195 191 q 268 160 236 191 q 300 88 300 129 q 268 16 300 46 q 195 -13 237 -13 q 123 16 154 -13 q 93 88 93 45 q 123 160 93 129 q 195 191 154 191 m 575 191 q 647 160 615 191 q 679 88 679 129 q 647 16 679 46 q 575 -13 616 -13 q 501 16 532 -13 q 471 88 471 45 q 501 160 471 129 q 575 191 532 191 m 948 191 q 1021 160 989 191 q 1053 88 1053 129 q 1021 16 1053 46 q 948 -13 990 -13 q 876 16 907 -13 q 846 88 846 45 q 876 160 846 129 q 948 191 907 191 "},"?":{x_min:93,x_max:539,ha:597,o:"m 295 221 q 377 186 340 221 q 414 104 414 152 q 378 23 414 61 q 295 -15 343 -15 q 210 19 245 -15 q 175 103 175 53 q 211 183 175 146 q 295 221 247 221 m 433 288 q 378 277 411 280 q 339 275 344 275 q 201 329 261 275 q 142 459 142 383 q 238 620 142 530 q 335 777 335 709 q 310 838 335 812 q 252 864 286 864 q 175 838 211 864 q 119 775 138 813 l 101 777 q 93 891 101 843 q 294 949 181 949 q 467 890 395 949 q 539 730 539 832 q 429 554 539 644 q 320 407 320 464 q 338 363 320 378 q 386 349 357 349 q 421 353 403 349 q 448 358 439 357 l 433 288 "},H:{x_min:91,x_max:957,ha:1049,o:"m 105 284 l 105 461 q 101 651 105 534 q 98 787 98 768 l 91 932 q 153 927 107 932 q 222 922 200 922 q 288 926 252 922 q 345 932 324 930 q 336 827 339 886 q 334 712 334 769 l 334 564 l 515 560 l 710 564 l 710 712 q 699 932 710 833 q 767 927 721 932 q 829 922 813 922 q 895 927 851 922 q 956 932 940 932 q 943 702 947 829 q 939 461 939 576 q 942 217 939 306 q 957 0 945 128 q 883 3 930 0 q 829 6 837 6 q 755 3 804 6 q 698 0 706 0 q 707 97 704 35 q 710 201 710 158 l 710 445 q 599 447 676 445 q 515 450 522 450 l 334 445 l 334 201 q 336 88 334 120 q 345 0 338 56 q 278 2 322 0 q 215 5 234 5 q 153 2 194 5 q 91 0 111 0 q 98 146 91 40 q 105 284 105 252 "},\u03BD:{x_min:9,x_max:658,ha:694,o:"m 470 438 q 463 504 470 477 q 422 642 457 532 q 641 671 528 660 q 658 582 658 626 q 614 412 658 494 l 541 270 q 462 107 487 161 q 417 0 438 53 q 374 3 403 0 q 331 8 345 8 q 289 3 317 8 q 246 0 261 0 q 165 236 209 110 q 85 458 121 361 q 9 667 49 555 q 72 661 40 664 q 128 659 103 659 q 184 661 152 659 q 245 666 217 664 q 403 184 300 449 q 454 328 438 275 q 470 438 470 381 "},\u00EE:{x_min:-15,x_max:413,ha:396,o:"m 93 126 l 93 543 q 87 602 93 558 q 82 666 82 645 q 141 661 111 664 q 198 659 172 659 q 255 661 223 659 q 316 666 287 664 q 311 621 315 658 q 303 544 307 584 l 303 319 q 305 144 303 212 q 316 0 307 76 l 196 2 l 81 0 q 93 126 93 66 m 136 1003 l 258 1003 l 413 755 l 345 755 l 198 878 l 50 755 l -15 755 l 136 1003 "},c:{x_min:36,x_max:623.109375,ha:660,o:"m 421 600 q 306 530 344 600 q 268 376 268 461 q 313 177 268 266 q 459 88 359 88 q 539 99 498 88 q 608 135 580 111 l 617 126 l 587 21 q 500 -5 546 3 q 404 -15 454 -15 q 140 76 245 -15 q 36 324 36 168 q 140 583 36 484 q 406 683 245 683 q 623 638 514 683 q 607 570 617 620 q 587 462 596 520 l 562 462 q 515 561 550 522 q 421 600 480 600 "},"\xB6":{x_min:18,x_max:531,ha:590,o:"m 298 968 l 531 968 l 531 910 l 473 910 l 473 4 l 415 4 l 415 910 l 305 910 l 305 4 l 247 4 l 247 558 q 99 601 163 558 q 27 690 36 645 q 18 744 18 734 q 90 896 18 824 q 298 968 163 968 "},\u03B2:{x_min:82,x_max:753,ha:828,o:"m 91 -115 q 86 188 91 -19 q 82 493 82 397 q 85 654 82 597 q 102 796 88 711 q 205 951 115 882 q 421 1021 294 1021 q 626 953 540 1021 q 713 770 713 886 q 671 634 713 690 q 553 542 629 579 q 700 438 647 506 q 753 273 753 369 q 680 68 753 152 q 490 -15 608 -15 q 390 0 435 -15 q 298 50 345 16 l 298 -105 l 306 -371 q 246 -365 278 -368 q 192 -362 214 -362 q 138 -365 169 -362 q 82 -370 108 -368 q 86 -238 82 -327 q 91 -115 91 -148 m 372 572 q 474 623 445 572 q 503 757 503 674 q 484 897 503 839 q 403 956 466 956 q 332 908 354 956 q 305 807 310 861 q 299 683 300 752 q 298 551 298 613 l 298 269 q 320 131 298 188 q 412 75 343 75 q 501 135 477 75 q 525 273 525 195 q 496 431 525 377 q 372 486 467 486 l 372 572 "},\u039C:{x_min:32,x_max:1165,ha:1217,o:"m 105 465 l 168 932 q 211 927 190 929 q 261 926 231 926 q 309 929 277 926 q 358 932 341 932 q 441 709 409 790 q 503 559 473 629 q 608 316 533 488 l 778 690 q 872 932 834 808 q 919 929 887 932 q 966 926 951 926 q 1027 929 1006 926 q 1059 932 1048 932 l 1105 473 q 1130 240 1117 354 q 1165 0 1144 127 q 1095 3 1140 0 q 1041 6 1051 6 q 969 3 1015 6 q 915 0 924 0 q 895 291 915 142 l 865 616 q 731 317 802 480 q 597 0 661 153 l 551 0 l 500 0 q 409 218 465 87 q 317 426 352 349 q 236 605 282 504 l 196 229 q 185 108 190 173 q 180 0 180 44 q 134 3 165 0 q 100 6 102 6 q 60 4 77 6 q 32 0 43 1 q 105 465 77 258 "},\u038C:{x_min:-28,x_max:1364,ha:1407,o:"m 855 949 q 1223 829 1082 949 q 1364 486 1364 710 q 1220 114 1364 244 q 830 -15 1076 -15 q 454 107 591 -15 q 318 465 318 229 q 466 823 318 697 q 855 949 615 949 m 158 953 q 211 1001 191 986 q 259 1017 231 1017 q 312 994 291 1017 q 333 943 333 972 q 314 897 333 916 q 265 863 295 878 l 40 755 l -28 755 l 158 953 m 840 73 q 1051 194 984 73 q 1118 472 1118 315 q 1051 742 1118 624 q 844 860 984 860 q 631 742 698 860 q 565 465 565 624 q 631 193 565 313 q 840 73 698 73 "},\u0389:{x_min:-28,x_max:1333.109375,ha:1424,o:"m 482 284 l 482 460 q 478 651 482 534 q 474 787 474 768 l 468 931 q 530 927 484 931 q 599 922 577 922 q 665 926 629 922 q 722 931 701 930 q 713 827 716 886 q 711 711 711 769 l 711 563 l 891 560 l 1086 564 l 1086 712 q 1075 931 1086 833 q 1143 927 1097 931 q 1205 922 1190 922 q 1272 927 1227 922 q 1333 931 1316 931 q 1319 702 1323 829 q 1315 460 1315 576 q 1318 217 1315 306 q 1333 0 1321 128 q 1260 3 1306 0 q 1205 6 1213 6 q 1131 3 1180 6 q 1074 0 1083 0 q 1083 97 1080 35 q 1086 201 1086 158 l 1086 444 q 975 447 1052 444 q 891 450 898 450 l 711 444 l 711 201 q 713 88 711 120 q 722 0 715 56 q 655 2 699 0 q 592 5 611 5 q 530 2 571 5 q 468 0 488 0 q 475 146 468 40 q 482 284 482 252 m 158 953 q 211 1001 191 986 q 259 1017 231 1017 q 312 994 291 1017 q 333 943 333 972 q 314 897 333 916 q 265 863 295 878 l 40 755 l -28 755 l 158 953 "},"\u2022":{x_min:215.28125,x_max:805.5625,ha:1024,o:"m 512 803 q 718 714 631 803 q 805 505 805 626 q 719 299 805 387 q 512 212 633 212 q 301 298 387 212 q 215 505 215 384 q 303 714 215 626 q 512 803 391 803 "},"\xA5":{x_min:8,x_max:752,ha:764,o:"m 38 252 l 38 336 l 160 332 l 277 332 l 277 417 q 140 413 225 417 q 38 410 55 410 l 38 494 q 131 486 87 486 l 228 486 l 143 644 q 87 751 114 704 q 8 888 60 799 q 82 884 34 888 q 138 881 130 881 q 213 884 167 881 q 265 888 258 888 q 433 529 349 696 q 524 707 478 613 q 608 888 571 802 q 640 888 624 888 q 674 888 657 888 l 752 888 q 602 642 653 729 q 516 486 551 554 l 722 494 l 722 410 q 583 413 668 410 q 485 417 497 417 l 485 331 l 722 336 l 722 252 q 604 255 690 252 q 485 258 518 258 q 490 123 485 213 q 495 0 495 33 l 386 5 q 316 2 364 5 q 264 0 268 0 q 274 126 271 59 q 277 258 277 194 q 140 255 235 258 q 38 252 45 252 "},"(":{x_min:91,x_max:403.5,ha:449,o:"m 249 479 l 249 379 l 249 277 q 287 54 249 161 q 402 -158 326 -53 l 356 -201 q 158 57 225 -80 q 91 365 91 195 q 158 683 91 541 q 359 949 225 825 l 403 906 q 288 701 328 808 q 249 479 249 594 "},U:{x_min:82,x_max:910,ha:999,o:"m 211 926 q 275 929 232 926 q 338 932 318 932 q 325 681 329 826 q 321 421 321 536 q 373 175 321 241 q 521 110 425 110 q 678 161 611 110 q 755 278 746 212 q 768 419 765 344 q 771 547 771 494 q 754 931 771 761 l 812 926 l 910 932 q 903 769 910 882 q 896 615 896 655 l 896 480 q 896 427 896 462 q 896 375 896 391 q 793 82 896 180 q 494 -15 691 -15 q 211 55 323 -15 q 100 286 100 126 q 91 616 100 383 q 82 932 82 850 q 154 929 102 932 q 211 926 207 926 "},\u03B3:{x_min:0,x_max:713.890625,ha:700,o:"m 523 199 q 486 87 498 128 q 474 -62 474 47 q 477 -246 474 -135 q 481 -374 481 -357 q 407 -366 442 -368 q 326 -365 373 -365 l 250 -370 q 258 -204 250 -315 q 267 -72 267 -93 q 246 138 267 52 q 189 344 225 224 q 130 512 154 463 q 50 561 105 561 q 25 558 38 561 q 0 553 11 555 l 0 635 q 79 669 38 656 q 159 683 119 683 q 329 593 293 683 q 433 233 365 503 q 519 456 482 349 q 576 666 555 562 l 644 663 l 713 666 q 633 490 665 572 q 523 199 601 408 "},\u03B1:{x_min:30,x_max:827.21875,ha:878,o:"m 669 665 l 749 662 l 827 665 q 763 499 782 551 q 720 377 743 447 l 818 0 q 763 6 792 2 q 717 10 733 10 q 662 5 692 10 q 615 0 632 1 l 594 101 q 361 -15 501 -15 q 120 83 210 -15 q 30 334 30 182 q 123 583 30 484 q 368 683 217 683 q 515 647 449 683 q 633 547 582 612 q 651 601 640 563 q 669 665 662 638 m 383 614 q 313 588 343 614 q 276 523 283 562 q 260 434 265 484 q 256 333 256 385 q 269 174 256 249 q 305 87 275 122 q 385 52 335 52 q 509 144 473 52 q 546 340 546 236 q 522 504 546 428 q 455 597 498 580 q 383 614 411 614 "},F:{x_min:91,x_max:645.15625,ha:686,o:"m 109 465 q 105 710 109 620 q 91 932 102 800 l 357 926 q 520 929 406 926 q 645 932 635 932 l 638 871 q 645 810 638 844 q 524 815 607 810 q 415 820 442 820 l 339 820 q 337 663 339 778 q 335 546 335 548 l 634 557 l 629 494 l 634 431 q 462 437 573 431 q 335 443 350 443 l 335 236 q 337 106 335 149 q 348 0 339 62 l 219 2 l 91 0 q 105 209 102 102 q 109 465 109 316 "},"\xAD":{x_min:0,x_max:683.328125,ha:683,o:"m 0 421 l 683 421 l 683 278 l 0 278 l 0 421 "},":":{x_min:105,x_max:343,ha:447,o:"m 223 221 q 307 185 272 221 q 343 103 343 150 q 306 19 343 54 q 223 -15 270 -15 q 139 18 174 -15 q 105 103 105 51 q 139 186 105 151 q 223 221 174 221 m 223 654 q 306 617 270 654 q 343 532 343 581 q 306 450 343 485 q 223 416 270 416 q 139 449 174 416 q 105 534 105 482 q 139 619 105 584 q 223 654 174 654 "},\u03A7:{x_min:-1.390625,x_max:801.390625,ha:782,o:"m 169 241 l 301 436 l 15 932 q 94 929 38 932 q 155 926 150 926 q 235 929 179 926 q 298 932 291 932 q 314 893 308 907 q 358 802 320 880 l 445 638 q 547 805 513 748 q 613 932 581 862 q 655 929 627 932 q 698 926 683 926 q 740 929 712 926 q 783 932 768 932 q 685 800 709 833 q 616 701 661 766 l 502 531 l 801 0 q 713 2 776 0 q 647 5 651 5 l 516 0 l 470 108 l 356 326 q 265 174 316 263 q 170 0 215 84 q 118 3 154 0 q 77 6 81 6 q 31 4 52 6 q -1 0 11 1 l 169 241 "},"*":{x_min:91,x_max:588,ha:683,o:"m 154 520 q 128 571 139 550 q 91 634 117 593 q 186 665 139 650 q 284 698 234 680 q 190 734 242 716 q 91 765 139 751 q 154 879 125 816 l 310 750 l 298 808 l 275 949 l 339 947 l 405 948 l 368 745 l 525 879 q 588 765 553 822 q 398 698 499 737 q 490 664 441 680 q 588 634 539 648 q 557 581 574 612 q 525 520 540 551 l 370 650 q 389 528 381 580 q 404 443 397 476 l 337 446 l 273 446 l 310 650 l 154 520 "},"\xB0":{x_min:165,x_max:519,ha:683,o:"m 165 913 q 221 1032 165 980 q 351 1084 278 1084 q 469 1040 420 1084 q 519 926 519 996 q 464 804 519 853 q 335 755 409 755 q 214 799 264 755 q 165 913 165 844 m 241 905 q 268 832 241 863 q 338 801 295 801 q 414 837 388 801 q 441 927 441 874 q 416 1009 441 977 q 345 1042 392 1042 q 281 1018 310 1042 q 247 962 253 994 q 241 905 241 930 "},V:{x_min:-19.4375,x_max:856.953125,ha:818,o:"m 255 230 l -19 932 q 61 929 4 932 q 120 926 117 926 l 247 932 q 298 768 270 840 l 476 296 l 646 770 q 673 852 662 812 q 692 932 685 891 l 766 926 q 812 929 781 926 q 856 932 843 932 q 752 706 801 819 l 566 231 q 488 0 520 123 q 445 4 463 2 q 413 6 427 6 q 368 3 397 6 q 336 0 340 0 q 304 97 322 46 q 255 230 286 147 "},\u039E:{x_min:58.328125,x_max:816.671875,ha:876,o:"m 438 190 q 653 193 518 190 q 816 197 788 197 q 812 124 812 160 l 812 99 q 812 51 812 74 q 816 0 812 27 q 629 4 754 0 q 438 8 504 8 q 248 4 375 8 q 58 0 122 0 l 63 98 l 58 197 q 281 193 145 197 q 438 190 418 190 m 438 747 q 258 743 379 747 q 77 739 137 739 q 84 804 83 784 q 84 834 84 823 q 77 932 84 879 q 267 927 140 932 q 438 922 394 922 q 626 927 500 922 q 797 932 752 932 l 793 835 l 797 739 q 619 743 738 739 q 438 747 500 747 m 708 467 l 713 375 q 577 379 669 375 q 438 383 486 383 q 300 379 391 383 q 162 375 208 375 q 165 418 163 397 q 168 468 168 440 q 165 523 168 484 q 162 567 162 562 q 438 554 300 554 q 713 566 577 554 l 708 467 "},"\xA0":{x_min:0,x_max:0,ha:375},\u03AB:{x_min:-32,x_max:797,ha:747,o:"m 133 650 q 52 795 94 720 q -32 931 11 869 l 91 928 l 256 932 q 365 700 329 773 q 441 554 401 627 q 541 731 491 634 q 636 932 590 827 l 711 928 l 797 932 q 644 689 714 812 q 498 420 573 566 l 502 143 l 509 0 l 413 5 l 256 0 q 261 118 256 38 q 267 236 267 197 l 267 402 l 133 650 m 242 1242 q 309 1215 281 1242 q 337 1148 337 1189 q 311 1078 337 1107 q 243 1050 285 1050 q 173 1078 203 1050 q 144 1148 144 1107 q 173 1214 144 1186 q 242 1242 202 1242 m 502 1242 q 571 1214 542 1242 q 600 1148 600 1187 q 572 1078 600 1107 q 505 1050 545 1050 q 435 1077 463 1050 q 408 1148 408 1105 q 435 1214 408 1186 q 502 1242 463 1242 "},"0":{x_min:34,x_max:709,ha:749,o:"m 367 -19 q 104 104 175 -19 q 34 436 34 228 q 109 777 34 644 q 377 910 184 910 q 640 785 572 910 q 709 443 709 660 q 635 108 709 236 q 367 -19 561 -19 m 260 447 q 261 330 260 382 q 269 213 262 279 q 296 101 276 147 q 374 56 316 56 q 453 108 430 56 q 477 221 477 160 q 480 287 478 254 q 483 458 483 365 q 480 590 483 543 q 477 665 478 637 q 452 779 477 727 q 372 832 428 832 q 281 765 299 832 q 263 598 263 698 q 261 505 263 561 q 260 447 260 448 "},"\u201D":{x_min:72.21875,x_max:615.28125,ha:654,o:"m 72 528 l 152 848 q 183 920 159 891 q 245 949 206 949 q 311 926 286 949 q 337 861 337 903 q 315 797 337 827 l 112 511 l 72 528 m 351 528 l 430 848 q 462 919 437 889 q 525 949 487 949 q 588 925 562 949 q 615 864 615 901 q 609 829 615 845 q 594 797 604 813 l 391 511 l 351 528 "},"@":{x_min:59,x_max:1305,ha:1365,o:"m 581 72 q 418 131 475 72 q 362 298 362 191 q 455 554 362 437 q 684 672 548 672 q 771 650 734 672 q 843 586 808 629 l 877 653 l 998 653 l 897 254 l 893 229 q 912 193 893 205 q 957 181 931 181 q 1119 290 1056 181 q 1183 504 1183 399 q 1060 772 1183 668 q 771 877 937 877 q 354 735 526 877 q 183 353 183 594 q 327 20 183 140 q 689 -100 471 -100 q 898 -66 792 -100 q 1092 25 1004 -33 l 1143 -51 q 689 -204 945 -204 q 244 -54 429 -204 q 59 348 59 94 q 261 804 59 621 q 739 988 464 988 q 1134 856 964 988 q 1305 505 1305 725 q 1195 206 1305 340 q 920 72 1085 72 l 895 72 q 818 90 846 72 q 777 180 791 108 q 691 99 739 127 q 581 72 643 72 m 693 578 q 552 487 600 578 q 505 294 505 397 q 532 207 505 245 q 606 169 560 169 q 712 212 668 169 q 772 322 756 256 l 808 466 q 773 546 804 515 q 693 578 742 578 "},\u038A:{x_min:-28,x_max:728,ha:822,o:"m 485 402 q 481 715 485 609 q 468 931 477 822 q 535 925 498 929 q 594 922 572 922 q 666 927 620 922 q 727 931 713 931 q 714 716 717 819 q 711 465 711 613 q 714 221 711 326 q 728 0 718 116 q 647 2 704 0 q 588 5 590 5 l 469 0 q 481 199 477 88 q 485 402 485 310 m 157 953 q 210 1001 190 986 q 258 1017 230 1017 q 311 994 290 1017 q 332 943 332 972 q 313 897 332 916 q 264 863 294 878 l 40 755 l -28 755 l 157 953 "},\u00F6:{x_min:32,x_max:743,ha:775,o:"m 395 683 q 647 588 551 683 q 743 337 743 494 q 648 79 743 173 q 387 -15 554 -15 q 129 78 227 -15 q 32 333 32 172 q 130 590 32 497 q 395 683 229 683 m 257 976 q 324 948 296 976 q 352 878 352 920 q 325 811 352 839 q 258 784 299 784 q 190 811 221 784 q 160 878 160 839 q 188 947 160 918 q 257 976 217 976 m 517 976 q 585 948 557 976 q 613 878 613 920 q 586 811 613 839 q 519 784 560 784 q 450 811 479 784 q 421 878 421 839 q 449 947 421 918 q 517 976 478 976 m 269 174 q 307 85 277 120 q 387 50 337 50 q 466 84 437 50 q 500 156 494 119 q 511 215 507 194 q 517 335 517 271 q 511 450 517 395 q 500 509 507 471 q 466 582 494 548 q 387 616 439 616 q 294 564 319 616 q 263 459 269 513 q 258 333 258 406 q 260 244 258 270 q 269 174 262 217 "},i:{x_min:80,x_max:314.71875,ha:396,o:"m 196 1014 q 273 980 240 1014 q 307 902 307 947 q 274 825 307 858 q 196 793 241 793 q 118 824 151 793 q 85 902 85 856 q 118 980 85 947 q 196 1014 151 1014 m 91 127 l 91 543 l 80 666 q 140 660 109 663 q 196 658 171 658 q 253 660 223 658 q 314 666 284 663 l 301 545 l 301 319 q 302 145 301 206 q 312 0 304 84 l 194 4 l 81 0 q 88 64 85 33 q 91 127 91 95 "},\u0392:{x_min:91,x_max:773,ha:815,o:"m 109 208 l 109 465 q 105 714 109 605 q 91 932 102 823 l 250 929 l 417 929 q 655 881 560 929 q 751 707 751 834 q 692 566 751 618 q 542 503 634 515 l 542 491 q 704 431 636 491 q 773 276 773 372 q 678 69 773 138 q 438 0 584 0 l 250 4 q 152 2 211 4 q 91 0 92 0 q 103 104 97 51 q 109 208 109 158 m 519 698 q 479 803 519 763 q 374 844 440 844 l 335 839 q 331 687 331 766 l 331 540 q 466 578 413 540 q 519 698 519 617 m 380 87 q 490 137 450 87 q 531 258 531 187 q 484 392 531 338 q 360 446 437 446 l 331 446 l 331 276 l 335 91 l 380 87 "},"\u2264":{x_min:170.984375,x_max:962.28125,ha:1139,o:"m 960 690 l 403 514 l 960 338 l 960 200 l 171 455 l 170 572 l 960 830 l 960 690 m 962 132 l 962 0 l 171 0 l 171 132 l 962 132 "},\u03C5:{x_min:82,x_max:765,ha:843,o:"m 765 416 q 663 115 765 245 q 401 -15 562 -15 q 162 56 243 -15 q 82 284 82 128 l 86 479 q 84 590 86 523 q 82 666 82 656 q 145 663 99 666 q 195 661 191 661 q 263 663 216 661 q 311 666 309 666 q 295 477 301 566 q 290 294 290 387 q 310 122 290 193 q 402 52 330 52 q 515 146 487 52 q 544 351 544 240 q 525 502 544 433 q 469 656 507 570 q 580 659 528 656 q 684 673 632 662 q 743 548 721 614 q 765 416 765 482 "},"]":{x_min:76,x_max:385.71875,ha:454,o:"m 80 -129 l 76 -85 l 227 -88 q 231 134 227 -14 q 235 356 235 282 q 231 605 235 438 q 227 855 227 771 l 164 855 l 76 855 l 80 885 q 80 908 80 896 q 76 931 77 925 l 230 926 l 385 933 l 373 566 l 373 359 l 373 199 l 383 -164 l 227 -157 q 141 -160 195 -157 q 76 -164 86 -164 l 80 -129 "},m:{x_min:80,x_max:1135,ha:1217,o:"m 91 329 q 85 517 91 394 q 80 667 80 640 l 184 662 l 293 666 l 293 571 q 392 651 334 619 q 511 683 450 683 q 628 653 579 683 q 700 559 676 623 q 791 651 733 620 q 921 683 849 683 q 1068 624 1011 683 q 1125 477 1125 566 l 1125 331 q 1130 158 1125 274 q 1135 0 1135 41 q 1070 2 1116 0 q 1019 5 1024 5 q 954 2 999 5 q 905 0 909 0 q 910 155 905 51 q 915 298 915 259 l 915 385 q 896 506 915 458 q 818 554 877 554 q 755 528 779 554 q 719 460 730 502 q 712 381 714 426 q 710 319 710 335 q 715 153 710 265 q 720 0 720 41 q 656 3 694 0 q 608 6 617 6 q 544 3 585 6 q 496 0 504 0 q 501 155 496 51 q 506 298 506 259 l 506 385 q 487 505 506 456 q 409 554 469 554 q 346 528 370 554 q 310 460 321 502 q 303 381 305 426 q 301 319 301 335 q 306 153 301 265 q 311 0 311 41 q 243 3 284 0 q 195 6 202 6 q 128 3 170 6 q 80 0 86 0 q 85 163 80 53 q 91 329 91 273 "},\u03C7:{x_min:15.28125,x_max:730.5625,ha:731,o:"m 569 380 l 472 204 l 545 31 q 631 -159 586 -62 q 729 -368 676 -255 l 600 -363 q 475 -371 537 -363 q 404 -147 438 -259 l 350 1 l 268 -155 q 218 -260 242 -204 q 176 -371 194 -316 q 105 -363 143 -363 q 16 -371 62 -363 q 97 -240 52 -319 q 197 -66 141 -162 l 298 111 l 168 423 q 130 509 148 466 q 63 568 101 563 l 15 564 l 15 638 q 166 683 83 683 q 286 628 252 683 q 367 445 320 573 l 422 318 l 499 479 q 572 665 544 582 l 634 662 q 697 665 674 662 q 730 668 719 668 l 569 380 "},"8":{x_min:34,x_max:710,ha:749,o:"m 511 492 q 654 412 598 471 q 710 266 710 352 q 607 53 710 128 q 360 -21 504 -21 q 131 50 229 -21 q 34 248 34 122 q 88 406 34 341 q 235 492 143 471 l 235 502 q 117 568 164 516 q 71 689 71 620 q 165 855 71 802 q 382 908 259 908 q 584 857 498 908 q 671 696 671 806 q 628 574 671 621 q 511 502 586 526 l 511 492 m 373 528 q 456 573 432 528 q 481 684 481 618 q 458 792 481 748 q 376 836 435 836 q 290 791 316 836 q 264 683 264 747 q 291 575 264 622 q 373 528 318 528 m 369 55 q 464 117 439 55 q 489 259 489 180 q 465 396 489 335 q 379 457 441 457 q 285 393 314 457 q 256 256 256 329 q 278 114 256 174 q 369 55 301 55 "},\u03AF:{x_min:80,x_max:478.609375,ha:396,o:"m 91 126 l 91 543 l 80 666 q 139 660 105 663 q 196 658 173 658 q 264 660 238 658 q 314 666 291 663 q 304 586 307 616 q 301 523 301 557 l 301 113 q 302 72 301 88 q 314 0 304 56 l 195 4 l 81 0 q 87 67 84 30 q 91 126 91 104 m 303 953 q 357 1001 337 986 q 406 1017 377 1017 q 457 994 437 1017 q 478 943 478 972 q 459 897 478 915 q 410 863 441 878 l 187 755 l 118 755 l 303 953 "},\u0396:{x_min:25,x_max:831.953125,ha:831,o:"m 25 54 q 186 311 81 142 q 354 582 291 480 q 495 813 418 685 l 294 813 q 98 801 186 813 l 105 852 q 98 932 105 894 l 444 926 q 657 928 509 926 q 815 931 805 931 l 815 903 q 573 517 695 715 q 331 119 451 320 l 566 119 q 706 122 654 119 q 831 136 758 125 q 826 43 826 96 l 827 0 q 606 3 761 0 q 443 6 451 6 q 203 3 370 6 q 25 0 36 0 l 25 54 "},R:{x_min:87,x_max:860.609375,ha:836,o:"m 106 398 q 96 663 106 486 q 87 931 87 841 l 182 927 q 295 932 207 927 q 420 938 382 938 q 699 874 625 938 q 773 697 773 811 q 713 538 773 603 q 560 465 654 474 q 701 235 627 350 q 860 0 775 120 l 753 5 l 578 0 q 469 202 531 100 q 320 438 408 304 l 320 258 q 322 114 320 154 q 331 0 324 75 q 261 3 304 0 q 211 6 217 6 q 140 3 184 6 q 87 0 95 0 q 96 198 87 65 q 106 398 106 331 m 544 689 q 505 805 544 760 q 397 850 467 850 l 324 850 l 320 696 l 320 506 q 483 548 422 506 q 544 689 544 590 "},"\xD7":{x_min:183.828125,x_max:970.171875,ha:1139,o:"m 577 501 l 877 800 l 970 706 l 670 408 l 970 106 l 876 13 l 577 314 l 277 13 l 184 106 l 483 408 l 183 706 l 277 800 l 577 501 "},o:{x_min:30,x_max:741,ha:774,o:"m 395 683 q 645 587 550 683 q 741 337 741 492 q 646 79 741 173 q 385 -15 552 -15 q 127 78 225 -15 q 30 333 30 172 q 129 590 30 498 q 395 683 228 683 m 269 174 q 305 85 275 119 q 386 52 335 52 q 464 85 436 52 q 503 172 491 119 q 510 237 506 194 q 515 336 515 279 q 510 431 515 391 q 503 494 506 472 q 464 581 491 548 q 385 615 436 615 q 291 563 315 615 q 261 459 267 512 q 256 333 256 407 q 269 174 256 248 "},"5":{x_min:46,x_max:670,ha:749,o:"m 284 60 q 397 118 360 60 q 434 258 434 176 q 404 391 434 333 q 307 450 375 450 q 183 388 238 450 l 118 422 q 128 525 126 467 q 131 606 131 583 q 126 749 131 684 q 108 878 121 814 l 118 888 q 268 883 173 888 q 387 878 362 878 q 635 888 519 878 l 630 793 q 636 696 630 739 q 479 702 579 696 q 365 709 378 709 l 225 709 q 213 501 213 608 q 399 548 301 548 q 591 480 513 548 q 670 300 670 413 q 559 59 670 139 q 280 -21 449 -21 q 156 -7 222 -21 q 46 32 90 5 q 94 133 74 84 q 131 238 115 182 l 152 237 q 180 109 152 158 q 284 60 208 60 "},"7":{x_min:96,x_max:760,ha:749,o:"m 333 343 l 549 689 q 439 693 511 689 q 329 697 366 697 q 221 694 272 697 q 98 689 171 691 q 105 755 104 734 q 105 787 105 775 q 102 844 105 808 q 98 888 98 881 l 401 883 l 741 887 l 760 849 q 312 0 491 452 l 216 0 l 105 0 l 96 18 q 229 187 177 119 q 333 343 280 255 "},K:{x_min:90,x_max:892.78125,ha:856,o:"m 334 716 l 334 515 l 569 787 q 635 866 619 845 q 682 932 651 886 l 767 926 q 817 929 784 926 q 870 932 851 932 q 687 746 790 851 q 503 554 585 641 l 623 377 q 892 0 753 179 l 753 5 q 664 2 727 5 q 595 0 600 0 q 484 190 545 98 q 334 404 424 281 l 334 193 q 348 0 334 94 q 270 2 325 0 q 212 5 215 5 l 90 0 q 99 236 90 69 q 108 461 108 402 q 103 623 108 515 q 99 787 99 731 l 90 932 q 157 927 113 932 q 219 922 201 922 q 282 925 252 922 q 342 932 312 927 q 338 831 342 907 q 334 716 334 755 "},",":{x_min:25,x_max:319.4375,ha:375,o:"m 109 121 q 146 203 119 168 q 218 238 173 238 q 289 208 259 238 q 319 136 319 178 q 313 101 319 118 q 294 64 306 85 l 62 -253 l 25 -238 l 109 121 "},d:{x_min:54,x_max:744,ha:825,o:"m 318 -15 q 115 84 177 -15 q 54 336 54 184 q 124 583 54 483 q 336 683 194 683 q 525 584 451 683 l 525 738 l 518 1024 q 581 1016 554 1019 q 630 1013 609 1013 q 678 1015 653 1013 q 744 1023 703 1018 q 740 900 744 983 q 736 775 736 816 q 738 403 736 627 q 740 176 740 179 l 744 0 q 680 3 721 0 q 630 6 638 6 q 568 3 608 6 q 520 0 528 0 q 523 39 522 16 q 525 85 525 62 q 430 8 477 32 q 318 -15 383 -15 m 396 587 q 328 562 355 587 q 289 499 300 538 q 273 409 277 460 q 269 316 269 358 q 295 158 269 227 q 396 89 321 89 q 501 167 473 89 q 530 338 530 245 q 503 511 530 435 q 396 587 477 587 "},"\xA8":{x_min:65.28125,x_max:609.71875,ha:654,o:"m 251 613 q 218 541 243 570 q 154 512 194 512 q 90 537 116 512 q 65 601 65 563 q 87 665 65 634 l 291 949 l 331 933 l 251 613 m 530 613 q 498 542 525 573 q 433 512 472 512 q 371 536 397 512 q 345 598 345 560 q 366 665 345 633 l 570 949 l 609 933 l 530 613 "},E:{x_min:90,x_max:644.15625,ha:703,o:"m 108 222 l 108 465 q 104 710 108 620 q 91 932 101 800 l 357 926 q 520 929 405 926 q 644 932 634 932 q 640 903 641 916 q 638 872 638 890 q 639 848 638 857 q 644 810 640 840 q 530 815 606 810 q 414 820 453 820 l 338 820 l 334 545 l 634 557 q 630 527 631 541 q 628 494 628 514 l 633 431 q 459 437 571 431 q 334 444 347 444 l 334 296 q 336 190 334 264 q 338 113 338 115 q 638 129 489 113 l 634 63 l 638 0 q 433 3 562 0 q 278 7 305 7 q 169 3 235 7 q 90 0 102 0 q 102 114 96 54 q 108 222 108 175 "},Y:{x_min:-30,x_max:797,ha:747,o:"m 136 650 q 67 772 123 672 q -30 932 10 872 l 92 926 q 184 929 120 926 q 256 931 249 931 q 345 740 304 825 q 442 554 386 656 q 541 730 492 636 q 637 931 589 825 l 712 926 q 753 929 726 926 q 797 931 781 931 q 644 689 714 812 q 498 420 573 566 l 502 143 l 508 0 l 414 5 l 256 0 q 262 138 256 50 q 269 237 269 226 l 269 402 l 136 650 "},'"':{x_min:53,x_max:399,ha:451,o:"m 181 958 l 181 586 l 53 586 l 53 958 l 181 958 m 399 958 l 399 586 l 271 586 l 271 958 l 399 958 "},\u00EA:{x_min:41,x_max:684.046875,ha:729,o:"m 482 98 q 566 112 532 98 q 643 160 600 126 l 661 151 q 643 96 652 125 q 628 40 634 66 q 521 -1 577 11 q 403 -15 466 -15 q 141 79 241 -15 q 41 336 41 173 q 137 586 41 490 q 386 683 234 683 q 608 601 532 683 q 684 373 684 520 l 684 332 l 267 332 q 325 165 267 232 q 482 98 383 98 m 302 1001 l 426 1001 l 577 754 l 512 754 l 364 876 l 216 754 l 149 754 l 302 1001 m 478 411 q 481 444 481 422 q 459 566 481 513 q 377 620 438 620 q 292 562 318 620 q 267 437 267 505 l 267 411 l 478 411 "},\u03B4:{x_min:30,x_max:688,ha:719,o:"m 543 794 q 498 889 531 854 q 407 924 465 924 q 329 895 362 924 q 296 822 296 867 q 393 671 296 739 q 585 539 490 603 q 688 308 688 444 q 600 71 688 157 q 359 -15 513 -15 q 119 70 209 -15 q 30 305 30 155 q 88 503 30 419 q 256 614 147 586 q 130 696 178 650 q 82 812 82 743 q 173 968 82 916 q 374 1021 263 1021 q 629 946 510 1021 q 606 875 617 912 q 582 788 596 839 l 543 794 m 269 163 q 296 83 276 114 q 360 52 317 52 q 435 95 414 52 q 462 204 456 139 l 462 306 l 462 407 q 438 513 462 464 q 363 561 415 561 q 298 529 321 561 q 269 449 274 496 q 260 382 263 421 q 258 306 258 343 q 260 227 258 249 q 269 163 262 206 "},\u03AD:{x_min:55,x_max:667.5,ha:657,o:"m 512 501 q 472 579 502 548 q 396 611 442 611 q 323 577 352 611 q 295 498 295 544 q 316 429 295 458 q 375 394 337 399 l 450 394 l 450 373 q 450 336 450 349 q 450 316 450 323 q 414 319 438 319 q 322 280 361 319 q 283 194 283 242 q 323 101 283 144 q 413 59 363 59 q 498 88 461 59 q 572 167 536 117 l 600 155 q 594 130 596 144 q 593 104 593 115 q 593 82 593 90 q 600 53 593 74 q 351 -15 486 -15 q 145 30 236 -15 q 55 176 55 75 q 105 289 55 244 q 233 360 156 335 q 127 421 167 385 q 88 516 88 456 q 165 643 88 603 q 340 683 243 683 q 593 612 480 683 q 565 556 576 583 q 551 501 555 530 l 512 501 m 492 955 q 545 1003 525 988 q 595 1019 566 1019 q 646 996 625 1019 q 667 945 667 974 q 648 899 667 917 q 600 865 630 880 l 375 757 l 306 757 l 492 955 "},\u03C9:{x_min:30,x_max:1059,ha:1093,o:"m 335 -15 q 111 79 192 -15 q 30 321 30 173 q 72 505 30 421 q 192 667 114 589 q 297 661 237 661 q 347 663 319 661 q 390 667 374 665 q 247 281 247 499 q 269 123 247 195 q 358 52 291 52 q 421 86 399 52 q 443 165 443 121 l 443 291 q 441 415 443 379 q 435 512 440 451 q 510 505 499 505 q 544 505 522 505 q 608 508 579 505 q 657 512 636 511 q 648 402 652 465 q 644 289 644 340 q 644 237 644 258 q 650 165 644 215 q 669 85 650 119 q 730 52 688 52 q 821 122 798 52 q 844 279 844 192 q 807 481 844 386 q 700 666 771 576 q 746 662 724 663 q 793 661 767 661 q 846 664 812 661 q 898 667 881 667 q 1016 508 974 595 q 1059 322 1059 422 q 974 83 1059 182 q 753 -15 890 -15 q 630 13 685 -15 q 545 100 575 41 q 459 14 516 44 q 335 -15 402 -15 "},"\xB4":{x_min:70.828125,x_max:337.5,ha:374,o:"m 70 528 l 151 848 q 183 919 158 889 q 244 949 208 949 q 310 924 283 949 q 337 862 337 900 q 331 829 337 845 q 316 797 326 813 l 111 511 l 70 528 "},"\xB1":{x_min:169,x_max:969,ha:1139,o:"m 636 815 l 636 597 l 969 597 l 969 465 l 636 465 l 636 246 l 501 246 l 501 465 l 169 465 l 169 597 l 501 597 l 501 815 l 636 815 m 969 132 l 969 0 l 169 0 l 169 132 l 969 132 "},"|":{x_min:272,x_max:411,ha:683,o:"m 411 956 l 411 447 l 272 447 l 272 956 l 411 956 m 411 272 l 411 -233 l 272 -233 l 272 272 l 411 272 "},\u03CB:{x_min:82,x_max:765,ha:843,o:"m 765 415 q 663 114 765 244 q 401 -15 562 -15 q 162 56 243 -15 q 82 284 82 127 l 86 478 q 84 589 86 523 q 82 666 82 656 q 145 663 99 666 q 195 661 191 661 q 263 663 216 661 q 311 666 309 666 q 295 476 301 566 q 290 294 290 387 q 310 122 290 193 q 402 52 330 52 q 515 146 487 52 q 544 351 544 240 q 525 502 544 433 q 469 657 507 570 q 580 659 528 657 q 684 672 632 662 q 743 547 721 613 q 765 415 765 482 m 262 975 q 329 947 301 975 q 357 879 357 919 q 331 811 357 840 q 265 783 305 783 q 195 810 226 783 q 165 879 165 838 q 192 947 165 919 q 262 975 220 975 m 522 975 q 589 947 561 975 q 617 879 617 919 q 591 811 617 840 q 525 783 565 783 q 456 811 486 783 q 427 879 427 840 q 454 947 427 919 q 522 975 482 975 "},"\xA7":{x_min:61,x_max:685,ha:743,o:"m 118 39 l 136 38 q 207 -72 149 -32 q 341 -113 265 -113 q 441 -84 398 -113 q 485 -1 485 -56 q 378 121 485 73 q 170 213 272 169 q 61 386 61 277 q 95 495 61 437 q 175 584 129 554 q 133 649 148 615 q 118 721 118 683 q 206 887 118 825 q 406 949 295 949 q 531 937 479 949 q 630 895 583 926 q 598 826 613 860 q 570 754 583 791 l 558 754 q 499 848 548 812 q 388 884 451 884 q 300 858 340 884 q 261 785 261 832 q 366 672 261 717 q 575 583 472 626 q 685 414 685 519 q 657 302 685 354 q 580 216 630 250 q 622 149 602 197 q 643 68 643 101 q 545 -116 643 -51 q 322 -182 447 -182 q 197 -171 255 -182 q 86 -135 138 -161 q 118 39 106 -38 m 197 478 q 310 346 197 400 q 521 249 423 293 q 546 312 546 274 q 433 432 546 379 q 224 528 320 485 q 197 478 201 508 "},b:{x_min:79,x_max:772,ha:825,o:"m 89 647 q 84 844 89 712 q 79 1024 79 977 q 136 1018 105 1021 q 192 1015 167 1015 q 249 1018 217 1015 q 306 1023 280 1020 l 299 724 l 299 578 q 389 656 339 630 q 505 683 439 683 q 704 581 637 683 q 772 340 772 479 q 694 88 772 191 q 470 -15 617 -15 q 340 15 400 -15 q 237 104 280 45 q 202 74 215 87 q 136 1 190 62 l 79 1 q 84 357 79 132 q 89 647 89 583 m 430 586 q 318 512 346 586 q 291 338 291 438 q 316 162 291 238 q 424 86 342 86 q 528 159 503 86 q 554 331 554 233 q 531 510 554 434 q 430 586 508 586 "},q:{x_min:51,x_max:741,ha:825,o:"m 331 -15 q 121 81 191 -15 q 51 323 51 177 q 117 576 51 469 q 323 683 184 683 q 523 580 446 683 l 523 605 q 516 666 523 631 q 586 660 568 661 q 627 659 604 659 q 741 666 675 659 q 738 416 741 561 q 732 125 735 271 q 730 -124 730 -19 q 735 -246 730 -164 q 741 -371 741 -328 q 687 -363 718 -366 q 628 -361 656 -361 q 563 -363 581 -361 q 514 -372 545 -365 l 523 -58 l 523 85 q 437 10 482 35 q 331 -15 392 -15 m 386 81 q 484 135 452 81 q 523 261 516 189 l 523 300 q 523 351 523 330 q 523 392 523 372 q 490 518 523 460 q 393 576 458 576 q 290 502 314 576 q 266 327 266 429 q 288 155 266 229 q 386 81 310 81 "},\u03A9:{x_min:36,x_max:1174.890625,ha:1211,o:"m 1173 129 q 1170 103 1170 116 q 1170 83 1170 90 l 1170 70 q 1170 36 1170 52 q 1174 0 1170 19 l 953 4 l 715 0 l 715 103 q 848 251 813 162 q 883 473 883 340 q 815 741 883 623 q 607 860 747 860 q 396 738 461 860 q 331 457 331 616 q 369 245 331 339 q 496 102 407 152 l 496 0 l 256 4 l 36 0 l 38 80 l 36 129 q 264 113 151 113 q 128 258 172 167 q 85 464 85 350 q 235 821 85 693 q 622 949 386 949 q 988 830 846 949 q 1130 491 1130 712 q 1082 272 1130 363 q 928 112 1034 180 q 1173 129 1049 112 "},\u03CD:{x_min:82,x_max:765,ha:843,o:"m 765 415 q 663 114 765 244 q 400 -15 561 -15 q 162 56 242 -15 q 82 284 82 128 l 86 479 q 84 590 86 523 q 82 666 82 656 q 145 663 99 666 q 195 661 191 661 q 263 663 216 661 q 311 666 309 666 q 295 477 301 566 q 290 294 290 387 q 310 122 290 193 q 402 52 330 52 q 515 146 487 52 q 544 351 544 240 q 525 502 544 433 q 469 656 507 570 q 580 659 528 656 q 684 672 632 662 q 743 547 721 613 q 765 415 765 482 m 548 953 q 601 1001 581 986 q 651 1017 621 1017 q 702 994 681 1017 q 723 943 723 972 q 704 897 723 916 q 655 863 685 878 l 431 755 l 362 755 l 548 953 "},\u00D6:{x_min:40,x_max:1087,ha:1129,o:"m 577 949 q 946 829 805 949 q 1087 486 1087 710 q 942 115 1087 246 q 552 -15 798 -15 q 176 107 313 -15 q 40 465 40 229 q 188 823 40 697 q 577 949 337 949 m 434 1242 q 501 1215 473 1242 q 529 1148 529 1189 q 502 1079 529 1108 q 435 1050 476 1050 q 366 1079 396 1050 q 337 1148 337 1109 q 366 1214 337 1186 q 434 1242 395 1242 m 693 1242 q 761 1215 733 1242 q 789 1148 789 1189 q 762 1079 789 1108 q 695 1050 736 1050 q 627 1079 655 1050 q 600 1148 600 1108 q 627 1214 600 1186 q 693 1242 655 1242 m 562 71 q 774 194 706 71 q 843 470 843 318 q 774 742 843 623 q 563 861 706 861 q 353 741 420 861 q 287 465 287 622 q 354 191 287 312 q 562 71 421 71 "},z:{x_min:19.4375,x_max:640.28125,ha:664,o:"m 19 75 q 118 216 33 94 q 257 415 204 337 q 359 567 311 493 l 255 568 q 151 562 205 568 q 65 552 97 556 l 68 608 l 65 667 l 337 660 q 507 663 404 660 q 627 666 611 666 l 627 588 q 515 441 573 519 q 399 276 458 362 q 280 98 340 190 l 375 96 q 506 101 418 96 q 640 107 595 107 q 638 76 638 93 q 637 51 637 59 l 637 34 l 640 0 q 459 3 568 0 q 333 7 351 7 q 147 3 259 7 q 19 0 36 0 l 19 75 "},"\u2122":{x_min:136,x_max:964,ha:1138,o:"m 461 975 l 461 900 l 350 900 l 350 610 l 249 610 l 249 900 l 136 900 l 136 975 l 461 975 m 666 974 l 751 751 l 833 974 l 964 975 l 964 610 l 874 610 l 874 882 l 772 610 l 730 610 l 625 881 l 625 610 l 535 610 l 535 975 l 666 974 "},\u03AE:{x_min:80,x_max:727,ha:808,o:"m 91 339 q 85 512 91 391 q 80 667 80 632 q 137 661 125 662 q 180 661 149 661 q 244 663 199 661 q 293 666 290 666 l 293 568 q 391 651 338 622 q 511 681 443 681 q 660 622 602 681 q 719 471 719 564 l 719 327 l 719 -50 q 723 -219 719 -107 q 727 -374 727 -332 q 618 -365 670 -365 q 502 -373 562 -365 l 512 16 l 512 251 l 512 368 q 491 499 512 446 q 408 552 471 552 q 319 488 342 552 q 302 419 305 457 q 299 330 299 382 q 304 148 299 264 q 309 0 309 33 q 243 3 278 0 q 195 6 207 6 q 127 3 163 6 q 80 0 92 0 q 85 188 80 65 q 91 339 91 311 m 552 953 q 605 1001 585 986 q 654 1017 625 1017 q 706 994 685 1017 q 727 943 727 972 q 708 897 727 916 q 658 863 689 878 l 435 756 l 366 756 l 552 953 "},\u0398:{x_min:40,x_max:1087,ha:1129,o:"m 51 585 q 235 855 85 761 q 577 949 385 949 q 944 829 802 949 q 1087 487 1087 710 q 941 116 1087 247 q 552 -15 796 -15 q 176 107 313 -15 q 40 465 40 229 q 41 510 40 492 q 51 585 42 528 m 559 73 q 771 194 703 73 q 840 472 840 315 q 773 742 840 624 q 566 860 706 860 q 353 742 420 860 q 287 465 287 624 q 353 193 287 314 q 559 73 419 73 m 566 525 q 678 528 610 525 q 755 532 745 532 l 754 539 l 754 472 l 754 403 l 755 407 l 563 414 l 373 407 l 373 469 l 373 531 q 484 528 416 531 q 566 525 553 525 "},"\xAE":{x_min:72,x_max:1065,ha:1138,o:"m 1065 488 q 917 139 1065 285 q 567 -6 770 -6 q 219 139 366 -6 q 72 488 72 285 q 219 836 72 688 q 567 985 367 985 q 917 839 770 985 q 1065 488 1065 693 m 155 488 q 276 197 155 320 q 566 75 398 75 q 858 197 734 75 q 983 487 983 320 q 860 780 983 656 q 567 904 738 904 q 277 780 399 904 q 155 488 155 656 m 577 774 q 741 740 670 774 q 812 625 812 707 q 778 527 812 569 q 692 468 745 484 l 811 223 l 666 222 l 561 447 l 497 447 l 497 223 l 361 223 l 361 774 l 577 774 m 497 528 l 562 528 q 641 546 609 528 q 673 608 673 564 q 655 660 673 638 q 607 685 638 682 q 555 691 584 691 l 497 691 l 497 528 "},\u00C9:{x_min:90,x_max:644.15625,ha:703,o:"m 108 223 l 108 465 q 104 713 108 622 q 91 933 101 804 l 357 929 l 644 933 l 640 872 l 644 811 q 530 816 606 811 q 415 822 453 822 l 340 822 q 337 663 340 774 q 334 545 334 551 l 634 557 q 631 521 634 546 q 628 493 628 496 q 630 458 628 477 q 634 429 633 440 q 476 436 587 429 q 334 444 365 444 l 334 294 q 335 203 334 249 q 340 111 336 156 q 483 114 419 111 q 640 128 546 118 q 634 65 634 100 q 635 37 634 47 q 640 0 635 27 q 427 3 556 0 q 280 7 298 7 q 169 3 242 7 q 90 0 95 0 q 102 117 97 59 q 108 223 108 175 m 410 1222 q 465 1272 445 1257 q 515 1288 485 1288 q 566 1265 545 1288 q 587 1215 587 1243 q 568 1169 587 1189 q 519 1133 549 1148 l 294 1025 l 225 1025 l 410 1222 "},"~":{x_min:266,x_max:1091,ha:1367,o:"m 1091 938 q 1033 721 1091 807 q 847 636 975 636 q 661 720 757 636 q 518 805 564 805 q 427 756 453 805 q 402 636 402 708 l 266 636 q 327 849 266 761 q 510 938 388 938 q 696 853 599 938 q 846 768 793 768 q 933 815 911 768 q 956 938 956 863 l 1091 938 "},\u0395:{x_min:90,x_max:644.15625,ha:703,o:"m 108 222 l 108 465 q 104 710 108 620 q 91 932 101 800 l 357 926 q 520 929 405 926 q 644 932 634 932 q 640 903 641 916 q 638 872 638 890 q 639 848 638 857 q 644 810 640 840 q 530 815 606 810 q 414 820 453 820 l 338 820 l 334 545 l 634 557 q 630 527 631 541 q 628 494 628 514 l 633 431 q 459 437 571 431 q 334 444 347 444 l 334 296 q 336 190 334 264 q 338 113 338 115 q 638 129 489 113 l 634 63 l 638 0 q 433 3 562 0 q 278 7 305 7 q 169 3 235 7 q 90 0 102 0 q 102 114 96 54 q 108 222 108 175 "},"\xB3":{x_min:18,x_max:448,ha:494,o:"m 242 899 q 370 867 315 899 q 425 770 425 836 q 399 699 425 730 q 301 645 373 667 q 403 605 359 642 q 448 512 448 569 q 375 384 448 426 q 210 342 303 342 q 108 352 152 342 q 18 391 65 362 q 88 505 60 451 l 98 505 q 119 420 98 452 q 191 388 141 388 q 263 421 237 388 q 290 501 290 454 q 262 580 290 549 q 186 612 235 612 l 151 612 l 151 660 l 181 658 q 259 684 228 658 q 290 759 290 710 q 268 828 290 800 q 207 856 246 856 q 141 821 163 856 q 119 742 119 787 l 110 736 q 26 815 75 777 q 120 876 53 854 q 242 899 187 899 "},"[":{x_min:104,x_max:415.109375,ha:454,o:"m 409 883 l 415 852 l 261 855 l 257 541 q 261 212 257 433 q 266 -86 266 -8 l 327 -88 l 415 -88 l 409 -117 q 415 -162 409 -142 l 261 -157 l 104 -164 q 110 154 104 -50 q 117 383 117 359 q 110 703 117 496 q 104 933 104 909 q 194 929 138 933 q 258 926 249 926 q 347 929 284 926 q 415 933 410 933 q 409 883 409 911 "},L:{x_min:91,x_max:639.609375,ha:650,o:"m 109 465 q 105 710 109 620 q 91 932 102 800 l 216 927 l 350 931 q 337 618 337 783 l 337 296 q 337 201 337 249 q 341 113 337 153 q 639 129 491 113 l 635 63 l 639 0 q 434 3 563 0 q 279 7 306 7 q 170 3 236 7 q 91 0 103 0 q 105 209 102 102 q 109 465 109 316 "},\u03C3:{x_min:30,x_max:832,ha:826,o:"m 679 557 q 730 451 724 495 q 738 384 736 407 q 741 339 741 361 q 738 277 741 295 q 726 190 736 259 q 617 53 716 121 q 385 -15 518 -15 q 126 78 223 -15 q 30 336 30 172 q 127 588 30 494 q 384 683 224 683 q 536 671 432 683 q 677 660 639 660 q 765 663 705 660 q 831 666 825 666 q 827 611 827 637 l 827 594 l 832 552 l 702 557 l 679 557 m 256 333 q 269 174 256 248 q 304 88 275 124 q 381 52 332 52 q 475 104 443 52 q 508 221 508 156 q 512 258 509 235 q 515 323 515 282 q 512 411 515 370 q 508 444 509 427 q 479 563 508 511 q 389 615 450 615 q 299 565 327 615 q 263 450 271 516 q 256 333 256 384 "},\u03B6:{x_min:64,x_max:667,ha:656,o:"m 231 360 l 231 340 l 231 314 q 343 192 231 217 q 554 162 448 176 q 667 24 667 133 q 628 -103 667 -42 q 525 -221 589 -164 l 458 -181 q 505 -114 493 -134 q 521 -63 516 -95 q 375 13 521 -6 q 146 71 229 33 q 64 260 64 110 q 123 495 64 382 q 257 692 182 608 q 467 905 333 776 q 278 903 353 905 q 122 893 204 901 l 126 958 l 122 1024 q 255 1019 166 1024 q 389 1015 344 1015 q 511 1019 429 1015 q 635 1024 593 1024 l 630 978 l 634 934 q 433 764 520 848 q 288 578 346 680 q 231 360 231 476 "},\u03B8:{x_min:34,x_max:710,ha:749,o:"m 710 450 q 636 110 710 240 q 367 -19 562 -19 q 104 103 175 -19 q 34 434 34 226 q 106 774 34 641 q 368 908 178 908 q 637 785 565 908 q 710 450 710 662 m 370 416 q 305 413 351 416 q 255 410 259 410 q 257 322 255 371 q 266 208 259 273 q 292 96 272 143 q 370 49 312 49 q 429 72 406 49 q 463 135 452 96 q 479 263 474 192 q 484 410 484 335 q 418 413 464 410 q 370 416 372 416 m 484 601 q 464 769 484 698 q 372 840 445 840 q 277 759 300 840 q 255 560 255 679 l 255 492 l 372 488 l 488 492 l 484 601 "},\u039F:{x_min:40,x_max:1086,ha:1129,o:"m 577 949 q 945 829 804 949 q 1086 486 1086 710 q 942 114 1086 244 q 552 -15 798 -15 q 176 107 313 -15 q 40 465 40 229 q 188 823 40 697 q 577 949 337 949 m 562 73 q 773 194 706 73 q 840 472 840 315 q 773 742 840 624 q 566 860 706 860 q 353 742 420 860 q 287 465 287 624 q 353 193 287 313 q 562 73 420 73 "},\u0393:{x_min:91,x_max:639.609375,ha:650,o:"m 232 926 l 449 926 l 639 932 l 635 866 l 639 802 q 485 815 548 812 q 341 819 423 819 q 338 769 339 805 q 337 681 337 734 l 337 635 l 337 312 q 339 138 337 195 q 351 0 341 81 l 216 4 l 91 0 q 100 238 91 70 q 109 465 109 406 q 105 713 109 613 q 91 932 102 813 q 161 929 114 932 q 232 926 209 926 "}," ":{x_min:0,x_max:0,ha:375},"%":{x_min:28,x_max:1085,ha:1122,o:"m 265 910 q 434 844 369 910 q 500 672 500 779 q 435 496 500 562 q 258 431 370 431 q 91 498 154 431 q 28 669 28 565 q 93 843 28 776 q 265 910 158 910 m 831 1015 l 917 1014 l 272 -125 l 184 -125 l 831 1015 m 849 463 q 1020 401 955 463 q 1085 230 1085 339 q 1023 51 1085 117 q 845 -15 961 -15 q 677 51 742 -15 q 612 222 612 118 q 675 398 612 333 q 849 463 738 463 m 196 561 q 214 505 196 532 q 261 478 232 478 q 297 489 280 478 q 323 525 314 501 q 335 586 332 548 q 339 669 339 625 q 337 723 339 697 q 332 780 336 749 q 311 836 327 811 q 264 861 296 861 q 204 820 222 861 q 191 752 194 786 q 188 669 188 719 q 196 561 188 615 m 779 112 q 797 57 779 83 q 847 31 816 31 q 895 59 873 31 q 916 114 916 87 q 922 222 922 162 q 922 275 922 248 q 915 338 917 312 q 896 389 912 364 q 848 414 880 414 q 812 404 827 414 q 791 375 797 394 q 776 312 780 347 q 772 241 772 276 l 772 222 q 772 183 772 201 q 779 112 773 165 "},P:{x_min:91,x_max:765,ha:801,o:"m 334 201 q 335 129 334 148 q 348 0 336 110 q 272 3 317 0 q 219 6 226 6 q 143 3 189 6 q 91 0 97 0 q 104 212 100 112 q 108 462 108 313 q 99 725 108 549 q 91 933 91 900 q 161 929 111 933 q 215 925 211 925 l 395 933 l 445 933 q 677 876 590 933 q 765 681 765 819 q 691 486 765 565 q 544 400 618 408 q 423 390 470 391 q 334 389 375 389 l 334 201 m 536 669 q 498 788 536 741 q 390 836 461 836 l 334 836 l 334 694 l 334 486 q 485 529 435 486 q 536 669 536 572 "},\u038F:{x_min:-28,x_max:1452.5625,ha:1489,o:"m 1451 129 q 1448 104 1448 117 q 1448 83 1448 90 l 1448 70 q 1448 36 1448 52 q 1452 0 1448 19 l 1231 4 l 993 0 l 993 103 q 1126 251 1091 162 q 1161 473 1161 340 q 1092 741 1161 623 q 884 860 1024 860 q 673 738 738 860 q 608 457 608 616 q 646 245 608 339 q 774 102 684 152 l 774 0 l 534 4 l 314 0 l 316 80 l 313 129 q 542 113 429 113 q 405 258 449 167 q 362 464 362 350 q 512 821 362 693 q 899 949 663 949 q 1266 830 1124 949 q 1408 491 1408 712 q 1360 272 1408 363 q 1206 112 1312 180 q 1451 129 1327 112 m 158 953 q 211 1001 191 986 q 259 1017 231 1017 q 312 994 291 1017 q 333 943 333 972 q 314 897 333 916 q 265 863 295 878 l 40 755 l -28 755 l 158 953 "},\u0388:{x_min:-28,x_max:1020.609375,ha:1078,o:"m 485 222 l 485 465 q 481 710 485 620 q 467 931 478 800 l 733 926 q 896 929 781 926 q 1020 932 1010 932 q 1016 903 1017 916 q 1015 872 1015 890 q 1015 848 1015 857 q 1020 810 1016 839 q 906 815 983 810 q 791 820 830 820 l 715 820 l 711 544 l 1010 556 q 1006 527 1008 540 q 1005 493 1005 513 l 1009 430 q 836 436 948 430 q 711 443 724 443 l 711 296 q 713 189 711 264 q 715 113 715 115 q 1015 129 865 113 l 1010 63 l 1015 0 q 810 3 938 0 q 655 7 681 7 q 545 3 612 7 q 466 0 478 0 q 478 114 472 54 q 485 222 485 175 m 158 953 q 212 1001 191 986 q 260 1017 232 1017 q 313 994 292 1017 q 334 943 334 972 q 315 897 334 916 q 265 863 296 878 l 40 755 l -28 755 l 158 953 "},_:{x_min:0,x_max:683.328125,ha:683,o:"m 683 -184 l 683 -322 l 0 -322 l 0 -184 l 683 -184 "},\u03AA:{x_min:-1,x_max:450,ha:449,o:"m 110 402 q 103 709 110 511 q 97 932 97 908 q 161 926 130 929 q 220 923 192 923 q 287 927 242 923 q 351 931 331 931 q 343 688 351 859 q 336 465 336 516 q 343 221 336 391 q 351 0 351 51 q 283 2 330 0 q 212 5 236 5 l 97 0 q 103 233 97 83 q 110 402 110 383 m 93 1242 q 160 1215 132 1242 q 188 1148 188 1189 q 162 1078 188 1107 q 97 1050 136 1050 q 28 1079 57 1050 q -1 1148 -1 1108 q 26 1214 -1 1186 q 93 1242 54 1242 m 352 1242 q 421 1214 393 1242 q 450 1148 450 1187 q 423 1079 450 1108 q 356 1050 397 1050 q 286 1078 316 1050 q 257 1148 257 1107 q 286 1214 257 1186 q 352 1242 315 1242 "},"+":{x_min:169,x_max:968,ha:1138,o:"m 636 813 l 636 473 l 968 473 l 968 340 l 636 340 l 636 0 l 501 0 l 501 340 l 169 340 l 169 473 l 501 473 l 501 813 l 636 813 "},"\xBD":{x_min:68,x_max:1145.765625,ha:1171,o:"m 207 481 l 207 736 l 207 808 q 150 784 180 798 q 103 763 120 770 l 68 813 q 195 860 131 834 q 331 918 259 886 l 348 909 q 346 744 348 844 q 344 644 344 645 l 345 650 l 345 505 l 345 511 q 345 458 345 480 q 349 391 345 437 l 299 394 q 247 392 281 394 q 198 391 213 391 l 207 481 m 844 1014 l 928 1014 l 326 -124 l 243 -124 l 844 1014 m 721 42 q 908 194 839 122 q 977 365 977 266 q 962 434 977 408 q 905 460 947 460 q 840 427 864 460 q 805 345 816 395 l 795 345 q 768 379 789 358 q 727 418 747 400 q 822 487 773 465 q 936 510 870 510 q 1068 474 1012 510 q 1124 365 1124 439 q 1035 209 1124 271 q 890 110 947 147 l 970 109 q 1070 111 999 109 q 1145 114 1140 114 q 1134 48 1134 80 q 1138 23 1134 37 q 1144 0 1143 9 l 1006 3 l 729 3 l 721 42 "},\u03A1:{x_min:91,x_max:765,ha:801,o:"m 334 201 q 335 129 334 148 q 348 0 336 110 q 272 3 317 0 q 219 6 226 6 q 143 3 189 6 q 91 0 97 0 q 104 212 100 112 q 108 462 108 313 q 99 725 108 549 q 91 933 91 900 q 161 929 111 933 q 215 925 211 925 l 395 933 l 445 933 q 677 876 590 933 q 765 681 765 819 q 691 486 765 565 q 544 400 618 408 q 423 390 470 391 q 334 389 375 389 l 334 201 m 536 669 q 498 788 536 741 q 390 836 461 836 l 334 836 l 334 694 l 334 486 q 485 529 435 486 q 536 669 536 572 "},"'":{x_min:72.21875,x_max:337.5,ha:375,o:"m 72 528 l 152 848 q 184 919 159 889 q 245 949 209 949 q 311 923 284 949 q 337 861 337 898 q 315 797 337 827 l 112 511 l 72 528 "},T:{x_min:8,x_max:738,ha:749,o:"m 493 818 q 490 723 493 790 q 487 652 487 656 q 490 427 487 529 q 498 201 494 326 q 503 0 503 77 q 438 2 482 0 q 374 5 395 5 q 317 3 351 5 q 244 0 284 1 q 252 266 244 88 q 261 476 261 444 q 258 670 261 533 q 255 818 255 808 q 158 815 188 818 q 8 801 128 813 l 12 872 l 8 932 q 198 927 70 932 q 373 922 327 922 q 572 927 445 922 q 738 932 700 932 l 733 870 l 738 801 q 493 818 614 818 "},\u03A6:{x_min:36,x_max:1093,ha:1129,o:"m 445 960 q 513 952 484 955 q 566 950 543 950 q 634 954 599 950 q 683 960 669 958 q 676 909 680 943 q 672 858 672 876 l 751 851 q 998 732 904 829 q 1093 484 1093 634 q 980 206 1093 301 q 672 72 867 112 q 673 31 672 44 q 683 -26 674 19 q 619 -20 653 -23 q 566 -17 585 -17 q 500 -20 535 -17 q 445 -26 465 -24 q 453 17 449 -5 q 458 72 458 40 l 380 82 q 133 205 231 103 q 36 454 36 307 q 150 732 36 636 q 458 858 265 828 q 452 911 458 879 q 445 960 447 943 m 668 700 l 668 467 l 668 234 l 672 171 q 817 266 774 182 q 861 468 861 351 q 817 666 861 583 q 669 764 773 750 l 668 700 m 419 755 q 301 654 336 739 q 267 469 267 570 q 309 267 267 351 q 455 171 351 183 l 458 234 l 462 424 l 458 700 l 458 764 l 419 755 "},j:{x_min:-62,x_max:313,ha:396,o:"m 196 660 q 235 660 215 660 q 307 666 254 661 l 306 490 q 309 182 306 369 q 313 -31 313 -4 q 217 -278 313 -195 q -49 -361 121 -361 l -62 -305 q 59 -240 24 -305 q 95 -81 95 -175 l 95 255 q 89 459 95 322 q 84 666 84 597 q 196 660 143 660 m 195 1014 q 272 980 239 1014 q 306 902 306 947 q 273 825 306 858 q 195 793 240 793 q 117 824 150 793 q 84 902 84 856 q 117 980 84 947 q 195 1014 150 1014 "},\u03A3:{x_min:18.0625,x_max:801.390625,ha:843,o:"m 747 865 l 751 804 q 641 808 715 804 q 527 813 568 813 l 369 813 q 481 664 427 733 q 594 519 534 594 q 402 315 496 419 l 304 203 l 544 203 q 672 208 586 203 q 801 214 758 214 l 794 112 q 801 0 794 59 l 456 4 l 18 0 l 18 57 q 261 330 138 181 l 365 461 q 222 657 298 559 q 55 865 147 755 l 55 932 q 243 928 118 932 q 431 924 368 924 q 630 928 511 924 q 751 932 750 932 l 747 865 "},"1":{x_min:55,x_max:502,ha:749,o:"m 276 616 q 273 680 276 637 q 271 747 271 723 q 197 713 223 726 q 112 666 172 700 l 55 754 q 471 940 291 848 l 498 927 l 492 454 l 493 465 l 493 202 l 493 216 q 497 102 493 178 q 502 0 502 26 l 383 6 q 314 3 362 6 q 264 0 266 0 q 270 359 264 127 q 276 616 276 591 "},\u00E4:{x_min:44,x_max:706.78125,ha:706,o:"m 236 -15 q 98 35 153 -15 q 44 169 44 86 q 212 352 44 301 q 401 421 380 403 q 410 439 410 432 q 373 539 410 502 q 275 577 337 577 q 140 511 185 577 l 135 511 l 115 585 q 230 657 164 632 q 365 683 296 683 q 543 623 479 683 q 608 452 608 564 l 604 213 q 604 166 604 184 q 608 123 604 148 q 625 87 612 99 q 658 76 638 76 q 679 80 666 76 q 702 90 691 84 l 706 40 q 643 1 676 14 q 563 -15 610 -10 q 480 5 518 -15 q 419 64 442 25 q 236 -15 350 -15 m 221 976 q 289 948 261 976 q 317 878 317 920 q 290 811 317 839 q 223 784 264 784 q 155 811 186 784 q 125 878 125 839 q 154 946 125 917 q 221 976 183 976 m 481 976 q 549 948 521 976 q 577 878 577 920 q 550 811 577 839 q 483 784 524 784 q 414 812 444 784 q 385 878 385 841 q 412 946 385 917 q 481 976 440 976 m 240 200 q 261 128 240 158 q 321 99 282 99 q 388 131 367 99 q 410 211 410 164 l 410 352 q 287 302 335 338 q 240 200 240 267 "},"<":{x_min:175,x_max:959.75,ha:1138,o:"m 959 650 l 362 406 l 959 162 l 959 17 l 175 340 l 175 471 l 959 796 l 959 650 "},"\xA3":{x_min:48,x_max:734.109375,ha:749,o:"m 56 88 q 52 142 56 117 q 48 181 49 167 q 138 198 100 181 q 185 254 177 215 q 193 315 193 292 l 191 429 l 153 429 q 99 425 128 429 q 56 421 70 421 l 61 467 l 56 512 q 113 506 81 508 q 184 504 145 504 q 172 598 172 552 q 259 829 172 748 q 499 910 346 910 q 734 848 623 910 q 710 778 718 809 q 691 695 702 747 l 658 695 q 613 795 645 758 q 523 833 581 833 q 417 787 455 833 q 379 671 379 741 q 384 582 379 637 q 391 504 390 527 l 463 504 l 480 504 q 519 504 500 504 q 598 512 538 505 l 593 466 l 598 422 l 493 429 l 391 429 q 343 288 382 340 q 219 184 303 236 l 542 189 l 724 195 q 716 146 720 174 q 711 98 711 117 q 713 62 711 78 q 724 0 716 45 q 557 3 667 0 q 391 8 448 8 q 220 3 334 8 q 48 0 106 0 q 52 46 49 16 q 56 88 56 77 "},"\xB9":{x_min:66,x_max:360,ha:494,o:"m 212 726 l 212 802 q 158 781 187 795 q 102 755 129 768 l 66 808 q 206 857 157 838 q 342 919 256 876 l 356 910 l 356 627 l 356 638 l 356 477 l 356 484 q 356 429 356 451 q 360 354 356 408 l 307 358 l 202 354 q 210 520 209 418 q 212 634 212 623 l 212 726 "},t:{x_min:9,x_max:468.71875,ha:463,o:"m 9 584 l 10 627 l 10 671 q 54 667 25 668 q 102 667 84 667 l 102 687 l 102 704 q 95 823 102 765 q 192 859 147 839 q 298 914 237 880 l 327 914 q 319 853 323 890 q 315 791 315 816 l 315 667 l 344 667 q 433 670 387 667 l 430 629 l 430 582 l 309 584 l 309 226 q 322 107 309 149 q 393 65 335 65 q 468 72 427 65 l 463 9 q 381 -11 425 -4 q 292 -18 336 -18 q 145 25 196 -18 q 95 165 95 69 q 98 410 95 260 q 102 583 102 559 l 9 584 "},\u03BB:{x_min:22.609375,x_max:662.890625,ha:686,o:"m 550 0 l 433 0 q 394 177 417 79 q 360 323 372 275 q 318 490 349 372 q 234 238 269 359 q 179 0 199 116 l 103 0 l 22 0 q 109 214 69 109 q 182 416 149 318 q 264 662 215 514 q 214 834 247 760 q 111 909 180 909 q 80 903 99 909 q 51 895 61 898 l 32 964 q 121 1008 76 993 q 215 1024 167 1024 q 384 925 342 1024 q 458 718 426 826 l 529 459 l 662 0 l 550 0 "},\u00F9:{x_min:75,x_max:722,ha:808,o:"m 474 757 l 249 865 q 198 900 216 883 q 181 946 181 917 q 203 998 181 977 q 256 1019 225 1019 q 303 1003 282 1019 q 356 955 324 987 l 542 757 l 474 757 m 292 -15 q 142 41 202 -15 q 83 189 83 98 l 83 337 q 79 509 83 394 q 75 668 75 624 q 134 661 108 663 q 185 659 160 659 q 240 662 209 659 q 300 668 271 665 q 290 455 290 570 l 290 384 l 290 279 q 316 146 290 181 q 394 111 343 111 q 467 147 441 111 q 501 234 493 184 l 501 330 q 499 488 501 415 q 495 668 497 562 q 554 662 518 665 q 613 659 589 659 q 671 662 640 659 q 722 668 701 665 q 717 505 722 625 q 712 326 712 386 q 717 156 712 270 q 722 1 722 43 l 617 4 l 511 1 l 511 96 q 410 15 468 46 q 292 -15 353 -15 "},W:{x_min:-8.328125,x_max:1325,ha:1326,o:"m -8 932 q 67 929 13 932 q 125 926 120 926 q 190 929 147 926 q 255 932 233 932 q 300 737 277 829 q 357 519 323 644 q 419 298 391 394 q 504 548 455 403 q 576 759 554 693 q 633 932 598 825 l 711 926 q 756 929 726 926 q 802 932 787 932 q 859 729 836 807 q 913 557 881 651 q 998 297 944 462 q 1166 932 1094 604 l 1248 926 q 1298 929 1280 926 q 1325 932 1316 932 l 1230 643 l 1019 0 q 972 4 983 4 q 937 5 962 5 q 884 2 904 5 q 855 0 865 0 q 793 200 831 80 q 740 363 754 319 l 652 623 q 543 325 594 476 q 441 0 493 175 q 393 3 423 0 q 359 6 363 6 q 308 4 330 6 q 272 0 286 1 q 184 320 222 191 q 107 576 147 450 q -8 932 68 703 "},\u00EF:{x_min:-26,x_max:422,ha:396,o:"m 93 126 l 93 542 q 87 601 93 557 q 82 666 82 645 q 141 660 111 663 q 198 658 172 658 q 255 661 223 658 q 316 666 287 663 q 311 621 315 658 q 303 544 307 584 l 303 319 l 303 115 l 315 0 l 195 2 l 81 0 q 93 126 93 66 m 68 976 q 134 947 107 976 q 162 878 162 918 q 136 811 162 839 q 71 784 111 784 q 2 811 31 784 q -26 878 -26 838 q 1 946 -26 917 q 68 976 29 976 m 327 976 q 394 948 366 976 q 422 878 422 920 q 396 811 422 838 q 329 784 370 784 q 260 811 288 784 q 232 878 232 838 q 260 947 232 918 q 327 976 288 976 "},">":{x_min:174.984375,x_max:961,ha:1138,o:"m 961 472 l 961 340 l 175 17 l 175 162 l 773 406 l 174 650 l 174 796 l 961 472 "},v:{x_min:0,x_max:669.453125,ha:667,o:"m 0 667 q 75 663 26 667 q 131 659 123 659 q 202 663 156 659 q 255 667 247 667 l 293 528 l 387 223 q 526 667 473 447 l 595 659 q 637 663 611 659 q 669 667 663 667 q 541 343 602 505 q 418 0 480 181 q 368 4 395 2 q 330 6 341 6 q 279 3 311 6 q 244 0 248 0 q 129 340 184 186 q 0 667 73 494 "},\u03C4:{x_min:9,x_max:654.84375,ha:661,o:"m 446 557 l 445 521 l 445 108 q 456 0 445 55 l 338 4 l 225 0 q 234 69 231 40 q 237 125 237 98 l 237 320 l 237 516 l 237 557 q 59 459 115 557 l 24 459 q 20 516 24 490 q 9 581 17 543 q 122 641 59 625 q 263 658 185 658 l 440 656 q 654 667 556 656 q 649 610 649 641 q 654 554 649 580 q 525 555 603 554 q 446 557 447 557 "},\u00FB:{x_min:75,x_max:722,ha:808,o:"m 339 1004 l 463 1004 l 616 757 l 549 757 l 400 879 l 254 757 l 186 757 l 339 1004 m 292 -15 q 142 41 202 -15 q 83 189 83 98 l 83 337 q 79 509 83 394 q 75 668 75 625 q 134 662 108 664 q 185 660 160 660 q 240 662 209 660 q 300 668 271 665 q 290 455 290 570 l 290 384 l 290 279 q 316 146 290 181 q 394 111 343 111 q 467 147 441 111 q 501 234 493 184 l 501 330 q 499 488 501 415 q 495 668 497 562 q 554 662 518 665 q 613 660 589 660 q 671 662 640 660 q 722 668 701 665 q 717 505 722 625 q 712 326 712 386 q 717 156 712 270 q 722 1 722 43 l 617 4 l 511 1 l 511 96 q 410 15 468 46 q 292 -15 353 -15 "},\u03BE:{x_min:53,x_max:675,ha:675,o:"m 559 813 q 508 904 534 873 q 432 936 482 936 q 335 887 372 936 q 299 776 299 838 q 372 648 299 683 q 550 614 446 614 l 546 569 l 546 525 l 455 528 q 320 498 379 528 q 251 432 261 469 q 240 386 241 396 q 239 360 239 376 q 240 322 239 335 q 244 304 241 310 q 363 205 258 226 q 569 165 469 183 q 675 25 675 130 q 647 -83 675 -27 q 536 -221 619 -139 l 468 -181 q 514 -114 498 -141 q 531 -55 531 -88 q 380 23 531 -5 q 141 98 229 53 q 53 287 53 143 q 113 467 53 390 q 274 586 173 544 q 144 666 196 615 q 92 790 92 716 q 180 962 92 901 q 389 1024 269 1024 q 515 1009 455 1024 q 640 963 575 994 q 620 886 632 936 q 604 809 608 836 l 559 813 "},"&":{x_min:50,x_max:948.609375,ha:974,o:"m 316 -18 q 128 44 206 -18 q 50 215 50 107 q 115 388 50 315 q 281 502 180 462 q 216 609 243 547 q 190 723 190 670 q 266 877 190 823 q 446 932 342 932 q 604 889 537 932 q 672 761 672 847 q 621 631 672 687 q 495 541 571 576 q 709 295 593 412 q 786 421 751 348 q 845 567 822 494 q 880 517 861 538 q 934 463 899 495 q 851 336 888 387 q 761 233 813 285 q 856 123 811 174 q 948 26 902 71 l 948 1 q 860 7 887 6 q 817 8 833 8 q 756 6 779 8 q 690 1 734 5 l 612 92 q 469 11 545 40 q 316 -18 394 -18 m 232 284 q 284 160 232 214 q 408 106 337 106 q 484 118 449 106 q 562 155 519 130 q 421 323 469 264 q 330 443 373 382 q 258 373 284 411 q 232 284 232 336 m 547 759 q 522 831 547 802 q 453 860 498 860 q 419 854 435 860 q 379 823 394 850 q 365 769 365 797 q 383 697 365 740 q 449 597 402 654 q 520 668 493 627 q 547 759 547 709 "},\u039B:{x_min:-19.4375,x_max:856.953125,ha:836,o:"m 583 700 l 856 0 q 781 3 823 0 q 723 6 740 6 q 645 3 688 6 q 587 0 602 0 q 563 90 579 43 q 538 163 547 137 l 359 637 l 189 161 q 142 0 163 87 l 72 5 q 35 4 48 5 q -19 0 23 4 q 25 92 -2 33 q 83 226 52 151 l 272 698 q 311 810 290 747 q 348 932 331 873 q 394 927 379 929 q 423 926 409 926 q 474 929 456 926 q 501 932 491 932 q 583 700 536 819 "},I:{x_min:94,x_max:354,ha:447,o:"m 111 402 q 107 716 111 609 q 94 932 103 822 q 161 925 124 929 q 220 922 198 922 q 292 927 245 922 q 353 931 339 932 q 340 716 343 819 q 337 465 337 613 q 340 221 337 326 q 354 0 344 116 q 273 2 330 0 q 214 5 216 5 l 95 0 q 107 199 103 88 q 111 402 111 311 "},G:{x_min:43,x_max:948,ha:1015,o:"m 552 -15 q 183 110 324 -15 q 43 461 43 236 q 195 823 43 693 q 583 954 347 954 q 763 932 679 954 q 929 865 848 911 q 879 697 895 784 l 862 697 q 749 816 818 772 q 595 860 680 860 q 390 769 471 860 q 300 608 309 679 q 289 513 291 536 q 287 469 287 490 q 289 404 287 426 q 294 375 292 382 q 389 167 310 250 q 590 84 468 84 q 713 100 651 84 q 699 430 713 272 q 824 423 768 423 q 948 431 886 423 q 942 323 948 395 q 937 214 937 251 q 939 118 937 185 q 942 47 942 51 q 746 1 839 17 q 552 -15 652 -15 "},\u03B0:{x_min:39,x_max:768,ha:843,o:"m 768 415 q 666 114 768 244 q 404 -15 565 -15 q 165 56 246 -15 q 85 284 85 127 l 89 478 q 87 589 89 523 q 85 666 85 656 q 148 663 102 666 q 198 661 194 661 q 266 663 219 661 q 314 666 312 666 q 298 476 304 566 q 293 294 293 387 q 313 122 293 193 q 405 52 333 52 q 518 146 490 52 q 547 351 547 240 q 528 502 547 433 q 472 656 510 570 q 583 659 531 656 q 687 672 636 662 q 746 547 725 613 q 768 415 768 481 m 121 961 q 179 935 155 961 q 203 877 203 910 q 179 820 203 844 q 121 797 155 797 q 64 820 89 797 q 39 879 39 844 q 62 935 39 910 q 121 961 86 961 m 462 1017 q 504 998 486 1017 q 522 957 522 980 q 508 919 522 935 q 470 886 494 903 l 282 755 l 224 755 l 368 950 q 413 998 391 979 q 462 1017 434 1017 m 657 961 q 713 935 688 961 q 739 877 739 910 q 715 820 739 844 q 658 797 691 797 q 600 820 625 797 q 575 879 575 844 q 599 936 575 912 q 657 961 623 961 "},"`":{x_min:65.671875,x_max:330.9375,ha:375,o:"m 251 613 q 217 540 240 569 q 153 512 193 512 q 92 537 118 512 q 65 598 65 562 q 87 665 65 634 l 292 949 l 330 933 l 251 613 "},\u03A5:{x_min:-30,x_max:797,ha:747,o:"m 136 650 q 67 772 123 672 q -30 932 10 872 l 92 926 q 184 929 120 926 q 256 931 249 931 q 345 740 304 825 q 442 554 386 656 q 541 730 492 636 q 637 931 589 825 l 712 926 q 753 929 726 926 q 797 931 781 931 q 644 689 714 812 q 498 420 573 566 l 502 143 l 508 0 l 414 5 l 256 0 q 262 138 256 50 q 269 237 269 226 l 269 402 l 136 650 "},r:{x_min:80,x_max:505,ha:521,o:"m 91 326 q 85 495 91 381 q 80 666 80 609 l 181 661 q 246 663 201 661 q 297 666 291 666 q 283 592 287 630 q 280 504 280 554 l 288 504 q 357 632 311 581 q 474 683 403 683 l 505 683 q 495 571 498 631 q 492 457 492 511 q 448 477 471 468 q 406 486 424 486 q 320 439 343 486 q 298 323 298 392 q 300 147 298 208 q 311 0 302 85 q 247 3 288 0 q 195 6 206 6 q 130 3 171 6 q 80 0 88 0 q 85 162 80 53 q 91 326 91 270 "},x:{x_min:-4.5625,x_max:646.828125,ha:644,o:"m 155 0 l 84 5 q 28 4 46 5 q -4 0 6 0 q 110 148 55 75 q 223 307 164 222 l 113 498 l 7 667 q 86 663 38 667 q 141 659 134 659 q 215 663 169 659 q 271 667 262 667 l 366 473 q 419 555 398 521 q 481 667 439 590 l 553 659 q 601 663 571 659 q 637 667 631 667 q 537 542 580 598 q 419 384 494 486 l 537 177 q 646 0 588 88 q 571 3 620 0 q 516 6 523 6 q 441 3 489 6 q 385 0 392 0 l 276 218 l 155 0 "},\u00E8:{x_min:41,x_max:684.046875,ha:729,o:"m 482 98 q 566 112 532 98 q 643 160 600 126 l 661 151 q 643 96 652 125 q 628 40 634 66 q 521 -1 577 11 q 403 -15 466 -15 q 141 79 241 -15 q 41 336 41 173 q 137 586 41 490 q 386 683 234 683 q 608 601 532 683 q 684 373 684 520 l 684 332 l 267 332 q 325 165 267 232 q 482 98 383 98 m 436 754 l 211 862 q 162 896 181 877 q 143 946 143 915 q 165 996 143 976 q 217 1017 186 1017 q 274 996 250 1017 q 320 952 298 975 l 508 754 l 436 754 m 478 411 q 481 444 481 422 q 459 566 481 513 q 377 620 438 620 q 292 562 318 620 q 267 437 267 505 l 267 411 l 478 411 "},\u03BC:{x_min:79,x_max:729,ha:808,o:"m 717 322 q 723 136 717 256 q 729 0 729 15 l 629 5 q 564 2 609 5 q 518 0 519 0 l 518 81 q 448 4 479 23 q 384 -15 417 -15 q 333 -4 352 -15 q 288 25 313 7 l 288 34 l 287 -57 l 288 -190 l 287 -180 q 292 -278 287 -212 q 297 -368 297 -344 q 221 -361 240 -361 q 189 -361 201 -361 q 150 -361 168 -361 q 79 -368 131 -362 q 86 -277 83 -323 q 90 -187 90 -231 l 90 116 q 90 303 90 177 q 90 491 90 428 q 86 593 90 530 q 82 667 82 655 q 190 659 139 659 q 255 663 214 659 q 305 666 296 666 q 301 506 305 613 q 297 360 297 398 l 297 260 q 315 142 297 189 q 396 95 334 95 q 486 153 466 95 q 507 299 507 211 q 503 517 507 385 q 500 667 500 650 q 619 659 566 659 q 683 663 645 659 q 729 666 722 666 q 723 465 729 594 q 717 322 717 336 "},"\xF7":{x_min:169,x_max:969,ha:1139,o:"m 669 667 q 638 597 669 626 q 566 568 608 568 q 497 597 526 568 q 468 669 468 626 q 497 739 468 710 q 567 769 526 769 q 639 739 610 769 q 669 667 669 710 m 969 474 l 969 342 l 169 342 l 169 474 l 969 474 m 669 144 q 638 73 669 103 q 568 44 608 44 q 497 73 526 44 q 468 142 468 102 q 498 214 468 184 q 568 244 528 244 q 639 216 610 244 q 669 144 669 188 "},h:{x_min:80,x_max:729,ha:808,o:"m 509 683 q 660 626 601 683 q 719 477 719 570 l 719 403 l 719 246 q 720 109 719 148 q 729 0 722 70 q 665 2 709 0 q 617 5 620 5 q 551 2 598 5 q 501 0 505 0 q 510 147 508 73 q 513 333 513 221 l 509 426 q 482 516 503 482 q 411 551 461 551 q 356 534 380 551 q 322 489 332 517 q 306 428 312 462 q 301 331 301 394 q 304 166 301 277 q 308 0 308 55 q 244 3 284 0 q 194 6 204 6 q 129 3 171 6 q 80 0 88 0 q 85 255 80 84 q 91 513 91 426 q 85 769 91 598 q 80 1024 80 940 l 180 1018 l 197 1018 q 308 1023 259 1018 q 304 902 308 976 q 301 815 301 827 l 301 583 q 509 683 379 683 "},".":{x_min:68,x_max:306,ha:375,o:"m 187 221 q 268 186 230 221 q 306 104 306 151 q 270 23 306 61 q 187 -15 235 -15 q 102 18 137 -15 q 68 103 68 51 q 102 186 68 151 q 187 221 137 221 "},\u03C6:{x_min:32,x_max:1012,ha:1044,o:"m 418 388 q 477 605 418 528 q 671 683 537 683 q 913 589 814 683 q 1012 352 1012 495 q 902 94 1012 180 q 612 -7 793 9 q 617 -198 612 -69 q 622 -374 622 -326 l 544 -365 q 471 -366 503 -365 q 404 -373 438 -368 q 411 -183 404 -315 q 418 -5 418 -51 q 359 1 377 0 q 320 8 341 2 q 112 118 193 29 q 32 334 32 206 q 123 568 32 488 q 374 669 215 648 q 381 643 376 656 q 393 612 386 629 q 278 504 311 576 q 246 329 246 431 q 285 142 246 223 q 418 61 325 61 l 418 276 l 418 388 m 612 61 q 707 88 670 66 q 763 157 743 109 q 788 255 782 205 q 794 377 794 305 q 791 450 794 416 q 779 528 788 484 q 748 593 770 572 q 696 614 725 614 q 631 564 650 614 q 612 459 612 515 l 612 276 l 612 61 "},";":{x_min:51.390625,x_max:347,ha:447,o:"m 226 654 q 310 619 274 654 q 347 534 347 584 q 312 450 347 485 q 227 416 277 416 q 142 449 177 416 q 108 534 108 482 q 142 619 108 584 q 226 654 177 654 m 134 120 q 172 203 145 170 q 244 237 200 237 q 313 207 284 237 q 343 137 343 178 q 337 100 343 116 q 319 63 331 84 l 88 -254 l 51 -238 l 134 120 "},f:{x_min:8,x_max:463.5625,ha:425,o:"m 381 1024 q 433 1019 413 1024 q 463 1010 453 1012 q 443 934 456 987 q 419 826 430 880 l 412 826 q 362 862 384 850 q 310 874 339 874 q 233 812 233 874 q 258 729 233 773 q 300 658 284 685 l 317 658 q 354 658 336 658 q 428 665 372 659 l 425 669 l 425 641 q 425 607 425 625 q 425 576 425 590 l 356 583 l 306 583 l 306 273 q 308 166 306 200 q 323 0 310 133 q 258 3 299 0 q 209 6 217 6 q 144 3 185 6 q 92 0 102 0 q 102 127 99 51 q 105 272 105 203 l 105 580 l 56 583 l 8 583 l 9 622 l 9 665 q 52 659 29 660 q 105 658 74 658 q 183 904 105 784 q 381 1024 262 1024 "},"\u201C":{x_min:65.28125,x_max:609.71875,ha:654,o:"m 251 613 q 218 541 243 570 q 154 512 194 512 q 90 537 116 512 q 65 601 65 563 q 87 665 65 634 l 291 949 l 331 933 l 251 613 m 530 613 q 498 542 525 573 q 433 512 472 512 q 371 536 397 512 q 345 598 345 560 q 366 665 345 633 l 570 949 l 609 933 l 530 613 "},A:{x_min:-29.171875,x_max:850,ha:829,o:"m 109 322 q 193 530 143 400 q 278 751 244 660 q 351 949 312 843 l 420 944 l 490 949 q 672 450 584 685 q 850 0 759 215 l 716 4 l 580 0 l 551 91 l 497 259 q 398 261 448 259 q 300 264 348 262 l 202 259 q 112 0 162 134 l 22 4 l -29 0 l 109 322 m 354 368 l 464 368 q 416 509 440 446 q 355 662 393 572 q 243 370 295 519 l 354 368 "},"6":{x_min:40,x_max:716,ha:749,o:"m 463 545 q 646 475 576 545 q 716 293 716 405 q 628 65 716 150 q 398 -19 541 -19 q 133 84 226 -19 q 40 362 40 187 q 160 750 40 590 q 501 911 280 911 q 582 903 544 911 q 670 879 620 895 q 658 812 663 845 q 652 748 652 779 l 643 747 q 579 804 612 784 q 502 825 546 825 q 330 716 383 825 q 278 475 278 608 q 359 528 309 511 q 463 545 409 545 m 383 449 q 297 393 317 449 q 278 257 278 337 q 296 113 278 174 q 381 52 315 52 q 469 110 449 52 q 490 256 490 169 q 469 393 490 337 q 383 449 449 449 "},"\u2018":{x_min:68.0625,x_max:331.9375,ha:374,o:"m 251 613 q 218 540 241 569 q 151 512 194 512 q 92 537 116 512 q 68 599 68 563 q 75 632 68 612 q 90 663 81 652 l 293 949 l 331 935 l 251 613 "},\u03CA:{x_min:-28,x_max:423,ha:396,o:"m 91 126 l 91 543 l 80 666 q 139 661 105 663 q 196 658 173 658 q 264 660 238 658 q 314 666 290 663 q 304 586 307 616 q 301 523 301 557 l 301 113 q 302 72 301 88 q 314 0 304 56 l 195 4 l 81 0 q 87 67 84 30 q 91 126 91 104 m 68 975 q 136 947 108 975 q 164 879 164 919 q 138 811 164 840 q 72 783 112 783 q 2 810 33 783 q -28 879 -28 838 q 0 947 -28 919 q 68 975 27 975 m 328 975 q 395 947 367 975 q 423 879 423 919 q 397 811 423 840 q 331 783 371 783 q 261 810 292 783 q 231 879 231 838 q 258 947 231 919 q 328 975 286 975 "},\u03C0:{x_min:19,x_max:957.890625,ha:965,o:"m 802 521 l 802 108 l 812 0 l 696 4 l 582 0 q 585 61 582 19 q 589 125 589 102 l 594 320 l 589 557 l 504 563 l 421 557 l 421 520 l 421 108 q 432 0 421 55 l 314 4 l 200 0 q 209 64 206 37 q 213 115 213 91 l 213 315 l 213 514 l 213 557 q 129 531 165 557 q 68 461 93 505 l 33 461 q 31 510 33 497 q 19 603 30 523 q 136 645 75 634 q 273 657 196 657 l 531 657 l 792 657 l 957 667 l 955 612 l 957 552 l 803 557 l 802 521 "},\u03AC:{x_min:30,x_max:827.21875,ha:878,o:"m 669 665 l 749 662 l 827 665 q 763 499 782 551 q 720 377 743 447 l 818 0 q 763 6 792 2 q 717 10 733 10 q 662 5 692 10 q 615 0 632 1 l 594 101 q 361 -15 501 -15 q 120 83 210 -15 q 30 334 30 182 q 123 583 30 484 q 368 683 217 683 q 515 647 449 683 q 633 547 582 612 q 651 601 640 563 q 669 665 662 638 m 523 952 q 576 1001 556 986 q 625 1017 596 1017 q 677 994 656 1017 q 698 943 698 972 q 679 896 698 915 q 629 862 660 877 l 406 754 l 337 754 l 523 952 m 383 614 q 313 588 343 614 q 276 523 283 562 q 260 434 265 484 q 256 333 256 385 q 269 174 256 249 q 305 87 275 122 q 385 52 335 52 q 509 144 473 52 q 546 340 546 236 q 522 504 546 428 q 455 597 498 580 q 383 614 411 614 "},O:{x_min:40,x_max:1086,ha:1129,o:"m 577 949 q 945 829 804 949 q 1086 486 1086 710 q 942 114 1086 244 q 552 -15 798 -15 q 176 107 313 -15 q 40 465 40 229 q 188 823 40 697 q 577 949 337 949 m 562 73 q 773 194 706 73 q 840 472 840 315 q 773 742 840 624 q 566 860 706 860 q 353 742 420 860 q 287 465 287 624 q 353 193 287 313 q 562 73 420 73 "},n:{x_min:80,x_max:727,ha:808,o:"m 91 338 q 85 512 91 391 q 80 667 80 632 q 137 661 125 662 q 180 661 149 661 q 249 661 215 661 q 293 666 279 665 l 293 568 q 391 648 333 616 q 508 681 449 681 q 659 624 600 681 q 719 475 719 567 l 719 329 q 723 172 719 287 q 727 0 727 58 q 673 2 709 0 q 617 5 637 5 q 552 2 598 5 q 502 0 506 0 q 507 175 502 58 q 512 333 512 291 l 512 358 q 508 426 512 393 q 483 514 508 476 q 411 552 459 552 q 355 534 379 552 q 318 487 331 517 q 302 419 305 457 q 299 330 299 382 q 304 148 299 264 q 309 0 309 33 q 244 3 285 0 q 195 6 203 6 q 128 3 170 6 q 80 0 86 0 q 85 188 80 65 q 91 338 91 311 "},"3":{x_min:30,x_max:680,ha:749,o:"m 365 908 q 561 853 479 908 q 643 691 643 799 q 593 565 643 612 q 457 485 544 517 l 457 476 q 617 410 555 463 q 680 260 680 356 q 573 50 680 122 q 318 -21 466 -21 q 30 58 155 -21 q 90 161 67 120 q 137 250 113 202 l 154 250 q 185 109 154 167 q 292 51 216 51 q 404 109 367 51 q 442 245 442 167 q 397 376 442 327 q 271 425 353 425 l 231 425 l 231 505 l 268 504 q 392 549 345 504 q 439 670 439 594 q 408 785 439 738 q 313 833 377 833 q 213 776 244 833 q 183 644 183 719 l 170 634 q 121 690 145 665 q 43 767 97 716 q 179 874 94 840 q 365 908 265 908 "},"9":{x_min:30,x_max:705,ha:749,o:"m 281 343 q 98 414 167 343 q 30 601 30 486 q 121 827 30 744 q 359 911 213 911 q 618 801 532 911 q 705 515 705 692 q 583 135 705 291 q 243 -21 461 -21 q 158 -12 193 -21 q 74 9 123 -4 q 87 74 82 42 q 92 140 92 106 l 102 143 q 163 84 127 105 q 243 64 199 64 q 414 172 362 64 q 467 414 467 280 q 386 359 435 376 q 281 343 337 343 m 360 440 q 446 495 426 440 q 467 630 467 551 q 447 775 467 714 q 361 837 427 837 q 274 778 293 837 q 256 631 256 720 q 276 496 256 553 q 360 440 296 440 "},l:{x_min:86,x_max:316,ha:407,o:"m 99 501 q 95 701 99 579 q 92 843 92 823 l 86 1024 q 154 1016 125 1019 q 201 1013 183 1013 q 265 1018 232 1013 q 316 1023 297 1022 q 309 719 316 915 q 303 501 303 523 l 307 180 l 316 0 q 263 5 309 1 q 201 10 218 10 q 138 6 169 10 q 86 0 108 2 q 92 292 86 104 q 99 501 99 480 "},\u03BA:{x_min:80,x_max:732.765625,ha:756,o:"m 184 659 q 306 667 239 659 l 301 509 l 295 461 l 295 389 q 422 510 367 447 q 545 667 478 573 l 618 667 l 709 667 l 714 657 l 628 576 l 475 425 q 552 292 510 364 q 636 154 595 220 l 732 0 q 661 3 706 0 q 607 6 616 6 q 536 3 579 6 q 486 0 493 0 q 386 174 440 83 q 295 329 331 266 l 295 249 q 298 106 295 206 q 301 0 301 6 l 190 4 l 80 0 q 85 127 80 43 q 91 255 91 212 q 85 461 91 323 q 80 666 80 598 l 184 659 "},"4":{x_min:43,x_max:708.265625,ha:749,o:"m 706 383 l 701 299 q 704 248 701 271 q 708 211 706 225 q 592 221 650 221 l 592 176 q 594 83 592 127 q 606 0 597 40 q 540 3 579 0 q 497 6 501 6 q 433 3 473 6 q 384 0 393 0 q 393 104 390 44 q 396 219 396 165 l 309 221 q 169 216 262 221 q 43 212 76 212 l 44 296 l 44 379 q 174 568 113 477 q 287 738 235 658 q 396 909 338 818 q 503 902 444 902 q 553 902 527 902 q 606 909 589 907 q 599 720 606 843 q 592 534 592 596 l 592 370 q 650 375 614 370 q 706 383 686 380 m 396 370 l 396 752 l 141 370 l 396 370 "},p:{x_min:82,x_max:772,ha:825,o:"m 502 683 q 704 574 636 683 q 772 322 772 466 q 701 82 772 179 q 491 -15 630 -15 q 302 85 371 -15 l 302 -71 l 309 -385 q 249 -379 278 -382 q 196 -376 221 -376 q 139 -379 171 -376 q 82 -384 108 -381 q 87 -252 82 -341 q 92 -131 92 -162 l 88 487 l 82 666 q 195 659 141 659 q 235 660 216 659 q 307 666 254 661 q 302 580 302 618 q 391 656 343 630 q 502 683 440 683 m 430 79 q 472 86 453 79 q 515 122 491 94 q 548 204 539 151 q 557 337 557 258 q 532 503 557 431 q 430 576 507 576 q 324 501 350 576 q 298 327 298 427 q 323 152 298 226 q 430 79 349 79 "},\u03C8:{x_min:59,x_max:1025,ha:1064,o:"m 1025 437 q 919 131 1025 249 q 625 -7 813 13 q 630 -190 625 -68 q 636 -374 636 -312 l 558 -365 q 483 -366 516 -365 q 418 -373 451 -368 q 424 -159 418 -297 q 431 -5 431 -22 q 374 0 401 -2 q 271 20 348 2 q 127 124 195 37 q 59 331 59 211 l 60 484 l 59 666 l 168 663 l 277 666 q 269 506 277 619 q 261 358 261 392 q 293 144 261 228 q 431 51 325 60 l 431 253 q 424 572 431 367 q 418 800 418 777 l 536 795 l 636 798 q 630 650 636 748 q 625 501 625 551 l 625 254 l 625 51 q 767 146 726 51 q 808 359 808 241 q 798 498 808 440 q 762 650 788 556 q 867 654 821 650 q 980 666 913 658 q 1025 437 1025 552 "},\u00DC:{x_min:82,x_max:910,ha:997,o:"m 210 927 l 338 931 q 329 643 338 836 q 321 421 321 451 q 360 197 321 284 q 521 110 400 110 q 678 162 609 110 q 756 279 747 214 q 768 420 765 344 q 771 548 771 495 q 756 931 771 755 l 814 927 l 910 931 q 903 770 910 883 q 896 616 896 657 l 896 480 l 896 375 q 794 81 896 178 q 493 -15 692 -15 q 210 56 321 -15 q 100 287 100 128 q 91 619 100 386 q 82 931 82 852 l 210 927 m 394 1242 q 461 1215 433 1242 q 489 1148 489 1189 q 463 1078 489 1107 q 396 1050 437 1050 q 327 1078 355 1050 q 299 1148 299 1107 q 326 1214 299 1186 q 394 1242 354 1242 m 654 1242 q 721 1214 694 1242 q 749 1148 749 1187 q 724 1079 749 1108 q 658 1050 699 1050 q 588 1077 617 1050 q 559 1148 559 1105 q 587 1214 559 1187 q 654 1242 615 1242 "},\u00E0:{x_min:44,x_max:706.78125,ha:706,o:"m 237 -15 q 98 35 153 -15 q 44 169 44 86 q 212 352 44 301 q 401 421 380 403 q 410 439 410 432 q 373 539 410 502 q 275 577 337 577 q 140 511 185 577 l 135 511 l 115 585 q 230 657 164 632 q 365 683 296 683 q 543 623 479 683 q 608 452 608 564 l 604 213 q 604 166 604 184 q 608 123 604 148 q 625 87 612 99 q 658 76 638 76 q 679 80 666 76 q 702 90 691 84 l 706 40 q 643 1 676 14 q 563 -15 610 -10 q 481 5 520 -15 q 421 64 441 26 q 237 -15 351 -15 m 425 755 l 201 863 q 145 902 159 883 q 131 944 131 921 q 153 996 131 975 q 206 1017 175 1017 q 253 1002 232 1017 q 309 953 273 987 l 494 755 l 425 755 m 240 200 q 261 128 240 158 q 321 99 282 99 q 388 131 367 99 q 410 211 410 164 l 410 352 q 287 302 335 338 q 240 200 240 267 "},\u03B7:{x_min:80,x_max:727,ha:808,o:"m 91 339 q 85 512 91 391 q 80 667 80 632 q 137 661 125 662 q 180 661 149 661 q 244 663 199 661 q 293 666 290 666 l 293 568 q 391 651 338 622 q 511 681 443 681 q 660 622 602 681 q 719 471 719 564 l 719 328 l 719 -49 q 723 -219 719 -106 q 727 -373 727 -332 q 618 -365 670 -365 q 502 -373 562 -365 l 512 16 l 512 251 l 512 368 q 491 499 512 446 q 408 552 471 552 q 319 488 342 552 q 302 419 305 457 q 299 330 299 382 q 304 148 299 264 q 309 0 309 33 q 243 3 278 0 q 195 6 207 6 q 127 3 163 6 q 80 0 92 0 q 85 188 80 65 q 91 339 91 311 "}},cssFontWeight:"bold",ascender:1288,underlinePosition:-133,cssFontStyle:"normal",boundingBox:{yMin:-385,xMin:-147,yMax:1288,xMax:1618},resolution:1e3,original_font_information:{postscript_name:"Optimer-Bold",version_string:"Version 1.00 2004 initial release",vendor_url:"http://www.magenta.gr/",full_font_name:"Optimer Bold",font_family_name:"Optimer",copyright:"Copyright (c) Magenta Ltd., 2004.",description:"",trademark:"",designer:"",designer_url:"",unique_font_identifier:"Magenta Ltd.:Optimer Bold:22-10-104",license_url:"http://www.ellak.gr/fonts/MgOpen/license.html",license_description:`Copyright (c) 2004 by MAGENTA Ltd. All Rights Reserved.\r
\r
Permission is hereby granted, free of charge, to any person obtaining a copy of the fonts accompanying this license ("Fonts") and associated documentation files (the "Font Software"), to reproduce and distribute the Font Software, including without limitation the rights to use, copy, merge, publish, distribute, and/or sell copies of the Font Software, and to permit persons to whom the Font Software is furnished to do so, subject to the following conditions: \r
\r
The above copyright and this permission notice shall be included in all copies of one or more of the Font Software typefaces.\r
\r
The Font Software may be modified, altered, or added to, and in particular the designs of glyphs or characters in the Fonts may be modified and additional glyphs or characters may be added to the Fonts, only if the fonts are renamed to names not containing the word "MgOpen", or if the modifications are accepted for inclusion in the Font Software itself by the each appointed Administrator.\r
\r
This License becomes null and void to the extent applicable to Fonts or Font Software that has been modified and is distributed under the "MgOpen" name.\r
\r
The Font Software may be sold as part of a larger software package but no copy of one or more of the Font Software typefaces may be sold by itself. \r
\r
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL MAGENTA OR PERSONS OR BODIES IN CHARGE OF ADMINISTRATION AND MAINTENANCE OF THE FONT SOFTWARE BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM OTHER DEALINGS IN THE FONT SOFTWARE.`,manufacturer_name:"Magenta Ltd.",font_sub_family_name:"Bold"},descender:-385,familyName:"Optimer",lineHeight:1672,underlineThickness:20};var Je=i=>document.getElementById(i),jc=Je("vista"),y3=new ja().parse(ed),zs={perfume:{color:"#7a3b12",material:"vidrio",marca:"AURORA",linea:"Eau de parfum \xB7 50 ml",luz:"lujo",sup:"marmol-negro",acento:"oro",fondo:"#16120e"},caja:{color:"#b9c4b1",material:"satinado",marca:"Aurora",linea:"Crema facial \xB7 50 g",luz:"ventana",sup:"lino",acento:"oro",fondo:"#e7ded3"},cafe:{color:"#1e1a17",material:"mate",marca:"Chanchamayo",linea:"Caf\xE9 de altura \xB7 250 g",luz:"ventana",sup:"madera",acento:"cobre",fondo:"#cfc2b0",calido:!0},plato:{color:"#3a1d12",material:"brillante",marca:"Dulce Lima",linea:"Torta de chocolate",luz:"gourmet",sup:"madera",acento:"oro",fondo:"#3b2a1f"},lata:{color:"#d23b2a",material:"brillante",marca:"Frescura",linea:"Bebida natural \xB7 355 ml",luz:"blanco",sup:"terrazo",acento:"plata",fondo:"#f0c9a8"},logo:{color:"#c9a45c",material:"metal",marca:"AURORA",linea:"",luz:"tecno",sup:"concreto",acento:"oro",fondo:"#1b2330"}},td={"marmol-blanco":{tex:"marmol-blanco",rep:1.6,rough:.9,cc:.8,ccR:.06,normal:!1,tinte:"#ffffff"},"marmol-negro":{tex:"marmol-negro",rep:1.4,rough:.9,cc:.7,ccR:.05,normal:!1,tinte:"#ffffff"},madera:{tex:"madera",rep:1.2,rough:1,cc:.25,ccR:.35,normal:.6,tinte:"#ffffff"},lino:{tex:"lino",rep:3.2,rough:1,cc:0,ccR:0,normal:.8,tinte:"#f3eee6",sheen:1},concreto:{tex:"concreto",rep:1.5,rough:1,cc:0,ccR:0,normal:.5,tinte:"#ffffff"},terrazo:{tex:"terrazo",rep:1.4,rough:.8,cc:.6,ccR:.12,normal:.3,tinte:"#ffffff"}},nd={oro:"#e0bb72",plata:"#d9dde2",cobre:"#d08a5c",negro:"#2a2826"},Zn={lujo:{hdri:"oscuro",envI:.22,exp:1,fondo:"#16120e",clave:["#ffe4c4",2.2,[-4,5.5,3.5]],relleno:["#d9e2ff",.12,[5,2,4]],rims:[["#ffd6a0",4.5,[-3.5,5.2,-3.5]],["#ffffff",3.5,[3.5,5.2,-3.5]]],fondoLuz:["#c79a62",30,[0,3.2,-1]],supK:.8,forms:[[[-3.2,3.2,1.2],[.7,3.4],7],[[3.2,3.2,-.8],[.5,3.4],5],[[0,6,.6],[4,1.2],1.2]],sombra:.55},ventana:{hdri:"ventana",envI:.75,exp:1,fondo:"#e8e1d6",clave:["#fff3e2",3,[-6,4.2,1.2]],relleno:["#eef3ff",.35,[5,2.5,4]],rims:[["#fff1dc",1.2,[2.5,3.5,-5]]],fondoLuz:["#fff3e0",10,[-1.5,3.4,-1]],forms:[[[-5,2.6,.5],[3.2,4.2],4.5],[[4.5,2,2],[1.2,3.5],.8]],sombra:.45},blanco:{hdri:"estudio",envI:.8,exp:1,fondo:"#f1efec",clave:["#ffffff",2.4,[-3.5,6,4]],relleno:["#ffffff",.6,[5,2.5,4]],rims:[["#ffffff",1.8,[-3,5,-4]],["#ffffff",1.6,[3.5,5,-4]]],fondoLuz:["#ffffff",12,[0,3,-1]],forms:[[[0,6,1],[5,3],2.2],[[-4,2,2],[1,4.5],3.5],[[4,2,1.5],[1,4.5],3]],sombra:.32},gourmet:{hdri:"calido",envI:.55,exp:1.02,fondo:"#3b2a1f",clave:["#ffcf98",3.4,[-3,3.6,-3.2]],relleno:["#ffdcb0",.5,[3.5,2,4.5]],rims:[["#ffb46a",3,[3.5,2.6,-4]]],fondoLuz:["#ff9f55",16,[.5,2.8,-1]],forms:[[[-3.5,2.4,-2.5],[2,3.5],5],[[3,2,3],[2.5,2.5],1.2]],sombra:.5},tecno:{hdri:"estudio",envI:.25,exp:1,fondo:"#1b2330",clave:["#e9f1ff",2,[-3.5,5.5,3.5]],relleno:["#7fb4ff",.25,[5,2,4]],rims:[["#59c8ff",5.5,[-4,4.6,-3.5]],["#a58cff",4.5,[4,4.6,-3.5]]],fondoLuz:["#4f86c9",26,[0,3,-1]],supK:.35,forms:[[[-3.4,1.8,-1],[.4,5.5],9,"#7fd6ff"],[[3.4,1.8,-1],[.4,5.5],8,"#b9a6ff"],[[0,6,1.5],[3.5,1],1.5]],sombra:.55}},X={plantilla:"perfume",color:zs.perfume.color,material:"vidrio",marca:"",linea:"",luz:"lujo",sup:"marmol-negro",acento:"oro",fondo:Zn.lujo.fondo,camara:"tres",imagen:null,calidad:"auto",nivel:3,desenfoque:!0,giro:!1,calido:!1},We=new qa({antialias:!1,alpha:!0,preserveDrawingBuffer:!1,powerPreference:"high-performance"});We.toneMapping=xr;We.toneMappingExposure=1;We.outputColorSpace=Ft;We.shadowMap.enabled=!0;We.shadowMap.type=vn;jc.appendChild(We.domElement);var ld=Math.min(8,We.capabilities.getMaxAnisotropy()),vt=new or,q3=new Ss(We),at=new Bt(20,1,.3,80);at.position.set(5,2,9);var Jt=new Ya(at,We.domElement);Jt.enableDamping=!0;Jt.dampingFactor=.09;Jt.minDistance=3;Jt.maxDistance=22;Jt.maxPolarAngle=Math.PI/2-.04;Jt.enablePan=!1;var Ct=new Ni(16777215,2);Ct.castShadow=!0;Ct.shadow.mapSize.set(2048,2048);Object.assign(Ct.shadow.camera,{left:-3.2,right:3.2,top:3.2,bottom:-3.2,near:1,far:22});Ct.shadow.radius=14;Ct.shadow.blurSamples=20;Ct.shadow.bias=-6e-4;Ct.shadow.normalBias=.01;vt.add(Ct,Ct.target);var Kc=new Ni(16777215,.3);vt.add(Kc);var Jc=[new Ni(16777215,0),new Ni(16777215,0)];Jc.forEach(i=>vt.add(i));var ki=new Fa(16777215,0,0,.55,1,0);ki.target.position.set(0,1.6,-7);vt.add(ki,ki.target);var Vc=0;function M3(i=40,e=14,t=-7.5,n=3.2,s=16){let r=[],a=t+n;r.push([e,0]);for(let u=0;u<=24;u++){let f=u/24*Math.PI/2;r.push([a-Math.sin(f)*n,n-Math.cos(f)*n])}r.push([t,s]);let o=[],l=[],c=[];r.forEach(([u,f],p)=>{o.push(-i/2,f,u,i/2,f,u),l.push(0,p/(r.length-1),1,p/(r.length-1))});for(let u=0;u<r.length-1;u++){let f=u*2;c.push(f,f+1,f+2,f+1,f+3,f+2)}let h=new Rt;return h.setAttribute("position",new je(o,3)),h.setAttribute("uv",new je(l,2)),h.setIndex(c),h.computeVertexNormals(),h}var Qc=new pr({color:"#888",roughness:.96,metalness:0,envMapIntensity:.35}),ho=new xt(M3(),Qc);ho.position.y=-.16;ho.receiveShadow=!0;vt.add(ho);var cd=16,hd=10.8,Dt=new mr({color:"#ffffff",roughness:1,metalness:0}),uo=new xt(new Hi(cd,.16,hd,3,.03),Dt);uo.position.set(0,-.08,1.2);uo.receiveShadow=!0;vt.add(uo);var S3=new Ua,ao=new Map;function Oc(i,e){if(ao.has(i))return ao.get(i);let t=S3.load("./"+i,()=>Gt(),void 0,()=>console.warn("sin textura",i));return t.wrapS=t.wrapT=vs,t.anisotropy=ld,e&&(t.colorSpace=Ft),ao.set(i,t),t}function Gc(){let i=td[X.sup]||td.madera,e=t=>(t.repeat.set(i.rep*cd/4,i.rep*hd/4),t);Dt.map=e(Oc(`tex-${i.tex}-color.webp`,!0)),Dt.roughnessMap=e(Oc(`tex-${i.tex}-rough.webp`,!1)),Dt.normalMap=i.normal?e(Oc(`tex-${i.tex}-normal.webp`,!1)):null,i.normal&&Dt.normalScale.set(i.normal,i.normal),Dt.roughness=i.rough,Dt.clearcoat=i.cc,Dt.clearcoatRoughness=i.ccR,Dt.sheen=i.sheen||0,Dt.sheenRoughness=.8,Dt.sheenColor.set("#ffffff"),Dt.color.set(i.tinte),Dt.envMapIntensity=.22,Dt.specularIntensity=.3,Dt.color.multiplyScalar(Zn[X.luz].supK??1),Dt.needsUpdate=!0,Gt()}var Fc=new Map;async function ud(i){if(Fc.has(i))return Fc.get(i);let e=(async()=>{let t=await fetch(`./hdri-${i}.webp`);if(!t.ok)throw new Error("HDRI "+t.status);let n=await createImageBitmap(await t.blob(),{colorSpaceConversion:"none",premultiplyAlpha:"none"}),s=n.width,r=n.height/2,a=document.createElement("canvas");a.width=n.width,a.height=n.height;let o=a.getContext("2d",{willReadFrequently:!0});o.drawImage(n,0,0);let l=o.getImageData(0,0,n.width,n.height).data,c=new Uint16Array(s*r*4),h=Nu.toHalfFloat,u=s*r*4;for(let p=0,g=s*r;p<g;p++){let x=l[u+p*4],m=x?Math.pow(2,x-136):0;c[p*4]=h(Math.min(24,(l[p*4]+.5)*m)),c[p*4+1]=h(Math.min(24,(l[p*4+1]+.5)*m)),c[p*4+2]=h(Math.min(24,(l[p*4+2]+.5)*m)),c[p*4+3]=15360}let f=new lr(c,s,r,tn,At);return f.mapping=nr,f.flipY=!1,f.magFilter=Vt,f.minFilter=Vt,f.generateMipmaps=!1,f.colorSpace=ci,f.needsUpdate=!0,f})();return Fc.set(i,e),e}var $c=new or,Ds=new xt(new Gn(40,64,32),new An({side:zt,toneMapped:!1,color:"#ffffff"}));Ds.scale.x=-1;$c.add(Ds);var Wc=new Yt;$c.add(Wc);var Mr=null,id="";async function dd(){let i=Zn[X.luz],e=X.luz+(X.calido?"c":""),t=null;try{t=await ud(i.hdri)}catch(s){console.warn("HDRI no disponible, uso softboxes",s.message)}if(e===id&&Mr)return;Ds.material.map=t,Ds.material.color.setScalar(t?i.envI:.02),Ds.material.needsUpdate=!0,Ds.rotation.y=i.hdri==="ventana"?-Math.PI/2:0,Wc.clear();for(let[s,[r,a],o,l]of i.forms){let c=new xt(new Pi(r,a),new An({color:l||"#ffffff",toneMapped:!1,side:Xt}));c.material.color.multiplyScalar(o*(X.calido&&!l,1)),X.calido&&!l&&c.material.color.multiply(new Re("#ffd9ae")),c.position.set(...s).multiplyScalar(1.6),c.lookAt(0,1,0),Wc.add(c)}let n=q3.fromScene($c,0,.1,100);Mr&&Mr.dispose(),Mr=n,id=e,vt.environment=Mr.texture,Gt()}var Ar={tam:512,ancho:4,alto:1.6},wr=new pt(Ar.tam,Ar.tam);wr.texture.generateMipmaps=!1;var Xc=new pt(Ar.tam,Ar.tam);Xc.texture.generateMipmaps=!1;var Yn=new oi(-2,2,2,-2,0,Ar.alto);Yn.rotation.x=Math.PI/2;var fd=new Ii({side:Xt});fd.onBeforeCompile=i=>{i.fragmentShader=i.fragmentShader.replace("vec4( vec3( 1.0 - fragCoordZ ), opacity );","vec4( vec3( 0.0 ), pow( 1.0 - fragCoordZ, 1.6 ) );")};var oo=new nt(Qu);oo.depthTest=!1;var lo=new nt($u);lo.depthTest=!1;var so=new Kt,jn=new xt(new Pi(1,1),new An({map:wr.texture,transparent:!0,depthWrite:!1,opacity:.9,side:Xt,toneMapped:!1,color:"#000000"}));jn.material.onBeforeCompile=i=>{i.fragmentShader=i.fragmentShader.replace("#include <map_fragment>","vec4 sampledDiffuseColor = texture2D( map, vMapUv ); diffuseColor = vec4( vec3( 0.0 ), sampledDiffuseColor.a * opacity );")};jn.rotation.x=-Math.PI/2;jn.scale.y=-1;jn.position.y=Vc+.003;jn.renderOrder=2;vt.add(jn);var Rr=!0;function b3(){if(!Lt)return;let i=new ln().setFromObject(Lt.g),e=i.getCenter(new P),t=i.getSize(new P),n=Math.max(t.x,t.z)*1.7+.6;Yn.left=-n/2,Yn.right=n/2,Yn.top=n/2,Yn.bottom=-n/2,Yn.far=Math.max(.6,Math.min(1.6,t.y*.6)),Yn.updateProjectionMatrix(),Yn.position.set(e.x,Vc,e.z),jn.position.set(e.x,Vc+.003,e.z),jn.scale.set(n,-n,1);let s=[];vt.traverse(c=>{(c.isMesh||c.isLine)&&c.visible&&!E3(c)&&(s.push(c),c.visible=!1)});let r=vt.background,a=vt.overrideMaterial,o=We.getClearAlpha();vt.background=null,vt.overrideMaterial=fd,We.setClearColor(0,0),We.setRenderTarget(wr),We.clear(),We.render(vt,Yn),vt.overrideMaterial=a,vt.background=r,s.forEach(c=>{c.visible=!0});let l=[1.2,2.4];for(let c of l)so.material=oo,oo.uniforms.tDiffuse.value=wr.texture,oo.uniforms.h.value=c/256,We.setRenderTarget(Xc),so.render(We),so.material=lo,lo.uniforms.tDiffuse.value=Xc.texture,lo.uniforms.v.value=c/256,We.setRenderTarget(wr),so.render(We);We.setRenderTarget(null),We.setClearColor(0,o),Rr=!1}function E3(i){let e=i;for(;e;){if(Lt&&e===Lt.g)return!0;e=e.parent}return!1}var Fs=new Qa(We),T3=new $a(vt,at),Ls=new Rs(new K(800,600),.07,.35,.96),Sn=new eo(vt,at,{focus:9,aperture:9e-4,maxblur:.007}),w3=new io,A3=new no(800,600),ui=new Cs({uniforms:{tDiffuse:{value:null},uGrano:{value:.022},uVin:{value:.22},uSemilla:{value:0}},vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:`uniform sampler2D tDiffuse; uniform float uGrano, uVin, uSemilla; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSemilla) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; d.x *= 1.15;
      c.rgb *= 1.0 - uVin * smoothstep(0.28, 0.82, length(d));
      float n = h(gl_FragCoord.xy) - 0.5; float l = dot(c.rgb, vec3(0.299,0.587,0.114));
      c.rgb += n * uGrano * (1.0 - l * 0.6); gl_FragColor = c; }`});[T3,Ls,Sn,w3,A3,ui].forEach(i=>Fs.addPass(i));var Cr=i=>new Re(i);function ro(i){let e=Cr(i);return .2126*e.r+.7152*e.g+.0722*e.b}function Wn(i,e,t){return"#"+Cr(i).lerp(Cr(e),t).getHexString()}var rt=i=>new mr(i);function st(i,e,t=0,n=0,s=0,r=!0){let a=new xt(i,e);return a.position.set(t,n,s),a.castShadow=r,a.receiveShadow=!0,a}function dn(i,e){let t=document.createElement("canvas");return t.width=i,t.height=e,[t,t.getContext("2d")]}function sn(i,e=!0,t){let n=new Sa(i);return e&&(n.colorSpace=Ft),n.anisotropy=ld,t&&(n.wrapS=n.wrapT=vs,n.repeat.set(...t)),n}var Bc=null,zc=null;function Hc(){if(Bc)return Bc;let[i,e]=dn(512,512);e.fillStyle="#808080",e.fillRect(0,0,512,512);for(let t=0;t<9e3;t++){let n=Math.random()*512,s=Math.random()*512,r=Math.random()*Math.PI,a=2+Math.random()*9;e.strokeStyle=`rgba(${Math.random()<.5?"255,255,255":"0,0,0"},${.05+Math.random()*.08})`,e.lineWidth=.6,e.beginPath(),e.moveTo(n,s),e.lineTo(n+Math.cos(r)*a,s+Math.sin(r)*a),e.stroke()}return Bc=sn(i,!1,[3,3])}function C3(){if(zc)return zc;let[i,e]=dn(64,1024);for(let t=0;t<1024;t++){let n=120+Math.random()*60;e.fillStyle=`rgb(${n},${n},${n})`,e.fillRect(0,t,64,1)}return zc=sn(i,!1,[1,1])}function hi(i,e=.28,t=!0){let n=rt({color:i,metalness:1,roughness:e,clearcoat:.2,clearcoatRoughness:.2});return t&&(n.roughnessMap=C3(),n.anisotropy=.6,n.anisotropyRotation=Math.PI/2),n}var Ps=()=>nd[X.acento]||nd.oro,R3=[["E3D Playfair","fuente-playfair.woff2"],["E3D Barlow","fuente-barlow-condensed-700.woff2"],["E3D Inter","fuente-inter-400.woff2"]],pd=Promise.all(R3.map(async([i,e])=>{try{let t=await(await fetch("../../comun/"+e)).arrayBuffer(),n=new FontFace(i,t);await n.load(),document.fonts.add(n)}catch{}})),Sr='"E3D Playfair", Georgia, serif',Xn='"E3D Inter", "Helvetica Neue", Arial, sans-serif',kc='"E3D Barlow", "Arial Narrow", sans-serif';function It(i,e,t,n,s,r,a=0){let o=s;do i.font=`${t} ${o}px ${n}`,i.letterSpacing=`${a*o}px`,o-=2;while(i.measureText(e).width>r&&o>8);return o+2}function un(){return(X.marca||zs[X.plantilla].marca).trim()||"Tu marca"}function Is(){return X.linea!==""?X.linea:zs[X.plantilla].linea}function br(i,e,t){let n=X.imagen,s=Math.max(e/n.width,t/n.height);i.drawImage(n,(e-n.width*s)/2,(t-n.height*s)/2,n.width*s,n.height*s)}function P3(i,e=6){return new bs(i.map(([n,s])=>new K(n,s))).getPoints(i.length*e)}function Cn(i,e=96,t=!0){let n=t?P3(i):i.map(([s,r])=>new K(s,r));return new Ts(n,e)}function I3(i){let e=i.toNonIndexed();return e.computeVertexNormals(),e}var D3={perfume(){let i=new Yt,e=.66,t=1.62,n=Cn([[0,0],[e*.86,0],[e*.98,.04],[e,.16],[e*1.005,t*.55],[e*.97,t*.86],[e*.78,t*.97],[.26,t*1],[.2,t+.04],[.2,t+.12],[0,t+.12]],96),s=rt({color:"#ffffff",metalness:0,roughness:.02,transmission:1,thickness:.45,ior:1.5,dispersion:.2,clearcoat:1,clearcoatRoughness:.02,specularIntensity:1,envMapIntensity:1.25});s.attenuationColor.set(Wn(X.color,"#ffffff",.6)),s.attenuationDistance=2,X.material!=="vidrio"&&(s.transmission=0,s.color.set(X.color),s.roughness=X.material==="mate"?.6:.15,s.metalness=X.material==="metal"?1:0);let r=st(n,s,0,0,0);if(r.castShadow=!0,i.add(r),X.material==="vidrio"){let m=e-.075,d=.2,S=t*.78,y=rt({color:X.color,roughness:.4,clearcoat:0,envMapIntensity:.3,emissive:Wn(X.color,"#000000",.25),emissiveIntensity:.18});i.add(st(Cn([[0,d],[m*.9,d],[m,d+.06],[m,S-.03],[m*.97,S],[0,S]],96),y,0,0,0,!1)),i.add(st(new Vn(.018,.018,t-.1,12),rt({color:"#ffffff",roughness:.1,transmission:.6,thickness:.05}),.05,(t-.1)/2+.12,0,!1))}let a=hi(Ps(),.22);i.add(st(Cn([[0,0],[.24,0],[.25,.02],[.25,.1],[.24,.12],[0,.12]],64,!1),a,0,t+.04,0));let o=X.acento==="negro"?rt({color:"#0d0c0b",roughness:.18,clearcoat:1,clearcoatRoughness:.03,flatShading:!0}):Object.assign(hi(Ps(),.16,!1),{flatShading:!0});X.plantilla==="perfume"&&X.color&&ro(X.color)<.04&&X.acento;let l=I3(new Ts([[0,0],[.32,0],[.37,.05],[.37,.54],[.3,.6],[0,.6]].map(([m,d])=>new K(m,d)),8)),c=st(l,o,0,t+.16,0);c.rotation.y=Math.PI/8,i.add(c);let[h,u]=dn(1024,512),f=X.acento==="negro"?"#141210":ro(X.color)>.5&&X.material!=="vidrio"?"#1b1a17":"#f4ead8";if(X.imagen)br(u,1024,512);else{u.textAlign="center",u.textBaseline="middle",u.fillStyle=f;let m=un().toUpperCase();It(u,m,500,Sr,150,900,.18),u.fillText(m,512,220),u.fillRect(472,318,80,3);let d=Is().toUpperCase();d&&(It(u,d,400,Xn,40,860,.3),u.globalAlpha=.85,u.fillText(d,512,380),u.globalAlpha=1)}let p=sn(h),g=rt({map:p,transparent:!0,roughness:.3,metalness:(X.acento==="oro"&&!X.imagen,0),bumpMap:p,bumpScale:1.2,depthWrite:!1}),x=st(new Vn(e*1.008,e*1.008,.62,64,1,!0,-.72,1.44),g,0,.78,0,!1);return x.rotation.y=.42,i.add(x),{g:i,alto:t+.76,foco:1,el:.09}},caja(){let i=new Yt,e=1.05,t=1.55,n=.62,[s,r]=dn(1024,1512);r.fillStyle=X.color,r.fillRect(0,0,1024,1512);let a=ro(X.color)>.45?"#2b2620":"#f5efe6";if(X.imagen)br(r,1024,1512);else{r.textAlign="center",r.fillStyle=a,r.strokeStyle=Ps(),r.lineWidth=4,r.strokeRect(60,60,904,1392),It(r,un(),500,Sr,190,820,.02),r.textBaseline="middle",r.fillText(un(),512,560),r.fillStyle=Ps(),r.fillRect(452,690,120,4);let y=Is();r.fillStyle=a,It(r,y.toUpperCase(),400,Xn,46,800,.28),r.fillText(y.toUpperCase(),512,780),It(r,"HIDRATACI\xD3N PROFUNDA",400,Xn,30,700,.3),r.globalAlpha=.7,r.fillText("HIDRATACI\xD3N PROFUNDA",512,1300),r.globalAlpha=1}let o=y=>rt({color:y?"#ffffff":X.color,map:y||null,roughness:X.material==="mate"?.85:X.material==="brillante"?.3:.55,bumpMap:Hc(),bumpScale:.6,clearcoat:X.material==="brillante"?.8:.1,clearcoatRoughness:.2,sheen:X.material==="satinado"?.6:0,sheenRoughness:.6}),l=o(sn(s)),c=o(null),h=st(new Hi(e,t,n,4,.012),[c,c,c,c,l,c],-.42,t/2,-.25);h.rotation.y=.28,i.add(h);let u=rt({color:"#f6f2ec",roughness:.18,clearcoat:1,clearcoatRoughness:.04,sheen:.2}),f=st(Cn([[0,0],[.5,0],[.56,.03],[.58,.1],[.58,.42],[.55,.46],[.5,.47],[0,.47]],96),u,.62,0,.42);i.add(f);let[p,g]=dn(1024,64);for(let y=0;y<1024;y+=8)g.fillStyle="#9a9a9a",g.fillRect(y,0,4,64),g.fillStyle="#5a5a5a",g.fillRect(y+4,0,4,64);let x=hi(Ps(),.24,!1);x.bumpMap=sn(p,!1),x.bumpScale=1.5,i.add(st(Cn([[0,0],[.57,0],[.6,.02],[.6,.2],[.58,.23],[0,.23]],128),x,.62,.47,.42));let[m,d]=dn(512,512);d.fillStyle="#808080",d.fillRect(0,0,512,512),d.fillStyle="#5a5a5a",d.textAlign="center",d.textBaseline="middle",It(d,un(),500,Sr,110,380),d.fillText(un(),256,256);let S=st(new Aa(.58,96),Object.assign(hi(Ps(),.2,!1),{bumpMap:sn(m,!1),bumpScale:2}),.62,.705,.42,!1);return S.rotation.x=-Math.PI/2,i.add(S),{g:i,alto:t,foco:.68}},cafe(){let i=new Yt,e=.56,t=1.48,n=hi(X.color,X.material==="brillante"?.18:.42,!0);n.metalness=X.material==="mate"||X.material==="satinado"?.35:.9,n.color.set(X.color),i.add(st(Cn([[0,.01],[e-.02,0],[e+.012,.025],[e+.012,.06],[e,.08],[e,t-.1],[e+.014,t-.07],[e+.014,t-.03],[e-.01,t],[0,t]],128,!1),n));let s=hi(Wn(X.color,"#000000",.15),.35,!0);s.metalness=n.metalness,i.add(st(Cn([[0,t+.13],[e-.04,t+.13],[e+.025,t+.1],[e+.03,t+.02],[e+.01,t-.02],[e+0,t-.02]],128),s));let[r,a]=dn(2048,820);a.fillStyle="#c8a77c",a.fillRect(0,0,2048,820);for(let S=0;S<26e3;S++)a.fillStyle=`rgba(${Math.random()<.5?"90,60,30":"240,220,190"},${Math.random()*.12})`,a.fillRect(Math.random()*2048,Math.random()*820,1+Math.random()*3,1);if(X.imagen)br(a,2048,820);else{let y="#2a1d14";a.textAlign="center",a.textBaseline="middle",a.fillStyle=y,It(a,"CAF\xC9 DE ESPECIALIDAD",400,Xn,30,520,.4),a.fillText("CAF\xC9 DE ESPECIALIDAD",1024,160),a.fillRect(864,210,320,2),It(a,un(),600,Sr,150,640),a.fillText(un(),1024,340),a.fillRect(864,450,320,2);let v=Is();It(a,v.toUpperCase(),400,Xn,34,560,.3),a.fillText(v.toUpperCase(),1024,520),It(a,"TOSTADO MEDIO \xB7 NOTAS DE CACAO Y PANELA",400,Xn,24,560,.2),a.globalAlpha=.75,a.fillText("TOSTADO MEDIO \xB7 NOTAS DE CACAO Y PANELA",1024,640),a.globalAlpha=1,a.strokeStyle=y,a.lineWidth=3,a.beginPath(),a.arc(1444,330,82,0,Math.PI*2),a.stroke(),It(a,"100%",600,Xn,40,120),a.fillText("100%",1444,310),It(a,"AR\xC1BICA",400,Xn,22,130,.2),a.fillText("AR\xC1BICA",1444,360)}let o=sn(r),l=rt({map:o,roughness:.88,bumpMap:Hc(),bumpScale:.8,sheen:.3,sheenRoughness:.8}),c=st(new Vn(e+.004,e+.004,.92,128,1,!0),l,0,.66,0,!1);c.rotation.y=Math.PI+.42,i.add(c);let h=new Gn(.06,20,14),u=h.attributes.position;for(let S=0;S<u.count;S++){let y=u.getX(S),v=u.getY(S),D=u.getZ(S),T=Math.exp(-Math.pow(y/.012,2))*(v>0?.022:0);u.setXYZ(S,y,v*.62-T,D*1.3)}h.computeVertexNormals();let f=rt({color:"#3b2314",roughness:.38,clearcoat:.6,clearcoatRoughness:.25}),p=34,g=new cr(h,f,p),x=new Mt,m=7,d=()=>(m=m*16807%2147483647,m/2147483647);for(let S=0;S<p;S++){let y=d()*Math.PI*2,v=Math.sqrt(d())*.55;x.position.set(.95+Math.cos(y)*v*1.3,.035+(v<.25?d()*.06:0),.55+Math.sin(y)*v*.7),x.rotation.set((d()-.5)*.6,d()*Math.PI*2,(d()-.5)*.5),x.scale.setScalar(.85+d()*.3),x.updateMatrix(),g.setMatrixAt(S,x.matrix)}return g.castShadow=!0,g.receiveShadow=!0,i.add(g),{g:i,alto:t+.13,foco:.74}},plato(){let i=new Yt,e=rt({color:"#f5f2ec",roughness:.16,clearcoat:1,clearcoatRoughness:.04});i.add(st(Cn([[0,0],[.9,0],[.95,.02],[1,.035],[1.32,.09],[1.5,.15],[1.53,.165],[1.5,.175],[1.32,.13],[1,.075],[0,.075]],128),e));let t=(O,N)=>Math.sin(O*7+N)*.008+Math.sin(O*13+N*2)*.005,n=(O,N,B,W,k)=>{let ee=new Vn(O,O,B,160,6),V=ee.attributes.position;for(let ae=0;ae<V.count;ae++){let ue=V.getX(ae),ge=V.getZ(ae),Ue=Math.atan2(ge,ue);if(Math.hypot(ue,ge)>.01){let Y=1+t(Ue,k)/O;V.setX(ae,ue*Y),V.setZ(ae,ge*Y)}}return ee.computeVertexNormals(),st(ee,W,0,N+B/2,0)},[s,r]=dn(512,512);r.fillStyle="#808080",r.fillRect(0,0,512,512);for(let O=0;O<5e3;O++)r.fillStyle=Math.random()<.5?"#3a3a3a":"#c0c0c0",r.beginPath(),r.arc(Math.random()*512,Math.random()*512,1+Math.random()*2.5,0,7),r.fill();let a=sn(s,!1,[4,1]),o=rt({color:Wn(X.color,"#5a2e1a",.4),roughness:.92,bumpMap:a,bumpScale:3}),l=rt({color:"#f3e6d3",roughness:.45,sheen:.4,sheenRoughness:.5}),c=rt({color:Wn(X.color,"#1a0c06",.35),roughness:.14,clearcoat:1,clearcoatRoughness:.06}),h=.78,u=.075;[[0,.24,o],[.24,.06,l],[.3,.24,o],[.54,.06,l],[.6,.2,o]].forEach(([O,N,B],W)=>i.add(n(h-(B===l?.012:0),u+O,N,B,W)));let p=u+.8;i.add(st(Cn([[0,p+.05],[h-.04,p+.045],[h+.012,p+.01],[h+.014,p-.06],[0,p-.06]],160),c));let g=3,x=()=>(g=g*16807%2147483647,g/2147483647);for(let O=0;O<26;O++){let N=O/26*Math.PI*2+x()*.12,B=.08+x()*.32,W=st(new wa(.035+x()*.015,B,6,14),c,Math.cos(N)*(h+.012),p-.04-B/2,Math.sin(N)*(h+.012));W.scale.set(1,1,.55),W.lookAt(0,W.position.y,0),i.add(W)}let[m,d]=dn(256,256);d.fillStyle="#b01025",d.fillRect(0,0,256,256);for(let O=0;O<160;O++)d.fillStyle="#e8c86a",d.beginPath(),d.ellipse(Math.random()*256,Math.random()*256,1.6,2.6,Math.random()*3,0,7),d.fill();let S=rt({map:sn(m),roughness:.28,clearcoat:1,clearcoatRoughness:.12}),y=new Gn(.11,32,24);{let O=y.attributes.position;for(let N=0;N<O.count;N++){let B=O.getY(N),W=1-Math.max(0,-B/.11)*.45;O.setX(N,O.getX(N)*W),O.setZ(N,O.getZ(N)*W),O.setY(N,B*1.25)}y.computeVertexNormals()}let v=rt({color:"#2a2f52",roughness:.42,sheen:1,sheenColor:"#8a93c8",sheenRoughness:.3}),D=rt({color:"#3f7f3a",roughness:.45,side:Xt,clearcoat:.4}),T=[[.12,.05,.6,"f"],[-.22,-.12,-.4,"f"],[.3,-.25,1.3,"f"],[-.05,.3,.2,"b"],[.08,-.08,0,"b"],[-.3,.12,0,"b"],[.28,.2,0,"b"],[-.12,-.32,0,"b"],[.4,.02,0,"b"]];for(let[O,N,B,W]of T)if(W==="f"){let k=st(y,S,O,p+.1,N);k.rotation.set(.5,B,.3),i.add(k)}else{let k=st(new Gn(.06,24,16),v,O,p+.1,N);i.add(k)}for(let O=0;O<3;O++){let N=st(new Gn(.09,20,10),D,-.02+O*.07,p+.2,.02-O*.05);N.scale.set(1,.12,.5),N.rotation.set(.3,O*2.1,.4),i.add(N)}let[A,R]=dn(900,560);R.fillStyle="#fbf8f2",R.fillRect(0,0,900,560),X.imagen?br(R,900,560):(R.textAlign="center",R.textBaseline="middle",R.fillStyle="#2a211b",It(R,un(),500,Sr,120,760),R.fillText(un(),450,240),It(R,Is().toUpperCase(),400,Xn,34,700,.25),R.globalAlpha=.75,R.fillText(Is().toUpperCase(),450,360),R.globalAlpha=1);let b=rt({map:sn(A),roughness:.7,bumpMap:Hc(),bumpScale:.5}),q=rt({color:"#fbf8f2",roughness:.7}),C=st(new Hi(.9,.56,.02,2,.008),[q,q,q,q,b,q],1.55,.28,.95);return C.rotation.set(-.14,-.55,0),i.add(C),{g:i,alto:1.05,foco:.5,ancho:3.2,el:.42}},lata(){let i=new Yt,e=.33,t=1.22,n=hi("#d8dbe0",.22,!0);i.add(st(Cn([[0,.05],[.2,.012],[.25,0],[.27,.005],[.3,.035],[e,.1],[e,t-.15],[.3,t-.07],[.275,t-.025],[.272,t],[.262,t+.004],[.255,t-.012],[0,t-.012]],128,!1),n));let[s,r]=dn(2048,1024),a=X.color,o=r.createLinearGradient(0,0,0,1024);if(o.addColorStop(0,Wn(a,"#ffffff",.12)),o.addColorStop(1,Wn(a,"#000000",.18)),r.fillStyle=o,r.fillRect(0,0,2048,1024),X.imagen)br(r,2048,1024);else{let T=ro(a)>.55?"#1d1a16":"#ffffff";r.fillStyle=Wn(a,"#ffffff",.22),r.beginPath(),r.arc(1024,470,300,0,Math.PI*2),r.fill(),r.fillStyle=Wn(a,"#000000",.25),r.fillRect(0,820,2048,204),r.textAlign="center",r.textBaseline="middle",r.fillStyle=T,It(r,un().toUpperCase(),700,kc,230,600,.01),r.fillText(un().toUpperCase(),1024,440);let A=Is().toUpperCase();It(r,A,700,kc,50,560,.16),r.fillText(A,1024,620),It(r,"355 ML",700,kc,42,200,.2),r.fillText("355 ML",1024,920),r.fillText("SIN AZ\xDACAR A\xD1ADIDA",404,920),r.fillText("100% NATURAL",1644,920)}let l=sn(s),c=rt({map:l,metalness:X.material==="metal"?.6:.12,roughness:X.material==="mate"?.55:.32,clearcoat:X.material==="mate"?0:1,clearcoatRoughness:.05}),h=st(new Vn(e+.002,e+.002,t-.27,128,1,!0),c,0,.1+(t-.27)/2+.005,0);h.rotation.y=Math.PI+.42,i.add(h);let u=st(new Ra(.07,.016,10,40),n,0,t+.008,.07,!1);u.rotation.x=-Math.PI/2,u.scale.set(1,1.4,1),i.add(u);let f=rt({color:"#ffffff",transparent:!0,opacity:.22,roughness:.04,clearcoat:1,clearcoatRoughness:.02,depthWrite:!1}),p=11,g=()=>(p=p*16807%2147483647,p/2147483647),x=new Gn(1,14,10),m=46,d=new cr(x,f,m),S=new Mt;for(let T=0;T<m;T++){let A=-1.5+g()*3,R=.18+g()*(t-.4),b=.007+Math.pow(g(),3)*.016;S.position.set(Math.sin(A)*e,R,Math.cos(A)*e),S.lookAt(0,R,0),S.scale.set(b,b*1.25,b*.45),S.updateMatrix(),d.setMatrixAt(T,S.matrix)}i.add(d);let[y,v]=dn(512,512);v.fillStyle="#f2e6b0",v.beginPath(),v.arc(256,256,250,0,7),v.fill(),v.fillStyle="#f5c242",v.beginPath(),v.arc(256,256,228,0,7),v.fill(),v.strokeStyle="#f8edc8",v.lineWidth=10;for(let T=0;T<10;T++){let A=T/10*Math.PI*2;v.beginPath(),v.moveTo(256,256),v.lineTo(256+Math.cos(A)*228,256+Math.sin(A)*228),v.stroke()}let D=st(new Vn(.28,.28,.05,64),[rt({color:"#e9b630",roughness:.4}),rt({map:sn(y),roughness:.25,clearcoat:1,transmission:0}),rt({map:sn(y),roughness:.3})],.62,.025,.42);return D.rotation.set(0,.4,0),i.add(D),{g:i,alto:t,foco:.62,el:.1}},logo(){let i=new Yt,t=un().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^\x20-\x7E]/g,"").slice(0,16)||"MARCA",n=new Za(t,{font:y3,size:.62,depth:.2,curveSegments:12,bevelEnabled:!0,bevelThickness:.025,bevelSize:.012,bevelSegments:6});n.computeBoundingBox(),n.center();let s=n.boundingBox,r=s.max.x-s.min.x,a=s.max.y-s.min.y,o=Math.min(1.1,3.4/r),l;X.material==="vidrio"?(l=rt({color:"#ffffff",transmission:1,thickness:.4,roughness:.04,ior:1.5,dispersion:.3}),l.attenuationColor.set(X.color),l.attenuationDistance=.8):X.material==="metal"?l=hi(X.color,.2,!0):l=rt({color:X.color,roughness:X.material==="mate"?.7:.25,clearcoat:X.material==="brillante"?1:.3,clearcoatRoughness:.08});let c=st(n,l,0,.14+a*o/2,0);c.scale.setScalar(o),i.add(c);let h=rt({color:"#141414",roughness:.3,clearcoat:1,clearcoatRoughness:.08});return i.add(st(new Hi(r*o+.5,.14,.7,3,.03),h,0,.07,0)),{g:i,alto:a*o+.14,foco:.14+a*o/2,ancho:r*o+.5}}},Lt=null;function L3(i){i.traverse(e=>{e.geometry&&e.geometry.dispose(),(Array.isArray(e.material)?e.material:e.material?[e.material]:[]).forEach(n=>{n.map&&!ao.has(n.map.name)&&n.map.dispose(),n.dispose()})})}function fi(){Lt&&(vt.remove(Lt.g),L3(Lt.g)),Lt=D3[X.plantilla](),vt.add(Lt.g),Rr=!0,Gt()}pd.then(()=>{Lt&&fi()});function md(){let i=Zn[X.luz],e=X.calido?Cr("#ffe0b8"):Cr("#ffffff"),t=(a,[o,l,c])=>{a.color.set(o).multiply(e),a.intensity=l,a.position.set(...c)};t(Ct,i.clave),t(Kc,i.relleno),Ct.target.position.set(0,.6,0),Jc.forEach((a,o)=>{i.rims[o]?t(a,i.rims[o]):a.intensity=0});let[n,s,r]=i.fondoLuz;ki.color.set(n).multiply(e),ki.intensity=s*.1,ki.position.set(...r),We.toneMappingExposure=i.exp,gd(),dd(),Gt()}function gd(){Qc.color.set(X.fondo),Gt()}var Mn=null;function U3(){let i=new ln().setFromObject(Lt.g),e=i.getSize(new P),t=i.getCenter(new P),n=zi.degToRad(at.fov),s=Math.max(.6,at.aspect);return{d:Math.max(e.y*1.7,Math.max(e.x,e.z)*1.35/s)/2/Math.tan(n/2),c:t,s:e}}function N3(i){let{d:e,c:t,s:n}=U3(),s=new P(t.x,t.y+n.y*.06,t.z);if(i==="frente")return[new P(t.x,s.y+e*.08,t.z+e),s];if(i==="cenital"){let o=Math.max(n.x,n.z)*1.6/2/Math.tan(zi.degToRad(at.fov)/2)/Math.min(1,at.aspect);return[new P(t.x,o,t.z+.02),new P(t.x,0,t.z)]}let r=.42,a=Lt.el??.2;return[new P(t.x+Math.sin(r)*Math.cos(a)*e,s.y+Math.sin(a)*e,t.z+Math.cos(r)*Math.cos(a)*e),s]}function eh(i,e){let[t,n]=N3(i);if(Jt.maxPolarAngle=i==="cenital"?Math.PI/2:Math.PI/2-.04,at.filmOffset=i==="cenital"?0:.09*at.getFilmWidth()*2*Math.tan(zi.degToRad(at.fov/2))*at.aspect/Math.max(1,at.aspect),at.updateProjectionMatrix(),e){at.position.copy(t),Jt.target.copy(n),Jt.update(),Mn=null,Gt();return}Mn={p0:at.position.clone(),t0:Jt.target.clone(),p1:t,t1:n,ini:performance.now(),dur:650}}var O3={3:"alta",2:"media",1:"ligera"};function Vi(i){X.nivel=i,Ls.enabled=i>=3,Sn.enabled=X.desenfoque&&i>=2,ui.enabled=i>=2,Ct.castShadow=i>=2;let e=i>=3?2048:1024;Ct.shadow.mapSize.x!==e&&(Ct.shadow.mapSize.set(e,e),Ct.shadow.map&&(Ct.shadow.map.dispose(),Ct.shadow.map=null)),th(),Je("nivel").textContent="Calidad "+O3[i]+(X.calidad==="auto"?" \xB7 autom\xE1tica":"")}var Er=[],Tr=0,sd=0;function F3(i){if(X.calidad==="auto"&&(Tr&&i-Tr<250&&Er.push(i-Tr),Tr=i,Er.length>=30&&i>sd)){let e=Er.reduce((t,n)=>t+n,0)/Er.length;Er.length=0,e>36&&X.nivel>1&&(Vi(X.nivel-1),sd=i+1500)}}var Us=0,Ns=0;function th(){let i=jc.getBoundingClientRect();Us=Math.max(200,Math.floor(i.width)),Ns=Math.max(160,Math.floor(i.height));let e=X.nivel>=3?Math.min(window.devicePixelRatio||1,2):X.nivel===2?Math.min(window.devicePixelRatio||1,1.25):1;We.setPixelRatio(e),We.setSize(Us,Ns,!1),We.domElement.style.width="100%",We.domElement.style.height="100%",Fs.setPixelRatio(e),Fs.setSize(Us,Ns),at.aspect=Us/Ns,at.updateProjectionMatrix(),Lt&&!Mn&&B3(),Gt()}var rd=0;function B3(){clearTimeout(rd),rd=setTimeout(()=>{at.filmOffset=X.camara==="cenital"?0:.09*at.getFilmWidth()*2*Math.tan(zi.degToRad(at.fov/2))*at.aspect/Math.max(1,at.aspect),at.updateProjectionMatrix(),Gt()},50)}new ResizeObserver(()=>th()).observe(jc);var Yc=!0;function Gt(){Yc=!0}Jt.addEventListener("change",Gt);function Bs(){Rr&&b3(),Sn.uniforms.focus.value=at.position.distanceTo(Jt.target),Sn.uniforms.aperture.value=55e-5*(9/Math.max(3,Sn.uniforms.focus.value)),ui.uniforms.uSemilla.value=(ui.uniforms.uSemilla.value+1.37)%100,Fs.render()}function xd(i){requestAnimationFrame(xd);let e=!1;if(Mn){let n=Math.min(1,(i-Mn.ini)/Mn.dur),s=n<.5?4*n*n*n:1-Math.pow(-2*n+2,3)/2;at.position.lerpVectors(Mn.p0,Mn.p1,s),Jt.target.lerpVectors(Mn.t0,Mn.t1,s),n>=1&&(Mn=null),e=!0}X.giro&&Lt&&(Lt.g.rotation.y+=.005,Rr=!0,e=!0);let t=Jt.update();(e||t||Yc)&&(Yc=!1,Bs(),e||t?F3(i):Tr=0)}async function Zc(i,e){let t=We.capabilities.maxTextureSize||4096,n=Math.round(Us*i),s=Math.round(Ns*i),r=Math.min(4096,t),a=Math.min(1,r/Math.max(n,s));n=Math.round(n*a),s=Math.round(s*a);let o=We.getPixelRatio();We.setPixelRatio(1),We.setSize(n,s,!1);let l,c=e?[ho,uo]:[];try{c.forEach(p=>{p.visible=!1}),e&&We.setClearColor(0,0),Fs.setPixelRatio(1),Fs.setSize(n,s);let h=Sn.enabled,u=ui.enabled,f=Ls.enabled;e&&(Sn.enabled=!1,ui.enabled=!1,Ls.enabled=!1),e?We.render(vt,at):(Sn.enabled=X.desenfoque,ui.enabled=!0,Ls.enabled=!0,Bs()),Sn.enabled=h,ui.enabled=u,Ls.enabled=f,l=await new Promise(p=>We.domElement.toBlob(p,"image/png"))}finally{c.forEach(h=>{h.visible=!0}),We.setPixelRatio(o),th(),Vi(X.nivel),Bs()}return{blob:l,w:n,h:s}}var z3=i=>i.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,""),H3=[["perfume",/perfum|fragancia|colonia|eau de|esencia|aroma/],["cafe",/\bcafe\b(?! (oscuro|claro))|cafeter|espresso|tostad|grano/],["postres",/postre|torta|pastel|keke|queque|cheesecake|reposter|dulce|chocolate|brownie|pie\b|tarta/],["comida",/comida|plato|restaurant|cevich|menu|almuerzo|hamburg|pizza|gourmet|cocina/],["bebidas",/bebida|refresco|gaseosa|jugo|energiz|cerveza|agua|limonada|kombucha|lata|soda|te helado/],["cosmetica",/cosmet|crema|serum|piel|facial|skin|maquill|labial|belleza|spa|shampoo|jabon/],["moda",/moda|ropa|zapat|joya|reloj|cartera|bolso|accesorio|boutique/],["tecnologia",/tecnolog|app|software|gadget|audifon|celular|startup|digital|ia\b|robot|electron/],["servicios",/servicio|consultor|agencia|estudio|clinica|abogad|contador|academia|curso|escuela/],["empresa",/empresa|marca|logo|corporat|compania|negocio|sac\b|eirl/]],k3=[["lujo",/lujo|premium|exclusiv|elegant|arabe|oro|dorad|sofistic|prestig|alta gama|noche/],["minimal",/minimal|simple|limpi|blanco y|nordic|escandin|sobrio/],["natural",/natural|organic|eco|vegano|hierba|botanic|verde|fresco|sostenib|bambu/],["vibrante",/vibrant|colorid|alegre|juvenil|divertid|neon|pop|tropical|energ/],["retro",/retro|vintage|clasic|antigu|abuel|años 70|años 80|nostalg/],["tecnologico",/tecnolog|futur|moderno|digital|frio|cyber|innova|ia\b/],["artesanal",/artesan|casero|hecho a mano|tradicion|andino|chanchamayo|cusco|origen|campo|rustic|selva|altura/],["corporativo",/corporat|profesional|serio|empresa|confian|institu|banco/]],V3=[[/dorad|oro\b|gold/,"#c9a24f","oro"],[/platead|plata|cromad/,"#c8ccd2","plata"],[/cobre|bronce/,"#b8734a","cobre"],[/negro|black|oscuro/,"#121110","negro"],[/blanco|white|marfil/,"#f1ede6"],[/rojo|carmesi|granate/,"#b3182c"],[/rosa|rosad|fucsia/,"#e7a1b0"],[/morad|lila|violeta|purpura/,"#6a3d8f"],[/azul|marino|celeste/,"#1f4f8f"],[/turquesa|aqua|menta/,"#3fb6a8"],[/verde|oliva|esmeralda/,"#2f6b45"],[/amarill|mostaza/,"#e8b923"],[/naranja|mandarina|coral/,"#e46a2e"],[/beige|crema\b|arena|nude/,"#e3d3bd"],[/marron|chocolate|cafe oscuro|terracota/,"#5a3220"]],ad={lujo:{luz:"lujo",sup:"marmol-negro",fondo:"#16120e",acento:"oro"},minimal:{luz:"blanco",sup:"marmol-blanco",fondo:"#efedea",acento:"plata"},natural:{luz:"ventana",sup:"lino",fondo:"#e4ddd0",acento:"oro"},vibrante:{luz:"blanco",sup:"terrazo",fondo:"#f2b9a0",acento:"plata"},retro:{luz:"gourmet",sup:"terrazo",fondo:"#d9a066",acento:"cobre"},tecnologico:{luz:"tecno",sup:"concreto",fondo:"#1b2330",acento:"plata"},artesanal:{luz:"ventana",sup:"madera",fondo:"#cfc2b0",acento:"cobre",calido:!0},corporativo:{luz:"blanco",sup:"concreto",fondo:"#dfe3e8",acento:"plata"}},od={perfume:["perfume","lujo"],cosmetica:["caja","natural"],moda:["caja","minimal"],comida:["plato","artesanal"],postres:["plato","gourmet"],cafe:["cafe","artesanal"],bebidas:["lata","vibrante"],tecnologia:["logo","tecnologico"],servicios:["logo","corporativo"],empresa:["logo","corporativo"]};function G3(i){let e=z3(i||"");if(window.clasificarRubroEstilo)try{let r=window.clasificarRubroEstilo(i);if(r&&r.rubro)return r}catch{}let t=(H3.find(([,r])=>r.test(e))||[])[0]||"empresa",n=(k3.find(([,r])=>r.test(e))||[])[0],s=V3.filter(([r])=>r.test(e));return{rubro:t,estilo:n,colores:s}}function vd(i){let{rubro:e,estilo:t,colores:n}=G3(i),[s,r]=od[e]||od.empresa,a=t||(e==="postres"?null:r),o=zs[s],l={plantilla:s,color:o.color,material:o.material,luz:o.luz,sup:o.sup,acento:o.acento,fondo:Zn[o.luz].fondo,calido:!!o.calido};a&&ad[a]&&Object.assign(l,{calido:!1},ad[a],a==="lujo"?{fondo:Zn.lujo.fondo}:{}),e==="postres"&&!t&&Object.assign(l,{luz:"gourmet",sup:"madera",fondo:Zn.gourmet.fondo});let c=n.filter(u=>u[2]&&u[2]!=="negro"),h=n.filter(u=>!u[2]||u[2]==="negro");if(c[0]&&(l.acento=c[0][2]),h[0]){let u=h[0][1];s==="perfume"&&h[0][2]==="negro"&&(u="#4a2a0c",l.sup="marmol-negro"),s!=="plato"&&(l.color=u)}else c[0]&&s==="perfume"&&(l.color="#a8641c");return s==="logo"&&c[0]&&(l.material="metal",l.color=c[0][1]),{op:l,rubro:e,estilo:a||(e==="postres"?"gourmet":r)}}function Os(i,e){document.querySelectorAll(`[data-g="${i}"] button`).forEach(t=>t.setAttribute("aria-pressed",String(t.dataset.v===e)))}function W3(){["plantilla","material","luz","sup","acento","camara"].forEach(e=>Os(e,X[e])),Je("color").value=X.color,Je("colorFondo").value=X.fondo;let i=zs[X.plantilla];Je("marca").placeholder=i.marca,Je("linea").placeholder=i.linea||"Sin l\xEDnea secundaria",Je("linea").disabled=X.plantilla==="logo"}function fo(i){let e=i.plantilla&&i.plantilla!==X.plantilla;if(i.plantilla){let t=zs[i.plantilla],n={color:t.color,material:t.material,luz:t.luz,sup:t.sup,acento:t.acento,fondo:t.fondo,calido:!!t.calido};Object.assign(X,e?n:{},i)}else Object.assign(X,i);i.calidad&&Vi(i.calidad==="auto"?3:+i.calidad),"desenfoque"in i&&(Je("desenfoque").checked=X.desenfoque,Sn.enabled=X.desenfoque&&X.nivel>=2),Gc(),md(),fi(),eh(X.camara,!0),W3()}function X3(i){fo({plantilla:i,marca:"",linea:""}),Je("marca").value="",Je("linea").value=""}document.querySelectorAll("[data-g] button").forEach(i=>{i.type="button",i.addEventListener("click",()=>{let e=i.parentElement.dataset.g,t=i.dataset.v;if(e==="plantilla")return X3(t);if(e==="escala")return Os("escala",t);if(e==="calidad"){X.calidad=t,Os("calidad",t),Vi(t==="auto"?3:+t),Gt();return}X[e]=t,Os(e,t),e==="material"||e==="acento"?fi():e==="sup"?Gc():e==="luz"?(X.fondo=Zn[t].fondo,X.calido=!1,Je("colorFondo").value=X.fondo,md(),Gc()):e==="camara"&&eh(t)})});var co=0;Je("color").addEventListener("input",i=>{X.color=i.target.value,clearTimeout(co),co=setTimeout(fi,60)});Je("colorFondo").addEventListener("input",i=>{X.fondo=i.target.value,gd()});for(let i of["marca","linea"])Je(i).addEventListener("input",e=>{X[i]=e.target.value,clearTimeout(co),co=setTimeout(fi,250)});Je("desenfoque").addEventListener("change",i=>{X.desenfoque=i.target.checked,Sn.enabled=X.desenfoque&&X.nivel>=2,Gt()});Je("giro").addEventListener("change",i=>{X.giro=i.target.checked,!X.giro&&Lt&&(Lt.g.rotation.y=0,Rr=!0,Gt())});function nh(){let i=Je("describe").value.trim();if(!i){di("Escribe qu\xE9 vendes y c\xF3mo lo imaginas, por ejemplo \xABperfume \xE1rabe de lujo, dorado y negro\xBB.");return}let e=vd(i);fo(e.op);let t={lujo:"Lujo oscuro",ventana:"Luz de ventana",blanco:"Estudio blanco",gourmet:"C\xE1lido gourmet",tecno:"Tecnol\xF3gico fr\xEDo"};Je("lectura").textContent=`Rubro: ${e.rubro} \xB7 estilo: ${e.estilo} \u2192 ${t[X.luz]}${X.calido?" c\xE1lida":""}, ${X.sup.replace("-"," ")}, acento ${X.acento}.`}Je("aplicarDesc").addEventListener("click",nh);Je("describe").addEventListener("keydown",i=>{i.key==="Enter"&&(i.preventDefault(),nh())});Je("imagen").addEventListener("change",i=>{let e=i.target.files&&i.target.files[0];if(!e)return;if(e.size>8*1024*1024){di("La imagen pesa m\xE1s de 8 MB: usa una m\xE1s liviana.");return}let t=new FileReader;t.onload=()=>{let n=new Image;n.onload=()=>{X.imagen=n,Je("quitar").hidden=!1,fi(),di("Etiqueta cambiada por tu imagen.")},n.onerror=()=>di("No pude leer esa imagen: prueba con PNG, JPG o WebP."),n.src=t.result},t.readAsDataURL(e)});Je("quitar").addEventListener("click",()=>{X.imagen=null,Je("imagen").value="",Je("quitar").hidden=!0,fi()});function di(i){let e=Je("aviso");e.textContent=i,clearTimeout(di.t),di.t=setTimeout(()=>{e.textContent=""},5e3)}Je("descargar").addEventListener("click",async()=>{let i=Je("descargar");i.disabled=!0;let e=i.textContent;i.textContent="Renderizando\u2026";try{let t=+document.querySelector('[data-g="escala"] [aria-pressed="true"]').dataset.v,{blob:n,w:s,h:r}=await Zc(t,Je("transparente").checked);if(!n)throw new Error("sin imagen");let a=URL.createObjectURL(n),o=document.createElement("a");o.href=a,o.download=`estudio3d-${X.plantilla}-${s}x${r}.png`,document.body.appendChild(o),o.click(),o.remove(),setTimeout(()=>URL.revokeObjectURL(a),4e3),di(`Descargado: ${s} \xD7 ${r} px.`)}catch{di("No se pudo exportar a ese tama\xF1o: prueba con 2x.")}finally{i.disabled=!1,i.textContent=e}});window.estudio3d={async set(i){fo(i),await pd;try{await ud(Zn[X.luz].hdri)}catch{}return await dd(),await new Promise(e=>setTimeout(e,30)),fi(),eh(X.camara,!0),Bs(),{nivel:X.nivel,w:Us,h:Ns}},describir(i){return Je("describe").value=i,nh(),vd(i)},png(){return Bs(),We.domElement.toDataURL("image/png")},async pngExport(i){let e=await Zc(i,!1);return await new Promise(t=>{let n=new FileReader;n.onload=()=>t(n.result),n.readAsDataURL(e.blob)})},async exportar(i,e){let t=await Zc(i,e);return{w:t.w,h:t.h,bytes:t.blob?t.blob.size:0}},estado:()=>({...X,imagen:!!X.imagen}),_interno:{clave:Ct,relleno:Kc,rims:Jc,luzFondo:ki,supMat:Dt,cicloMat:Qc,contacto:jn,scene:vt,invalidar:()=>Gt()}};Vi(3);fo({plantilla:"perfume"});Os("calidad","auto");Os("escala","2");Je("desenfoque").checked=!0;requestAnimationFrame(xd);(function(){let e=0,t=0,n=s=>{if(X.calidad!=="auto")return;if(e===4&&(t=s),e<24){e++,Bs(),requestAnimationFrame(n);return}let r=(s-t)/20;r>55?Vi(1):r>30&&Vi(2),Gt()};setTimeout(()=>requestAnimationFrame(n),400)})();document.documentElement.dataset.listo="1";
/*! Bundled license information:

three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2024 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
