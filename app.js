let db = { cursos: [] };
let usuarioLogado = null;

// =========================
// SUPABASE
// =========================
const SUPABASE_URL = "https://enkwyjpiyfvseooczpzd.supabase.co";
const SUPABASE_KEY = "sb_publishable_1HjiNJRF1_0STvMiCP0DZA_TAwVblIR";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =========================
// CARREGAR CURSOS DO db.json
// =========================
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
// MOSTRAR TELAS LOGIN/CADASTRO
// =========================
function mostrarCadastro() {
  document.getElementById("telaLogin").style.display = "none";
  document.getElementById("telaCadastro").style.display = "block";
}

function voltarLogin() {
  document.getElementById("telaCadastro").style.display = "none";
  document.getElementById("telaLogin").style.display = "block";
}

// =========================
// LOGIN
// =========================
async function login() {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!email || !senha) {
    alert("Preencha email e senha");
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    alert("Login inválido: " + error.message);
    return;
  }

  await carregarUsuarioLogado(data.user);

  if (usuarioLogado) {
    iniciarApp();
  }
}

// =========================
// CADASTRO
// =========================
async function cadastrar() {
  const nome = document.getElementById("nomeCadastro").value.trim();
  const email = document.getElementById("emailCadastro").value.trim();
  const senha = document.getElementById("senhaCadastro").value.trim();

  if (!nome || !email || !senha) {
    alert("Preencha nome, email e senha");
    return;
  }

  if (senha.length < 6) {
    alert("A senha deve ter pelo menos 6 caracteres");
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password: senha
  });

  if (error) {
    alert("Erro ao cadastrar: " + error.message);
    return;
  }

  const user = data.user;

  if (!user) {
    alert("Conta criada. Verifique seu email para confirmar o cadastro.");
    return;
  }

  const { error: insertError } = await supabaseClient
    .from("profiles")
    .insert([
      {
        id: user.id,
        nome: nome,
        email: email,
        progresso: 0,
        cursos_concluidos: 0
      }
    ]);

  if (insertError) {
    alert("Conta criada, mas houve erro ao salvar perfil: " + insertError.message);
    return;
  }

  alert("Conta criada com sucesso!");
  voltarLogin();
}

// =========================
// CARREGAR PERFIL
// =========================
async function carregarUsuarioLogado(userAuth) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userAuth.id)
    .single();

  if (error) {
    console.error("Erro ao buscar perfil:", error);
    alert("Erro ao carregar perfil do usuário.");
    return;
  }

  usuarioLogado = {
    id: data.id,
    nome: data.nome || "",
    email: data.email || userAuth.email || "",
    progresso: data.progresso || 0,
    cursosConcluidos: data.cursos_concluidos || 0
  };
}

// =========================
// INICIAR APP
// =========================
function iniciarApp() {
  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "flex";

  document.getElementById("nomeUser").innerText = usuarioLogado.nome;
  document.getElementById("emailUser").innerText = usuarioLogado.email;

  atualizarDashboard();
  carregarCursos();
  mostrar("menu");
}

// =========================
// DASHBOARD
// =========================
function atualizarDashboard() {
  document.getElementById("progresso").innerText =
    "Progresso: " + usuarioLogado.progresso + "%";

  document.getElementById("concluidos").innerText =
    "Cursos concluídos: " + usuarioLogado.cursosConcluidos;
}

