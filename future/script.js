import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold
} from "@google/generative-ai";

import chalk from "chalk";
import ora from "ora";
import prompt from "prompt-sync";

const promptSync = prompt();

// Configurações
const MODEL_NAME = "gemini-1.5-flash";
const API_KEY = "AIzaSyCZeRFVrzlebbGWkFbhkJkUjYOlj7NYRLw"; // insira sua chave da API do Google AI Studio

const GENERATION_CONFIG = {
  temperature: 0.7,
  topK: 1,
  topP: 1,
  maxOutputTokens: 1024
};

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }
];

async function runChat() {
  const spinner = ora("Inicializando chatbot BioEnergy...").start();

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const chat = model.startChat({
      generationConfig: GENERATION_CONFIG,
      safetySettings: SAFETY_SETTINGS,
      history: [
        {
          role: "user",
          parts: [{
            text: `
Você é um assistente especializado em biomassa, energia limpa, sustentabilidade e tecnologias ambientais.
Responda sempre com profundidade, clareza e foco no tema, mesmo que a pergunta não contenha palavras-chave explícitas.
Use exemplos reais, linguagem acessível e incentive práticas sustentáveis.
Se a pergunta estiver fora do escopo, gentilmente redirecione para o tema principal.
            `
          }]
        },
        {
          role: "model",
          parts: [{ text: "Entendido! Estou pronto para conversar sobre energia limpa, biomassa e sustentabilidade." }]
        }
      ]
    });

    spinner.stop();
    console.log(chalk.green("Chat BioEnergy iniciado!"));
    console.log(chalk.yellow("Digite 'exit' para encerrar.\n"));

    while (true) {
      const userInput = promptSync(chalk.green("Você: "));

      if (userInput.toLowerCase() === "exit") {
        console.log(chalk.yellow("Até breve! Continue investindo em energia limpa 🌱"));
        process.exit(0);
      }

      const result = await chat.sendMessage(userInput);

      if (result.error) {
        console.error(chalk.red("Erro da IA:"), result.error.message);
        continue;
      }

      const response = result.response.text();
      console.log(chalk.blue("BioEnergy IA:"), response);
    }
  } catch (error) {
    spinner.stop();
    console.error(chalk.red("Erro encontrado:"), error.message);
    process.exit(1);
  }
}

runChat();
