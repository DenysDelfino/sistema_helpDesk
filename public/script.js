// 1. SEGURANÇA: Verifica se tem crachá. Se não tiver, expulsa para o login.
        const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
        
        if (!usuarioLogado) {
            window.location.href = 'login.html';
        }
        
        // Se chegou aqui, mostra quem está logado no console (pra gente testar)
        console.log("Logado como:", usuarioLogado.nome);

let termoBusca = ""; // Variável para guardar o que foi digitado

        function filtrarPorTexto() {
            // Pega o valor digitado e transforma em minúsculas (para 'Wifi' achar 'WIFI')
            termoBusca = document.getElementById('input-busca').value.toLowerCase();
            renderizarLista(); // Manda desenhar de novo com o filtro novo
        }
        // ⚡ NOVO: Variável Global para guardar a cópia dos dados
        let listaCompletaChamados = [];
        let filtroAtual = 'Todos'; // Começa mostrando tudo
        let graficoStatus = null; // Variável para controlar o gráfico

        // Função para CRIAR
        async function criarChamado() {
            const titulo = document.getElementById('titulo').value;
            const descricao = document.getElementById('descricao').value;
            const prioridade = document.getElementById('prioridade').value;
            const arquivoInput = document.getElementById('arquivo-upload'); // Pega o campo do arquivo
            
            // Pega o ID do usuário logado (da etapa anterior de segurança)
            const usuario_id = usuarioLogado.id; 

            if(!titulo) return alert('O título é obrigatório!');

            // --- AQUI MUDA TUDO ---
            // Para enviar arquivo, usamos FormData em vez de JSON
            const formData = new FormData();
            formData.append('titulo', titulo);
            formData.append('descricao', descricao);
            formData.append('usuario_id', usuario_id);
            formData.append('prioridade', prioridade);
            
            // Se o usuário selecionou um arquivo, adiciona ele no pacote
            if (arquivoInput.files[0]) {
                formData.append('arquivo', arquivoInput.files[0]);
            }

            await fetch('http://localhost:3000/chamados', {
                method: 'POST',
                // NÃO colocamos Content-Type header aqui, o navegador faz sozinho para arquivos
                body: formData 
            });

            // Limpa tudo
            document.getElementById('titulo').value = '';
            document.getElementById('descricao').value = '';
            document.getElementById('arquivo-upload').value = ''; // Limpa o arquivo
            
            buscarChamados();
        }

        // NOVO: Calcula os números do Dashboard
       function atualizarDashboard() {
            // 1. Cálculos (isso você já tinha)
            const total = listaCompletaChamados.length;
            const abertos = listaCompletaChamados.filter(c => c.status !== 'Fechado').length;
            const fechados = listaCompletaChamados.filter(c => c.status === 'Fechado').length;

            // 2. Atualiza os números na tela
            document.getElementById('dash-total').innerText = total;
            document.getElementById('dash-abertos').innerText = abertos;
            document.getElementById('dash-fechados').innerText = fechados;

            // 3. ⚡ NOVO: Desenha (ou atualiza) o Gráfico
            const ctx = document.getElementById('meuGrafico').getContext('2d');

            // Se já existir um gráfico antigo, destrua ele antes de criar o novo
            // (Isso evita bugs visuais quando o gráfico atualiza)
            if (graficoStatus) {
                graficoStatus.destroy();
            }

            // Cria o gráfico novo
            graficoStatus = new Chart(ctx, {
                type: 'doughnut', // Tipo "Rosquinha" 🍩
                data: {
                    labels: ['Pendentes', 'Concluídos'],
                    datasets: [{
                        data: [abertos, fechados], // Os números reais!
                        backgroundColor: [
                            '#ff9800', // Laranja (Pendentes)
                            '#4caf50'  // Verde (Concluídos)
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' } // Legenda embaixo
                    }
                }
            });
        }

        // ⚡ MUDANÇA: Agora temos DUAS funções
        // 1. buscarChamados: Vai no servidor e pega os dados
        async function buscarChamados() {
            const resposta = await fetch('http://localhost:3000/chamados');
            listaCompletaChamados = await resposta.json();
            listaCompletaChamados.reverse(); // Mais novos primeiro
            
            // Depois de buscar, manda desenhar aplicando o filtro atual
            atualizarDashboard();
            renderizarLista(); 
        }
        
       // 2. renderizarLista: Só desenha na tela (sem ir no servidor)
        function renderizarLista() {
            const divLista = document.getElementById('lista-chamados');
            divLista.innerHTML = ''; 

            // 1. FILTRAGEM (Status + Texto da Busca)
            const listaFiltrada = listaCompletaChamados.filter(chamado => {
                // Filtro de Status
                const statusBate = (filtroAtual === 'Todos') || (chamado.status === filtroAtual);
                
                // Filtro de Texto (Busca)
                const textoBate = chamado.titulo.toLowerCase().includes(termoBusca) || 
                                  (chamado.descricao && chamado.descricao.toLowerCase().includes(termoBusca));

                return statusBate && textoBate;
            });

            // 2. SE NÃO TIVER NADA
            if (listaFiltrada.length === 0) {
                divLista.innerHTML = '<p style="text-align:center; color: #888;">Nenhum chamado encontrado.</p>';
                atualizarBotoes();
                return;
            }

            // 3. O LOOP (Desenha cada cartão)
            listaFiltrada.forEach(chamado => {
                
                // --- Datas ---
                const dataRaw = chamado.data_criacao ? new Date(chamado.data_criacao) : new Date();
                const dataFormatada = dataRaw.toLocaleString('pt-BR');

                // --- Status e Botão Concluir ---
                const classeStatus = chamado.status === 'Fechado' ? 'status-fechado' : 'status-aberto';
                const botaoConcluir = chamado.status === 'Fechado' 
                    ? '<span>✅</span>' 
                    : `<button class="btn-fechar" onclick="fecharChamado(${chamado.id})">Concluir</button>`;

                // --- Prioridade (Cores) ---
                let corBadge = 'p-baixa';
                if(chamado.prioridade === 'Média') corBadge = 'p-media';
                if(chamado.prioridade === 'Alta') corBadge = 'p-alta';

                // --- ⚡ NOVO: Lógica do Anexo ---
                let htmlAnexo = '';
                if (chamado.anexo) {
                    htmlAnexo = `<a href="http://localhost:3000/uploads/${chamado.anexo}" target="_blank" style="color: #2196F3; font-size: 0.9em; display:block; margin-top:10px; font-weight:bold;">📎 Ver Print do Erro</a>`;
                }

                // --- Desenhar HTML ---
                divLista.innerHTML += `
                    <div class="card ${classeStatus}">
                        <button onclick="deletarChamado(${chamado.id})" class="btn-delete" title="Excluir">🗑️</button>
                        <button onclick="abrirChat(${chamado.id}, '${chamado.titulo}')" style="float:right; margin-right:10px; background:none; border:none; cursor:pointer; font-size:1.2em;" title="Ver Comentários">💬</button>
                        ${botaoConcluir} 
                        
                        <span class="badge ${corBadge}">${chamado.prioridade || 'Baixa'}</span>
                        
                        <h3>#${chamado.id} - ${chamado.titulo}</h3>
                        <p>${chamado.descricao || 'Sem descrição'}</p>
                        
                        ${htmlAnexo}
                        
                        <p style="color: #666; font-size: 0.9em; margin-top: 10px;">
                            📅 ${dataFormatada} | 👤 Usuário ID: ${chamado.usuario_id}
                        </p>
                        
                        <p><strong>Status:</strong> ${chamado.status}</p>
                    </div>
                `;
            });
            
            atualizarBotoes();
        }
       
              // ⚡ NOVO: Função que troca o filtro quando clica no botão
        function filtrar(novoFiltro) {
            filtroAtual = novoFiltro;
            renderizarLista(); // Redesenha sem ir no servidor!
        }

        // Função visual para mudar a cor do botão ativo
        function atualizarBotoes() {
            document.getElementById('btn-todos').className = filtroAtual === 'Todos' ? 'ativo' : '';
            document.getElementById('btn-aberto').className = filtroAtual === 'Aberto' ? 'ativo' : '';
            document.getElementById('btn-fechado').className = filtroAtual === 'Fechado' ? 'ativo' : '';
        }

        // Função para FECHAR
        async function fecharChamado(id) {
            if(confirm('Tem certeza que deseja fechar este chamado?')) {
                await fetch(`http://localhost:3000/chamados/${id}`, { method: 'PUT' });
                buscarChamados(); // Busca tudo de novo para atualizar o status
            }
        }

        // ⚡ NOVO: Busca os usuários e preenche o <select>
        async function carregarUsuarios() {
            const resposta = await fetch('http://localhost:3000/usuarios');
            const usuarios = await resposta.json();
            
            const select = document.getElementById('usuario_id');
            select.innerHTML = ''; // Limpa o "Carregando..."

            usuarios.forEach(usuario => {
                // Cria a opção: Mostra o NOME, mas vale o ID
                select.innerHTML += `<option value="${usuario.id}">${usuario.nome}</option>`;
            });
        }

        // ⚡ NOVO: Função para apagar do banco 
        async function deletarChamado(id) {
            // Pergunta de segurança para evitar acidentes
            if(confirm('Tem certeza que quer EXCLUIR este chamado para sempre?')) {
                await fetch(`http://localhost:3000/chamados/${id}`, { method: 'DELETE' });
                buscarChamados(); // Atualiza a lista
            }
        }

        // Começa o sistema
        carregarUsuarios();
        buscarChamados();

        let chamadoAtualId = null; // Guarda qual chamado estamos vendo agora

        // Abre a janela e carrega as mensagens
        async function abrirChat(id, titulo) {
            chamadoAtualId = id;
            document.getElementById('titulo-chat').innerText = `Chat: #${id} - ${titulo}`;
            document.getElementById('modal-chat').style.display = 'flex';
            
            // Carrega a lista de usuários no select do chat também
            carregarUsuariosSelect('chat-usuario-id'); 
            
            carregarComentarios();
        }

        function fecharModal() {
            document.getElementById('modal-chat').style.display = 'none';
        }

        async function carregarComentarios() {
            const divChat = document.getElementById('lista-comentarios');
            divChat.innerHTML = 'Carregando...';

            const res = await fetch(`http://localhost:3000/comentarios/${chamadoAtualId}`);
            const comentarios = await res.json();

            divChat.innerHTML = ''; // Limpa

            comentarios.forEach(c => {
                const data = new Date(c.data_criacao).toLocaleString('pt-BR');
                divChat.innerHTML += `
                    <div class="mensagem">
                        <span class="msg-info">👤 ${c.nome_usuario || 'Desconhecido'} em ${data}</span>
                        ${c.texto}
                    </div>
                `;
            });
            
            // Rola para o final automaticamente
            divChat.scrollTop = divChat.scrollHeight;
        }

        async function enviarComentario() {
    const texto = document.getElementById('chat-texto').value;

    // ⚡ MUDOU: Pega direto do login
    const usuario_id = usuarioLogado.id;

            if(!texto) return;

            await fetch('http://localhost:3000/comentarios', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ texto, chamado_id: chamadoAtualId, usuario_id })
            });

            document.getElementById('chat-texto').value = ''; // Limpa campo
            carregarComentarios(); // Recarrega mensagens
        }

        // NOVO: Precisamos de uma função genérica para carregar selects de usuarios
        // async function carregarUsuariosSelect(idElemento) {
        //     const select = document.getElementById(idElemento);
        //     // Só carrega se estiver vazio
        //     if(select.options.length > 0) return; 

        //     const resposta = await fetch('http://localhost:3000/usuarios');
        //     const usuarios = await resposta.json();
            
        //     select.innerHTML = '';
        //     usuarios.forEach(usuario => {
        //         select.innerHTML += `<option value="${usuario.id}">${usuario.nome}</option>`;
        //     });
        // }