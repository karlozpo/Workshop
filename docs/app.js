const express = require("express");
const bodyParser = require("body-parser");
const server = express();


server.use(bodyParser.json());
server.use(express.static("public"));

let usuariosInscritos = [];

server.post("/login", (req, res) => {
  const { usuario, contrasena } = req.body;
  if (usuario === "admin" && contrasena === "admin") {
    res.status(201).json("Usuario Valido");
    
  } else {
    res.status(404).json("Usuario Invalido");
  }
});

server.get("/inscritos", (req, res) => {
  res.json(usuariosInscritos);
});

function validarUsuarioExiste(req, res, next) {
  const { nombre, telefono, email } = req.body;
  console.log(req.body);
  let dominio = email.split("@");
  console.log(dominio);

  if (
    dominio.find((email) => email === "yahoo.com") ||
    dominio.find((email) => email === "hotmail.com") ||
    dominio.find((email) => email === "gmail.com")
  ) {
   // alert(json("El email no es valido"));
   //res.status(409).json("El email no es valido");
   res.status(409).json({
    icon: 'error',
    title: 'Oops...',
    text: 'El email no es valido',
  });
   
  } else if (usuariosInscritos.find((usuario) => usuario.email === email)) {
   // alert("El usuario ya existe");
    res.status(408).json({
      icon: 'error',
      title: 'Oops...',
      text: 'El usuario ya existe',
    });
  } else {
    next();
  }
}

server.post("/inscritos", validarUsuarioExiste, (req, res) => {
  const { body } = req;
  usuariosInscritos.push(body);
  //res.status(201).json("El usuario registrado EXITOSAMENTE!");
  res.status(201).json({
    icon: 'success',
    title: 'Felicitaciones',
    text: 'Te has registrado EXITOSAMENTE!',
  });
 

});

server.listen(3000, () => {
  console.log("Servidor creado exitosamente");
});
