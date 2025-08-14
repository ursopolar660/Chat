document.addEventListener('DOMContentLoaded', () => {

    const workflowNameEl = document.getElementById('workflow-name');
    const nodesContainer = document.getElementById('nodes-container');

    // Caminho para o seu arquivo JSON do fluxo n8n
    const caminhoDoJson = 'data/fluxo.json'; // Certifique-se que o nome e caminho estão corretos

    fetch(caminhoDoJson)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro na rede: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 'data' agora é o objeto JSON completo do seu fluxo

            // 1. Define o nome do fluxo
            workflowNameEl.textContent = data.name || "Nome do Fluxo não definido";

            // 2. Limpa o container de nós
            nodesContainer.innerHTML = '';

            // 3. Itera sobre cada nó no array 'nodes'
            if (data.nodes && data.nodes.length > 0) {
                data.nodes.forEach(node => {
                    const nodeDiv = document.createElement('div');
                    nodeDiv.classList.add('node');

                    let nodeContent = `
                        <p class="node-title">${node.name}</p>
                        <p class="node-details">
                            <strong>ID:</strong> ${node.id}<br>
                            <strong>Tipo:</strong> ${node.type}
                        </p>
                    `;

                    // Tratamento especial para o nó do Gemini para exibir o prompt
                    if (node.type === '@n8n/n8n-nodes-langchain.googleGemini' && node.parameters.messages) {
                        const promptText = node.parameters.messages.values[0].content;
                        nodeContent += `
                            <h2>Prompt do MentorGPT:</h2>
                            <pre class="prompt"><code>${promptText}</code></pre>
                        `;
                    }
                    
                    // Tratamento especial para os nós do Google Sheets
                    if (node.type === 'n8n-nodes-base.googleSheets') {
                        const sheetName = node.parameters.sheetName.cachedResultName || 'Nome da Planilha não disponível';
                        const operation = node.parameters.operation || 'Operação não definida';
                        nodeContent += `
                            <p><strong>Operação na Planilha:</strong> ${operation}</p>
                            <p><strong>Nome da Aba:</strong> ${sheetName}</p>
                        `;
                    }

                    nodeDiv.innerHTML = nodeContent;
                    nodesContainer.appendChild(nodeDiv);
                });
            } else {
                nodesContainer.innerHTML = '<p>Nenhum nó encontrado no arquivo JSON.</p>';
            }
        })
        .catch(error => {
            console.error('Falha ao carregar o arquivo JSON do fluxo:', error);
            workflowNameEl.textContent = "Erro ao Carregar Fluxo";
            nodesContainer.innerHTML = '<p>Não foi possível carregar os dados. Verifique o console para mais detalhes.</p>';
        });
});