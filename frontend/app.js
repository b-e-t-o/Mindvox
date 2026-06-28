// Captura de elementos do DOM do Mindvox Studio
const fileInput = document.getElementById('audioFile');
const fileName = document.getElementById('fileName');
const dropZone = document.getElementById('dropZone');
const statusIndicator = document.getElementById('statusIndicator');
const emptyState = document.getElementById('emptyState');
const responseTextarea = document.getElementById('responseTextarea');
const downloadContainer = document.getElementById('downloadContainer');
const downloadBtn = document.getElementById('downloadBtn');
const fileSizeLabel = document.getElementById('fileSizeLabel');

let rawTranscriptText = ""; 

// Intercepta e gerencia os eventos de arrastar arquivos (Drag & Drop)
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => { 
        e.preventDefault(); 
        e.stopPropagation();
        dropZone.classList.add('border-indigo-500', 'bg-slate-950/80'); 
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => { 
        e.preventDefault(); 
        e.stopPropagation();
        dropZone.classList.remove('border-indigo-500', 'bg-slate-950/80'); 
    }, false);
});

// Captura o arquivo quando arrastado e solto direto na caixa
dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        fileInput.files = files; // Sincroniza o input oculto
        fileName.textContent = files[0].name;
        fileName.classList.add('text-indigo-400');
    }
});

// Captura o arquivo quando selecionado clicando na caixa
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        fileName.textContent = e.target.files[0].name;
        fileName.classList.add('text-indigo-400');
    }
});

// Envio do formulário via AJAX para a API local do FastAPI
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (fileInput.files.length === 0) {
        alert("Por favor, selecione ou arraste um arquivo de áudio antes de iniciar.");
        return;
    }

    // Atualiza estados da UI para "Carregando" (Processing)
    statusIndicator.textContent = "Processing";
    statusIndicator.className = "text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md bg-indigo-950/50 border border-indigo-800 text-indigo-400 animate-pulse";
    
    emptyState.classList.add('hidden');
    responseTextarea.classList.remove('hidden');
    downloadContainer.classList.add('hidden');
    downloadContainer.classList.remove('opacity-100', 'translate-y-0');
    
    responseTextarea.value = ">>> [SYSTEM]: Inicializando interceptador de formato...\n>>> [SYSTEM]: Resolvendo dependências do binário FFmpeg local...\n>>> [CODEC]: Lendo metadados binários do contêiner MP3...\n>>> [STT-ENGINE]: Invocando modelo PyTorch Whisper local...\n\n[INFO]: Processando tensores de áudio em chunks. Aguarde sem fechar a página...";

    const formData = new FormData();
    // Extrai com segurança o primeiro arquivo do array do FileList
    formData.append('audio_file', fileInput.files[0]);
    formData.append('class_title', document.getElementById('classTitle').value);

    try {
        const response = await fetch('/transcriptions/v1.0.0', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer dev-token' }, 
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            statusIndicator.textContent = "Success";
            statusIndicator.className = "text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md bg-green-950/50 border border-green-800 text-green-400";
            
            // Extrai o texto gerado da resposta da rota
            rawTranscriptText = data.text || JSON.stringify(data, null, 2);
            responseTextarea.value = rawTranscriptText;
            
            // Exibe e calcula metadados para download
            const blob = new Blob([rawTranscriptText], { type: 'text/plain' });
            fileSizeLabel.textContent = `${(blob.size / 1024).toFixed(1)} KB`;
            
            downloadContainer.classList.remove('hidden');
            setTimeout(() => {
                downloadContainer.classList.add('opacity-100', 'translate-y-0', 'transition-all', 'duration-500');
            }, 50);
        } else {
            throw new Error(data.detail || 'Falha de processamento interna do backend.');
        }
    } catch (err) {
        statusIndicator.textContent = "Error 500";
        statusIndicator.className = "text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md bg-red-950/50 border border-red-800 text-red-400";
        responseTextarea.value = `>>> [CRITICAL ERROR]: Falha no pipeline de decodificação.\n\nDetalhes:\n${err.message}\n\n[DICA]: Certifique-se de que o modelo Ollama está de pé e que as permissões da pasta outputs estão corretas.`;
    }
});

// Lógica de download e geração do arquivo .txt localmente
downloadBtn.addEventListener('click', () => {
    if (!rawTranscriptText) return;
    const blob = new Blob([rawTranscriptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcricao_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
