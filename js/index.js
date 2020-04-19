const formulario = document.getElementById("formularioRegistro");
const fname = document.getElementById("fname");
const email = document.getElementById("email");
const telefono = document.getElementById("phone");
let registro = {};

formulario.addEventListener("submit", submitRegistro);

function submitRegistro(event) {
  event.preventDefault();
  console.log(fname.value, email.value, telefono.value);
  registro.nombre = fname.value;
  registro.telefono = telefono.value;
  registro.email = email.value;
  fetch("/inscritos", {
    method: "POST",
    body: JSON.stringify(registro),
    headers:{
      'content-type': 'application/json'
    }
  })
    .then((res) => {
      return res.json();
    })
    .then((res) => {
      // llama la libreria de sweetalert
      Swal.fire(res);
      // si la respuesta es tiene exito se limpian los campos
      if(res.icon=="success"){
        fname.value="";
        telefono.value="";
        email.value="";
      }
 
    })
    .catch((err) => {
      alert(err);
    });
}
