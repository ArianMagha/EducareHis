let db = { cursos: [] };
let usuarioLogado = null;

// =========================
// CONFIGURAÇÃO SUPABASE
// =========================
const SUPABASE_URL = "https://enkwyjpiyfvseooczpzd.supabase.co";
const SUPABASE_KEY = "sb_publishable_1HjiNJRF1_0STvMiCP0DZA_TAwVblIR";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Carregar o JSON de cursos
async function carregarBanco() {
  try {
    const res = await fetch("db.json");
    db = await res.json();
  } catch (error) {
    console.error("Erro ao carregar db.json:", error);
    db = { cursos: [] };
  }
}

// =========================
// AUTENTICAÇÃO E TELAS
// =========================
function mostrarCadastro() {
  document.getElementById("telaLogin").style.display = "none";
  document.getElementById("telaCadastro").style.display = "block";
}

function voltarLogin() {
  document.getElementById("telaCadastro").style.display = "none";
  document.getElementById("telaLogin").style.display = "block";
}

async function cadastrar() {
  const nome = document.getElementById("nomeCadastro").value.trim();
  const email = document.getElementById("emailCadastro").value.trim().toLowerCase();

  if (!nome || !email) { alert("Preencha nome e email"); return; }

  const { error } = await supabaseClient.from("solicitacoes_cadastro").insert([
    { nome: nome, email: email, status: "pendente" }
  ]);

  if (error) { alert("Erro: " + error.message); return; }

  alert("Solicitação enviada! Aguarde aprovação.");
  voltarLogin();
}

async function login() {
  const email = document.getElementById("email").value.trim().toLowerCase();
  const senha = document.getElementById("senha").value.trim();

  if (!email || !senha) { alert("Preencha todos os campos"); return; }

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });

  if (error) { alert("Login inválido: " + error.message); return; }

  await carregarUsuarioLogado(data.user);
  if (usuarioLogado) iniciarApp();
}

async function carregarUsuarioLogado(userAuth) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userAuth.id)
    .single();

  if (error) return;

  usuarioLogado = {
    id: data.id,
    nome: data.nome || "",
    email: data.email || userAuth.email || "",
    progresso: data.progresso || 0,
    cursosConcluidos: data.cursos_concluidos || 0,
    primeiroAcesso: data.primeiro_acesso === true
  };
}

// =========================
// CORE DO SISTEMA (AQUI ESTÁ A MÁGICA)
// =========================
function iniciarApp() {
  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "flex";

  document.getElementById("nomeUser").innerText = usuarioLogado.nome;
  document.getElementById("emailUser").innerText = usuarioLogado.email;

  atualizarDashboard();
  renderizarListaCursos(); // Nova função para o estilo de cards

  if (usuarioLogado.primeiroAcesso) {
    mostrar("perfil");
    document.getElementById("avisoPrimeiroAcesso").style.display = "block";
  } else {
    mostrar("menu");
  }
}

// 1. Renderiza os Cards dos Cursos
function renderizarListaCursos() {
  const div = document.getElementById("cursos");
  div.innerHTML = `<h2 class="sectionTitle">Seus Cursos</h2><div class="dashboardGrid" id="gridCursos"></div>`;
  const grid = document.getElementById("gridCursos");

  db.cursos.forEach(curso => {
    const card = document.createElement("div");
    card.className = "card dashboardCard";
    card.style.cursor = "pointer";
    card.onclick = () => carregarTrilhasDoCurso(curso.id);
    card.innerHTML = `
      <span class="badge">Curso</span>
      <h3>${curso.titulo}</h3>
      <p>${curso.descricao}</p>
      <button class="primaryBtn" style="margin-top:15px; width:100%">Abrir Conteúdo</button>
    `;
    grid.appendChild(card);
  });
}

