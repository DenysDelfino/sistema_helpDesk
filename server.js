const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// Configuração de onde salvar os arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Salva na pasta que você criou
    },
    filename: (req, file, cb) => {
        // Cria um nome único: data_de_hoje + nome_original
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const app = express();
app.use(cors());
// Permite que o navegador veja as imagens da pasta uploads
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// 1. Configuração da conexão com o Banco
const conexao = mysql.createConnection({
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || 'admin', // Coloque sua senha do Workbench aqui se for rodar local
    database: process.env.MYSQLDATABASE || 'sistema_helpdesk',
    port: process.env.MYSQLPORT || 3306
});
// 2. Teste se conectou
conexao.connect(erro => {
    if (erro) {
        console.error('Erro ao conectar no MySQL: ' + erro.stack);
        return;
    }
    console.log('Conectado ao MySQL com sucesso! ID: ' + conexao.threadId);
});

// 3. Rota para Listar Chamados (O navegador pede, o servidor entrega)
app.get('/chamados', (req, res) => {
    conexao.query('SELECT * FROM chamados', (erro, resultados) => {
        if (erro) throw erro;
        res.json(resultados);
    });
});

// 5. NOVA HABILIDADE: Rota para Fechar um Chamado
// O ":id" funciona como uma variável na URL (ex: /chamados/1)
app.put('/chamados/:id', (req, res) => {
    const idChamado = req.params.id;
    
    // Comando SQL para fechar o chamado específico
    const sql = "UPDATE chamados SET status = 'Fechado' WHERE id = ?";

    conexao.query(sql, [idChamado], (erro, resultado) => {
        if (erro) {
            console.error(erro);
            res.status(500).send('Erro ao atualizar');
        } else {
            res.json({ mensagem: 'Chamado fechado com sucesso!' });
        }
    });
});

// 6. Rota para CRIAR chamado COM ARQUIVO (Atualizada)
app.post('/chamados', upload.single('arquivo'), (req, res) => {
    const { titulo, descricao, usuario_id, prioridade } = req.body;
    const anexo = req.file ? req.file.filename : null; // Se tiver arquivo, pega o nome. Se não, null.
    
    const sql = "INSERT INTO chamados (titulo, descricao, usuario_id, prioridade, anexo) VALUES (?, ?, ?, ?, ?)";
    
    conexao.query(sql, [titulo, descricao, usuario_id, prioridade, anexo], (erro, resultado) => {
        if (erro) {
            console.error(erro);
            res.status(500).send('Erro ao criar chamado');
        } else {
            res.json({ mensagem: 'Chamado criado!', id: resultado.insertId });
        }
    });
});

// 7. Rota para Listar Usuários (Para preencher o combo box)
app.get('/usuarios', (req, res) => {
    conexao.query('SELECT * FROM usuarios', (erro, resultados) => {
        if (erro) {
            console.error(erro);
            res.status(500).send('Erro ao buscar usuários');
        } else {
            res.json(resultados);
        }
    });
});

// 8. Rota para CRIAR NOVO USUÁRIO
app.post('/usuarios', (req, res) => {
    const { nome, email, is_admin } = req.body;

    const sql = "INSERT INTO usuarios (nome, email, is_admin) VALUES (?, ?, ?)";

    conexao.query(sql, [nome, email, is_admin], (erro, resultado) => {
        if (erro) {
            console.error(erro);
            res.status(500).send('Erro ao cadastrar usuário');
        } else {
            res.json({ mensagem: 'Usuário cadastrado!', id: resultado.insertId });
        }
    });
});

// 9. Rota para EXCLUIR um chamado (DELETE)
app.delete('/chamados/:id', (req, res) => {
    const id = req.params.id;

    // O comando SQL perigoso (mas necessário)
    conexao.query('DELETE FROM chamados WHERE id = ?', [id], (erro, resultado) => {
        if (erro) {
            console.error(erro);
            res.status(500).send('Erro ao excluir');
        } else {
            res.json({ mensagem: 'Chamado excluido!' });
        }
    });
});

// 10. Rota para BUSCAR comentários de um chamado
app.get('/comentarios/:chamadoId', (req, res) => {
    const id = req.params.chamadoId;
    // Fazemos um JOIN para pegar o NOME da pessoa que comentou
    const sql = `
        SELECT c.*, u.nome as nome_usuario 
        FROM comentarios c
        LEFT JOIN usuarios u ON c.usuario_id = u.id
        WHERE c.chamado_id = ?
        ORDER BY c.data_criacao ASC
    `;
    conexao.query(sql, [id], (erro, resultados) => {
        if (erro) res.status(500).send('Erro ao buscar comentários');
        else res.json(resultados);
    });
});

// 11. Rota para SALVAR um comentário novo
app.post('/comentarios', (req, res) => {
    const { texto, chamado_id, usuario_id } = req.body;
    const sql = "INSERT INTO comentarios (texto, chamado_id, usuario_id) VALUES (?, ?, ?)";
    conexao.query(sql, [texto, chamado_id, usuario_id], (erro, resultado) => {
        if (erro) res.status(500).send('Erro ao comentar');
        else res.json({ mensagem: 'Comentário salvo!' });
    });
});

// 12. Rota de LOGIN (Verifica e-mail)
app.post('/login', (req, res) => {
    const { email } = req.body;
    
    // Busca o usuário pelo e-mail exato
    const sql = "SELECT * FROM usuarios WHERE email = ?";
    
    conexao.query(sql, [email], (erro, resultados) => {
        if (erro) return res.status(500).send('Erro no servidor');
        
        if (resultados.length > 0) {
            // Achou! Devolve os dados do usuário para o site guardar
            res.json(resultados[0]);
        } else {
            // Não achou
            res.status(401).send('E-mail não cadastrado!');
        }
    });
});

// 4. Iniciar o servidor
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000 (http://localhost:3000)');
});