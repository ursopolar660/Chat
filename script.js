document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos da Interface (incluindo o novo botão) ---
    const chatWindow = document.getElementById('chat-window');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const aiNameEl = document.getElementById('ai-name');
    const newChatButton = document.getElementById('new-chat-button'); // Botão adicionado na etapa anterior

    let aiConfig = {
        persona: 'Assistente',
        prompt: 'Por favor, responda de forma útil.'
    };

    // --- FUNÇÕES DE INICIALIZAÇÃO E CHAT ---
    
    // Função para iniciar ou reiniciar um chat
    function startNewChat() {
        chatWindow.innerHTML = '';
        addMessageToChat('Olá! Sou seu MentorGPT. Qual o seu desafio hoje?', 'ai');
        messageInput.focus();
        resetTextareaHeight();
    }

    // Carrega a configuração da IA do JSON
    fetch('config_ia.json')
        .then(response => {
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
            return response.json();
        })
        .then(configData => {
            const geminiNode = configData.nodes.find(node => node.type === '@n8n/n8n-nodes-langchain.googleGemini');
            if (geminiNode) {
                const promptContent = geminiNode.parameters.messages.values[0].content;
                aiConfig.prompt = promptContent;
                const nameMatch = promptContent.match(/Você é \"(.*?)\"/);
                if (nameMatch && nameMatch[1]) {
                    aiConfig.persona = nameMatch[1];
                }
            }
            aiNameEl.textContent = `Conversando com ${aiConfig.persona}`;
            startNewChat(); // Inicia o primeiro chat
        })
        .catch(error => {
            console.error("Falha ao carregar a configuração da IA:", error);
            aiNameEl.textContent = "Erro de Configuração";
            addMessageToChat('Não consegui carregar minha configuração. Verifique o arquivo JSON.', 'ai');
        });

    // --- LÓGICA DE ENVIO DE MENSAGEM (Refatorada) ---
    
    // Função centralizada para enviar a mensagem
    function sendMessage() {
        const userMessage = messageInput.value.trim();
        if (userMessage) {
            addMessageToChat(userMessage, 'user', false);
            messageInput.value = '';
            resetTextareaHeight();
            getAiResponse(userMessage);
        }
    }

    // O formulário agora só chama a função de envio
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage();
    });

    // *** NOVA LÓGICA PARA SHIFT + ENTER ***
    messageInput.addEventListener('keydown', (e) => {
        // Verifica se a tecla pressionada é 'Enter' E se a tecla 'Shift' NÃO está pressionada
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Impede que uma nova linha seja inserida
            sendMessage();      // Chama a função de envio
        }
        // Se for 'Shift + Enter', o comportamento padrão (pular linha) acontece normalmente.
    });
    
    // *** BÔNUS: TEXTAREA COM ALTURA AUTOMÁTICA ***
    function resetTextareaHeight() {
        messageInput.style.height = 'auto';
    }
    messageInput.addEventListener('input', () => {
        resetTextareaHeight();
        messageInput.style.height = `${messageInput.scrollHeight}px`;
    });


    // --- FUNÇÕES AUXILIARES ---

    // Adiciona listener para o botão de novo chat
    newChatButton.addEventListener('click', startNewChat);

    function addMessageToChat(text, sender, asHtml = true) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        if (sender === 'ai' && asHtml) {
            messageElement.innerHTML = marked.parse(text);
        } else {
            messageElement.textContent = text;
        }
        chatWindow.appendChild(messageElement);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    async function getAiResponse(userInput) {
        const typingIndicator = document.createElement('div');
        typingIndicator.textContent = `${aiConfig.persona} está digitando...`;
        typingIndicator.classList.add('message', 'ai-message', 'typing-indicator');
        chatWindow.appendChild(typingIndicator);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: userInput,
                    prompt: aiConfig.prompt
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro na resposta do servidor.');
            }

            const data = await response.json();
            chatWindow.removeChild(typingIndicator);
            addMessageToChat(data.resposta, 'ai', true);

        } catch (error) {
            console.error("Erro na chamada da API:", error);
            chatWindow.removeChild(typingIndicator);
            addMessageToChat(`Desculpe, ocorreu um erro ao processar sua solicitação: ${error.message}`, 'ai');
        }
    }
});