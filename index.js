const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const axios = require('axios');
require('dotenv').config();

const app = express().use(express.json());

// Memoria temporal para estados del usuario
const userStates = {};

// Configurar Google Sheets
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

app.post('/webhook', async (req, res) => {
    const entry = req.body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    const senderId = messaging?.sender?.id;

    if (messaging?.message && !messaging.message.is_echo) {
        const text = messaging.message.text;
        let state = userStates[senderId] || { step: 'INICIO' };

        try {
            if (state.step === 'INICIO') {
                await enviarMensaje(senderId, "¡Hola! Bienvenido a Interioriza. ¿Cuál es tu nombre y apellido?");
                userStates[senderId] = { step: 'ESPERANDO_NOMBRE' };
            } 
            else if (state.step === 'ESPERANDO_NOMBRE') {
                state.nombre = text;
                state.step = 'ESPERANDO_CIUDAD';
                await enviarMensaje(senderId, `¡Mucho gusto ${text}! ¿De qué ciudad nos escribes?`);
                userStates[senderId] = state;
            } 
            else if (state.step === 'ESPERANDO_CIUDAD') {
                state.ciudad = text;
                state.step = 'ESPERANDO_TELEFONO';
                await enviarMensaje(senderId, "Perfecto. Por último, indícanos tu número de teléfono.");
                userStates[senderId] = state;
            } 
            else if (state.step === 'ESPERANDO_TELEFONO') {
                state.telefono = text;
                await guardarEnSheets(state); // GUARDAR DATOS
                await enviarMensaje(senderId, "¡Gracias! Tus datos han sido registrados. Un asesor te contactará pronto.");
                delete userStates[senderId]; // Limpiar memoria
            }
        } catch (error) {
            console.error("Error en el flujo:", error);
        }
    }
    res.sendStatus(200);
});

async function guardarEnSheets(data) {
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.addRow({ Nombre: data.nombre, Ciudad: data.ciudad, Telefono: data.telefono });
}

async function enviarMensaje(recipientId, text) {
    await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`, {
        recipient: { id: recipientId },
        message: { text: text }
    });
}

app.listen(process.env.PORT || 3000);