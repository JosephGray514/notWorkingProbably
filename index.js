import express from "express";
import bodyParser from "body-parser";
import request from "request";
import { config } from "dotenv";
config();

import { TextLoader } from "langchain/document_loaders/fs/text";
import { CharacterTextSplitter } from "langchain/text_splitter";

///////////

import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { FaissStore } from "langchain/vectorstores/faiss";
import { OpenAI } from "langchain/llms/openai";
import { RetrievalQAChain, loadQAStuffChain } from "langchain/chains";

const app = express().use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

/////////////Sube el documento a Faisstore//////////////

const upload = async () => {
  const loader = new TextLoader("./Texto.txt");

  const docs = await loader.load();

  const splitter = new CharacterTextSplitter({
    chunkSize: 200,
    chunkOverlap: 50,
  });

  const documents = await splitter.splitDocuments(docs);
  if (documents) {
    console.log("Documento subido");
  }
  
  const embeddings = new OpenAIEmbeddings();

  const vectorstore = await FaissStore.fromDocuments(documents, embeddings);
  await vectorstore.save("./");
};



// Ruta para el método GET
app.get("/webhook", async(req, res) => {
  console.log("GET: webhook");

  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

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
app.post("/webhook", async(req, res) => {
  console.log("POST: webhook");

  const body = req.body;

  if (body.object === "page") {
    body.entry.forEach((entry) => {
      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);

      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log("Sender PSID: " + sender_psid + "  //");

      // Get the message sent
      let text = webhook_event.message.text;
      console.log("Text: " + text + "  //");

      if (webhook_event.message) {
        handleMessages(sender_psid, webhook_event.message);
      } else if (webhook_event.postback) {
        handlePostBack(sender_psid, webhook_event.postback);
      }
    });
    res.status(200).send("EVENTO RECIBIDO");
  } else {
    res.sendStatus(404);
  }
});

async function handleMessages(sender_psid, received_message) {
  let response;
  if (received_message.text) {
    const question = received_message.text;
    console.log("Hola! Estoy en el handleMessage" + "\n");
    console.log("Este es el question: " + question + "\n");
    const aiRespond = await ai(question);
    response = {
      text: "Escribiste esto : "+ received_message.text,
    };
  }
  callSendAPI(sender_psid, response);
}

function handlePostBack(sender_psid, received_postback) {}

function callSendAPI(sender_psid, response) {
  const requestBody = {
    recipient: {
      id: sender_psid,
    },
    message: response,
  };

  request(
    {
      url: "https://graph.facebook.com/v18.0/me/messages",
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: "POST",
      json: requestBody,
    },
    (err, res, body) => {
      if (!err) {
        console.log("Mensaje enviado de vuelta");
      } else {
        console.error("Imposible enviar mensaje");
      }
    }
  );
}

const ai = async (question) => {
  ////////////////
  const embeddings = new OpenAIEmbeddings();
  const vectorStore = await FaissStore.load("./", embeddings);

  const model = new OpenAI({ temperature: 0.2 });

  const chain = new RetrievalQAChain({
    combineDocumentsChain: loadQAStuffChain(model),
    retriever: vectorStore.asRetriever(),
    returnSourceDocuments: true,
  });

  const response = await chain.call({
    query: question,
  });

  const answer = response.text;

  return answer;
};

app.get("/", async (req, res) => {
  res.status(200).send("Hola");

});

// Iniciar el servidor en un puerto específico
const PORT = process.env.PORT || 3000;
app.listen(PORT, async() => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
  await upload()
});
