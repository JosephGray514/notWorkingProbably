import express from "express";
import { config } from "dotenv";
config();

import { TextLoader } from "langchain/document_loaders/fs/text";
import { CharacterTextSplitter } from "langchain/text_splitter";

///////////

import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { FaissStore } from "langchain/vectorstores/faiss";
import { OpenAI } from "langchain/llms/openai";
import { RetrievalQAChain, loadQAStuffChain } from "langchain/chains";

const app = express();

// Ruta para el método GET
app.get("/webhook", (req, res) => {
  console.log("GET: webhook");

  const VERIFY_TOKEN = "stringUnicoParaTuAplicacion";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK VERIFICADO");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(404);
    }
  } else {
    res.sendStatus(404);
  }
});

// Ruta para el método POST
app.post("/webhook", (req, res) => {
  console.log("POST: webhook");

  const body = req.body;

  if (body.object === "page") {
    body.entry.forEach(entry =>{
      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      // console.log(webhook_event);

      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log("Sender PSID: " + sender_psid + "  //");

      // Get the message sent
      let text = webhook_event.message.text;
      console.log("Text: " + text + "  //");

    });
    res.status(200).send("EVENTO RECIBIDO");
  } else {
    res.sendStatus(404);
  }
});

const ai = async (question) => {
  const loader = new TextLoader("./Texto.txt");

  const docs = await loader.load();

  const splitter = new CharacterTextSplitter({
    chunkSize: 200,
    chunkOverlap: 50,
  });

  const documents = await splitter.splitDocuments(docs);
  console.log(documents);

  const embeddings = new OpenAIEmbeddings();

  const vectorstore = await FaissStore.fromDocuments(documents, embeddings);
  await vectorstore.save("./");

  ////////////////

  const vectorStore = await FaissStore.load("./", embeddings);

  const model = new OpenAI({ temperature: 0 });

  const chain = new RetrievalQAChain({
    combineDocumentsChain: loadQAStuffChain(model),
    retriever: vectorStore.asRetriever(),
    returnSourceDocuments: true,
  });

  const response = await chain.call({
    query: "Como puedo contactarlos?",
  });

  let answer = response.text;

  return answer;
};

app.get("/", async (req, res) => {
  res.status(200).send("Hola");
});

// Iniciar el servidor en un puerto específico
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
