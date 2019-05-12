const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");
const mongoose = require("mongoose");
const { Schema } = mongoose;
const chunk = require("lodash/chunk");

mongoose.connect("mongodb://localhost/hoodsense-viewit", {
  useNewUrlParser: true
});

const links = JSON.parse(fs.readFileSync("./links.json", "UTF8"));

const model = new Schema({
  address: String,
  location: {
    lat: Number,
    lng: Number
  },
  rent: Number,
  scrapeDate: Date,
  bedrooms: Number,
  description: String,
  isAirBnB: Boolean,
  size: String,
  amenity: {
    laundry: Boolean,
    hydro: Boolean,
    gas: Boolean,
    parking: Boolean,
    dishwasher: Boolean,
    ac: Boolean,
    yard: Boolean,
    balconyOrDeck: Boolean,
    fridgeOrStove: Boolean
  }
});

const Apartment = mongoose.model("Apartment", model);

function getSingleListingPage(url) {
  return () => axios.get(url);
}

const chunkedLinks = chunk(links, 10);
let count = 0;
chunkedLinks
  .reduce((p, curr) => {
    return p.then(() => {
      count++;
      console.log(`Getting ${count * 10} 🏠 listings of from ${links.length}`);
      return new Promise(async res => {
        const listings = curr.map(getSingleListingPage).map(fn => fn());
        const pages = await Promise.all(listings);
        const apartmentRequests = pages
          .map(({ data }) => data)
          .filter(page => {
            const $ = cheerio.load(page);

            return $('[data-fancybox="MGallery"]').attr("href") !== "#";
          })
          .map(page => {
            const $ = cheerio.load(page);

            const map = $('[data-fancybox="MGallery"]').attr("href");
            // Easier than a regex 🙃)
            const latLng = decodeURI(map)
              .split("|")[2]
              .split("&")[0]
              .split(",");
            const amenityList = Array.from(
              $(".listingDetails-ammenities-yes").map((_, item) => {
                return $(item)
                  .text()
                  .trim();
              })
            );

            const bedrooms = parseInt(
              $(".s-listingDetails-rooms")
                .parent("span")
                .text()
                .trim()
            );

            const apartment = {
              description: $(".listingDetails-description p").text(),
              bedrooms: bedrooms || 0,
              price: $(".listingHead-price")
                .text()
                .trim(),
              location: {
                lat: parseFloat(latLng[0]),
                lng: parseFloat(latLng[1])
              },
              scrapeDate: Date.now(),
              amenity: {
                laundry: amenityList.includes("Laundry"),
                hydro: amenityList.includes("Hydro"),
                gas: amenityList.includes("Gas"),
                parking: amenityList.includes("Parking"),
                dishwasher: amenityList.includes("Dishwasher"),
                ac: amenityList.includes("AC"),
                yard: amenityList.includes("Yard"),
                balconyOrDeck: amenityList.includes("Balcony / Deck"),
                fridgeOrStove: amenityList.includes("Fridge / Stove")
              }
            };
            const apt = new Apartment(apartment);
            return apt.save();
          });

        await Promise.all(apartmentRequests);
        res();
      });
    });
  }, Promise.resolve())
  .then(() => {
    console.log(`All done 🎉`);
    process.exit(0);
  });
