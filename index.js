const puppeteer = require("puppeteer");

const zones = [353, 49, 354, 355, 14, 356];
const links = [];

function getLinks(page, count) {
  return new Promise(async (res, rej) => {
    console.log("new page");
    await page.screenshot({ path: `page${count}.png` });
    res();
  });
}

(async () => {
  // launch the browsers
  const browser = await puppeteer.launch();
  // get a new page
  const page = await browser.newPage();
  // Go to the main Toronto T1 page
  // ** TODO get all the other T zones
  await page.goto("https://beta.viewit.ca/city/Toronto.aspx?CID=353");
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
    await getLinks(page, count);
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

  process.exit(0);
})();
