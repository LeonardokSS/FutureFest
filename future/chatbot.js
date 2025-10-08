async function enviarPergunta() {
  const input = document.getElementById("chat-input");
  const log = document.getElementById("chat-log");
  const pergunta = input.value.trim();
  if (!pergunta) return;

  adicionarMensagem("Você", pergunta);
  input.value = "";

  try {
    const resposta = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta })
    }).then(res => res.json());

    adicionarMensagem("BioEnergy IA", resposta.resposta);
  } catch (error) {
    adicionarMensagem("BioEnergy IA", "Desculpe, houve um erro ao conectar com a IA.");
  }
}

function adicionarMensagem(remetente, texto) {
  const log = document.getElementById("chat-log");
  const msg = document.createElement("div");
  msg.innerHTML = `<strong>${remetente}:</strong> ${texto}`;
  log.appendChild(msg);
  log.scrollTop = log.scrollHeight;
}
