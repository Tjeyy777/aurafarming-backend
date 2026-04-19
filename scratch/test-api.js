// Using global fetch available in Node.js 22

async function test(url) {
    console.log(`\nTesting: ${url}`);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log(`Response Snippet: ${text.substring(0, 200)}`);
    } catch (err) {
        console.error(`Fetch Error: ${err.message}`);
    }
}

const fromDate = "01/04/2026";
const toDate = "05/04/2026";
const apiKeyStr = "Aura123:AbhimanueTJ:Jacobbarry@123:true";
const [apiKey, user, pass, isAdmin] = apiKeyStr.split(":");

// Try 1: Whole string as APIKey (current)
test(`https://api.etimeoffice.com/api/DownloadInOutPunchData?Empcode=ALL&FromDate=${fromDate}&ToDate=${toDate}&APIKey=${encodeURIComponent(apiKeyStr)}`);

// Try 2: Separated parameters (Common eTimeOffice pattern)
test(`https://api.etimeoffice.com/api/DownloadInOutPunchData?Empcode=ALL&FromDate=${fromDate}&ToDate=${toDate}&APIKey=${apiKey}&UserName=${user}&Password=${pass}&IsAdmin=${isAdmin}`);

// Try 3: Without APIKey at all (User's shared working link)
test(`https://api.etimeoffice.com/api/DownloadInOutPunchData?Empcode=ALL&FromDate=${fromDate}&ToDate=${toDate}`);
