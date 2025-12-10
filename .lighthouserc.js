module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      maxWaitForLoad: 60000, // 60秒に延長（デフォルトは30秒）
      settings: {
        // タイムアウト設定
        maxWaitForFcp: 60000,
        maxWaitForLoad: 60000,
      },
    },
    puppeteerLaunchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      timeout: 60000, // 60秒に延長
    },
  },
};
