const datosUsuario = document.getElementById("UsuariosRegistrados");
const usuario = document.getElementById("user-name");
const telefono =  document.getElementById("user-phone");
const email =  document.getElementById("user-email");

function obtenerDatos(){

fetch("/inscritos", {
    method: "GET",
    //body: JSON.stringify(credenciales),
    headers:{
      'content-type': 'application/json'
    }
  })
    .then((res) => {
      console.log(res);
      return res.json();
    })
   .then((res) => {
    console.log(res);
    for (let i = 0; i < res.length; i++) {
        let fila = document.createElement("tr");
        let celdaNombre = document.createElement ("td");
        let celdaEmail = document.createElement ("td");
        let celdaTelefono = document.createElement ("td");
        fila.classList.add("estiloLinea");
        celdaNombre.classList.add("col-sm-4") ;
        celdaEmail.classList.add("col-sm-4") ;
        celdaTelefono.classList.add("col-sm-4") ;
        celdaNombre.innerHTML= res[i].nombre;
        celdaEmail.innerHTML= res[i].email;
        celdaTelefono.innerHTML= res[i].telefono;
        fila.appendChild(celdaNombre);
        fila.appendChild(celdaTelefono);
        fila.appendChild(celdaEmail);
        datosUsuario.appendChild(fila);
    }
    

})
    .catch((err) => {
      alert(err);
    });

    
}

obtenerDatos();
