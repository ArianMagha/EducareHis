let db = {};
let usuarioLogado = null;

// carregar banco
fetch("db.json")
.then(res => res.json())
.then(data => {
  db = data;
});

// LOGIN
function login(){
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  const user = db.usuarios.find(u => u.email == email && u.senha == senha);

  if(user){
    usuarioLogado = user;
    localStorage.setItem("user", JSON.stringify(user));
    iniciarApp();
  } else {
    alert("Login inválido");
  }
}

// INICIAR APP
function iniciarApp(){
  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "flex";

  document.getElementById("nomeUser").innerText = usuarioLogado.nome;
  document.getElementById("emailUser").innerText = usuarioLogado.email;

  atualizarDashboard();
  carregarCursos();
}

// DASHBOARD
function atualizarDashboard(){
  document.getElementById("progresso").innerText =
    "Progresso: " + usuarioLogado.progresso + "%";

  document.getElementById("concluidos").innerText =
    "Cursos concluídos: " + usuarioLogado.cursosConcluidos;
}

// CURSOS
function carregarCursos(){
  const div = document.getElementById("cursos");
  div.innerHTML = "";

  db.cursos.forEach(curso => {

    div.innerHTML += `
      <div class="card">
        <h3>${curso.titulo}</h3>
        <p>${curso.descricao}</p>

        <iframe src="${curso.video}" width="100%" height="200"></iframe>

        <button onclick="fazerAtividade(${curso.id})">Atividade</button>
      </div>
    `;
  });
}

// ATIVIDADE
function fazerAtividade(id){
  const curso = db.cursos.find(c => c.id == id);
  const atividade = curso.atividades[0];

  let resposta = prompt(
    atividade.pergunta + "\n" +
    atividade.opcoes.map((o,i)=>`${i} - ${o}`).join("\n")
  );

  if(resposta == atividade.resposta){
    alert("Correto!");

    usuarioLogado.progresso += 10;
    usuarioLogado.cursosConcluidos += 1;

    localStorage.setItem("user", JSON.stringify(usuarioLogado));
    atualizarDashboard();

  } else {
    alert("Errado");
  }
}

// MENU
function mostrar(sec){
  document.getElementById("menu").style.display = "none";
  document.getElementById("cursos").style.display = "none";
  document.getElementById("perfil").style.display = "none";

  document.getElementById(sec).style.display = "block";
}

// LOGOUT
function logout(){
  localStorage.removeItem("user");
  location.reload();
}

// AUTO LOGIN
window.onload = () => {
  const user = localStorage.getItem("user");
  if(user){
    usuarioLogado = JSON.parse(user);
    iniciarApp();
  }
};