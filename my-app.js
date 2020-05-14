const {google} = require('googleapis')
require('dotenv').config()
const key = require('./key')
const _arr = require('lodash/array');
const puppeteer = require('puppeteer');

// Google sheets API v4 - update:  https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update
// INFO FOR SCOPES: https://developers.google.com/identity/protocols/oauth2/scopes

const client = new google.auth.JWT(
    key.client_email,
    null,
    key.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
)

// Checks for whether we can connect to the google sheets API, and then runs the main script!
client.authorize((err, tokens) => {
    if (err) {
        console.log(err)
        return
    } else {
        console.log('Connected!')
        runScript(client)
    }
})

// the management of running the scraping function and writing to Google sheets for all countries
const getDataUpdateSheet = async (countryNames, imgSrcArr, url, sheetsAPI) => {
    for (let i = 0; i < countryNames.length; i++) {
        const country = countryNames[i].replace(/ /g, '_')
        const newUrl = url + country
        let imageUrl = await scrape(newUrl)
        if (imageUrl) console.log(`Data retrived for country: ${country}`)
        imgSrcArr.push([imageUrl])
        // lucky that there are exactly  200 countries, and it's divisible by 10
        if (imgSrcArr.length == 10)  {
            await sheetsAPI.spreadsheets.values.update({
                spreadsheetId: process.env.SPREADSHEET_ID,
                range: `Sheet1!C${i-7}`,
                valueInputOption: 'USER_ENTERED',
                resource: {  values: imgSrcArr}
            })
            imgSrcArr.length = 0
        }
    }
    console.log('DONE')
}

// the actual scraping function
async function scrape (newUrl) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(newUrl);
    // USING WIKI
    try {
        const flagContent = await page.evaluate(() => document.querySelector('.image > img').src);
        browser.close();
        return flagContent
    } catch (e) {
        browser.close()
        console.log(e)
        console.log('URL where it broke: ', newUrl)
    }
}

// the script that does stuff with google sheets
const runScript =  async (client) => {
    const sheetsAPI = google.sheets({version: 'v4', auth: client})
    const readOptions = {
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Sheet1!A2:A265'
    }
    let url =  'https://en.wikipedia.org/wiki/'

    let res = await sheetsAPI.spreadsheets.values.get(readOptions)
    const countryNames = _arr.flatten(res.data.values)
    let imgSrcArr = []
    await getDataUpdateSheet(countryNames, imgSrcArr, url, sheetsAPI)
}
