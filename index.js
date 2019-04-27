const puppeteer = require("puppeteer");
const fs = require("fs");

const zones = [353, 49, 354, 355, 14, 356];
let links = [];

function getLinks(page, count, zoneID) {
  return new Promise(async (res, rej) => {
    console.log(`-- Grabbing 🔗's`);
    await page.screenshot({ path: `images/page${count}-${zoneID}.png` });
    try {
      const anchors = await page.$$eval("article a", anchors =>
        anchors.map(elm => elm.href)
      );
      links = [...links, ...anchors];
      res();
    } catch {
      rej(() => process.exit(0));
    }
  });
}

function loadPage(zoneID) {
  return new Promise(async res => {
    console.log("📄 Loading a Page 📄");
    // launch the browsers
    const browser = await puppeteer.launch();
    // get a new page
    const page = await browser.newPage();
    // Go to the main Toronto T1 page
    // ** TODO get all the other T zones
    await page.goto(`https://beta.viewit.ca/city/Toronto.aspx?CID=${zoneID}`);
    // Click the button
    // You neeed to wait for the navitation first and then click
    await Promise.all([
      page.waitForNavigation({
        waitUntil: "domcontentloaded"
      }),
      page.click("#ctl00_ContentMain_ucSearchDetails1_btnList")
    ]);
    // Once on new page, we need to get the URL's for the listings
    // Store them in the `links` array
    let next = await page.$$(
      "#ctl00_ContentMain_UcListingsGrid_UcSearchBar_UcPagination_lnkNext"
    );
    // Check if there is a next pagination link
    let count = 0;
    while (next !== null) {
      count++;
      await getLinks(page, count, zoneID);
      next = await page.$$(
        "#ctl00_ContentMain_UcListingsGrid_UcSearchBar_UcPagination_lnkNext"
      );
      if (next.length === 0) {
        next = null;
      } else {
        await Promise.all([
          page.waitForNavigation({
            waitUntil: "domcontentloaded"
          }),
          page.click(
            "#ctl00_ContentMain_UcListingsGrid_UcSearchBar_UcPagination_lnkNext"
          )
        ]);
      }
    }
    await browser.close();
    res();
  });
}

zones
  .reduce((p, zoneID) => {
    return p.then(() => loadPage(zoneID));
  }, Promise.resolve())
  .then(() => {
    const unqilinks = new Set(links);
    fs.writeFile("links.json", JSON.stringify(Array.from(unqilinks)), () =>
      console.log("🎉 All done!")
    );
  });
