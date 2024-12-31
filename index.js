const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

const outputFilePath = path.join(__dirname, 'h3_tags_output.txt');
const logFilePath = path.join(__dirname, 'scrape_log.txt');
const statusFilePath = path.join(__dirname, 'status.json');

// Initialize status file
if (!fs.existsSync(statusFilePath)) {
    fs.writeFileSync(statusFilePath, JSON.stringify({ running: false }));
}

const setStatus = (status) => {
    fs.writeFileSync(statusFilePath, JSON.stringify(status));
};

const getStatus = () => {
    return JSON.parse(fs.readFileSync(statusFilePath));
};

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Route to start scraping
app.get('/start-scraping', (req, res) => {
    const status = getStatus();
    if (status.running) {
        return res.send('Scraping is already in progress.');
    }

    setStatus({ running: true });

    exec('node scraper.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing scraper: ${error.message}`);
            return;
        }

        if (stderr) {
            console.error(`Scraper stderr: ${stderr}`);
            return;
        }

        console.log(`Scraper stdout: ${stdout}`);
        setStatus({ running: false });
    });

    res.send('Scraping has started.');
});

// Route to check server status
app.get('/ping', (req, res) => {
    res.send('Server is running.');
});

// Route to download the output file
app.get('/download-output', (req, res) => {
    res.download(outputFilePath, 'h3_tags_output.txt', (err) => {
        if (err) {
            res.status(500).send('Error occurred while downloading the file.');
        }
    });
});

// Serve the web console
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
