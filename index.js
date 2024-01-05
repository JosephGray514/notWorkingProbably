import express from 'express'

const app = express()

app.get('/', (req,res) =>{
    res.status(200).send('Hello World I am Joseph')
});

// Iniciar el servidor en un puerto específico
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});