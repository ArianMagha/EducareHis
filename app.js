let db = { cursos: [] };
let usuarioLogado = null;

const SUPABASE_URL = "https://enkwyjpiyfvseooczpzd.supabase.co";
const SUPABASE_KEY = "sb_publishable_1HjiNJRF1_0STvMiCP0DZA_TAwVblIR";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


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

  if (!nome || !email) {
    alert("Preencha nome e e-mail para solicitar cadastro.");
    return;
  }

  const senhaTemporaria = Math.random().toString(36).slice(-10) + "A1!";
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password: senhaTemporaria,
    options: { data: { nome } }
  });

  if (error) {
    alert("Erro ao solicitar cadastro: " + error.message);
    return;
  }

  if (data?.user) {
    await supabaseClient.from("profiles").upsert({
      id: data.user.id,
      nome,
      email,
      progresso: 0,
      cursos_concluidos: 0
    });
  }

  alert("Solicitação enviada! Verifique seu e-mail para confirmar a conta.");
  voltarLogin();
}
async function carregarBanco() {
  const res = await fetch("db.json");
  db = await res.json();
}

// LOGIN
async function login() {
  const email = document.getElementById("email").value.trim().toLowerCase();
  const senha = document.getElementById("senha").value.trim();
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
  if (error) return alert("Erro: " + error.message);
  await carregarUsuarioLogado(data.user);
  iniciarApp();
}

async function carregarUsuarioLogado(userAuth) {
  const { data } = await supabaseClient.from("profiles").select("*").eq("id", userAuth.id).single();
  usuarioLogado = { id: data.id, nome: data.nome, email: data.email, progresso: data.progresso || 0, concluidas: data.cursos_concluidos || 0 };
}

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

// CURSOS
function renderizarListaCursos() {
  const div = document.getElementById("cursos");
  div.innerHTML = `<h2>Cursos</h2><div class="dashboardGrid" id="gridC"></div>`;
  db.cursos.forEach(curso => {
    document.getElementById("gridC").innerHTML += `
      <div class="card" onclick="abrirCurso(${curso.id})">
        <span class="badge">Ativo</span>
        <h3>${curso.titulo}</h3>
        <button class="primaryBtn" style="width:100%; margin-top:10px;">Entrar</button>
      </div>`;
  });
}

function abrirCurso(id) {
  const curso = db.cursos.find(c => c.id === id);
  const div = document.getElementById("cursos");
  div.innerHTML = `
    <button class="secondaryBtn" onclick="renderizarListaCursos()">← Voltar</button>
    <div class="layout-aula">
      <div id="visualizador"><div class="card">Selecione uma aula.</div></div>
      <div id="trilha"></div>
    </div>`;

  curso.modulos.forEach((mod, i) => {
    document.getElementById("trilha").innerHTML += `
      <div class="trailItem">
        <div class="trailHeader" onclick="document.getElementById('m-${i}').style.display='block'">${mod.nome}</div>
        <div id="m-${i}" class="trailLessons" style="display:none;">
          ${mod.materias.map(mat => `<div class="lessonItem" onclick="carregarAula(${curso.id}, ${mod.id}, ${mat.id})">▶ ${mat.titulo}</div>`).join('')}
        </div>
      </div>`;
  });
}

function carregarAula(cId, mId, matId) {
  const curso = db.cursos.find(c => c.id === cId);
  const modulo = curso.modulos.find(m => m.id === mId);
  const materia = modulo.materias.find(ma => ma.id === matId);

  document.getElementById("visualizador").innerHTML = `
    <div class="videoWrapper"><iframe src="${materia.video}" allowfullscreen></iframe></div>
    <div class="card">
      <h2>${materia.titulo}</h2>
      <p>${materia.descricao}</p>
      <button class="primaryBtn" style="margin-top:20px;" onclick="mostrarAtividade(${cId}, ${mId}, ${matId})">Concluir Aula ✅</button>
      <div id="boxQuiz" class="quiz-box"></div>
    </div>`;
}

function mostrarAtividade(cId, mId, matId) {
  const curso = db.cursos.find(c => c.id === cId);
  const modulo = curso.modulos.find(m => m.id === mId);
  const materia = modulo.materias.find(ma => ma.id === matId);
  const quiz = materia?.atividades?.[0];

  const box = document.getElementById("boxQuiz");
  box.style.display = "block";

  if (!quiz) {
    box.innerHTML = "<p>Esta aula ainda não possui atividade cadastrada.</p>";
    return;
  }

  box.innerHTML = `
    <h3>Atividade de Fixação</h3>
    <p style="margin:10px 0;">${quiz.pergunta}</p>
    ${quiz.opcoes.map((op, i) => `<button class="option-btn" onclick="validarQuiz(${i}, ${quiz.resposta})">${op}</button>`).join('')}
  `;
}

async function validarQuiz(escolha, correta) {
  if (escolha === correta) {
    alert("Correto! Salvando progresso...");
    usuarioLogado.concluidas += 1;
    usuarioLogado.progresso += 5;
    
    await supabaseClient.from("profiles").update({ cursos_concluidos: usuarioLogado.concluidas, progresso: usuarioLogado.progresso }).eq("id", usuarioLogado.id);
    
    atualizarDashboard();
    document.getElementById("boxQuiz").innerHTML = "<p style='color:green; font-weight:bold;'>Aula concluída com sucesso!</p>";
  } else {
    alert("Resposta errada. Tente novamente!");
  }
}

function mostrar(id) {
  ["menu", "cursos", "perfil"].forEach(s => document.getElementById(s).style.display = "none");
  document.getElementById(id).style.display = "block";
}

async function logout() { await supabaseClient.auth.signOut(); location.reload(); }

window.onload = async () => {
  await carregarBanco();
  const { data } = await supabaseClient.auth.getSession();
  if (data?.session) { await carregarUsuarioLogado(data.session.user); iniciarApp(); }
};
