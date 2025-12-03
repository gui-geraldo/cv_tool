const express = require('express');
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');

// ---- REGISTRA O HELPER formatDates ---- //
handlebars.registerHelper('formatDates', function (dateRange) {
    if (!dateRange) return '';

    const [start, end] = dateRange.split(';');

    function format(date) {
        if (!date) return null;

        const parts = date.split('-');
        const year = parts[0];
        const month = parts[1] ? parseInt(parts[1]) : null;

        const meses = [
            "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
            "Jul", "Ago", "Set", "Out", "Nov", "Dez"
        ];

        return month ? `${meses[month - 1]}/${year}` : year;
    }

    const startFormatted = format(start);
    const endFormatted = format(end) || "Atual";

    return `${startFormatted} - ${endFormatted}`;
});


const app = express();
const PORT = 3000;
const BASE_URL = process.env.BASE_URL;

app.use(cors());
app.use(express.json());

const TEMPLATE_PATH = path.join(__dirname, 'templates', 'resume.html');
const PDF_OUTPUT_PATH = path.join(__dirname, 'public', 'pdfs');

// Setup inicial
fs.ensureDirSync(PDF_OUTPUT_PATH);
fs.ensureDirSync(path.join(__dirname, 'templates'));

if (!fs.existsSync(TEMPLATE_PATH)) {
    // Template padrão simplificado para teste
    fs.writeFileSync(TEMPLATE_PATH, '<html><body><h1>{{nome}}</h1><p>{{email}}</p></body></html>');
}

// ROTA 1: Ler o Template (para o Admin mostrar na tela)
app.get('/api/template', async (req, res) => {
    try {
        const html = await fs.readFile(TEMPLATE_PATH, 'utf-8');
        res.json({ html });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ROTA 2: Salvar Template
app.post('/api/template', async (req, res) => {
    try {
        await fs.writeFile(TEMPLATE_PATH, req.body.html);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ROTA 3: Gerar PDF
app.post('/api/generate', async (req, res) => {
    console.log("Recebendo pedido de geração de PDF...");
    try {
        const data = req.body;
        const htmlTemplate = await fs.readFile(TEMPLATE_PATH, 'utf-8');
        const template = handlebars.compile(htmlTemplate);
        const htmlFinal = template(data);

        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: 'new'
        });
        const page = await browser.newPage();
        await page.setContent(htmlFinal, { waitUntil: 'networkidle0' });
        
        const filename = `resume-${Date.now()}.pdf`;
        const filepath = path.join(PDF_OUTPUT_PATH, filename);

        await page.pdf({ path: filepath, format: 'A4', printBackground: true });
        await browser.close();

        // Retorna a URL pública que o NGINX vai servir
        res.json({
            status: 'success',
            download_url: `${BASE_URL}/pdfs/${filename}`
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar PDF', details: error.message });
    }
});

app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));