const express = require("express");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static("public"));

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const systemPrompt = `
Você é um assistente da empresa BioEnergy.
Sua função é ajudar clientes a escolher o serviço mais adequado de acordo com a descrição da fazenda.

Contexto:
- Serviço 1 → indicado para fazendas de tamanho médio
- Serviço 2 → indicado para fazendas pequenas
- Serviço 3 → indicado para fazendas grandes
- Serviço 4 → indicado quando o cliente fala em biomassa, resíduos ou orgânicos

Quando o usuário mandar uma mensagem, responda apenas com o nome do serviço mais adequado (ex: "Serviço 1").
Não explique nada além do nome do serviço.
`;

app.post("/api/chat", async (req, res) => {
  const { text } = req.body;

  try {
    const prompt = `
Você é um classificador da BioEnergy.

Sua única função é ler a frase do usuário e responder **apenas** com um dos seguintes nomes de serviço:

- Serviço 1 → fazenda de tamanho médio
- Serviço 2 → fazenda pequena
- Serviço 3 → fazenda grande
- Serviço 4 → biomassa, resíduos ou orgânicos

Regras:
- Nunca explique sua escolha.
- Nunca escreva nada além de "Serviço X".
- Se não tiver certeza, escolha o mais próximo.

Usuário: ${text}
    `;

    const result = await model.generateContent(prompt);
    const reply = result.response.text().trim();

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao processar a mensagem" });
  }
});



app.listen(3000, () => console.log("Servidor rodando em http://localhost:3000"));
