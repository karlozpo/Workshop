const usuario = document.getElementById("usuario");
const contraseña = document.getElementById("contrasena");
const btnIngresar = document.getElementById("btningresar");

let credenciales = {};

btnIngresar.addEventListener("click", submitLogin);

function submitLogin(event) {
    event.preventDefault();
    credenciales.usuario = usuario.value;
    credenciales.contrasena = contrasena.value;
    fetch("/login", {
      method: "POST",
      body: JSON.stringify(credenciales),
      headers:{
        'content-type': 'application/json'
      }
    })
      .then((res) => {
        console.log(res.status);
            if (res.status == 201){
                window.location.replace("/backend.html");
            }else{
                //alert ("El usuario es invalido");
                Swal.fire({
                  icon: 'error',
                  title: 'Datos incorrectos',
                  text: 'El usuario o contraseña no es valido',
                });
            }

        return res.json();
      })
     // .then()
      .catch((err) => {
        alert(err);
      });




}