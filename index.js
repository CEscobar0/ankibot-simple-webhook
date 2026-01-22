const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express().use(bodyParser.json());

// Variables de entorno
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// 1. Verificación del Webhook para Meta
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFICADO');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// 2. Recepción de mensajes
app.post('/webhook', (req, res) => {
    const body = req.body;

    if (body.object === 'instagram') {
        body.entry.forEach(entry => {
            const messaging = entry.messaging[0];
            const senderId = messaging.sender.id;

            if (messaging.message && messaging.message.text) {
                console.log(`Mensaje recibido de ${senderId}: ${messaging.message.text}`);
                // Aquí iría tu lógica para pedir nombre, ciudad y teléfono
                enviarTexto(senderId, "¡Hola! Recibimos tu mensaje. ¿Cómo te llamas?");
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

async function enviarTexto(recipientId, text) {
    try {
        await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            recipient: { id: recipientId },
            message: { text: text }
        });
    } catch (error) {
        console.error("Error enviando mensaje:", error.response.data);
    }
}

app.listen(process.env.PORT || 3000, () => console.log('Servidor activo'));