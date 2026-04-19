exports.fetchBiometricData = async (fromDate, toDate) => {
  try {
    const authString = "Aura123:AbhimanueTJ:Jacobbarry@123:true";
    const encodedAuth = Buffer.from(authString).toString("base64");

    const url = `https://api.etimeoffice.com/api/DownloadInOutPunchData?Empcode=ALL&FromDate=${fromDate}&ToDate=${toDate}`;

    console.log("Biometric URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${encodedAuth}`,
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    console.log("Raw Response:", text);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      throw new Error("Invalid JSON response from biometric API");
    }

    if (result.Error) {
      throw new Error(result.Msg || "Biometric API error");
    }

    if (!Array.isArray(result.InOutPunchData)) {
      throw new Error("Invalid data format from biometric API");
    }

    return result;

  } catch (error) {
    console.error("Biometric fetch error:", error.message);
    throw error;
  }
};