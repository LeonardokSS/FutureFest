const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const systemPrompt = `
Você é um assistente virtual da BioEnergy, uma empresa especializada em energia limpa a partir de biomassa.
Ajude visitantes com informações sobre:
- Serviços (consultoria, instalação, manutenção, capacitação, sustentabilidade)
- A empresa e sua missão
- Energia renovável e práticas ambientais
Responda de forma educada, informativa e objetiva em português.
De preferencia de respostas nao muito grandes para nao ficar uma coisa ruim de ler
`;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/api/chat", async (req, res) => {
  const { text } = req.body;
  try {
    const prompt = `${systemPrompt}\n\nUsuário: ${text}\nAssistente:`;
    const result = await model.generateContent(prompt);
    const reply = result.response.text().trim();
    res.json({ reply });
  } catch (err) {
    console.error("Erro:", err);
    res.status(500).json({ reply: "Desculpe, houve um erro ao processar sua mensagem." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
