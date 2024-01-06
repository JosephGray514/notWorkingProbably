import express from 'express'

const app = express()

// Ruta para el método GET
app.get('/webhook', (req, res) => {
    console.log('GET: webhook');

    const VERIFY_TOKEN = 'stringUnicoParaTuAplicacion'

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if(mode && token){
        if(mode === 'subscribe' && token === VERIFY_TOKEN){
            console.log('WEBHOOK VERIFICADO')
            res.status(200).send(challenge)
        }else{
            res.sendStatus(404);
        }
    }else{
        res.sendStatus(404);
    }
});

// Ruta para el método POST
app.post('/webhook', (req, res) => {
    
});

app.get('/', (req,res) =>{
    res.status(200).send('Hello World I am Joseph')
});

// Iniciar el servidor en un puerto específico
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});