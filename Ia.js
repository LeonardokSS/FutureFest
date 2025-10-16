const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Caminho do arquivo de histórico
const historico = path.join(__dirname, "historico.json");

// Garante que o arquivo exista
if (!fs.existsSync(historico)) {
  fs.writeFileSync(historico, JSON.stringify([]));
}

// Prompt base (identidade da IA)
const systemPrompt = `
Você é um assistente virtual da BioEnergy, uma empresa especializada em energia limpa a partir de biomassa.
Seu papel é ajudar os visitantes a escolher os melhores produtos e serviços da empresa, além de responder dúvidas sobre biomassa, energia renovável e sustentabilidade.

Siga estas diretrizes:

Fale sempre em português.
Seja educado, direto e claro.
Dê respostas curtas e objetivas, evitando textos longos.
Forneça informações sobre:
- Serviços (consultoria, instalação, manutenção, capacitação e sustentabilidade)
- A empresa e sua missão
- Energia renovável, biomassa e práticas ambientais

Seu objetivo é oferecer um atendimento simples, rápido e informativo, ajudando o cliente a entender as soluções da BioEnergy e tomar boas decisões.
`;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/api/chat", async (req, res) => {
  const { text } = req.body;

  try {
    // 1. Lê o histórico
    const lerHistorico = JSON.parse(fs.readFileSync(historico, "utf8"));

    // 2. Adiciona a nova mensagem do usuário
    lerHistorico.push({ role: "user", content: text });

    // 3. Monta o histórico em formato de texto para o modelo
    const conversa = lerHistorico
      .map((msg) => `${msg.role === "user" ? "Usuário" : "Assistente"}: ${msg.content}`)
      .join("\n");

    const prompt = `${systemPrompt}\n\n${conversa}\nAssistente:`;

    // 4. Envia o histórico para o modelo
    const result = await model.generateContent(prompt);
    const reply = result.response.text().trim();

    // 5. Salva a resposta no histórico
    lerHistorico.push({ role: "assistant", content: reply });
    fs.writeFileSync(historico, JSON.stringify(lerHistorico, null, 2));

    // 6. Retorna a resposta
    res.json({ reply });
  } catch (err) {
    console.error("Erro:", err);
    res.status(500).json({ reply: "Desculpe, houve um erro ao processar sua mensagem." });
  }
});

// Endpoint opcional para limpar o histórico
app.post("/api/clear-lerHistorico", (req, res) => {
  fs.writeFileSync(historico, JSON.stringify([]));
  res.json({ message: "Histórico apagado com sucesso." });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
