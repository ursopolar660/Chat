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
    process.exit(1); // Encerra o processo se a chave não puder ser lida
}

const genAI = new GoogleGenerativeAI(apiKey);
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Endpoint de chat modificado
app.post('/api/chat', async (req, res) => {
    // 1. RECEBER O PROMPT E A MENSAGEM
    // Agora capturamos tanto a mensagem do usuário quanto o prompt da persona
    const { message, prompt } = req.body;

    // Validação de entrada
    if (!message || !prompt) {
        return res.status(400).json({ resposta: 'Erro: A mensagem e o prompt são obrigatórios.' });
    }

    try {
        // Use um modelo recente e disponível, como o gemini-2.0-flash
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // 2. CONSTRUIR O HISTÓRICO DA CONVERSA
        // Este é o passo crucial. Instruímos a IA com a persona antes de receber a mensagem.
        const chatHistory = [
            {
                role: "user",
                parts: [{ text: prompt }], // A persona e as regras vão aqui!
            },
            {
                role: "model",
                parts: [{ text: "Entendido. Sou o MentorGPT e seguirei rigorosamente o protocolo. Estou pronto para a solicitação." }], // A IA confirma que entendeu as regras
            },
        ];

        // 3. INICIAR O CHAT COM CONTEXTO E ENVIAR A MENSAGEM
        // Usamos startChat com o histórico para que a IA saiba como se comportar
        const chat = model.startChat({
            history: chatHistory,
            generationConfig: {
                maxOutputTokens: 4096, // Aumente se precisar de respostas mais longas
            },
        });

        // Enviamos a mensagem atual do usuário para o chat já contextualizado
        const result = await chat.sendMessage(message);
        const response = result.response;
        const text = response.text();
        
        // 4. ENVIAR A RESPOSTA CORRETA PARA O FRONTEND
        res.json({ resposta: text });

    } catch (error) {
        console.error("Erro ao consultar a IA Gemini:", error);
        res.status(500).json({ resposta: 'Desculpe, ocorreu um erro interno ao processar sua solicitação.' });
    }
});

// Servir arquivos estáticos (frontend)
app.use(express.static(__dirname));

app.listen(3000, () => console.log('Backend rodando na porta 3000. Acesse http://localhost:3000'));