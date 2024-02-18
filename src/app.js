const { newBlockHandler } = require('./newBlockUtils');
const { getProvider } = require('../utils/providers');
const { contractRecorder } = require('./newBlockUtils/nftContractListener');
const { logHandler } = require('../utils/log-handler');

const evmProvider = getProvider();
const evmProvider2 = getProvider(2);

evmProvider.on({ topics: [] }, (log) => logHandler(log, evmProvider));

evmProvider2.on('block', async (blockNumber) => {
  newBlockHandler(
    blockNumber,
    evmProvider2,
    async (blockDataWithTransactions) => {
      await contractRecorder(blockDataWithTransactions, evmProvider2);
    },
  );
});
