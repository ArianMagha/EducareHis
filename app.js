let db = { cursos: [] };
let usuarioLogado = null;

// CONFIGURAÇÃO SUPABASE
const SUPABASE_URL = "https://enkwyjpiyfvseooczpzd.supabase.co";
const SUPABASE_KEY = "sb_publishable_1HjiNJRF1_0STvMiCP0DZA_TAwVblIR";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Carregar dados do JSON
async function carregarBanco() {
  const res = await fetch("db.json");
  db = await res.json();
}

// LOGIN
async function login() {
  const email = document.getElementById("email").value.trim().toLowerCase();
  const senha = document.getElementById("senha").value.trim();
  
  if(!email || !senha) { alert("Preencha todos os campos"); return; }

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
  
  if (error) { alert("Erro no login: " + error.message); return; }
  
  await carregarUsuarioLogado(data.user);
  iniciarApp();
}

// BUSCAR DADOS DO PERFIL NO SUPABASE
async function carregarUsuarioLogado(userAuth) {
  const { data } = await supabaseClient.from("profiles").select("*").eq("id", userAuth.id).single();
  usuarioLogado = {
    id: data.id,
    nome: data.nome,
    email: data.email,
    progresso: data.progresso || 0,
    concluidas: data.cursos_concluidos || 0
  };
}

// INICIAR INTERFACE
function iniciarApp() {
  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "flex";
  document.getElementById("nomeUser").innerText = usuarioLogado.nome;
  document.getElementById("emailUser").innerText = usuarioLogado.email;
  atualizarDashboard();
  renderizarListaCursos();
}

function atualizarDashboard() {
  document.getElementById("progresso").innerText = usuarioLogado.progresso + "%";
  document.getElementById("concluidos").innerText = usuarioLogado.concluidas;
}

// LISTAGEM DE CURSOS (Cards)
function renderizarListaCursos() {
  const div = document.getElementById("cursos");
  div.innerHTML = `<h2 style="margin-bottom:20px;">Seus Cursos Disponíveis</h2><div class="dashboardGrid" id="gradeCursos"></div>`;
  const grade = document.getElementById("gradeCursos");

  db.cursos.forEach(curso => {
    grade.innerHTML += `
      <div class="card" onclick="abrirCurso(${curso.id})">
        <span class="badge">Curso Ativo</span>
        <h3 style="margin:10px 0;">${curso.titulo}</h3>
        <p style="font-size:14px; color:#666; margin-bottom:15px;">${curso.descricao}</p>
        <button class="primaryBtn" style="width:100%;">Começar Agora</button>
      </div>`;
  });
}

// ABRIR CURSO (Vídeo + Trilha Lateral)
function abrirCurso(id) {
  const curso = db.cursos.find(c => c.id === id);
  const div = document.getElementById("cursos");
  div.innerHTML = `
    <button class="secondaryBtn" onclick="renderizarListaCursos()">← Voltar para a vitrine</button>
    <h2 style="margin:20px 0;">Estudando: ${curso.titulo}</h2>
    <div class="layout-aula">
      <div id="playerPrincipal">
        <div class="card" style="text-align:center; padding:50px;">
           <p>Escolha uma aula na trilha ao lado para carregar o player.</p>
        </div>
      </div>
      <div id="listaTrilhas"></div>
    </div>`;

  const trilhaDiv = div.querySelector("#listaTrilhas");
  curso.modulos.forEach((mod, index) => {
    trilhaDiv.innerHTML += `
      <div class="trailItem">
        <div class="trailHeader" onclick="toggleModulo('mod-${index}')">
           <span>${mod.nome}</span>
           <small>▼</small>
        </div>
        <div id="mod-${index}" class="trailLessons" style="display:none;">
          ${mod.materias.map(mat => `
            <div class="lessonItem" onclick="tocarAula(${curso.id}, ${mod.id}, ${mat.id})">
               ▶ ${mat.titulo}
            </div>
          `).join('')}
        </div>
      </div>`;
  });
}

function toggleModulo(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === "none" ? "block" : "none";
}

// CARREGAR VÍDEO E DESCRIÇÃO
function tocarAula(cId, mId, matId) {
  const curso = db.cursos.find(c => c.id === cId);
  const modulo = curso.modulos.find(m => m.id === mId);
  const materia = modulo.materias.find(ma => ma.id === matId);

  document.getElementById("playerPrincipal").innerHTML = `
    <div class="videoWrapper"><iframe src="${materia.video}" allowfullscreen></iframe></div>
    <div class="card">
      <h2 style="margin-bottom:10px;">${materia.titulo}</h2>
      <p style="color:#666; margin-bottom:25px; line-height:1.5;">${materia.descricao}</p>
      <button class="primaryBtn" onclick="concluirAula()">Concluir Aula e Ganhar Progresso ✅</button>
    </div>`;
}

// LÓGICA DE CONCLUIR AULA
async function concluirAula() {
  usuarioLogado.concluidas += 1;
  usuarioLogado.progresso += 5; // Aumenta 5% por aula (ajuste como preferir)

  const { error } = await supabaseClient.from("profiles")
    .update({ cursos_concluidos: usuarioLogado.concluidas, progresso: usuarioLogado.progresso })
    .eq("id", usuarioLogado.id);

  if (!error) {
    alert("Parabéns! Aula marcada como concluída.");
    atualizarDashboard();
  } else {
    alert("Erro ao salvar progresso.");
  }
}

// NAVEGAÇÃO ENTRE TELAS
function mostrar(id) {
  ["menu", "cursos", "perfil"].forEach(s => document.getElementById(s).style.display = "none");
  document.getElementById(id).style.display = "block";
}

async function logout() { await supabaseClient.auth.signOut(); location.reload(); }

// SOLICITAR CADASTRO
async function cadastrar() {
  const nome = document.getElementById("nomeCadastro").value.trim();
  const email = document.getElementById("emailCadastro").value.trim();
  if(!nome || !email) return alert("Preencha os dados");
  
  const { error } = await supabaseClient.from("solicitacoes_cadastro").insert([{ nome, email, status: "pendente" }]);
  if(!error) { alert("Solicitação enviada!"); voltarLogin(); }
}

function mostrarCadastro() { document.getElementById("telaLogin").style.display="none"; document.getElementById("telaCadastro").style.display="block"; }
function voltarLogin() { document.getElementById("telaCadastro").style.display="none"; document.getElementById("telaLogin").style.display="block"; }

// AUTO-LOGIN AO RECARREGAR
window.onload = async () => {
  await carregarBanco();
  const { data } = await supabaseClient.auth.getSession();
  if (data?.session) {
    await carregarUsuarioLogado(data.session.user);
    iniciarApp();
  }
};
