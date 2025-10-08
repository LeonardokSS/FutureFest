const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const genAI = new GoogleGenerativeAI("AIzaSyCZeRFVrzlebbGWkFbhkJkUjYOlj7NYRLw")

app.post("/api/chat", async (req, res) => {
  const pergunta = req.body.pergunta;
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent(pergunta);
  const resposta = result.response.text();
  res.json({ resposta });
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
