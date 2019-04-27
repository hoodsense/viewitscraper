const puppeteer = require("puppeteer");

const zones = [353, 49, 354, 355, 14, 356];

(async () => {
  // launch the browsers
  const browser = await puppeteer.launch();
  // get a new page
  const page = await browser.newPage();
  // Go to the main Toronto T1 page
  // ** TODO get all the other T zones
  await page.goto("https://beta.viewit.ca/city/Toronto.aspx?CID=353");
  await Promise.all([
    page.waitForNavigation({
      waitUntil: "domcontentloaded"
    }),
    page.click("#ctl00_ContentMain_ucSearchDetails1_btnList")
  ]);
  await page.screenshot({ path: "page.png" });

  process.exit(0);
})();
