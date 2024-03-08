const Block = require('../../models/block.model');
const { getProvider } = require('../../utils/providers');

const newBlockHandler = async (
  blockNumber,
  provider = getProvider(),
  actions = async () => {},
) => {
  try {
    const newBlock = new Block({ blockNumber });
    const blockDataWithTransactions = await provider.getBlockWithTransactions(
      blockNumber,
    );
    newBlock.hash = blockDataWithTransactions.hash;
    newBlock.parentHash = blockDataWithTransactions.parentHash;
    newBlock.timestamp = new Date(blockDataWithTransactions.timestamp * 1e3);
    newBlock.chainId = provider.network.chainId;
    await actions(blockDataWithTransactions);
    await newBlock.save();
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  newBlockHandler,
};