// =========================
// CURSOS EM TRILHA
// =========================
function carregarCursos() {
  const div = document.getElementById("cursos");
  div.innerHTML = "";

  if (!db.cursos || db.cursos.length === 0) {
    div.innerHTML = "<p>Nenhum curso encontrado.</p>";
    return;
  }

  db.cursos.forEach(curso => {
    let html = `
      <div class="card">
        <h2>${curso.titulo}</h2>
        <p>${curso.descricao}</p>
    `;

    curso.modulos.forEach(modulo => {
      html += `
        <div class="modulo">
          <h3>${modulo.nome}</h3>
      `;

      modulo.materias.forEach(materia => {
        html += `
          <div class="materia">
            <h4>${materia.titulo}</h4>
            <p>${materia.descricao}</p>
            <iframe src="${materia.video}" allowfullscreen></iframe>
            <button onclick="fazerAtividade(${curso.id}, ${modulo.id}, ${materia.id})">
              Fazer Atividade
            </button>
          </div>
        `;
      });

      html += `</div>`;
    });

    html += `</div>`;
    div.innerHTML += html;
  });
}

// =========================
// ATIVIDADE
// =========================
async function fazerAtividade(cursoId, moduloId, materiaId) {
  const curso = db.cursos.find(c => c.id == cursoId);
  if (!curso) return;

  const modulo = curso.modulos.find(m => m.id == moduloId);
  if (!modulo) return;

  const materia = modulo.materias.find(m => m.id == materiaId);
  if (!materia || !materia.atividades || materia.atividades.length === 0) {
    alert("Esta matéria não possui atividade.");
    return;
  }

  const atividade = materia.atividades[0];

  let resposta = prompt(
    atividade.pergunta + "\n" +
    atividade.opcoes.map((o, i) => `${i} - ${o}`).join("\n")
  );

  if (resposta == atividade.resposta) {
    alert("Correto!");

    usuarioLogado.progresso += 5;
    usuarioLogado.cursosConcluidos += 1;

    const { error } = await supabaseClient
      .from("profiles")
      .update({
        progresso: usuarioLogado.progresso,
        cursos_concluidos: usuarioLogado.cursosConcluidos
      })
      .eq("id", usuarioLogado.id);

    if (error) {
      alert("Erro ao salvar progresso: " + error.message);
      return;
    }

    atualizarDashboard();
  } else {
    alert("Errado");
  }
}

// =========================
// MENU
// =========================
function mostrar(sec) {
  document.getElementById("menu").style.display = "none";
  document.getElementById("cursos").style.display = "none";
  document.getElementById("perfil").style.display = "none";

  document.getElementById(sec).style.display = "block";
}

// =========================
// ALTERAR SENHA
// =========================
async function alterarSenha() {
  const senhaAtual = document.getElementById("senhaAtual").value.trim();
  const novaSenha = document.getElementById("novaSenha").value.trim();
  const confirmarSenha = document.getElementById("confirmarSenha").value.trim();

  if (!senhaAtual || !novaSenha || !confirmarSenha) {
    alert("Preencha todos os campos");
    return;
  }

  if (novaSenha.length < 6) {
    alert("A nova senha deve ter pelo menos 6 caracteres");
    return;
  }

  if (novaSenha !== confirmarSenha) {
    alert("As senhas não coincidem");
    return;
  }

  const { error: loginError } = await supabaseClient.auth.signInWithPassword({
    email: usuarioLogado.email,
    password: senhaAtual
  });

  if (loginError) {
    alert("Senha atual incorreta");
    return;
  }

  const { error: updateError } = await supabaseClient.auth.updateUser({
    password: novaSenha
  });

  if (updateError) {
    alert("Erro ao alterar senha: " + updateError.message);
    return;
  }

  alert("Senha alterada com sucesso!");

  document.getElementById("senhaAtual").value = "";
  document.getElementById("novaSenha").value = "";
  document.getElementById("confirmarSenha").value = "";
}

// =========================
// LOGOUT
// =========================
async function logout() {
  await supabaseClient.auth.signOut();
  usuarioLogado = null;
  location.reload();
}

// =========================
// AUTO LOGIN
// =========================
window.onload = async () => {
  await carregarBanco();

  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Erro ao recuperar sessão:", error);
    return;
  }

  if (data.session && data.session.user) {
    await carregarUsuarioLogado(data.session.user);
    if (usuarioLogado) {
      iniciarApp();
    }
  }
};
