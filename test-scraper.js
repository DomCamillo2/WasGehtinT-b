async function testSchlachthausScraperr() {
  try {
    const cheerio = await import("cheerio");
    const response = await fetch("https://www.schlachthaus-tuebingen.de/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.log("Response not OK:", response.status);
      return;
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    console.log("HTML length:", html.length);
    
    // Get all text content
    const bodyText = $("body").text();
    const lines = bodyText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    
    console.log("Total lines:", lines.length);
    console.log("\nFirst 50 lines:");
    lines.slice(0, 50).forEach((line, i) => {
      console.log(`${i}: ${line}`);
    });

    // Test the regex
    const eventPattern = /(MO|DI|MI|DO|FR|SA|SO)\s+(\d{1,2})\.(\d{1,2})\.\s*\|\s*(.+?)\s*\|\s*(\d{1,2}):(\d{2})/gi;
    
    console.log("\n\nSearching for events...");
    let eventCount = 0;
    const combinedText = lines.join(" ");
    let match;
    while ((match = eventPattern.exec(combinedText)) !== null) {
      console.log(`Found event: ${match[0]}`);
      eventCount++;
    }
    
    console.log(`\nTotal events found: ${eventCount}`);
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testSchlachthausScraperr();
