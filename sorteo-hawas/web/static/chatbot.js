// Chatbot JMD — widget flotante que habla con POST /api/chat y conoce cursos/premios/canje
(function(){
  const $ = (s, r=document)=>r.querySelector(s);
  const panel = $("#cb-panel"), launcher = $("#cb-launcher"), msgs = $("#cb-msgs"), form = $("#cb-form"), input = $("#cb-input");
  const closeBtn = $("#cb-close");
  if(!panel) return;
  let busy=false;
  const esc = s=>String(s??"").replace(/[&<>"]/g,c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
  const fmt = t=> esc(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
  function add(texto, quien="bot", extra){
    const d=document.createElement("div");
    d.className="cb-m "+quien;
    if(quien==="bot") d.innerHTML = fmt(texto);
    else d.textContent = texto;
    msgs.appendChild(d);
    if(extra && extra.sugerencias){
      const ch=document.createElement("div"); ch.className="cb-chips";
      extra.sugerencias.slice(0,6).forEach(s=>{
        const b=document.createElement("button"); b.type="button"; b.textContent=s;
        b.onclick=()=>ask(s);
        ch.appendChild(b);
      });
      msgs.appendChild(ch);
    }
    msgs.scrollTop = msgs.scrollHeight;
  }
  async function ask(texto){
    texto=String(texto||"").trim();
    if(!texto||busy) return;
    busy=true; input.value="";
    add(texto,"yo");
    const typ=document.createElement("div"); typ.id="cb-typing"; typ.innerHTML="<i></i><i></i><i></i>"; msgs.appendChild(typ); msgs.scrollTop=msgs.scrollHeight;
    try{
      const r=await fetch("api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({texto})});
      const j=await r.json();
      typ.remove();
      if(!r.ok) throw new Error(j.error||"Error");
      add(j.texto||"Aquí estoy.", "bot", j);
      if(j.cursos){ /* opcional: no rompe layout */ }
    }catch(e){
      typ.remove();
      add("No pude conectarme ("+e.message+"). Intenta de nuevo.", "bot");
    }finally{ busy=false; msgs.scrollTop=msgs.scrollHeight; }
  }
  form.addEventListener("submit", e=>{ e.preventDefault(); ask(input.value); });
  launcher.addEventListener("click", ()=>{ panel.hidden=!panel.hidden; if(!panel.hidden) input.focus(); });
  closeBtn.addEventListener("click", ()=> panel.hidden=true);
  // chips iniciales abren preguntas
  document.addEventListener("click", e=>{
    const b=e.target.closest("[data-ask]");
    if(b) ask(b.dataset.ask);
  });
  // mensaje bienvenida
  add("¡Hola! Soy el asistente de JMD 🤖\nPregúntame por **cursos, precio, fechas, sorteo o tu cupón**. También te ayudo a canjear.", "bot", {sugerencias:["¿Qué cursos hay?","¿Cómo funciona el sorteo?","¿Cómo canjeo mi cupón?","Precio y fechas"]});
  // abrir con ?chat=1
  if(new URLSearchParams(location.search).get("chat")==="1") panel.hidden=false;
  window.JMDChat={ask, open:()=>panel.hidden=false};
})();
