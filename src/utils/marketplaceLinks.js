/**
 * Generate marketplace search links based on category
 * 
 * Site-specific query strategies:
 * - eBay: Handles detailed queries well (brand + item + era + details)
 * - Discogs: Needs ONLY artist + title (no format, year, label, or catalog numbers)
 * - Reverb: Good with broad instrument/gear terms
 * - Auction sites: Maker + object type + era
 * - Most retail sites: Broad 2-4 word queries work best
 */
export const getMarketplaceLinks = (category, searchTerms, broadTerms, discogsTerms, auctionTerms) => {
  if (!searchTerms) return [];
  
  // eBay gets the full detailed query
  const ebayQuery = encodeURIComponent(searchTerms);
  
  // Derive broad terms if not provided (first 3-4 meaningful words)
  const derivedBroadTerms = searchTerms
    .replace(/\b(vinyl|record|lp|cd|book|vintage|antique|circa|c\.|ca\.)\b/gi, '')
    .replace(/\b\d{4}\b/g, '') // Remove years
    .replace(/\b[A-Z]{2,3}\s*\d+\b/g, '') // Remove catalog numbers like "CL 1412"
    .trim()
    .split(" ")
    .filter(w => w.length > 2)
    .slice(0, 4)
    .join(" ");
  const broadQuery = encodeURIComponent(broadTerms || derivedBroadTerms || searchTerms.split(" ").slice(0, 3).join(" "));
  
  // Discogs needs very clean queries - artist + album only
  const cleanDiscogsQuery = discogsTerms 
    ? encodeURIComponent(discogsTerms)
    : encodeURIComponent(
        searchTerms
          .replace(/\b(vinyl|record|lp|cd|album|12"|7"|45|33|rpm|mono|stereo|reissue|repress|original|pressing)\b/gi, '')
          .replace(/\b\d{4}\b/g, '')
          .replace(/\b[A-Z]{2,}\s*[-]?\s*\d+\b/g, '')
          .replace(/\b(Columbia|Atlantic|Motown|Capitol|RCA|Decca|Mercury|Verve|Blue Note|Impulse|Prestige)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim()
          .split(" ")
          .slice(0, 5)
          .join(" ")
      );
  
  // Auction sites get maker/artist + type + era
  const auctionQuery = encodeURIComponent(auctionTerms || broadTerms || derivedBroadTerms);
  
  const cat = (category || "").toLowerCase();

  const links = [
    {
      name: "eBay Sold",
      domain: "ebay.com",
      url: `https://www.ebay.com/sch/i.html?_nkw=${ebayQuery}&_sacat=0&LH_Sold=1&LH_Complete=1`,
      color: "text-blue-700 bg-blue-50 border-blue-200",
    },
    {
      name: "Google Images",
      domain: "google.com",
      url: `https://www.google.com/search?q=${broadQuery}&tbm=isch`,
      color: "text-stone-700 bg-stone-50 border-stone-200",
    },
  ];

  const isJewelry =
    cat.includes("jewelry") ||
    cat.includes("brooch") ||
    cat.includes("ring") ||
    cat.includes("necklace") ||
    cat.includes("bracelet") ||
    cat.includes("watch");
  const isDecor =
    cat.includes("furniture") ||
    cat.includes("lighting") ||
    cat.includes("decor") ||
    cat.includes("rug") ||
    cat.includes("ceramic") ||
    cat.includes("glass") ||
    cat.includes("pottery");
  const isArt =
    cat.includes("art") ||
    cat.includes("painting") ||
    cat.includes("print") ||
    cat.includes("sculpture");
  const isFashion = 
    cat.includes("clothing") ||
    cat.includes("fashion") ||
    cat.includes("bag") ||
    cat.includes("shoe") ||
    cat.includes("accessory");
  const isMusic = 
    cat.includes("record") ||
    cat.includes("vinyl") ||
    cat.includes("lp") ||
    cat.includes("music") ||
    cat.includes("instrument");
  const isAuto = 
    cat.includes("car") ||
    cat.includes("auto") ||
    cat.includes("vehicle") ||
    cat.includes("motor");
  const isBooks = 
    cat.includes("book") ||
    cat.includes("ephemera");
  const isCollectibles = 
    cat.includes("collectible") ||
    cat.includes("toy") ||
    cat.includes("card") ||
    cat.includes("comic");

  if (isJewelry) {
    links.push({
      name: "Ruby Lane",
      url: `https://www.rubylane.com/search?q=${broadQuery}`,
      color: "text-rose-700 bg-rose-50 border-rose-200",
    });
    links.push({
      name: "The RealReal",
      url: `https://www.therealreal.com/products?keywords=${broadQuery}`,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    });
    links.push({
      name: "1stDibs",
      url: `https://www.1stdibs.com/search/?q=${broadQuery}`,
      color: "text-amber-700 bg-amber-50 border-amber-200",
    });
  } else if (isDecor) {
    links.push({
      name: "Chairish",
      url: `https://www.chairish.com/search?q=${broadQuery}`,
      color: "text-pink-700 bg-pink-50 border-pink-200",
    });
    links.push({
      name: "1stDibs",
      url: `https://www.1stdibs.com/search/?q=${broadQuery}`,
      color: "text-amber-700 bg-amber-50 border-amber-200",
    });
    links.push({
      name: "Pamono",
      url: `https://www.pamono.com/catalogsearch/result/?q=${broadQuery}`,
      color: "text-stone-800 bg-stone-100 border-stone-300",
    });
  } else if (isArt) {
    links.push({
      name: "1stDibs",
      url: `https://www.1stdibs.com/search/?q=${broadQuery}`,
      color: "text-amber-700 bg-amber-50 border-amber-200",
    });
    links.push({
      name: "LiveAuctioneers",
      url: `https://www.liveauctioneers.com/search/?keyword=${auctionQuery}&sort=relevance&status=archive`,
      color: "text-stone-800 bg-stone-100 border-stone-300",
    });
    links.push({
      name: "Artsy",
      url: `https://www.artsy.net/search?term=${broadQuery}`,
      color: "text-purple-700 bg-purple-50 border-purple-200",
    });
  } else if (isFashion) {
    links.push({
      name: "Poshmark",
      url: `https://poshmark.com/search?query=${broadQuery}`,
      color: "text-red-700 bg-red-50 border-red-200",
    });
    links.push({
      name: "Depop",
      url: `https://www.depop.com/search/?q=${broadQuery}`,
      color: "text-red-600 bg-white border-red-600",
    });
    links.push({
      name: "The RealReal",
      url: `https://www.therealreal.com/products?keywords=${broadQuery}`,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    });
    links.push({
      name: "Grailed",
      url: `https://www.grailed.com/shop?keyword=${broadQuery}`,
      color: "text-stone-800 bg-stone-100 border-stone-300",
    });
    links.push({
      name: "Vestiaire",
      url: `https://us.vestiairecollective.com/search/?q=${broadQuery}`,
      color: "text-orange-700 bg-orange-50 border-orange-200",
    });
  } else if (isMusic) {
    links.push({
      name: "Discogs",
      url: `https://www.discogs.com/search/?q=${cleanDiscogsQuery}&type=all`,
      color: "text-stone-800 bg-yellow-50 border-yellow-200",
    });
    links.push({
      name: "Reverb",
      url: `https://reverb.com/marketplace?query=${broadQuery}`,
      color: "text-orange-600 bg-orange-50 border-orange-200",
    });
  } else if (isAuto) {
    links.push({
      name: "Bring a Trailer",
      url: `https://bringatrailer.com/search/?s=${broadQuery}`,
      color: "text-stone-800 bg-stone-200 border-stone-400",
    });
    links.push({
      name: "Hemmings",
      url: `https://www.hemmings.com/classifieds?q=${broadQuery}`,
      color: "text-blue-800 bg-blue-100 border-blue-300",
    });
    links.push({
      name: "ClassicCars",
      url: `https://classiccars.com/listings/find?q=${broadQuery}`,
      color: "text-red-800 bg-red-100 border-red-300",
    });
  } else if (isBooks) {
    links.push({
      name: "AbeBooks",
      url: `https://www.abebooks.com/servlet/SearchResults?sts=t&kn=${broadQuery}`,
      color: "text-red-700 bg-red-50 border-red-200",
    });
  } else if (isCollectibles) {
    links.push({
      name: "Mercari",
      url: `https://www.mercari.com/search/?keyword=${broadQuery}`,
      color: "text-purple-700 bg-purple-50 border-purple-200",
    });
  } else {
    links.push({
      name: "Etsy",
      url: `https://www.etsy.com/search?q=${broadQuery}`,
      color: "text-orange-700 bg-orange-50 border-orange-200",
    });
    links.push({
      name: "Mercari",
      url: `https://www.mercari.com/search/?keyword=${broadQuery}`,
      color: "text-purple-700 bg-purple-50 border-purple-200",
    });
  }
  
  return links;
};
