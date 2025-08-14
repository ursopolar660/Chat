const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Carrega a chave da API a partir de um arquivo local
const keyPath = path.join(__dirname, 'gemini-key.json');
let apiKey;
try {
    const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    apiKey = keyData.api_key;
} catch (error) {
    console.error("Erro ao ler o arquivo gemini-key.json. Certifique-se de que ele existe e está no formato correto.", error);
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const app = express();
app.use(cors());
app.use(bodyParser.json());

/**
 * Função mesclada que executa a lógica de chat com retentativa.
 * @param {string} prompt - O prompt da persona/sistema.
 * @param {string} message - A mensagem do usuário.
 * @param {number} maxRetries - O número máximo de tentativas.
 * @returns {Promise<string>} - A resposta de texto da IA.
 */
async function getAiChatResponseWithRetry(prompt, message, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Tentativa ${attempt} de chamar a API Gemini...`);

            // *** ALTERAÇÃO PRINCIPAL: Usando um modelo padrão e estável ***
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

            const chatHistory = [
                { role: "user", parts: [{ text: prompt }] },
                { role: "model", parts: [{ text: "Entendido. Sou o MentorGPT e seguirei rigorosamente o protocolo. Estou pronto para a solicitação." }] },
            ];

            const chat = model.startChat({
                history: chatHistory,
                generationConfig: {
                    maxOutputTokens: 4096,
                },
            });

            const result = await chat.sendMessage(message);
            return result.response.text(); 

        } catch (error) {
            // Lógica de retentativa aprimorada com optional chaining (?.)
            if (error?.status === 503 && attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000;
                console.warn(`API sobrecarregada (503). Tentando novamente em ${delay / 1000} segundos...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`Falha na tentativa ${attempt}.`);
                throw error; 
            }
        }
    }
}

// Endpoint de chat modificado para usar a função com retentativa
app.post('/api/chat', async (req, res) => {
    const { message, prompt } = req.body;

    if (!message || !prompt) {
        return res.status(400).json({ resposta: 'Erro: A mensagem e o prompt são obrigatórios.' });
    }

    try {
        const aiResponseText = await getAiChatResponseWithRetry(prompt, message);
        res.json({ resposta: aiResponseText });

    } catch (error) {
        // Log mais detalhado do erro final no console do backend
        console.error('Erro final após todas as tentativas:', error.message || error);
        
        // Envia uma resposta de erro mais informativa para o frontend
        const status = error?.status || 500;
        const message = error?.message || 'Erro interno do servidor.';
        res.status(status).json({
            error: `Falha ao comunicar com a IA. (Status: ${status})`,
            details: message
        });
    }
});

// Servir arquivos estáticos (frontend)
app.use(express.static(__dirname));

app.listen(3000, () => console.log('Backend rodando na porta 3000. Acesse http://localhost:3000'));