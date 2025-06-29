const bsiApiShopId = document.querySelector('[bsi-api-shop-id]')?.getAttribute('bsi-api-shop-id') || '';
const bsiApiBaseUrl = document.querySelector('[bsi-api-base-url]')?.getAttribute('bsi-api-base-url') || '';
const bsiApiSiteSerial = document.querySelector('[bsi-api-site-serial]')?.getAttribute('bsi-api-site-serial') || '';
const bsiApiCheckIdUrl = document.querySelector('[bsi-api-check-id-url]')?.getAttribute('bsi-api-check-id-url') || '';
const bsiApiGetOtpUrl = document.querySelector('[bsi-api-get-otp-url]')?.getAttribute('bsi-api-get-otp-url') || '';
const shopifyCustomerId = __st.cid;

async function shiseidoConnectCheck() {
  const shopId = bsiApiShopId;
  const siteSerial = bsiApiSiteSerial;
  const proxyUrl = bsiApiBaseUrl;
  const checkIdUrl = bsiApiCheckIdUrl;

  const url = proxyUrl;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      site_serial: siteSerial,
      tkisk_cd: shopId,
      tkisk_ec_id: String(shopifyCustomerId),
      target_url: checkIdUrl,
    }),
  });

  const data = await response.json();

  console.log(data);

  if (data.id_renkei_kbn === '2') {
    const statusElements = document.querySelectorAll('.bsi-connect-status');
    statusElements.forEach((element) => {
      element.classList.remove('tw-hidden');
    });
  } else {
    const statusElements = document.querySelectorAll('.bsi-connect-status-not-connected');
    statusElements.forEach((element) => {
      element.classList.remove('tw-hidden');
    });
  }

  return data.id_renkei_kbn;
}

async function getShiseidoConnectOtp() {
  console.log('getShiseidoConnectOtp');

  // フォールバック値を直接使用
  const shopId = bsiApiShopId;
  const siteSerial = bsiApiSiteSerial;
  const proxyUrl = bsiApiBaseUrl;
  const getOtpUrl = bsiApiGetOtpUrl;

  const url = proxyUrl;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      site_serial: siteSerial,
      tkisk_cd: shopId,
      tkisk_ec_id: String(shopifyCustomerId),
      target_url: getOtpUrl,
    }),
  });

  const data = await response.json();
  const aTags = document.querySelectorAll('a.shiseido-connect-register');
  aTags.forEach((aTag) => {
    aTag.href += data.onetime_password;
  });

  return data.onetime_password;
}

// 初期化処理
async function initializeShiseidoConnect() {
  console.log('initializeShiseidoConnect');
  try {
    await shiseidoConnectCheck();
    await getShiseidoConnectOtp();
  } catch (error) {
    console.error('Shiseido Connect初期化エラー:', error);
  }
}

// 初期化実行
initializeShiseidoConnect();