// 2. Renderiza os Módulos (Trilhas) dentro do curso selecionado
function carregarTrilhasDoCurso(cursoId) {
  const curso = db.cursos.find(c => c.id === cursoId);
  const div = document.getElementById("cursos");
  
  // Criar interface de trilhas
  div.innerHTML = `
    <button class="secondaryBtn" onclick="renderizarListaCursos()" style="margin-bottom:20px;">← Voltar para cursos</button>
    <h2 class="sectionTitle">${curso.titulo}</h2>
    <div class="layout">
      <div id="visualizadorAula" class="leftPanel">
         <div class="card contentCard">Selecione uma aula na trilha ao lado para começar a estudar.</div>
      </div>
      <div class="rightPanel" id="listaModulos"></div>
    </div>
  `;

  const painelModulos = document.getElementById("listaModulos");

  curso.modulos.forEach((modulo, index) => {
    const item = document.createElement("div");
    item.className = "trailItem";
    item.innerHTML = `
      <div class="trailHeader" onclick="toggleElement('mod-cont-${index}')">
        <div class="trailTitle">${modulo.nome}</div>
        <div class="trailMeta">${modulo.materias.length} aulas</div>
      </div>
      <div id="mod-cont-${index}" class="trailLessons" style="display:none;">
        ${modulo.materias.map(m => `
          <div class="lessonItem" onclick="abrirAula(${curso.id}, ${modulo.id}, ${m.id})">
            <div class="lessonTitle">${m.titulo}</div>
            <div class="lessonMeta">Vídeo aula</div>
          </div>
        `).join('')}
      </div>
    `;
    painelModulos.appendChild(item);
  });
}

// 3. Abre a aula e o vídeo
function abrirAula(cursoId, moduloId, materiaId) {
  const curso = db.cursos.find(c => c.id === cursoId);
  const modulo = curso.modulos.find(m => m.id === moduloId);
  const materia = modulo.materias.find(m => m.id === materiaId);

  const visualizador = document.getElementById("visualizadorAula");
  visualizador.innerHTML = `
    <div class="card videoCard">
      <div class="videoWrapper">
        <iframe src="${materia.video}" allowfullscreen></iframe>
      </div>
    </div>
    <div class="card contentCard">
      <h2>${materia.titulo}</h2>
      <p class="contentText">${materia.descricao}</p>
      <div class="actionRow">
        <button class="primaryBtn" onclick="fazerAtividade(${cursoId}, ${moduloId}, ${materiaId})">Fazer Atividade</button>
      </div>
    </div>
  `;
}

function toggleElement(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === "none" ? "block" : "none";
}

// =========================
// ATIVIDADES E DASHBOARD
// =========================
async function fazerAtividade(cId, mId, matId) {
  const curso = db.cursos.find(c => c.id === cId);
  const materia = curso.modulos.find(m => m.id === mId).materias.find(ma => ma.id === matId);
  const atividade = materia.atividades[0];

  let resp = prompt(atividade.pergunta + "\n" + atividade.opcoes.map((o, i) => `${i}: ${o}`).join("\n"));

  if (resp == atividade.resposta) {
    alert("Excelente! Você acertou.");
    usuarioLogado.progresso += 2;
    await supabaseClient.from("profiles").update({ progresso: usuarioLogado.progresso }).eq("id", usuarioLogado.id);
    atualizarDashboard();
  } else {
    alert("Resposta incorreta, revise o vídeo!");
  }
}

function atualizarDashboard() {
  document.getElementById("progresso").innerText = usuarioLogado.progresso + "%";
  document.getElementById("concluidos").innerText = usuarioLogado.cursosConcluidos;
}

function mostrar(sec) {
  const telas = ["menu", "cursos", "perfil"];
  telas.forEach(t => document.getElementById(t).style.display = "none");
  document.getElementById(sec).style.display = "block";
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

window.onload = async () => {
  await carregarBanco();
  const { data } = await supabaseClient.auth.getSession();
  if (data?.session) {
    await carregarUsuarioLogado(data.session.user);
    if (usuarioLogado) iniciarApp();
  }
};
