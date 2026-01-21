const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const axios = require('axios');

const app = express().use(express.json());

// Memoria temporal para llevar el paso de cada usuario
const userStates = {}; 

// CONFIGURACIÓN GOOGLE SHEETS
const serviceAccountAuth = new JWT({
  email: 'TU_EMAIL_DE_GOOGLE_SERVICE_ACCOUNT',
  key: 'TU_PRIVATE_KEY_DE_GOOGLE',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet('ID_DE_TU_HOJA_DE_CALCULO', serviceAccountAuth);

app.post('/webhook', async (req, res) => {
    const entry = req.body.entry[0];
    const messaging = entry.messaging[0];
    const senderId = messaging.sender.id;

    // 1. Detectar inicio desde el Anuncio
    if (messaging.postback && messaging.postback.payload === 'START_FLOW') {
        userStates[senderId] = { step: 'ASK_NAME' };
        await enviarMensaje(senderId, "¡Excelente! ¿Cuál es tu nombre y apellido?");
    } 
    
    // 2. Procesar respuestas de texto
    else if (messaging.message && !messaging.message.is_echo) {
        const text = messaging.message.text;
        const state = userStates[senderId];

        if (state?.step === 'ASK_NAME') {
            state.nombre = text;
            state.step = 'ASK_CITY';
            await enviarMensaje(senderId, `Mucho gusto ${text}, ¿en qué ciudad te encuentras?`);
        } 
        else if (state?.step === 'ASK_CITY') {
            state.ciudad = text;
            state.step = 'ASK_PHONE';
            await enviarMensaje(senderId, "Perfecto. Por último, déjanos tu número de teléfono.");
        } 
        else if (state?.step === 'ASK_PHONE') {
            state.telefono = text;
            // GUARDAR EN GOOGLE SHEETS
            await guardarEnSheets(state);
            await enviarMensaje(senderId, "¡Gracias! Tus datos han sido registrados. Un asesor te contactará pronto.");
            delete userStates[senderId]; // Limpiar estado
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
    await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=TU_TOKEN`, {
        recipient: { id: recipientId },
        message: { text: text }
    });
}

app.listen(process.env.PORT || 3000, () => console.log('Bot activo'));