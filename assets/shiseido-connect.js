// HTMLから取得する値をフォールバック用に保持
const fallbackCpbApiBaseUrl = document.querySelector('[cpb-api-base-url]')?.getAttribute('cpb-api-base-url') || '';
const fallbackCpbApiSiteSerial = document.querySelector('[cpb-api-site-serial]')?.getAttribute('cpb-api-site-serial') || '';
const fallbackCpbApiCheckIdUrl = document.querySelector('[cpb-api-check-id-url]')?.getAttribute('cpb-api-check-id-url') || '';
const fallbackCpbApiGetOtpUrl = document.querySelector('[cpb-api-get-otp-url]')?.getAttribute('cpb-api-get-otp-url') || '';
const shopifyCustomerId = __st.cid;

console.log(shopifyCustomerId);

// Shopifyのメタフィールドを取得する関数
async function getShopMetafields() {
  const query = `
    query getShopMetafields {
      shop {
        metafield(namespace: "custom", key: "cpb_settings") {
          value
        }
        apiKey: metafield(namespace: "custom", key: "api_key") {
          value
        }
        siteCode: metafield(namespace: "custom", key: "site_code") {
          value
        }
        baseUrl: metafield(namespace: "custom", key: "base_url") {
          value
        }
        checkIdUrl: metafield(namespace: "custom", key: "check_id_url") {
          value
        }
        getOtpUrl: metafield(namespace: "custom", key: "get_otp_url") {
          value
        }
      }
    }
  `;

  try {
    const response = await fetch('/api/2023-10/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': window.Shopify.storefront_access_token || ''
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return null;
    }

    return data.data.shop;
  } catch (error) {
    console.error('メタフィールドの取得に失敗しました:', error);
    return null;
  }
}

async function shiseidoConnectCheck() {
  console.log('shiseidoConnectCheck');
  // メタフィールドから設定値を取得
  const shopMetafields = await getShopMetafields();
  console.log('shopMetafields', shopMetafields);

  // メタフィールドの値を使用（フォールバック値も設定）
  const apiKey = shopMetafields?.apiKey?.value || '627714';
  const siteCode = shopMetafields?.siteCode?.value || fallbackCpbApiSiteSerial;
  const baseUrl = shopMetafields?.baseUrl?.value || fallbackCpbApiBaseUrl;
  const checkIdUrl = shopMetafields?.checkIdUrl?.value || fallbackCpbApiCheckIdUrl;

  const url = baseUrl;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      site_serial: siteCode,
      tkisk_cd: apiKey,
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
  // メタフィールドから設定値を取得
  const shopMetafields = await getShopMetafields();

  // メタフィールドの値を使用（フォールバック値も設定）
  const apiKey = shopMetafields?.apiKey?.value || '627714';
  const siteCode = shopMetafields?.siteCode?.value || fallbackCpbApiSiteSerial;
  const baseUrl = shopMetafields?.baseUrl?.value || fallbackCpbApiBaseUrl;
  const getOtpUrl = shopMetafields?.getOtpUrl?.value || fallbackCpbApiGetOtpUrl;

  const url = baseUrl;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      site_serial: siteCode,
      tkisk_cd: apiKey,
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
